import "server-only";
import { createClient } from "@/lib/supabase/server";
import type {
  CommentWithAuthor,
  Post,
  PostPhoto,
  PostWithDetails,
  Profile,
} from "@/lib/database.types";

type AuthorRow = Pick<
  Profile,
  "id" | "full_name" | "username" | "avatar_url"
>;

export async function listBookmarkedPosts(
  currentUserId: string,
  limit: number = 60,
): Promise<PostWithDetails[]> {
  const supabase = await createClient();
  const { data: bookmarks } = await supabase
    .from("post_bookmarks")
    .select("post_id, created_at")
    .eq("user_id", currentUserId)
    .order("created_at", { ascending: false })
    .limit(limit);
  if (!bookmarks || bookmarks.length === 0) return [];

  const ids = bookmarks.map((b) => b.post_id);
  const { data: posts } = await supabase
    .from("posts")
    .select("*")
    .in("id", ids)
    .is("deleted_at", null);
  if (!posts) return [];

  const byId = new Map(posts.map((p) => [p.id, p]));
  const ordered = ids
    .map((id) => byId.get(id))
    .filter((r): r is NonNullable<typeof r> => Boolean(r));

  return attachDetails(ordered, currentUserId);
}

export async function listPostsByHashtag(
  tag: string,
  currentUserId: string,
  limit: number = 30,
): Promise<PostWithDetails[]> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("posts_by_hashtag", {
    tag_text: tag.toLowerCase(),
    page_limit: limit,
  });
  if (error || !data) return [];

  // Le RPC retourne juste l'essentiel — on récupère les vraies lignes
  // pour avoir les colonnes vidéo et autres champs ajoutés.
  const ids = data.map((r) => r.id);
  const { data: fullRows } = await supabase
    .from("posts")
    .select("*")
    .in("id", ids)
    .is("deleted_at", null);
  if (!fullRows) return [];
  // Préserve l'ordre du RPC (par created_at desc)
  const byId = new Map(fullRows.map((r) => [r.id, r]));
  const ordered = ids
    .map((id) => byId.get(id))
    .filter((r): r is NonNullable<typeof r> => Boolean(r));

  return attachDetails(ordered, currentUserId);
}

async function attachDetails(
  rows: Post[],
  currentUserId: string,
): Promise<PostWithDetails[]> {
  if (rows.length === 0) return [];
  const supabase = await createClient();

  const postIds = rows.map((row) => row.id);
  const authorIds = Array.from(new Set(rows.map((row) => row.author_id)));

  const [
    { data: photos },
    { data: authors },
    { data: likeRows },
    likedByMe,
    commentRows,
    bookmarkedByMe,
  ] = await Promise.all([
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
      .from("post_likes")
      .select("post_id, user_id")
      .in("post_id", postIds),
    supabase
      .from("post_likes")
      .select("post_id")
      .eq("user_id", currentUserId)
      .in("post_id", postIds),
    supabase
      .from("post_comments")
      .select("post_id")
      .in("post_id", postIds)
      .is("deleted_at", null),
    supabase
      .from("post_bookmarks")
      .select("post_id")
      .eq("user_id", currentUserId)
      .in("post_id", postIds),
  ]);

  const photosByPost = new Map<string, PostPhoto[]>();
  for (const photo of photos ?? []) {
    const existing = photosByPost.get(photo.post_id) ?? [];
    existing.push(photo);
    photosByPost.set(photo.post_id, existing);
  }

  const authorById = new Map<string, AuthorRow>();
  for (const author of authors ?? []) {
    authorById.set(author.id, author);
  }

  const likeCountByPost = new Map<string, number>();
  for (const like of likeRows ?? []) {
    likeCountByPost.set(
      like.post_id,
      (likeCountByPost.get(like.post_id) ?? 0) + 1,
    );
  }

  const commentCountByPost = new Map<string, number>();
  for (const comment of commentRows.data ?? []) {
    commentCountByPost.set(
      comment.post_id,
      (commentCountByPost.get(comment.post_id) ?? 0) + 1,
    );
  }

  const likedByMeIds = new Set(
    (likedByMe.data ?? []).map((row) => row.post_id),
  );
  const bookmarkedByMeIds = new Set(
    (bookmarkedByMe.data ?? []).map((row) => row.post_id),
  );

  return rows.map((row) => ({
    ...row,
    photos: photosByPost.get(row.id) ?? [],
    author: authorById.get(row.author_id) ?? null,
    likes_count: likeCountByPost.get(row.id) ?? 0,
    comments_count: commentCountByPost.get(row.id) ?? 0,
    is_liked: likedByMeIds.has(row.id),
    is_bookmarked: bookmarkedByMeIds.has(row.id),
  }));
}

export async function listFeedPosts(
  currentUserId: string,
  limit: number = 30,
): Promise<PostWithDetails[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("posts")
    .select("*")
    .is("deleted_at", null)
    .is("circle_id", null)
    .eq("status", "published")
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error || !data) return [];
  return attachDetails(data, currentUserId);
}

export async function listCirclePosts(
  circleId: string,
  currentUserId: string,
  limit: number = 30,
): Promise<PostWithDetails[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("posts")
    .select("*")
    .eq("circle_id", circleId)
    .is("deleted_at", null)
    .is("pinned_at", null)
    .eq("status", "published")
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error || !data) return [];
  return attachDetails(data, currentUserId);
}

export async function listCirclePinnedPosts(
  circleId: string,
  currentUserId: string,
  limit: number = 5,
): Promise<PostWithDetails[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("posts")
    .select("*")
    .eq("circle_id", circleId)
    .is("deleted_at", null)
    .eq("status", "published")
    .not("pinned_at", "is", null)
    .order("pinned_at", { ascending: false })
    .limit(limit);

  if (error || !data) return [];
  return attachDetails(data, currentUserId);
}

export async function getPostById(
  id: string,
  currentUserId: string,
): Promise<PostWithDetails | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("posts")
    .select("*")
    .eq("id", id)
    .is("deleted_at", null)
    .maybeSingle();

  if (error || !data) return null;
  const [enriched] = await attachDetails([data], currentUserId);
  return enriched ?? null;
}

export async function listPostsByAuthor(
  authorId: string,
  currentUserId: string,
  limit: number = 30,
): Promise<PostWithDetails[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("posts")
    .select("*")
    .eq("author_id", authorId)
    .is("deleted_at", null)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error || !data) return [];
  return attachDetails(data, currentUserId);
}

export async function listCommentsForPost(
  postId: string,
): Promise<CommentWithAuthor[]> {
  const supabase = await createClient();
  const { data: comments } = await supabase
    .from("post_comments")
    .select("*")
    .eq("post_id", postId)
    .is("deleted_at", null)
    .order("created_at", { ascending: true });

  if (!comments || comments.length === 0) return [];

  const authorIds = Array.from(new Set(comments.map((c) => c.author_id)));
  const { data: authors } = await supabase
    .from("profiles")
    .select("id, full_name, username, avatar_url")
    .in("id", authorIds);

  const authorById = new Map<string, AuthorRow>();
  for (const author of authors ?? []) {
    authorById.set(author.id, author);
  }

  return comments.map((comment) => ({
    ...comment,
    author: authorById.get(comment.author_id) ?? null,
  }));
}
