"use client";

/* useReels — pagination client-side de la file de reels.
 *
 * Hydraté avec les reels SSR initiaux, étend en arrière-plan via
 * `loadMoreForYouReels` quand l'user approche de la fin de la file
 * (= scroll N-2 reels). Permet l'enchaînement continu (infinite scroll
 * vertical type TikTok).
 *
 * État exposé :
 *  - `reels` : liste accumulée
 *  - `loading` : un prefetch est en cours
 *  - `done` : plus rien à charger côté serveur
 *  - `loadMore()` : déclencheur manuel (ReelsFeed l'appelle quand
 *    l'index courant approche de la fin) */

import { useCallback, useState } from "react";
import { loadMoreForYouReels } from "@/app/(app)/reels/foryou-actions";
import type { ReelWithDetails } from "@/lib/database.types";

const PAGE_SIZE = 12;

export type UseReelsOptions = {
  initialReels: ReelWithDetails[];
};

export function useReels({ initialReels }: UseReelsOptions) {
  const [reels, setReels] = useState(initialReels);
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);

  const loadMore = useCallback(async () => {
    if (loading || done) return;
    setLoading(true);
    try {
      /* loadMoreForYouReels prend la liste des IDs déjà vus pour
         exclure côté serveur (re-ranking from-scratch, pas cursor). */
      const knownIds = reels.map((r) => r.id);
      const res = await loadMoreForYouReels(knownIds, PAGE_SIZE);
      if (!res.ok) return;
      if (res.reels.length === 0 || res.reels.length < PAGE_SIZE) {
        setDone(true);
      }
      setReels((prev) => {
        const ids = new Set(prev.map((r) => r.id));
        const fresh = res.reels.filter((r) => !ids.has(r.id));
        return [...prev, ...fresh];
      });
    } finally {
      setLoading(false);
    }
  }, [reels, loading, done]);

  return { reels, loading, done, loadMore };
}
