import "server-only";

/* Sprint Recsys — Étapes 9-10 : Geo candidates helper.
 *
 * Wrap la RPC nearby_posts_for_user qui retourne les posts géolocalisés
 * dans le rayon home du user, scorés par distance × freshness.
 *
 * Si l'user n'a pas de home_lat/lng dans profiles, fallback sur le
 * centre du 1er cercle local rejoint. Sinon retourne []. */

import { createClient } from "@/lib/supabase/server";

export type NearbyPostCandidate = {
  post_id: string;
  distance_km: number;
  freshness_score: number;
  combined_score: number;
};

export async function getNearbyPostsForUser(
  userId: string,
  opts: { limit?: number; days?: number } = {},
): Promise<NearbyPostCandidate[]> {
  const supabase = await createClient();
  /* eslint-disable-next-line @typescript-eslint/no-explicit-any */
  const { data, error } = await (supabase as any).rpc(
    "nearby_posts_for_user",
    {
      p_user_id: userId,
      p_limit: opts.limit ?? 50,
      p_days: opts.days ?? 14,
    },
  );
  if (error || !data) return [];
  return (data as Array<{
    post_id: string;
    distance_km: number | string;
    freshness_score: number | string;
    combined_score: number | string;
  }>).map((r) => ({
    post_id: r.post_id,
    distance_km: Number(r.distance_km),
    freshness_score: Number(r.freshness_score),
    combined_score: Number(r.combined_score),
  }));
}
