"use client";

import { Pause, Play, Volume2, VolumeX } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils/cn";

type Props = {
  url: string;
  thumbnailUrl: string | null;
  durationMs: number | null;
};

export function IntroVideoPlayer({ url, thumbnailUrl, durationMs }: Props) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [muted, setMuted] = useState(true);
  const [playing, setPlaying] = useState(true);
  const [visible, setVisible] = useState(false);

  /* Autoplay only when in viewport (TikTok-style).
     React 19 strict : setVisible du fallback déplacé dans queueMicrotask
     pour éviter set-state-in-effect. */
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    if (typeof IntersectionObserver === "undefined") {
      void video.play().catch(() => undefined);
      queueMicrotask(() => setVisible(true));
      return;
    }
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.intersectionRatio >= 0.5) {
            setVisible(true);
            void video.play().catch(() => undefined);
            setPlaying(true);
          } else {
            video.pause();
            setPlaying(false);
          }
        }
      },
      { threshold: [0, 0.5, 1] },
    );
    observer.observe(video);
    return () => observer.disconnect();
  }, []);

  function togglePlay() {
    const video = videoRef.current;
    if (!video) return;
    if (video.paused) {
      void video.play().catch(() => undefined);
      setPlaying(true);
    } else {
      video.pause();
      setPlaying(false);
    }
  }

  function toggleMute(event: React.MouseEvent) {
    event.stopPropagation();
    const video = videoRef.current;
    if (!video) return;
    video.muted = !video.muted;
    setMuted(video.muted);
  }

  return (
    <div className="relative rounded-3xl overflow-hidden bg-night aspect-[9/16] max-w-xs w-full shadow-[0_30px_60px_-20px_rgba(10,31,68,0.45)] group">
      <video
        ref={videoRef}
        src={url}
        poster={thumbnailUrl ?? undefined}
        playsInline
        loop
        muted
        preload="metadata"
        onClick={togglePlay}
        className="w-full h-full object-cover cursor-pointer"
      />

      {/* Overlay gradient (subtil) */}
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-night/60 via-transparent to-transparent" />

      {/* Play/Pause central indicator */}
      {!playing && visible ? (
        <button
          type="button"
          onClick={togglePlay}
          aria-label="Lire"
          className="absolute inset-0 flex items-center justify-center"
        >
          <span className="w-16 h-16 rounded-full bg-white/90 text-night flex items-center justify-center shadow-lg">
            <Play className="w-7 h-7 ml-1" aria-hidden />
          </span>
        </button>
      ) : null}

      {/* Mute toggle (bottom-right) */}
      <button
        type="button"
        onClick={toggleMute}
        aria-label={muted ? "Activer le son" : "Couper le son"}
        className={cn(
          "absolute bottom-3 right-3 w-10 h-10 rounded-full flex items-center justify-center transition-colors backdrop-blur-md",
          muted
            ? "bg-white/90 text-night"
            : "bg-emerald-500 text-white",
        )}
      >
        {muted ? (
          <VolumeX className="w-4 h-4" aria-hidden />
        ) : (
          <Volume2 className="w-4 h-4" aria-hidden />
        )}
      </button>

      {/* Tap-to-unmute hint (only while muted) */}
      {muted && playing ? (
        <div className="absolute top-3 left-3 px-2.5 py-1 rounded-full bg-white/90 text-night text-[10px] font-bold uppercase tracking-widest">
          🔇 Touche pour le son
        </div>
      ) : null}

      {/* Duration badge (top-right) */}
      {durationMs ? (
        <div className="absolute top-3 right-3 px-2 py-0.5 rounded-full bg-night/70 text-white text-[10px] font-bold">
          {formatDuration(durationMs)}
        </div>
      ) : null}

      {/* Pause indicator over the video */}
      {playing && !muted ? null : null}
    </div>
  );
}

function formatDuration(ms: number): string {
  const s = Math.round(ms / 1000);
  const m = Math.floor(s / 60);
  const r = s % 60;
  return `${m}:${r.toString().padStart(2, "0")}`;
}
