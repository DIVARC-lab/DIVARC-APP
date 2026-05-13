"use client";

/* useVideoTracking — Chantier Reels Recsys étape 2.
 *
 * Hook qui attache à un <video> tous les listeners pour produire les events
 * vidéo TikTok-style (quartiles, completion, replay, skip_fast/normal,
 * unmute, fullscreen, scrub_forward/backward, long_press_pause).
 *
 * Particularités :
 *  - IntersectionObserver détecte la visibilité ≥50% pour l'impression et
 *    pour le skip detection (sortie de viewport <2s = skip_fast).
 *  - timeupdate accumule watch_time_ms (cumul réel, pas durée écoulée).
 *  - Replay détecté quand `ended` se déclenche ou quand currentTime saute
 *    à ~0 alors qu'il était proche de duration (loop natif HTML video).
 *  - Long press pause détecté via mousedown/touchstart >500ms.
 *
 * Tous les events sont émis avec `target_video_id` + `surface` (reels_foryou
 * par défaut, override possible).
 */

import { useEffect, useRef } from "react";
import { trackEvent } from "@/lib/tracking/eventTracker";
import { EVENT_TYPES } from "@/lib/tracking/eventTypes";
import type { EventSurface } from "@/lib/database.types";

type Options = {
  /** Surface (reels_foryou, reels_following, feed_home si video inline). */
  surface?: EventSurface;
  /** Position dans le feed (rang 0-indexed). */
  position?: number;
  /** Désactive (ex : preview composer). */
  disabled?: boolean;
};

const QUARTILES = [25, 50, 75, 95] as const;
const QUARTILE_EVENT: Record<number, string> = {
  25: EVENT_TYPES.VIDEO_QUARTILE_25,
  50: EVENT_TYPES.VIDEO_QUARTILE_50,
  75: EVENT_TYPES.VIDEO_QUARTILE_75,
  95: EVENT_TYPES.VIDEO_QUARTILE_95,
};

export function useVideoTracking(
  videoRef: React.RefObject<HTMLVideoElement | null>,
  videoId: string,
  options: Options = {},
) {
  const stateRef = useRef({
    playStartTs: null as number | null,
    visibleSinceTs: null as number | null,
    watchTimeMs: 0,
    lastTimeS: 0,
    quartilesEmitted: new Set<number>(),
    replayCount: 0,
    impressionFired: false,
    isVisible: false,
    pressTimer: null as ReturnType<typeof setTimeout> | null,
  });

  useEffect(() => {
    if (options.disabled) return;
    if (typeof window === "undefined") return;
    const video = videoRef.current;
    if (!video) return;

    const state = stateRef.current;
    /* Reset state à chaque mount / changement de videoId. */
    state.playStartTs = null;
    state.visibleSinceTs = null;
    state.watchTimeMs = 0;
    state.lastTimeS = 0;
    state.quartilesEmitted = new Set();
    state.replayCount = 0;
    state.impressionFired = false;
    state.isVisible = false;

    function emit(eventType: string, props?: Record<string, unknown>) {
      trackEvent(eventType, {
        target_post_id: videoId,
        surface: options.surface ?? "reels",
        position: options.position,
        properties: props,
      });
    }

    /* === IntersectionObserver pour impression + skip detection === */
    const io = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting && entry.intersectionRatio >= 0.5) {
            state.isVisible = true;
            state.visibleSinceTs = Date.now();
            /* Impression unique par mount, après 300ms de visibilité. */
            if (!state.impressionFired) {
              window.setTimeout(() => {
                if (state.isVisible && !state.impressionFired) {
                  state.impressionFired = true;
                  emit(EVENT_TYPES.VIDEO_IMPRESSION);
                }
              }, 300);
            }
          } else {
            /* Sortie viewport → skip_fast (<2s) ou skip_normal (2-5s). */
            if (state.isVisible && state.playStartTs) {
              const elapsed = Date.now() - state.playStartTs;
              if (elapsed < 2000) {
                emit(EVENT_TYPES.VIDEO_SKIP_FAST, { elapsed_ms: elapsed });
              } else if (elapsed < 5000) {
                emit(EVENT_TYPES.VIDEO_SKIP_NORMAL, { elapsed_ms: elapsed });
              }
            }
            state.isVisible = false;
            state.visibleSinceTs = null;
          }
        }
      },
      { threshold: [0.5] },
    );
    io.observe(video);

    /* === play_start === */
    function onPlay() {
      if (state.playStartTs === null) {
        state.playStartTs = Date.now();
        emit(EVENT_TYPES.VIDEO_PLAY_START);
      }
    }

    /* === timeupdate : accumule watch_time + quartiles === */
    function onTimeUpdate() {
      if (!video || !isFinite(video.duration) || video.duration <= 0) return;
      const t = video.currentTime;
      /* Accumule watch time uniquement si la progression est positive
       * (pas un seek arrière). */
      if (t > state.lastTimeS) {
        state.watchTimeMs += (t - state.lastTimeS) * 1000;
      }
      state.lastTimeS = t;

      const pct = (t / video.duration) * 100;
      for (const q of QUARTILES) {
        if (pct >= q && !state.quartilesEmitted.has(q)) {
          state.quartilesEmitted.add(q);
          emit(QUARTILE_EVENT[q]!, {
            watch_time_ms: Math.round(state.watchTimeMs),
            duration_s: video.duration,
          });
        }
      }
    }

    /* === ended : completion + replay tracking === */
    function onEnded() {
      emit(EVENT_TYPES.VIDEO_COMPLETION, {
        watch_time_ms: Math.round(state.watchTimeMs),
        duration_s: video?.duration ?? 0,
        replay_count: state.replayCount,
      });
      state.replayCount += 1;
      /* Reset quartile tracking pour la prochaine boucle. */
      state.quartilesEmitted = new Set();
      state.lastTimeS = 0;

      if (state.replayCount === 1) {
        emit(EVENT_TYPES.VIDEO_REPLAY);
      } else if (state.replayCount >= 3) {
        emit(EVENT_TYPES.VIDEO_REPLAY_MULTIPLE, {
          replay_count: state.replayCount,
        });
      }
    }

    /* === unmute === */
    let lastMuted = video.muted;
    function onVolumeChange() {
      if (!video) return;
      if (lastMuted && !video.muted && video.volume > 0) {
        emit(EVENT_TYPES.VIDEO_UNMUTE);
      }
      lastMuted = video.muted;
    }

    /* === fullscreen === */
    function onFullscreenChange() {
      if (document.fullscreenElement === video) {
        emit(EVENT_TYPES.VIDEO_FULLSCREEN);
      }
    }

    /* === seek (scrub forward/backward) === */
    let preSeekTime = 0;
    function onSeeking() {
      preSeekTime = state.lastTimeS;
    }
    function onSeeked() {
      if (!video) return;
      const direction =
        video.currentTime > preSeekTime ? "forward" : "backward";
      emit(
        direction === "forward"
          ? EVENT_TYPES.VIDEO_SCRUB_FORWARD
          : EVENT_TYPES.VIDEO_SCRUB_BACKWARD,
        {
          from_s: preSeekTime,
          to_s: video.currentTime,
        },
      );
    }

    /* === pause + long press pause === */
    function onPause() {
      if (!video || video.ended) return;
      emit(EVENT_TYPES.VIDEO_PAUSE);
    }

    /* Long press detection : pointerdown >500ms pendant lecture = intent. */
    function onPointerDown() {
      if (state.pressTimer) clearTimeout(state.pressTimer);
      state.pressTimer = setTimeout(() => {
        if (video && !video.paused) {
          emit(EVENT_TYPES.VIDEO_LONG_PRESS_PAUSE);
        }
      }, 500);
    }
    function onPointerUp() {
      if (state.pressTimer) {
        clearTimeout(state.pressTimer);
        state.pressTimer = null;
      }
    }

    video.addEventListener("play", onPlay);
    video.addEventListener("timeupdate", onTimeUpdate);
    video.addEventListener("ended", onEnded);
    video.addEventListener("volumechange", onVolumeChange);
    video.addEventListener("seeking", onSeeking);
    video.addEventListener("seeked", onSeeked);
    video.addEventListener("pause", onPause);
    video.addEventListener("pointerdown", onPointerDown);
    video.addEventListener("pointerup", onPointerUp);
    video.addEventListener("pointercancel", onPointerUp);
    document.addEventListener("fullscreenchange", onFullscreenChange);

    return () => {
      io.disconnect();
      video.removeEventListener("play", onPlay);
      video.removeEventListener("timeupdate", onTimeUpdate);
      video.removeEventListener("ended", onEnded);
      video.removeEventListener("volumechange", onVolumeChange);
      video.removeEventListener("seeking", onSeeking);
      video.removeEventListener("seeked", onSeeked);
      video.removeEventListener("pause", onPause);
      video.removeEventListener("pointerdown", onPointerDown);
      video.removeEventListener("pointerup", onPointerUp);
      video.removeEventListener("pointercancel", onPointerUp);
      document.removeEventListener("fullscreenchange", onFullscreenChange);
      if (state.pressTimer) clearTimeout(state.pressTimer);
    };
    /* eslint-disable-next-line react-hooks/exhaustive-deps */
  }, [videoId, options.disabled, options.surface, options.position]);
}
