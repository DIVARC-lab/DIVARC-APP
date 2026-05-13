import "server-only";

/* foryouPipeline — Chantier Reels Recsys étape 12.
 *
 * Orchestration end-to-end du pipeline V3 (For You Page) :
 *   candidate_generation → hydration → ranker → re-ranker → output.
 *
 * Utilisé par /api/feed/foryou et /api/reels/foryou (et plus tard par
 * lib/queries/reels.ts à l'étape 13).
 */

import type { SupabaseClient } from "@supabase/supabase-js";
import {
  buildUserProfile,
  hydrateCandidates,
  rankCandidates,
  rerank,
  type CandidateSource,
  type ContentType,
  type RawCandidate,
  type ScoredCandidate,
} from "./foryouRanker";

type SupaClient = SupabaseClient<any, "public", any>;

export type ForYouSurface =
  | "feed_foryou"
  | "feed_home"
  | "reels_foryou"
  | "reels";

export type ForYouOptions = {
  /** Nombre final d'items retournés (max 50). */
  limit?: number;
  /** Nombre de candidats demandés à la RPC (500-1000). */
  candidates_n?: number;
};

export type ForYouItem = {
  content_id: string;
  content_type: ContentType;
  score: number;
  source: CandidateSource;
  primary_signals: Array<{ type: string; label: string; weight: number }>;
};

export type ForYouResult = {
  items: ForYouItem[];
  pipeline_metadata: {
    candidates_generated: number;
    candidates_hydrated: number;
    user_has_interest_vector: boolean;
    user_is_lurker: boolean;
    duration_ms: number;
  };
};

/* === Liste des IDs vus récemment (pour exclusion dans ranker) ========
 *
 * Les events post.impression / video.impression dans les 24 dernières
 * heures forment l'ensemble "déjà vu". Filtre dur dans le ranker.
 */
async function getRecentlySeenIds(
  supabase: SupaClient,
  userId: string,
  hours: number = 24,
): Promise<Set<string>> {
  const cutoff = new Date(Date.now() - hours * 3600 * 1000).toISOString();
  const { data } = await supabase
    .from("recsys_events")
    .select("target_post_id")
    .eq("user_id", userId)
    .in("event_type", ["post.impression", "video.impression"])
    .gte("created_at", cutoff)
    .not("target_post_id", "is", null)
    .limit(1000);

  const set = new Set<string>();
  for (const row of data ?? []) {
    if (row.target_post_id) set.add(row.target_post_id as string);
  }
  return set;
}

/* === IDs d'auteurs see_less / hide cliqués par l'user ==============
 *
 * Si l'user a explicitement signalé "voir moins" / "masquer" sur un
 * auteur, on le démote fortement dans le re-ranker.
 */
async function getSeeLessAuthors(
  supabase: SupaClient,
  userId: string,
): Promise<Set<string>> {
  const cutoff = new Date(Date.now() - 90 * 24 * 3600 * 1000).toISOString();
  const { data } = await supabase
    .from("recsys_events")
    .select("target_user_id")
    .eq("user_id", userId)
    .in("event_type", ["post.see_less", "post.hide", "user.mute", "user.block"])
    .gte("created_at", cutoff)
    .not("target_user_id", "is", null)
    .limit(500);

  const set = new Set<string>();
  for (const row of data ?? []) {
    if (row.target_user_id) set.add(row.target_user_id as string);
  }
  return set;
}

/* === Close friends (top 8 user_affinity) =========================== */
async function getCloseFriends(
  supabase: SupaClient,
  userId: string,
): Promise<Set<string>> {
  const { data } = await supabase
    .from("user_interest_profiles")
    .select("user_affinity")
    .eq("user_id", userId)
    .maybeSingle();
  if (!data?.user_affinity) return new Set();
  const affinityMap = data.user_affinity as Record<string, number>;
  const top8 = Object.entries(affinityMap)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 8)
    .map(([id]) => id);
  return new Set(top8);
}

/* === Pipeline principal ============================================ */
export async function runForYouPipeline(
  supabase: SupaClient,
  userId: string,
  surface: ForYouSurface,
  options: ForYouOptions = {},
): Promise<ForYouResult> {
  const start = Date.now();
  const limit = Math.min(Math.max(options.limit ?? 30, 5), 50);
  const candidatesN = Math.min(Math.max(options.candidates_n ?? 800, 200), 1000);

  /* 1. Candidate generation (RPC SQL 7 sources). */
  const { data: rawCandidates, error: rpcError } = await supabase.rpc(
    "generate_candidates_v3",
    {
      p_user_id: userId,
      p_surface: surface,
      p_n: candidatesN,
    },
  );
  if (rpcError) {
    console.error("[foryouPipeline]", surface, "generate_candidates_v3 error:", rpcError);
    return emptyResult(start);
  }

  const candidates = (rawCandidates as RawCandidate[] | null) ?? [];
  if (candidates.length === 0) return emptyResult(start);

  /* 2. Hydration des contenus + profil + contexts en parallèle. */
  const [contentById, profile, recentlySeenIds, seeLessAuthorIds, closeFriendIds] =
    await Promise.all([
      hydrateCandidates(supabase, candidates),
      buildUserProfile(supabase, userId),
      getRecentlySeenIds(supabase, userId, 24),
      getSeeLessAuthors(supabase, userId),
      getCloseFriends(supabase, userId),
    ]);

  /* 3. Ranking heuristique. */
  const now = new Date();
  const scored = rankCandidates(candidates, contentById, profile, {
    surface,
    current_hour: now.getHours(),
    is_weekend: now.getDay() === 0 || now.getDay() === 6,
    recently_seen_ids: recentlySeenIds,
  });

  /* 4. Re-ranking MMR + business rules. */
  const finalFeed = rerank(scored, contentById, {
    target_size: limit,
    close_friend_ids: closeFriendIds,
    see_less_author_ids: seeLessAuthorIds,
  });

  /* 5. Output. */
  const items: ForYouItem[] = finalFeed.map((sc) => ({
    content_id: sc.candidate.content_id,
    content_type: sc.candidate.content_type,
    score: sc.final_score,
    source: sc.candidate.source,
    primary_signals: sc.primary_signals,
  }));

  return {
    items,
    pipeline_metadata: {
      candidates_generated: candidates.length,
      candidates_hydrated: contentById.size,
      user_has_interest_vector: profile.interest_vector !== null,
      user_is_lurker: profile.is_lurker,
      duration_ms: Date.now() - start,
    },
  };
}

function emptyResult(start: number): ForYouResult {
  return {
    items: [],
    pipeline_metadata: {
      candidates_generated: 0,
      candidates_hydrated: 0,
      user_has_interest_vector: false,
      user_is_lurker: false,
      duration_ms: Date.now() - start,
    },
  };
}
