"use client";

/* ReelPlayer — player vidéo 9:16 réutilisable et autonome.
 *
 * Diff avec <ReelView /> : ce composant contient UNIQUEMENT la logique
 * lecture vidéo (HLS attach + autoplay quand visible + mute + onEnded).
 * <ReelView /> garde toute la logique métier (like, comment, share,
 * follow, watch_ms tracking pour le ranker reels).
 *
 * Use cases du player standalone :
 *  - Preview rapide dans /reels/[id] avant click (full view)
 *  - Modal partage avec aperçu
 *  - Embed dans un post du feed (futur)
 *  - Stories vidéo (mode différent mais même player)
 *
 * Tailwind v4 + Motion. Respecte le ratio 9:16 strict. Le wrapper
 * applique `aspect-[9/16]` ; <video> est en object-cover object-center
 * pour éviter toute déformation. */

import { Pause, Play, Volume2, VolumeX } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useHlsVideo } from "@/components/video/useHlsVideo";
import { cn } from "@/lib/utils/cn";

export type ReelPlayerProps = {
  /** URL .m3u8 (HLS) — préféré pour streaming adaptatif. */
  hlsUrl?: string | null;
  /** URL MP4 — fallback si pas HLS ou navigateur unsupported. */
  mp4Url: string;
  /** Poster (thumbnail) affiché avant la lecture. */
  posterUrl?: string | null;
  /** Auto-mute par défaut (recommandé : iOS Safari bloque autoplay
   *  audio sans gesture user, donc on démarre muet pour garantir le
   *  démarrage). Le user toggle ensuite. */
  defaultMuted?: boolean;
  /** Active l'IntersectionObserver autoplay (≥40% visible). False
   *  pour les previews où l'autoplay manuel suffit. */
  observeViewport?: boolean;
  /** Seuil de visibilité pour démarrer la lecture (0-1). Défaut 0.4. */
  viewportThreshold?: number;
  /** Si true, la vidéo loop infiniment (comportement reel). False
   *  pour story qui passe au suivant à la fin (via onEnded). */
  loop?: boolean;
  /** Callback fin de lecture (utile pour stories qui avancent). */
  onEnded?: () => void;
  /** Callback à chaque update du muted state (sync avec parent). */
  onMutedChange?: (muted: boolean) => void;
  /** Affiche les contrôles play/pause + mute en overlay. Défaut true. */
  showControls?: boolean;
  /** className additionnel sur le wrapper. */
  className?: string;
};

export function ReelPlayer({
  hlsUrl,
  mp4Url,
  posterUrl,
  defaultMuted = true,
  observeViewport = true,
  viewportThreshold = 0.4,
  loop = true,
  onEnded,
  onMutedChange,
  showControls = true,
  className,
}: ReelPlayerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [muted, setMuted] = useState(defaultMuted);
  const [playing, setPlaying] = useState(false);

  /* Attach HLS via hook partagé (gère Safari natif vs hls.js). */
  useHlsVideo(videoRef, hlsUrl ?? null, mp4Url);

  /* Autoplay/pause synchronisé avec viewport + retry au loadedmetadata
     pour gérer la race avec useHlsVideo (set src async). */
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    let wantsPlay = false;

    function tryPlay() {
      if (!video || !wantsPlay) return;
      void video.play().catch(() => undefined);
    }

    function onLoaded() {
      tryPlay();
    }
    function onCanPlay() {
      tryPlay();
    }
    function onPlayEvt() {
      setPlaying(true);
    }
    function onPauseEvt() {
      setPlaying(false);
    }
    function onEndedEvt() {
      onEnded?.();
    }

    video.addEventListener("loadedmetadata", onLoaded);
    video.addEventListener("canplay", onCanPlay);
    video.addEventListener("play", onPlayEvt);
    video.addEventListener("pause", onPauseEvt);
    video.addEventListener("ended", onEndedEvt);

    let observer: IntersectionObserver | null = null;
    if (observeViewport && typeof IntersectionObserver !== "undefined") {
      observer = new IntersectionObserver(
        (entries) => {
          for (const entry of entries) {
            if (entry.intersectionRatio >= viewportThreshold) {
              wantsPlay = true;
              tryPlay();
            } else {
              wantsPlay = false;
              video.pause();
            }
          }
        },
        { threshold: [0, viewportThreshold, 1] },
      );
      observer.observe(video);
    } else {
      /* Pas d'observer demandé : autoplay direct. */
      wantsPlay = true;
      tryPlay();
    }

    return () => {
      observer?.disconnect();
      video.removeEventListener("loadedmetadata", onLoaded);
      video.removeEventListener("canplay", onCanPlay);
      video.removeEventListener("play", onPlayEvt);
      video.removeEventListener("pause", onPauseEvt);
      video.removeEventListener("ended", onEndedEvt);
    };
  }, [observeViewport, viewportThreshold, onEnded]);

  /* Sync muted state vers <video> (et notifie le parent). */
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    video.muted = muted;
    onMutedChange?.(muted);
  }, [muted, onMutedChange]);

  function togglePlay() {
    const video = videoRef.current;
    if (!video) return;
    if (video.paused) {
      void video.play().catch(() => undefined);
    } else {
      video.pause();
    }
  }

  function toggleMute() {
    setMuted((m) => !m);
  }

  return (
    <div
      className={cn(
        "relative w-full bg-black overflow-hidden aspect-[9/16] flex items-center justify-center",
        className,
      )}
    >
      <video
        ref={videoRef}
        poster={posterUrl ?? undefined}
        playsInline
        loop={loop}
        muted={muted}
        preload="metadata"
        onClick={togglePlay}
        className="w-full h-full object-cover object-center cursor-pointer"
      />

      {/* Overlay gradient bas pour lisibilité des contrôles. */}
      <div className="pointer-events-none absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-black/55 to-transparent" />

      {showControls && !playing ? (
        <button
          type="button"
          onClick={togglePlay}
          aria-label="Lire"
          className="absolute inset-0 flex items-center justify-center"
        >
          <span className="w-16 h-16 rounded-full bg-white/90 text-black flex items-center justify-center shadow-lg">
            <Play className="w-7 h-7 ml-1" aria-hidden />
          </span>
        </button>
      ) : null}

      {showControls && playing ? (
        <button
          type="button"
          onClick={togglePlay}
          aria-label="Pause"
          className="absolute top-3 left-3 w-9 h-9 rounded-full bg-black/50 hover:bg-black/70 text-white flex items-center justify-center backdrop-blur-sm opacity-0 hover:opacity-100 focus:opacity-100 transition-opacity z-10"
          tabIndex={-1}
        >
          <Pause className="w-4 h-4" aria-hidden />
        </button>
      ) : null}

      {showControls ? (
        <button
          type="button"
          onClick={toggleMute}
          aria-label={muted ? "Activer le son" : "Couper le son"}
          className={cn(
            "absolute bottom-3 right-3 w-10 h-10 rounded-full flex items-center justify-center backdrop-blur-md z-10 transition-colors",
            muted
              ? "bg-white/90 text-black"
              : "bg-emerald-500 text-white",
          )}
        >
          {muted ? (
            <VolumeX className="w-4 h-4" aria-hidden />
          ) : (
            <Volume2 className="w-4 h-4" aria-hidden />
          )}
        </button>
      ) : null}
    </div>
  );
}
