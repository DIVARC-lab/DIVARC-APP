import "server-only";
import type { Reel } from "@/lib/database.types";

/* For You ranking V2 — exploitation des signaux reel_views.
 *
 * Pipeline :
 *   1) computeUserAffinity(userId) → AffinityProfile {
 *        creators: Map<authorId, score>,
 *        sounds:   Map<soundId, score>,
 *        hashtags: Map<tag, score>,
 *        skipRate: Map<authorId, [0..1]>,
 *      }
 *   2) scoreReel(reel, profile, now) → number
 *   3) rankReels(reels, profile) → trié décroissant
 *   4) diversifyByAuthor (anti-bulle final)
 *
 * Scoring signals (poids) :
 *   - Affinity créateur (×0.35)  : avg completed_pct sur ce créateur
 *   - Affinity son      (×0.20)  : avg completed_pct sur ce son
 *   - Affinity hashtag  (×0.15)  : moyenne max sur hashtags du reel
 *   - Engagement velocity (×0.15) : (likes + 2×saves + 1.5×shares) / age_hours
 *   - Recency boost      (×0.10) : 1.0 si <24h, decay log
 *   - Penalty skip rate  (×−0.05) : auteur avec skip > 50% pénalisé
 *
 * Cold start : si l'user n'a aucun reel_view (< 5), on retombe sur
 * popularité globale (likes_count + saves_count décroissants). */

export type AffinityProfile = {
  /** authorId → score [0..100] basé sur completed_pct moyen. */
  creators: Map<string, number>;
  /** soundId → score idem. */
  sounds: Map<string, number>;
  /** hashtag (lowercased) → score. */
  hashtags: Map<string, number>;
  /** authorId → skip rate [0..1]. */
  skipRate: Map<string, number>;
  /** Total views computed (signal "cold start" si < 5). */
  viewsCount: number;
};

type ReelViewRow = {
  reel_id: string;
  watch_ms: number;
  completed_pct: number;
  skipped: boolean;
  did_like: boolean;
  did_save: boolean;
  did_share: boolean;
  did_comment: boolean;
};

type ReelMeta = {
  id: string;
  author_id: string;
  sound_id: string | null;
  hashtags: string[];
};

export function computeAffinityFromViews(
  views: ReelViewRow[],
  reelMetas: ReelMeta[],
): AffinityProfile {
  const metaById = new Map<string, ReelMeta>();
  for (const m of reelMetas) metaById.set(m.id, m);

  /* Bucket aggregations */
  const creatorAgg = new Map<string, { sum: number; count: number; skips: number }>();
  const soundAgg = new Map<string, { sum: number; count: number }>();
  const hashtagAgg = new Map<string, { sum: number; count: number }>();

  for (const view of views) {
    const meta = metaById.get(view.reel_id);
    if (!meta) continue;

    /* Score d'engagement composite, non-saturable trop vite : */
    const engagementBoost =
      (view.did_like ? 25 : 0) +
      (view.did_save ? 35 : 0) +
      (view.did_share ? 20 : 0) +
      (view.did_comment ? 15 : 0);
    const watchScore = Math.min(view.completed_pct + engagementBoost, 200);
    const skip = view.skipped ? 1 : 0;

    /* Creator */
    const creatorKey = meta.author_id;
    const creator = creatorAgg.get(creatorKey) ?? { sum: 0, count: 0, skips: 0 };
    creator.sum += watchScore;
    creator.count += 1;
    creator.skips += skip;
    creatorAgg.set(creatorKey, creator);

    /* Sound */
    if (meta.sound_id) {
      const sound = soundAgg.get(meta.sound_id) ?? { sum: 0, count: 0 };
      sound.sum += watchScore;
      sound.count += 1;
      soundAgg.set(meta.sound_id, sound);
    }

    /* Hashtags */
    for (const tag of meta.hashtags ?? []) {
      const key = tag.toLowerCase();
      const hashtag = hashtagAgg.get(key) ?? { sum: 0, count: 0 };
      hashtag.sum += watchScore;
      hashtag.count += 1;
      hashtagAgg.set(key, hashtag);
    }
  }

  const creators = new Map<string, number>();
  const skipRate = new Map<string, number>();
  for (const [key, agg] of creatorAgg) {
    creators.set(key, agg.sum / agg.count);
    skipRate.set(key, agg.skips / agg.count);
  }
  const sounds = new Map<string, number>();
  for (const [key, agg] of soundAgg) {
    sounds.set(key, agg.sum / agg.count);
  }
  const hashtags = new Map<string, number>();
  for (const [key, agg] of hashtagAgg) {
    hashtags.set(key, agg.sum / agg.count);
  }

  return {
    creators,
    sounds,
    hashtags,
    skipRate,
    viewsCount: views.length,
  };
}

const COLD_START_THRESHOLD = 5;

export function isColdStart(profile: AffinityProfile): boolean {
  return profile.viewsCount < COLD_START_THRESHOLD;
}

/* Score un reel candidat : 0..200 environ.
 * Toutes les composantes sont sur 0..100 puis pondérées. */
export function scoreReel(
  reel: Reel,
  profile: AffinityProfile,
  now: number = Date.now(),
): number {
  const ageMs = now - new Date(reel.created_at).getTime();
  const ageHours = Math.max(ageMs / 3600_000, 0.5);

  /* 1) Affinity créateur (0..100) */
  const creatorScore = profile.creators.get(reel.author_id) ?? 0;

  /* 2) Affinity son (0..100) */
  const soundScore = reel.sound_id
    ? (profile.sounds.get(reel.sound_id) ?? 0)
    : 0;

  /* 3) Affinity hashtag : max sur les tags du reel */
  let hashtagScore = 0;
  for (const tag of reel.hashtags ?? []) {
    const s = profile.hashtags.get(tag.toLowerCase()) ?? 0;
    if (s > hashtagScore) hashtagScore = s;
  }

  /* 4) Engagement velocity (likes + 2×saves + 1.5×shares) / age_hours, capped */
  const rawVelocity =
    (reel.likes_count + 2 * reel.saves_count + 1.5 * reel.shares_count) /
    ageHours;
  const velocityScore = Math.min(rawVelocity * 10, 100);

  /* 5) Recency boost log decay : 100 à 0h, 50 à 24h, 25 à 72h */
  const recencyScore = Math.max(100 - 30 * Math.log2(1 + ageHours / 6), 0);

  /* 6) Penalty skip rate : -0..-20 */
  const skipPenalty = (profile.skipRate.get(reel.author_id) ?? 0) * 20;

  return (
    creatorScore * 0.35 +
    soundScore * 0.2 +
    hashtagScore * 0.15 +
    velocityScore * 0.15 +
    recencyScore * 0.1 -
    skipPenalty
  );
}

export function rankReels(
  reels: Reel[],
  profile: AffinityProfile,
  now: number = Date.now(),
): Reel[] {
  return [...reels].sort((a, b) => scoreReel(b, profile, now) - scoreReel(a, profile, now));
}

/* Cold start fallback : popularité globale pondérée. */
export function rankByPopularity(reels: Reel[]): Reel[] {
  return [...reels].sort((a, b) => {
    const sa = a.likes_count + 2 * a.saves_count + 0.5 * a.plays_count;
    const sb = b.likes_count + 2 * b.saves_count + 0.5 * b.plays_count;
    return sb - sa;
  });
}

/* Diversification : alterne les auteurs (max 1 reel consec par créateur). */
export function diversifyByAuthor(reels: Reel[]): Reel[] {
  if (reels.length <= 2) return reels;
  const result: Reel[] = [];
  const remaining = [...reels];
  let lastAuthor: string | null = null;
  while (remaining.length > 0) {
    const idx = remaining.findIndex((r) => r.author_id !== lastAuthor);
    const pickIdx = idx >= 0 ? idx : 0;
    const picked = remaining.splice(pickIdx, 1)[0]!;
    result.push(picked);
    lastAuthor = picked.author_id;
  }
  return result;
}
