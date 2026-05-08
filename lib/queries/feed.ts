import "server-only";
import { createClient } from "@/lib/supabase/server";
import type {
  Post,
  PostPhoto,
  PostWithDetails,
  Profile,
} from "@/lib/database.types";

type AuthorRow = Pick<
  Profile,
  "id" | "full_name" | "username" | "avatar_url"
>;

function diversifyByAuthor(
  posts: PostWithDetails[],
  maxConsecutivePerAuthor = 1,
): PostWithDetails[] {
  if (posts.length <= maxConsecutivePerAuthor + 1) return posts;
  const result: PostWithDetails[] = [];
  const remaining = [...posts];
  const recentAuthors: string[] = [];

  while (remaining.length > 0) {
    const idx = remaining.findIndex(
      (post) =>
        recentAuthors
          .slice(-maxConsecutivePerAuthor)
          .every((id) => id !== post.author_id),
    );
    const pickIdx = idx >= 0 ? idx : 0;
    const picked = remaining.splice(pickIdx, 1)[0]!;
    result.push(picked);
    recentAuthors.push(picked.author_id);
  }

  return result;
}

type RawRankedRow = {
  id: string;
  author_id: string;
  body: string | null;
  visibility: string;
  created_at: string;
};

async function attachPhotos(
  rows: RawRankedRow[],
  scoredById: Map<
    string,
    {
      likes_count: number;
      comments_count: number;
      is_liked: boolean;
    }
  >,
  _currentUserId: string,
): Promise<PostWithDetails[]> {
  if (rows.length === 0) return [];
  const supabase = await createClient();

  const postIds = rows.map((row) => row.id);
  const authorIds = Array.from(new Set(rows.map((row) => row.author_id)));

  const [{ data: photos }, { data: authors }, { data: videoRows }] =
    await Promise.all([
      supabase
        .from("post_photos")
        .select("*")
        .in("post_id", postIds)
        .order("position", { ascending: true }),
      supabase
        .from("profiles")
        .select("id, full_name, username, avatar_url")
        .in("id", authorIds),
      supabase
        .from("posts")
        .select(
          "id, video_url, video_thumbnail_url, video_duration_ms, video_width, video_height",
        )
        .in("id", postIds),
    ]);

  const { data: bookmarkRows } = await supabase
    .from("post_bookmarks")
    .select("post_id")
    .eq("user_id", _currentUserId)
    .in("post_id", postIds);
  const bookmarkedIds = new Set(
    (bookmarkRows ?? []).map((r) => r.post_id),
  );

  const videoByPost = new Map<
    string,
    Pick<
      Post,
      | "video_url"
      | "video_thumbnail_url"
      | "video_duration_ms"
      | "video_width"
      | "video_height"
    >
  >();
  for (const row of videoRows ?? []) {
    videoByPost.set(row.id, {
      video_url: row.video_url,
      video_thumbnail_url: row.video_thumbnail_url,
      video_duration_ms: row.video_duration_ms,
      video_width: row.video_width,
      video_height: row.video_height,
    });
  }

  const photosByPost = new Map<string, PostPhoto[]>();
  for (const photo of photos ?? []) {
    const existing = photosByPost.get(photo.post_id) ?? [];
    existing.push(photo);
    photosByPost.set(photo.post_id, existing);
  }

  const authorById = new Map<string, AuthorRow>();
  for (const author of authors ?? []) authorById.set(author.id, author);

  return rows.map((row) => {
    const scored = scoredById.get(row.id);
    const videoFields = videoByPost.get(row.id) ?? {
      video_url: null,
      video_thumbnail_url: null,
      video_duration_ms: null,
      video_width: null,
      video_height: null,
    };
    return {
      ...row,
      updated_at: row.created_at,
      edited_at: null,
      deleted_at: null,
      circle_id: null,
      pinned_at: null,
      pinned_by: null,
      ...videoFields,
      author: authorById.get(row.author_id) ?? null,
      photos: photosByPost.get(row.id) ?? [],
      likes_count: scored?.likes_count ?? 0,
      comments_count: scored?.comments_count ?? 0,
      is_liked: scored?.is_liked ?? false,
      is_bookmarked: bookmarkedIds.has(row.id),
      visibility: row.visibility as Post["visibility"],
    } satisfies PostWithDetails;
  });
}

export async function listRankedFeed(
  currentUserId: string,
  limit: number = 40,
): Promise<PostWithDetails[]> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("rank_feed_posts", {
    feed_limit: limit,
  });

  if (error || !data) return [];

  const scoredById = new Map<
    string,
    { likes_count: number; comments_count: number; is_liked: boolean }
  >();
  for (const row of data) {
    scoredById.set(row.id, {
      likes_count: row.likes_count,
      comments_count: row.comments_count,
      is_liked: row.is_liked,
    });
  }

  const enriched = await attachPhotos(data, scoredById, currentUserId);
  return diversifyByAuthor(enriched);
}

export async function listFriendsOnlyFeed(
  currentUserId: string,
  limit: number = 30,
): Promise<PostWithDetails[]> {
  const supabase = await createClient();
  const { data: friendRows } = await supabase
    .from("friendships")
    .select("requester_id, recipient_id")
    .eq("status", "accepted")
    .or(`requester_id.eq.${currentUserId},recipient_id.eq.${currentUserId}`);

  const friendIds = new Set<string>();
  for (const row of friendRows ?? []) {
    friendIds.add(row.requester_id);
    friendIds.add(row.recipient_id);
  }
  friendIds.delete(currentUserId);

  if (friendIds.size === 0) return [];

  const { data: posts } = await supabase
    .from("posts")
    .select("*")
    .is("deleted_at", null)
    .is("circle_id", null)
    .in("author_id", Array.from(friendIds))
    .order("created_at", { ascending: false })
    .limit(limit);

  if (!posts || posts.length === 0) return [];

  const ids = posts.map((p) => p.id);
  const [{ data: photos }, { data: likes }, { data: comments }, likedByMe, bookmarkedByMe] =
    await Promise.all([
      supabase
        .from("post_photos")
        .select("*")
        .in("post_id", ids)
        .order("position", { ascending: true }),
      supabase
        .from("post_likes")
        .select("post_id")
        .in("post_id", ids),
      supabase
        .from("post_comments")
        .select("post_id")
        .in("post_id", ids)
        .is("deleted_at", null),
      supabase
        .from("post_likes")
        .select("post_id")
        .eq("user_id", currentUserId)
        .in("post_id", ids),
      supabase
        .from("post_bookmarks")
        .select("post_id")
        .eq("user_id", currentUserId)
        .in("post_id", ids),
    ]);

  const photosByPost = new Map<string, PostPhoto[]>();
  for (const p of photos ?? []) {
    const existing = photosByPost.get(p.post_id) ?? [];
    existing.push(p);
    photosByPost.set(p.post_id, existing);
  }
  const likeCount = new Map<string, number>();
  for (const l of likes ?? []) likeCount.set(l.post_id, (likeCount.get(l.post_id) ?? 0) + 1);
  const commentCount = new Map<string, number>();
  for (const c of comments ?? []) commentCount.set(c.post_id, (commentCount.get(c.post_id) ?? 0) + 1);
  const likedSet = new Set((likedByMe.data ?? []).map((row) => row.post_id));
  const bookmarkedSet = new Set(
    (bookmarkedByMe.data ?? []).map((row) => row.post_id),
  );

  const authorIds = Array.from(new Set(posts.map((p) => p.author_id)));
  const { data: authors } = await supabase
    .from("profiles")
    .select("id, full_name, username, avatar_url")
    .in("id", authorIds);
  const authorById = new Map<string, AuthorRow>();
  for (const author of authors ?? []) authorById.set(author.id, author);

  return posts.map((post) => ({
    ...post,
    photos: photosByPost.get(post.id) ?? [],
    author: authorById.get(post.author_id) ?? null,
    likes_count: likeCount.get(post.id) ?? 0,
    comments_count: commentCount.get(post.id) ?? 0,
    is_liked: likedSet.has(post.id),
    is_bookmarked: bookmarkedSet.has(post.id),
  }));
}
