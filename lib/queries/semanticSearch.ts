import "server-only";

/* Sprint G.1 — Search sémantique côté server.
 *
 * 1. Génère l'embedding de la query via OpenAI text-embedding-3-small.
 * 2. Appelle la RPC search_posts_by_embedding.
 * 3. Enrich avec author + first photo (pas trop pour rester rapide).
 *
 * Si OpenAI n'est pas configuré, retourne une liste vide silencieusement.
 * Le call site peut fallback sur une recherche textuelle classique. */

import { createClient } from "@/lib/supabase/server";
import { generateEmbedding } from "@/lib/openai/embeddings";
import type {
  Post,
  PostPhoto,
  Profile,
} from "@/lib/database.types";

/* eslint-disable @typescript-eslint/no-explicit-any */
type SupabaseAny = any;

export type SemanticSearchResult = {
  post: Post;
  author: Pick<Profile, "id" | "full_name" | "username" | "avatar_url"> | null;
  photo: PostPhoto | null;
  similarity_score: number;
};

export async function searchPostsSemantic(args: {
  query: string;
  circleId?: string | null;
  limit?: number;
}): Promise<SemanticSearchResult[]> {
  const query = args.query.trim();
  if (query.length < 3) return [];

  /* 1. Embed la query. */
  const embedding = await generateEmbedding(query);
  if (!embedding) return [];

  const supabase = await createClient();

  /* 2. RPC sur Postgres avec scope optionnel circle_id. */
  const { data: rows } = await (supabase as SupabaseAny).rpc(
    "search_posts_by_embedding",
    {
      p_query_embedding: embedding.embedding,
      p_circle_id: args.circleId ?? null,
      p_limit: args.limit ?? 20,
      p_days_window: 365,
    },
  );

  type Row = {
    post_id: string;
    similarity_score: number;
    body: string | null;
    author_id: string;
    circle_id: string | null;
    created_at: string;
  };
  const list = (rows ?? []) as Row[];
  if (list.length === 0) return [];

  /* 3. Hydrate avec full post + author + 1 photo. */
  const postIds = list.map((r) => r.post_id);
  const authorIds = Array.from(new Set(list.map((r) => r.author_id)));

  const [postsRes, authorsRes, photosRes] = await Promise.all([
    supabase.from("posts").select("*").in("id", postIds),
    supabase
      .from("profiles")
      .select("id, full_name, username, avatar_url")
      .in("id", authorIds),
    supabase
      .from("post_photos")
      .select("*")
      .in("post_id", postIds)
      .order("position", { ascending: true }),
  ]);

  const postById = new Map(
    (postsRes.data ?? []).map((p) => [p.id, p as Post]),
  );
  const authorById = new Map(
    (authorsRes.data ?? []).map((a) => [
      a.id,
      a as Pick<Profile, "id" | "full_name" | "username" | "avatar_url">,
    ]),
  );
  const firstPhotoByPost = new Map<string, PostPhoto>();
  for (const photo of (photosRes.data ?? []) as PostPhoto[]) {
    if (!firstPhotoByPost.has(photo.post_id)) {
      firstPhotoByPost.set(photo.post_id, photo);
    }
  }

  return list
    .map((r) => {
      const post = postById.get(r.post_id);
      if (!post) return null;
      return {
        post,
        author: authorById.get(r.author_id) ?? null,
        photo: firstPhotoByPost.get(r.post_id) ?? null,
        similarity_score: r.similarity_score,
      };
    })
    .filter((x): x is SemanticSearchResult => x !== null);
}
