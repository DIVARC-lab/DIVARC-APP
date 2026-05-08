"use client";

import { Play, Volume2, VolumeX } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils/cn";

type Props = {
  url: string;
  thumbnailUrl: string | null;
  durationMs: number | null;
  width: number | null;
  height: number | null;
};

export function PostVideoPlayer({
  url,
  thumbnailUrl,
  durationMs,
  width,
  height,
}: Props) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [muted, setMuted] = useState(true);
  const [playing, setPlaying] = useState(false);

  // Aspect ratio from intrinsic dimensions, default 9:16 (vertical reel)
  const aspect =
    width && height && width > 0 && height > 0
      ? `${width} / ${height}`
      : "9 / 16";

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    if (typeof IntersectionObserver === "undefined") {
      void video.play().catch(() => undefined);
      setPlaying(true);
      return;
    }
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.intersectionRatio >= 0.6) {
            void video.play().catch(() => undefined);
            setPlaying(true);
          } else {
            video.pause();
            setPlaying(false);
          }
        }
      },
      { threshold: [0, 0.6, 1] },
    );
    observer.observe(video);
    return () => observer.disconnect();
  }, []);

  function togglePlay(event: React.MouseEvent) {
    event.preventDefault();
    event.stopPropagation();
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
    event.preventDefault();
    event.stopPropagation();
    const video = videoRef.current;
    if (!video) return;
    video.muted = !video.muted;
    setMuted(video.muted);
  }

  return (
    <div
      className="relative bg-night overflow-hidden mx-auto"
      style={{
        aspectRatio: aspect,
        maxHeight: "640px",
        maxWidth: "100%",
      }}
    >
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

      <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-night/40 via-transparent to-transparent" />

      {!playing ? (
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
