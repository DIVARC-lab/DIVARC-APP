"use client";

import { Play, Volume2, VolumeX } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useHlsVideo } from "@/components/video/useHlsVideo";
import { useVideoPlayer } from "@/components/video/VideoPlayerProvider";
import {
  classifyMediaShape,
  SHAPE_ASPECT_CLASS,
  SHAPE_MAX_HEIGHT,
} from "@/lib/feed/mediaFormat";
import { cn } from "@/lib/utils/cn";

type Props = {
  url: string;
  thumbnailUrl: string | null;
  durationMs: number | null;
  width: number | null;
  height: number | null;
  /** ID du post parent — sert à expand() en mode overlay au tap. */
  postId: string;
  /** URL HLS .m3u8 si disponible (V2 quand pipeline transcoding actif). */
  hlsUrl?: string | null;
};

export function PostVideoPlayer({
  url,
  thumbnailUrl,
  durationMs,
  width,
  height,
  postId,
  hlsUrl,
}: Props) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [muted, setMuted] = useState(true);
  const [playing, setPlaying] = useState(false);
  const { source: activeSource, expand } = useVideoPlayer();

  /* Si cette vidéo est déjà active dans l'overlay/mini, on rend juste
     un placeholder (le `<video>` global continue de jouer ailleurs). */
  const isActive = activeSource?.id === postId;

  /* Hook HLS — fallback gracieux MP4 si pas de m3u8. */
  useHlsVideo(videoRef, hlsUrl ?? null, url);

  /* Classification du format selon les dimensions Facebook officielles :
     reel 9:16 (1080×1920), portrait 4:5 (1080×1350), carré 1:1
     (1080×1080), paysage 1.91:1 (1200×630). Le container applique
     l'aspect-ratio exact ; <video> en object-cover center pour éviter
     tout étirement ou crop hors zone. */
  const shape = classifyMediaShape(width, height);
  const aspectClass = SHAPE_ASPECT_CLASS[shape];
  const maxHeightClass = SHAPE_MAX_HEIGHT[shape];
  /* Pour l'expand vers le player global, on garde le ratio source
     précis (les vidéos verticales atypiques sont préservées). */
  const aspectRatioCSS =
    width && height && width > 0 && height > 0
      ? `${width} / ${height}`
      : "9 / 16";

  /* Auto-play quand la vidéo est visible. Gère 3 sources de truth :
   *  1. IntersectionObserver : visibilité scroll
   *  2. `loadedmetadata` event : src set par useHlsVideo (race async)
   *  3. onPlay / onPause natifs : sync l'état réel du <video>
   *
   * Sans (2), la 1ère tentative play() peut échouer silencieusement car
   * useHlsVideo set le src dans un useEffect async qui peut ne pas être
   * résolu au moment où IO fire (= bug "vidéo bloquée au chargement"). */
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    /* Flag : on veut être en train de jouer (= visible OU déjà décidé). */
    let wantsPlay = false;

    function tryPlay() {
      if (!video || !wantsPlay) return;
      /* play() peut throw NotAllowedError sur iOS sans gesture, ou
         NotSupportedError si src pas encore set. On ignore : on retry
         au prochain event (loadedmetadata, canplay). */
      void video.play().catch(() => undefined);
    }

    function onLoadedMetadata() {
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

    video.addEventListener("loadedmetadata", onLoadedMetadata);
    video.addEventListener("canplay", onCanPlay);
    video.addEventListener("play", onPlayEvt);
    video.addEventListener("pause", onPauseEvt);

    let observer: IntersectionObserver | null = null;
    if (typeof IntersectionObserver === "undefined") {
      wantsPlay = true;
      tryPlay();
    } else {
      observer = new IntersectionObserver(
        (entries) => {
          for (const entry of entries) {
            if (entry.intersectionRatio >= 0.6) {
              wantsPlay = true;
              tryPlay();
            } else {
              wantsPlay = false;
              if (video) video.pause();
            }
          }
        },
        { threshold: [0, 0.6, 1] },
      );
      observer.observe(video);
    }

    return () => {
      observer?.disconnect();
      video.removeEventListener("loadedmetadata", onLoadedMetadata);
      video.removeEventListener("canplay", onCanPlay);
      video.removeEventListener("play", onPlayEvt);
      video.removeEventListener("pause", onPauseEvt);
    };
  }, []);

  /* Tap sur la vidéo : passe en mode "expanded" via le store global.
     Le timestamp courant est préservé (sync entre les <video> via
     setTime() dans le store). Comportement Facebook : pas de
     redirection, l'URL reste sur /feed. */
  function expandToOverlay(event: React.MouseEvent) {
    event.preventDefault();
    event.stopPropagation();
    const video = videoRef.current;
    expand(
      {
        id: postId,
        hlsUrl: hlsUrl ?? null,
        mp4Url: url,
        posterUrl: thumbnailUrl,
        durationMs,
        aspectRatio: aspectRatioCSS,
        postId,
        loop: durationMs !== null && durationMs < 30_000,
      },
      video?.currentTime ?? 0,
    );
  }

  function toggleMute(event: React.MouseEvent) {
    event.preventDefault();
    event.stopPropagation();
    const video = videoRef.current;
    if (!video) return;
    video.muted = !video.muted;
    setMuted(video.muted);
  }

  /* Si la vidéo est active dans le player global, on rend un placeholder
     statique (poster) — le `<video>` réel est dans l'ExpandedVideoPlayer
     ou MiniVideoPlayer pour éviter le double playback. */
  if (isActive) {
    return (
      <div
        className={cn(
          "relative bg-night overflow-hidden mx-auto flex items-center justify-center w-full",
          aspectClass,
          maxHeightClass,
        )}
      >
        {thumbnailUrl ? (
          /* eslint-disable-next-line @next/next/no-img-element */
          <img
            src={thumbnailUrl}
            alt=""
            className="w-full h-full object-cover object-center opacity-50"
          />
        ) : null}
        <span className="absolute text-cream/80 text-[11px] uppercase tracking-wider font-bold bg-black/50 px-3 py-1.5 rounded-full backdrop-blur-sm">
          ▶ Lecture en cours
        </span>
      </div>
    );
  }

  return (
    <div
      className={cn(
        "relative bg-night overflow-hidden mx-auto w-full",
        aspectClass,
        maxHeightClass,
      )}
    >
      <video
        ref={videoRef}
        poster={thumbnailUrl ?? undefined}
        playsInline
        loop
        muted
        preload="metadata"
        onClick={expandToOverlay}
        className="w-full h-full object-cover object-center cursor-pointer"
      />

      <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-night/40 via-transparent to-transparent" />

      {!playing ? (
        <button
          type="button"
          onClick={expandToOverlay}
          aria-label="Lire en plein écran"
          className="absolute inset-0 flex items-center justify-center"
        >
          <span className="w-16 h-16 rounded-full bg-white/90 text-night flex items-center justify-center shadow-lg">
            <Play className="w-7 h-7 ml-1" aria-hidden />
          </span>
        </button>
      ) : null}

      <button
        type="button"
        onClick={toggleMute}
        aria-label={muted ? "Activer le son" : "Couper le son"}
        className={cn(
          "absolute bottom-3 right-3 w-10 h-10 rounded-full flex items-center justify-center transition-colors backdrop-blur-md z-10",
          muted ? "bg-white/90 text-night" : "bg-emerald-500 text-white",
        )}
      >
        {muted ? (
          <VolumeX className="w-4 h-4" aria-hidden />
        ) : (
          <Volume2 className="w-4 h-4" aria-hidden />
        )}
      </button>

      {muted && playing ? (
        <div className="absolute top-3 left-3 px-2.5 py-1 rounded-full bg-white/90 text-night text-[10px] font-bold uppercase tracking-widest">
          🔇 Touche pour le son
        </div>
      ) : null}

      {durationMs ? (
        <div className="absolute top-3 right-3 px-2 py-0.5 rounded-full bg-night/70 text-white text-[10px] font-bold">
          {formatDuration(durationMs)}
        </div>
      ) : null}
    </div>
  );
}

function formatDuration(ms: number): string {
  const s = Math.round(ms / 1000);
  const m = Math.floor(s / 60);
  const r = s % 60;
  return `${m}:${r.toString().padStart(2, "0")}`;
}
