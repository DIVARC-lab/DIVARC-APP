"use client";

import { motion, useMotionValue } from "motion/react";
import { Pause, Play, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useHlsVideo } from "./useHlsVideo";
import { useVideoPlayer } from "./VideoPlayerProvider";

/* MiniVideoPlayer — PiP flottant Facebook-style.
 *
 * Comportement :
 *   - 240×135px desktop, 180×100px mobile
 *   - Snap aux 4 coins de l'écran après drag (gravité)
 *   - Tap = re-expand
 *   - Bouton X = close
 *   - Vidéo continue de jouer (timestamp préservé via context)
 *   - Z-index élevé pour rester au-dessus de tout (sauf modals z-60+)
 */
export function MiniVideoPlayer() {
  const {
    source,
    currentTime,
    isPlaying,
    isMuted,
    miniPosition,
    expandFromMini,
    close,
    setTime,
    setPlaying,
    setMiniPosition,
  } = useVideoPlayer();
  const videoRef = useRef<HTMLVideoElement>(null);
  const [hovered, setHovered] = useState(false);

  useHlsVideo(videoRef, source?.hlsUrl, source?.mp4Url ?? "");

  /* Default position : bottom-right, au-dessus de la BottomNav mobile. */
  const defaultX =
    typeof window !== "undefined" ? window.innerWidth - 256 : 0;
  const defaultY =
    typeof window !== "undefined" ? window.innerHeight - 200 : 0;

  const x = useMotionValue(miniPosition.x || defaultX);
  const y = useMotionValue(miniPosition.y || defaultY);

  /* Restore + sync video state. */
  useEffect(() => {
    const video = videoRef.current;
    if (!video || !source) return;
    const id = setTimeout(() => {
      try {
        if (Math.abs(video.currentTime - currentTime) > 0.5) {
          video.currentTime = currentTime;
        }
        video.muted = isMuted;
        if (isPlaying) {
          void video.play().catch(() => undefined);
        }
      } catch {
        /* noop */
      }
    }, 100);
    return () => clearTimeout(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [source?.id]);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    const onTimeUpdate = () => setTime(video.currentTime);
    const onPlay = () => setPlaying(true);
    const onPause = () => setPlaying(false);
    video.addEventListener("timeupdate", onTimeUpdate);
    video.addEventListener("play", onPlay);
    video.addEventListener("pause", onPause);
    return () => {
      video.removeEventListener("timeupdate", onTimeUpdate);
      video.removeEventListener("play", onPlay);
      video.removeEventListener("pause", onPause);
    };
  }, [setTime, setPlaying]);

  if (!source) return null;

  const snapToCorner = () => {
    if (typeof window === "undefined") return;
    const w = window.innerWidth;
    const h = window.innerHeight;
    const playerW = 240;
    const playerH = 135;
    const margin = 12;
    const xVal = x.get();
    const yVal = y.get();
    /* Snap horizontalement : si moins de la moitié, gauche, sinon droite. */
    const snapX = xVal < (w - playerW) / 2 ? margin : w - playerW - margin;
    /* Snap verticalement : haut ou bas. Réserver 60px en bas pour BottomNav. */
    const snapY = yVal < (h - playerH) / 2 ? 72 : h - playerH - 72;
    setMiniPosition(snapX, snapY);
  };

  return (
    <motion.div
      drag
      dragMomentum={false}
      dragConstraints={{
        top: 60,
        left: 0,
        right:
          typeof window !== "undefined" ? Math.max(0, window.innerWidth - 240) : 0,
        bottom:
          typeof window !== "undefined"
            ? Math.max(0, window.innerHeight - 140)
            : 0,
      }}
      style={{ x, y }}
      onDragEnd={snapToCorner}
      onHoverStart={() => setHovered(true)}
      onHoverEnd={() => setHovered(false)}
      className="fixed z-[55] cursor-grab active:cursor-grabbing rounded-xl overflow-hidden shadow-2xl bg-black w-[240px] h-[135px] sm:w-[260px] sm:h-[146px]"
    >
      <video
        ref={videoRef}
        poster={source.posterUrl ?? undefined}
        muted={isMuted}
        playsInline
        loop={!!source.loop}
        autoPlay
        onClick={() => {
          const v = videoRef.current;
          expandFromMini(v?.currentTime ?? currentTime);
        }}
        className="w-full h-full object-cover pointer-events-auto"
      />

      {/* Overlay au hover : controls. */}
      {hovered ? (
        <div className="absolute inset-0 bg-black/30 flex items-center justify-center gap-2 pointer-events-none">
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              const v = videoRef.current;
              if (!v) return;
              if (v.paused) void v.play().catch(() => undefined);
              else v.pause();
            }}
            aria-label={isPlaying ? "Pause" : "Lecture"}
            className="w-9 h-9 rounded-full bg-cream/90 text-night flex items-center justify-center pointer-events-auto"
          >
            {isPlaying ? (
              <Pause className="w-4 h-4" aria-hidden />
            ) : (
              <Play className="w-4 h-4 translate-x-px" aria-hidden />
            )}
          </button>
        </div>
      ) : null}

      {/* Bouton close — toujours visible. */}
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          close();
        }}
        aria-label="Fermer le mini-lecteur"
        className="absolute top-1 right-1 w-6 h-6 rounded-full bg-black/70 hover:bg-black text-cream flex items-center justify-center"
      >
        <X className="w-3.5 h-3.5" aria-hidden />
      </button>
    </motion.div>
  );
}
