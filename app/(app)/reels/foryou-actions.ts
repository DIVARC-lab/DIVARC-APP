"use server";

/* foryou-actions — Chantier Reels Recsys étape 14.
 *
 * Server action loadMoreForYouReels pour le préchargement client-side
 * de ReelsFeed. Wrappe le pipeline V3 + hydrate les reels en
 * ReelWithDetails[] prêts à rendre.
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
