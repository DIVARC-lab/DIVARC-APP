import "server-only";
import { createClient } from "@/lib/supabase/server";
import type {
  CommentReactionEmoji,
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
    pollRows,
    userVoteRows,
    taggedUserRows,
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
    /* V4 Phase 1.6 — sondages.
       PERF FIX : avant on fetchait TOUTES les options de sondage de la
       BDD (`select * from post_poll_options` sans filtre). Maintenant
       nested select Supabase pour récupérer options en même temps que
       polls, filtré par post_id IN postIds. */
    supabase
      .from("post_polls")
      .select("*, post_poll_options(*)")
      .in("post_id", postIds),
    supabase
      .from("post_poll_votes")
      .select("poll_id, option_id")
      .eq("user_id", currentUserId),
    /* V4 Phase 1.6 — tagged users (sans embedded join, on fait un
       2nd query plus loin pour les profils des taggés). */
    supabase
      .from("post_tagged_users")
      .select("post_id, user_id")
      .in("post_id", postIds),
  ]);

  /* Tagged users : 2e query pour récupérer les profils. */
  const taggedUserIds = Array.from(
    new Set(
      ((taggedUserRows.data ?? []) as Array<{
        post_id: string;
        user_id: string;
      }>).map((r) => r.user_id),
    ),
  );
  const taggedProfilesRes =
    taggedUserIds.length > 0
      ? await supabase
          .from("profiles")
          .select("id, full_name, username, avatar_url")
          .in("id", taggedUserIds)
      : { data: [] };
  const taggedProfileById = new Map<
    string,
    { id: string; full_name: string | null; username: string | null; avatar_url: string | null }
  >();
  for (const p of (taggedProfilesRes.data ?? []) as Array<{
    id: string;
    full_name: string | null;
    username: string | null;
    avatar_url: string | null;
  }>) {
    taggedProfileById.set(p.id, p);
  }

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

  /* Polls : indexer par post_id. Options indexées par poll_id. */
  type PollRow = {
    id: string;
    post_id: string;
    question: string;
    multi_choice: boolean;
    is_anonymous: boolean;
    ends_at: string | null;
    total_votes: number;
    created_at: string;
    /* Chantier Feed v2 — migration 0113. */
    is_closed: boolean;
  };
  type PollOptionRow = {
    id: string;
    poll_id: string;
    position: number;
    label: string;
    votes_count: number;
    created_at: string;
    /* Chantier Feed v2 — migration 0113. */
    emoji: string | null;
  };

  /* pollRows.data contient maintenant des PollRow avec un champ
     `post_poll_options: PollOptionRow[]` grâce au nested select. */
  type PollRowWithOptions = PollRow & {
    post_poll_options: PollOptionRow[] | null;
  };
  const pollByPost = new Map<string, PollRow>();
  const optionsByPoll = new Map<string, PollOptionRow[]>();
  for (const p of ((pollRows.data ?? []) as unknown) as PollRowWithOptions[]) {
    pollByPost.set(p.post_id, p);
    const opts = (p.post_poll_options ?? []).slice().sort(
      (a, b) => a.position - b.position,
    );
    optionsByPoll.set(p.id, opts);
  }
  const userVotesByPoll = new Map<string, string[]>();
  for (const v of (userVoteRows.data ?? []) as Array<{
    poll_id: string;
    option_id: string;
  }>) {
    const arr = userVotesByPoll.get(v.poll_id) ?? [];
    arr.push(v.option_id);
    userVotesByPoll.set(v.poll_id, arr);
  }

  /* Tagged users : indexer par post_id. */
  const taggedByPost = new Map<
    string,
    Array<{
      id: string;
      full_name: string | null;
      username: string | null;
      avatar_url: string | null;
    }>
  >();
  for (const tag of (taggedUserRows.data ?? []) as Array<{
    post_id: string;
    user_id: string;
  }>) {
    const profile = taggedProfileById.get(tag.user_id);
    if (!profile) continue;
    const arr = taggedByPost.get(tag.post_id) ?? [];
    arr.push(profile);
    taggedByPost.set(tag.post_id, arr);
  }

  return rows.map((row) => {
    const poll = pollByPost.get(row.id);
    const tagged = taggedByPost.get(row.id) ?? [];
    return {
      ...row,
      photos: photosByPost.get(row.id) ?? [],
      author: authorById.get(row.author_id) ?? null,
      likes_count: likeCountByPost.get(row.id) ?? 0,
      comments_count: commentCountByPost.get(row.id) ?? 0,
      is_liked: likedByMeIds.has(row.id),
      is_bookmarked: bookmarkedByMeIds.has(row.id),
      poll: poll
        ? {
            ...poll,
            options: optionsByPoll.get(poll.id) ?? [],
            user_voted_option_ids: userVotesByPoll.get(poll.id) ?? [],
          }
        : null,
      tagged_users: tagged,
    };
  });
}

export async function listFeedPosts(
  currentUserId: string,
  limit: number = 30,
  /* Cursor pagination : si fourni, retourne les posts dont created_at <
     cursor (= posts plus anciens). Permet l'infinite scroll FB-style.
     Format attendu : ISO string (post.created_at d'un post déjà chargé). */
  cursor?: string | null,
): Promise<PostWithDetails[]> {
  const supabase = await createClient();
  let query = supabase
    .from("posts")
    .select("*")
    .is("deleted_at", null)
    .is("circle_id", null)
    .eq("status", "published")
    .order("created_at", { ascending: false })
    .limit(limit);

  if (cursor) {
    query = query.lt("created_at", cursor);
  }

  const { data, error } = await query;

  if (error || !data) return [];
  return attachDetails(data, currentUserId);
}

/* Chantier 3.2 — Tris transparents pour le feed d'un cercle. */
export type CircleFeedSort =
  | "recent"
  | "hot_24h"
  | "hot_7d"
  | "mine"
  | "unread";

export async function listCirclePosts(
  circleId: string,
  currentUserId: string,
  limit: number = 30,
  sort: CircleFeedSort = "recent",
  /* Pour 'unread' on lit last_read_at depuis circle_members. */
  unreadSince: string | null = null,
): Promise<PostWithDetails[]> {
  const supabase = await createClient();
  let query = supabase
    .from("posts")
    .select("*")
    .eq("circle_id", circleId)
    .is("deleted_at", null)
    .is("pinned_at", null)
    .eq("status", "published")
    .limit(limit);

  switch (sort) {
    case "hot_24h":
      query = query
        .gt(
          "created_at",
          new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
        )
        .order("upvotes", { ascending: false, nullsFirst: false })
        .order("helpful_marks", { ascending: false, nullsFirst: false })
        .order("created_at", { ascending: false });
      break;
    case "hot_7d":
      query = query
        .gt(
          "created_at",
          new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
        )
        .order("upvotes", { ascending: false, nullsFirst: false })
        .order("helpful_marks", { ascending: false, nullsFirst: false })
        .order("created_at", { ascending: false });
      break;
    case "mine":
      query = query
        .eq("author_id", currentUserId)
        .order("created_at", { ascending: false });
      break;
    case "unread":
      if (unreadSince) {
        query = query
          .gt("created_at", unreadSince)
          .neq("author_id", currentUserId)
          .order("created_at", { ascending: false });
      } else {
        query = query.order("created_at", { ascending: false });
      }
      break;
    case "recent":
    default:
      query = query.order("created_at", { ascending: false });
      break;
  }

  const { data, error } = await query;
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

/* Chantier Feed 4.2 — charge toutes les cartes d'un thread, ordonnées.
 * rootId = id du post racine (thread_root_id pour les cartes suivantes,
 * ou son propre id pour le root). */
export async function getThreadCards(
  rootId: string,
  currentUserId: string,
): Promise<PostWithDetails[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("posts")
    .select("*")
    .or(`id.eq.${rootId},thread_root_id.eq.${rootId}`)
    .is("deleted_at", null)
    .eq("status", "published")
    .order("thread_position", { ascending: true, nullsFirst: false });

  if (error || !data) return [];
  return attachDetails(data, currentUserId);
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

  /* Current user — pour calculer liked_by_me et my_reaction par commentaire. */
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const currentUserId = user?.id ?? null;

  const { data: comments } = await supabase
    .from("post_comments")
    .select("*")
    .eq("post_id", postId)
    .is("deleted_at", null)
    .order("created_at", { ascending: true });

  if (!comments || comments.length === 0) return [];

  const commentIds = comments.map((c) => c.id);
  const authorIds = Array.from(new Set(comments.map((c) => c.author_id)));

  /* Parallèle : auteurs + likes by me + my reactions + reactions summary. */
  const [
    { data: authors },
    likedByMe,
    myReactions,
    reactionsSummary,
  ] = await Promise.all([
    supabase
      .from("profiles")
      .select("id, full_name, username, avatar_url")
      .in("id", authorIds),
    currentUserId
      ? supabase
          .from("post_comment_likes")
          .select("comment_id")
          .eq("user_id", currentUserId)
          .in("comment_id", commentIds)
      : Promise.resolve({ data: [] as Array<{ comment_id: string }> }),
    currentUserId
      ? supabase
          .from("post_comment_reactions")
          .select("comment_id, emoji")
          .eq("user_id", currentUserId)
          .in("comment_id", commentIds)
      : Promise.resolve({
          data: [] as Array<{ comment_id: string; emoji: string }>,
        }),
    /* Agrégation des réactions tous users pour le summary. */
    supabase
      .from("post_comment_reactions")
      .select("comment_id, emoji")
      .in("comment_id", commentIds),
  ]);

  const authorById = new Map<string, AuthorRow>();
  for (const author of authors ?? []) {
    authorById.set(author.id, author);
  }

  const likedSet = new Set<string>(
    (likedByMe.data ?? []).map((r) => r.comment_id),
  );

  const myReactionByComment = new Map<string, string>();
  for (const r of myReactions.data ?? []) {
    myReactionByComment.set(r.comment_id, r.emoji);
  }

  /* reactions_summary : Map<comment_id, Map<emoji, count>>. */
  const summaryByComment = new Map<
    string,
    Record<string, number>
  >();
  for (const r of reactionsSummary.data ?? []) {
    const m = summaryByComment.get(r.comment_id) ?? {};
    m[r.emoji] = (m[r.emoji] ?? 0) + 1;
    summaryByComment.set(r.comment_id, m);
  }

  return comments.map((comment) => ({
    ...comment,
    author: authorById.get(comment.author_id) ?? null,
    liked_by_me: likedSet.has(comment.id),
    my_reaction: (myReactionByComment.get(comment.id) ?? null) as
      | CommentReactionEmoji
      | null,
    reactions_summary: (summaryByComment.get(comment.id) ?? {}) as Record<
      CommentReactionEmoji,
      number
    >,
  }));
}
