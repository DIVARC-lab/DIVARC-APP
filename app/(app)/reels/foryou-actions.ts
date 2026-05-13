"use server";

/* foryou-actions — Chantier Reels Recsys étapes 14 et 18.
 *
 * - loadMoreForYouReels : préchargement client-side du ReelsFeed (étape 14).
 * - completeColdStart   : sauve les 5 topics choisis au cold start (étape 18).
 */

import { createClient } from "@/lib/supabase/server";
import { listForYouReels } from "@/lib/queries/reels";
import type { ReelWithDetails } from "@/lib/database.types";

export async function loadMoreForYouReels(
  excludeIds: string[] = [],
  limit: number = 10,
): Promise<{ ok: boolean; reels: ReelWithDetails[] }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, reels: [] };

  /* listForYouReels gère déjà le pipeline V3 + fallback lite. Pour le
   * préchargement, on en demande limit×2 puis on filtre les excludeIds
   * côté serveur pour éviter de re-servir des reels déjà à l'écran. */
  const reels = await listForYouReels(user.id, limit * 2);
  const excludeSet = new Set(excludeIds);
  const filtered = reels.filter((r) => !excludeSet.has(r.id)).slice(0, limit);

  return { ok: true, reels: filtered };
}

/* completeColdStart — Chantier Reels Recsys 18.
 *
 * Sauve les topics choisis par l'user au premier accès Reels. Cohérent
 * avec la migration 0122 (cold_start_topics + cold_start_completed_at).
 * Upsert le user_interest_profile pour ne pas écraser un profil existant. */
export async function completeColdStart(
  topics: string[],
): Promise<{ ok: boolean }> {
  if (!Array.isArray(topics) || topics.length < 1) return { ok: false };
  const safe = topics.slice(0, 10).filter((t) => typeof t === "string");
  if (safe.length < 1) return { ok: false };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false };

  const { error } = await supabase
    .from("user_interest_profiles")
    .upsert(
      {
        user_id: user.id,
        cold_start_topics: safe,
        cold_start_completed_at: new Date().toISOString(),
        last_updated: new Date().toISOString(),
      },
      { onConflict: "user_id" },
    );

  return { ok: !error };
}
