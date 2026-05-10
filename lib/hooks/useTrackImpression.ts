"use client";

import { useEffect, useRef } from "react";
import { trackEvent } from "@/lib/tracking/eventTracker";
import type { EventSurface } from "@/lib/database.types";

/* useTrackImpression — déclenche un event `post.impression` quand
 * l'élément est visible à ≥50% pendant ≥1s.
 *
 * Pattern Pinterest/Instagram pour mesurer la visibilité réelle.
 * IntersectionObserver natif, threshold 0.5, debounce via setTimeout
 * 1s pour éviter de tracker un scroll rapide.
 *
 * Une seule impression par mount (utilise un ref `tracked` pour éviter
 * le double-fire si le post est re-scrollé hors-vue puis ré-affiché). */

type UseTrackImpressionOptions = {
  /** Surface d'affichage (feed_home, reels, etc.). */
  surface?: EventSurface;
  /** Position dans le feed (rang, 0-indexed). */
  position?: number;
  /** Désactive le tracking (ex : preview composer). */
  disabled?: boolean;
};

export function useTrackImpression(
  postId: string,
  options: UseTrackImpressionOptions = {},
) {
  const ref = useRef<HTMLElement | null>(null);
  const trackedRef = useRef(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (options.disabled) return;
    if (!ref.current) return;
    if (trackedRef.current) return;
    if (typeof IntersectionObserver === "undefined") return;

    const element = ref.current;
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting && entry.intersectionRatio >= 0.5) {
            /* Démarre le timer 1s. Si l'élément reste visible, on track.
               Si l'élément disparaît avant, on annule. */
            if (!timerRef.current) {
              timerRef.current = setTimeout(() => {
                if (!trackedRef.current) {
                  trackedRef.current = true;
                  trackEvent("post.impression", {
                    target_post_id: postId,
                    surface: options.surface,
                    position: options.position,
                  });
                }
                timerRef.current = null;
              }, 1000);
            }
          } else {
            /* Sortie de viewport → annule le timer si pas encore fired. */
            if (timerRef.current) {
              clearTimeout(timerRef.current);
              timerRef.current = null;
            }
          }
        }
      },
      { threshold: [0.5] },
    );

    observer.observe(element);
    return () => {
      observer.disconnect();
      if (timerRef.current) {
        clearTimeout(timerRef.current);
        timerRef.current = null;
      }
    };
  }, [postId, options.disabled, options.surface, options.position]);

  return ref;
}
