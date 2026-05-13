import "server-only";

/* indexers — Chantier Reels Recsys étape 5.
 *
 * Workers d'indexation pour posts et reels via OpenAI embeddings.
 *
 * Comportement :
 *  - Appelé en fire-and-forget depuis les server actions de publication
 *    (`void indexPostEmbedding(...)`). Le post/reel est publié immédiatement
 *    même si l'embedding échoue — graceful fallback sur ranker heuristique.
 *  - Source text : pour posts = body, pour reels = description + hashtags.
 *  - Backfill batch utilisable par cron pour rattraper les contenus non
 *    embeddés.
 */

import type { SupabaseClient } from "@supabase/supabase-js";
import { generateEmbedding } from "@/lib/openai/embeddings";

type SupaClient = SupabaseClient<any, "public", any>;

/* === Indexation d'un POST ============================================= */
export async function indexPostEmbedding(
  supabase: SupaClient,
  postId: string,
  body: string,
): Promise<{ ok: boolean; reason?: string }> {
  if (!body || body.length < 10) return { ok: false, reason: "too_short" };
  try {
    const result = await generateEmbedding(body);
    if (!result) return { ok: false, reason: "no_embedding" };

    const { error } = await supabase.from("content_embeddings").upsert(
      {
        post_id: postId,
        embedding: result.embedding,
        model: result.model,
        source_text: result.source_text,
        generated_at: new Date().toISOString(),
      },
      { onConflict: "post_id" },
    );
    if (error) return { ok: false, reason: error.message };
    return { ok: true };
  } catch (err) {
    return { ok: false, reason: (err as Error).message };
  }
}

/* === Indexation d'un REEL ============================================= */
export async function indexReelEmbedding(
  supabase: SupaClient,
  reelId: string,
  description: string | null,
  hashtags: string[] | null,
): Promise<{ ok: boolean; reason?: string }> {
  /* Le source text reel = description + hashtags concaténés (hashtags
   * portent souvent le topic principal d'un reel court). */
  const parts: string[] = [];
  if (description && description.trim().length > 0) parts.push(description);
  if (hashtags && hashtags.length > 0) {
    parts.push(hashtags.map((h) => `#${h}`).join(" "));
  }
  const sourceText = parts.join(" ").trim();
  if (sourceText.length < 10) return { ok: false, reason: "too_short" };

  try {
    const result = await generateEmbedding(sourceText);
    if (!result) return { ok: false, reason: "no_embedding" };

    const { error } = await supabase.from("reel_embeddings").upsert(
      {
        reel_id: reelId,
        embedding: result.embedding,
        model: result.model,
        source_text: result.source_text,
        generated_at: new Date().toISOString(),
      },
      { onConflict: "reel_id" },
    );
    if (error) return { ok: false, reason: error.message };
    return { ok: true };
  } catch (err) {
    return { ok: false, reason: (err as Error).message };
  }
}

/* === Backfill batch ===================================================
 *
 * Récupère les N posts/reels les plus récents non encore indexés et les
 * indexe en séquence (pas de parallèle pour ne pas saturer l'OpenAI rate
 * limit). Utilisé par le cron /api/cron/embeddings-backfill.
 */

export async function backfillPostEmbeddings(
  supabase: SupaClient,
  limit: number = 50,
): Promise<{ indexed: number; failed: number }> {
  const { data: posts } = await supabase
    .from("posts")
    .select("id, body")
    .is("deleted_at", null)
    .eq("status", "published")
    .not("body", "is", null)
    .order("created_at", { ascending: false })
    .limit(limit * 3); /* on prend large car beaucoup seront déjà indexés */

  if (!posts || posts.length === 0) return { indexed: 0, failed: 0 };

  const ids = posts.map((p) => p.id);
  const { data: existing } = await supabase
    .from("content_embeddings")
    .select("post_id")
    .in("post_id", ids);
  const indexedSet = new Set((existing ?? []).map((e) => e.post_id));

  let indexed = 0;
  let failed = 0;
  for (const p of posts) {
    if (indexed >= limit) break;
    if (indexedSet.has(p.id)) continue;
    const r = await indexPostEmbedding(
      supabase,
      p.id,
      (p.body as string | null) ?? "",
    );
    if (r.ok) indexed += 1;
    else failed += 1;
  }
  return { indexed, failed };
}

export async function backfillReelEmbeddings(
  supabase: SupaClient,
  limit: number = 50,
): Promise<{ indexed: number; failed: number }> {
  const { data: reels } = await supabase
    .from("reels")
    .select("id, description, hashtags")
    .is("deleted_at", null)
    .eq("status", "published")
    .order("created_at", { ascending: false })
    .limit(limit * 3);

  if (!reels || reels.length === 0) return { indexed: 0, failed: 0 };

  const ids = reels.map((r) => r.id);
  const { data: existing } = await supabase
    .from("reel_embeddings")
    .select("reel_id")
    .in("reel_id", ids);
  const indexedSet = new Set((existing ?? []).map((e) => e.reel_id));

  let indexed = 0;
  let failed = 0;
  for (const r of reels) {
    if (indexed >= limit) break;
    if (indexedSet.has(r.id)) continue;
    const result = await indexReelEmbedding(
      supabase,
      r.id,
      r.description as string | null,
      (r.hashtags as string[] | null) ?? null,
    );
    if (result.ok) indexed += 1;
    else failed += 1;
  }
  return { indexed, failed };
}
