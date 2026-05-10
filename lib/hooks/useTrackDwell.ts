"use client";

import { useEffect, useRef } from "react";
import { trackEvent } from "@/lib/tracking/eventTracker";
import type { EventSurface } from "@/lib/database.types";

/* useTrackDwell — mesure le temps qu'un user passe à regarder un post
 * (depuis l'impression jusqu'à scroll-out / fermeture).
 *
 * Pattern : on démarre le chrono quand l'élément devient visible ≥50%,
 * on le stoppe quand il devient invisible OU au unmount. On track
 * `post.dwell_time` avec `properties.dwell_ms` pour que le profile
 * updater calcule le poids via `dwellWeight()`.
 *
 * Granularité : on n'envoie qu'une fois par mount, à la sortie de
 * viewport ou unmount, pour ne pas spammer. */

type UseTrackDwellOptions = {
  surface?: EventSurface;
  /** Seuil minimum en ms pour envoyer l'event (sub-1s = ignoré). */
  minMs?: number;
  disabled?: boolean;
};

export function useTrackDwell(
  postId: string,
  options: UseTrackDwellOptions = {},
) {
  const ref = useRef<HTMLElement | null>(null);
  const startedAtRef = useRef<number | null>(null);
  const totalDwellRef = useRef(0);
  const sentRef = useRef(false);
  const minMs = options.minMs ?? 1000;

  useEffect(() => {
    if (options.disabled) return;
    if (!ref.current) return;
    if (typeof IntersectionObserver === "undefined") return;

    const element = ref.current;

    function flush() {
      if (sentRef.current) return;
      const total = totalDwellRef.current;
      if (total >= minMs) {
        sentRef.current = true;
        trackEvent("post.dwell_time", {
          target_post_id: postId,
          surface: options.surface,
          properties: { dwell_ms: total },
        });
      }
    }

    function startTimer() {
      if (startedAtRef.current === null) {
        startedAtRef.current = Date.now();
      }
    }

    function stopTimer() {
      if (startedAtRef.current !== null) {
        totalDwellRef.current += Date.now() - startedAtRef.current;
        startedAtRef.current = null;
      }
    }

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting && entry.intersectionRatio >= 0.5) {
            startTimer();
          } else {
            stopTimer();
          }
        }
      },
      { threshold: [0.5] },
    );

    observer.observe(element);

    /* Cleanup au unmount : stoppe le chrono et envoie l'event final. */
    return () => {
      stopTimer();
      observer.disconnect();
      flush();
    };
  }, [postId, options.disabled, options.surface, minMs]);

  return ref;
}
