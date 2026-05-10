"use client";

import { Maximize2, Minimize2, Volume2, VolumeX, X } from "lucide-react";
import { useEffect, useRef } from "react";
import { useHlsVideo } from "./useHlsVideo";
import { useVideoPlayer } from "./VideoPlayerProvider";

/* ExpandedVideoPlayer — overlay vidéo agrandi style Facebook.
 *
 * Comportement :
 *   - Centré, ~85% écran, fond noir/dim
 *   - Vidéo + controls custom (play/pause, mute, seek, fullscreen, X)
 *   - Bouton X ferme totalement
 *   - Bouton "Réduire" passe en mini-player (PiP)
 *   - Click outside backdrop = passe en mini (comportement Facebook)
 *
 * Pour V1 on rend les controls customs basiques. Le swipe-down mobile
 * vers mini sera ajouté en V1.5 avec gestures motion.
 */
export function ExpandedVideoPlayer() {
  const {
    source,
    mode,
    currentTime,
    isPlaying,
    isMuted,
    shrinkToMini,
    close,
    setTime,
    setPlaying,
    toggleMute,
    enterFullscreen,
    exitFullscreen,
  } = useVideoPlayer();
  const videoRef = useRef<HTMLVideoElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useHlsVideo(videoRef, source?.hlsUrl, source?.mp4Url ?? "");

  /* Restore timestamp + playing state au mount. */
  useEffect(() => {
    const video = videoRef.current;
    if (!video || !source) return;
    /* Petit delay pour laisser hls.js attacher la source. */
    const id = setTimeout(() => {
      try {
        if (Math.abs(video.currentTime - currentTime) > 0.5) {
          video.currentTime = currentTime;
        }
        video.muted = isMuted;
        if (isPlaying) {
          void video.play().catch(() => undefined);
        } else {
          video.pause();
        }
      } catch {
        /* noop */
      }
    }, 100);
    return () => clearTimeout(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [source?.id]);

  /* Sync mute state. */
  useEffect(() => {
    const video = videoRef.current;
    if (video) video.muted = isMuted;
  }, [isMuted]);

  /* Listen aux events pour update store. */
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

  /* Fullscreen API natif. */
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    if (mode === "fullscreen" && document.fullscreenElement !== container) {
      container.requestFullscreen?.().catch(() => undefined);
    } else if (mode !== "fullscreen" && document.fullscreenElement === container) {
      document.exitFullscreen?.().catch(() => undefined);
    }
  }, [mode]);

  /* Listen exitFullscreen via ESC ou bouton natif. */
  useEffect(() => {
    function handleFs() {
      if (!document.fullscreenElement && mode === "fullscreen") {
        const video = videoRef.current;
        exitFullscreen(video?.currentTime ?? currentTime);
      }
    }
    document.addEventListener("fullscreenchange", handleFs);
    return () => document.removeEventListener("fullscreenchange", handleFs);
  }, [mode, exitFullscreen, currentTime]);

  if (!source) return null;

  const handleBackdropClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.target === e.currentTarget) {
      const video = videoRef.current;
      shrinkToMini(video?.currentTime ?? currentTime);
    }
  };

  return (
    <div
      className="fixed inset-0 z-[60] bg-black/85 flex items-center justify-center p-2 sm:p-4 backdrop-blur-md"
      role="dialog"
      aria-modal="true"
      onClick={handleBackdropClick}
    >
      <div
        ref={containerRef}
        className="relative w-full max-w-4xl bg-black rounded-2xl overflow-hidden shadow-2xl"
        style={{
          aspectRatio: source.aspectRatio ?? "16 / 9",
          maxHeight: "90vh",
        }}
      >
        <video
          ref={videoRef}
          poster={source.posterUrl ?? undefined}
          playsInline
          loop={!!source.loop}
          autoPlay
          className="w-full h-full object-contain bg-black"
          onClick={() => {
            const v = videoRef.current;
            if (!v) return;
            if (v.paused) void v.play().catch(() => undefined);
            else v.pause();
          }}
        />

        {/* Controls overlay — top right. */}
        <div className="absolute top-3 right-3 flex items-center gap-1.5">
          <ControlBtn
            label={isMuted ? "Activer le son" : "Couper le son"}
            onClick={toggleMute}
          >
            {isMuted ? (
              <VolumeX className="w-4 h-4" aria-hidden />
            ) : (
              <Volume2 className="w-4 h-4" aria-hidden />
            )}
          </ControlBtn>
          <ControlBtn
            label={
              mode === "fullscreen" ? "Quitter le plein écran" : "Plein écran"
            }
            onClick={() => {
              if (mode === "fullscreen") {
                const v = videoRef.current;
                exitFullscreen(v?.currentTime ?? currentTime);
              } else {
                enterFullscreen();
              }
            }}
          >
            {mode === "fullscreen" ? (
              <Minimize2 className="w-4 h-4" aria-hidden />
            ) : (
              <Maximize2 className="w-4 h-4" aria-hidden />
            )}
          </ControlBtn>
          <ControlBtn label="Fermer" onClick={close}>
            <X className="w-4 h-4" aria-hidden />
          </ControlBtn>
        </div>

        {/* Controls overlay — bottom hint. */}
        <div className="absolute bottom-3 left-3 right-3 flex items-center gap-2 pointer-events-none">
          <p className="text-[10.5px] text-cream/70 font-mono tabular-nums bg-black/40 px-2 py-0.5 rounded">
            {formatTime(currentTime)}
            {source.durationMs
              ? ` / ${formatTime(source.durationMs / 1000)}`
              : ""}
          </p>
        </div>
      </div>
    </div>
  );
}

function ControlBtn({
  label,
  onClick,
  children,
}: {
  label: string;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={(e) => {
        e.stopPropagation();
        onClick();
      }}
      aria-label={label}
      className="w-9 h-9 rounded-full bg-black/60 hover:bg-black/80 text-cream flex items-center justify-center backdrop-blur-sm transition-colors"
    >
      {children}
    </button>
  );
}

function formatTime(seconds: number): string {
  if (!Number.isFinite(seconds)) return "0:00";
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${String(s).padStart(2, "0")}`;
}
