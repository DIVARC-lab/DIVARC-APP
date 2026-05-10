"use client";

import { useEffect, useRef, type RefObject } from "react";
import { trackEvent } from "@/lib/tracking/eventTracker";
import type { EventSurface } from "@/lib/database.types";

/* useVideoTracking — track les events de visionnage pour le recsys.
 *
 * Events déclenchés (via /api/events/track) :
 *   - video.play_quartile (25/50/75/95) : un seul fire par quartile
 *     par session. Reset si l'user replay (currentTime revient à ~0).
 *   - video.replay : quand l'user revient à 0 après avoir atteint 95%.
 *   - video.unmute : quand l'user dé-mute (intent fort).
 *   - video.scrub : quand l'user seek (intent : skip ou re-watch).
 *   - video.dwell : envoyé au unmount avec le total dwell_ms cumulé.
 *
 * Tous les events portent target_post_id = postId pour rattacher au
 * recsys. L'event_id côté DB est un UUID v4 généré par trackEvent().
 */
type UseVideoTrackingOptions = {
  postId: string;
  surface?: EventSurface;
  /** Désactive temporairement (ex: composer preview). */
  disabled?: boolean;
};

export function useVideoTracking(
  videoRef: RefObject<HTMLVideoElement | null>,
  options: UseVideoTrackingOptions,
) {
  const { postId, surface, disabled } = options;
  const firedQuartilesRef = useRef<Set<25 | 50 | 75 | 95>>(new Set());
  const dwellMsRef = useRef(0);
  const lastPlayingAtRef = useRef<number | null>(null);
  const lastTimeRef = useRef(0);
  const reachedEndRef = useRef(false);
  const replayCountRef = useRef(0);

  useEffect(() => {
    if (disabled) return;
    const video = videoRef.current;
    if (!video) return;

    function onTimeUpdate() {
      if (!video) return;
      const dur = video.duration;
      const t = video.currentTime;
      lastTimeRef.current = t;
      if (!Number.isFinite(dur) || dur <= 0) return;

      /* Quartiles. */
      const pct = (t / dur) * 100;
      const fired = firedQuartilesRef.current;
      const quartiles: Array<25 | 50 | 75 | 95> = [25, 50, 75, 95];
      for (const q of quartiles) {
        if (pct >= q && !fired.has(q)) {
          fired.add(q);
          trackEvent("video.play_quartile", {
            target_post_id: postId,
            surface,
            properties: { quartile: q, duration_s: Math.round(dur) },
          });
        }
      }

      /* Détection replay : on a déjà atteint 95% et on revient sous 5%. */
      if (fired.has(95) && pct < 5 && !reachedEndRef.current) {
        reachedEndRef.current = true;
      }
      if (reachedEndRef.current && pct > 10) {
        replayCountRef.current += 1;
        reachedEndRef.current = false;
        firedQuartilesRef.current = new Set();
        trackEvent("video.replay", {
          target_post_id: postId,
          surface,
          properties: {
            replay_index: replayCountRef.current,
            duration_s: Math.round(dur),
          },
        });
      }
    }

    function onPlay() {
      lastPlayingAtRef.current = performance.now();
    }

    function onPause() {
      if (lastPlayingAtRef.current !== null) {
        dwellMsRef.current += performance.now() - lastPlayingAtRef.current;
        lastPlayingAtRef.current = null;
      }
    }

    function onSeeking() {
      /* Si l'user seek > 1s par rapport à la position attendue, c'est
         un scrub explicite. */
      if (!video) return;
      const expected = lastTimeRef.current;
      const actual = video.currentTime;
      if (Math.abs(actual - expected) > 1.5) {
        trackEvent("video.scrub", {
          target_post_id: postId,
          surface,
          properties: {
            from_s: Math.round(expected),
            to_s: Math.round(actual),
          },
        });
      }
    }

    function onVolumeChange() {
      if (!video) return;
      if (!video.muted) {
        trackEvent("video.unmute", {
          target_post_id: postId,
          surface,
          properties: { at_s: Math.round(video.currentTime) },
        });
      }
    }

    function onEnded() {
      reachedEndRef.current = true;
    }

    video.addEventListener("timeupdate", onTimeUpdate);
    video.addEventListener("play", onPlay);
    video.addEventListener("pause", onPause);
    video.addEventListener("seeking", onSeeking);
    video.addEventListener("volumechange", onVolumeChange);
    video.addEventListener("ended", onEnded);

    return () => {
      video.removeEventListener("timeupdate", onTimeUpdate);
      video.removeEventListener("play", onPlay);
      video.removeEventListener("pause", onPause);
      video.removeEventListener("seeking", onSeeking);
      video.removeEventListener("volumechange", onVolumeChange);
      video.removeEventListener("ended", onEnded);

      /* Flush dwell_time au unmount. */
      if (lastPlayingAtRef.current !== null) {
        dwellMsRef.current += performance.now() - lastPlayingAtRef.current;
      }
      const totalMs = Math.round(dwellMsRef.current);
      if (totalMs >= 1000) {
        trackEvent("video.dwell", {
          target_post_id: postId,
          surface,
          properties: {
            dwell_ms: totalMs,
            replays: replayCountRef.current,
            quartiles_reached: Array.from(firedQuartilesRef.current),
          },
        });
      }
    };
  }, [videoRef, postId, surface, disabled]);
}
