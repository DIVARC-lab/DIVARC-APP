"use client";

import { Pause, Play } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils/cn";

type AudioPlayerProps = {
  url: string;
  durationMs: number | null;
  isOwn: boolean;
};

export function AudioPlayer({ url, durationMs, isOwn }: AudioPlayerProps) {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [playing, setPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [actualDurationMs, setActualDurationMs] = useState<number | null>(
    durationMs,
  );

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const onTime = () => {
      const duration = (actualDurationMs ?? 0) / 1000;
      setProgress(duration > 0 ? audio.currentTime / duration : 0);
    };
    const onEnd = () => {
      setPlaying(false);
      setProgress(0);
      audio.currentTime = 0;
    };
    const onLoaded = () => {
      if (audio.duration && Number.isFinite(audio.duration)) {
        setActualDurationMs(audio.duration * 1000);
      }
    };

    audio.addEventListener("timeupdate", onTime);
    audio.addEventListener("ended", onEnd);
    audio.addEventListener("loadedmetadata", onLoaded);

    return () => {
      audio.removeEventListener("timeupdate", onTime);
      audio.removeEventListener("ended", onEnd);
      audio.removeEventListener("loadedmetadata", onLoaded);
    };
  }, [actualDurationMs]);

  function toggle() {
    const audio = audioRef.current;
    if (!audio) return;
    if (playing) {
      audio.pause();
      setPlaying(false);
    } else {
      void audio.play();
      setPlaying(true);
    }
  }

  function handleSeek(event: React.MouseEvent<HTMLButtonElement>) {
    const audio = audioRef.current;
    const rect = event.currentTarget.getBoundingClientRect();
    const ratio = (event.clientX - rect.left) / rect.width;
    if (audio && actualDurationMs) {
      audio.currentTime = (actualDurationMs / 1000) * ratio;
      setProgress(ratio);
    }
  }

  return (
    <div
      className={cn(
        "flex items-center gap-3 px-3 py-2 rounded-3xl shadow-sm min-w-[200px]",
        isOwn
          ? "bg-night text-cream rounded-br-md"
          : "bg-white text-night border border-line rounded-bl-md",
      )}
    >
      <audio ref={audioRef} src={url} preload="metadata" />
      <button
        type="button"
        onClick={toggle}
        aria-label={playing ? "Pause" : "Lecture"}
        className={cn(
          "shrink-0 w-9 h-9 rounded-full flex items-center justify-center",
          isOwn
            ? "bg-cream/15 text-cream hover:bg-cream/25"
            : "bg-night text-cream hover:bg-night-soft",
        )}
      >
        {playing ? (
          <Pause className="w-4 h-4" aria-hidden />
        ) : (
          <Play className="w-4 h-4 ml-0.5" aria-hidden />
        )}
      </button>
      <div className="flex-1 min-w-0">
        <button
          type="button"
          onClick={handleSeek}
          aria-label="Position"
          className="block w-full h-2 rounded-full bg-current/20 cursor-pointer overflow-hidden"
        >
          <span
            className="block h-full bg-current transition-all"
            style={{ width: `${progress * 100}%` }}
          />
        </button>
        <p className="mt-1 text-[10px] opacity-80">
          {formatDuration(actualDurationMs ?? durationMs ?? 0)}
        </p>
      </div>
    </div>
  );
}

export function formatDuration(ms: number): string {
  const totalSeconds = Math.max(0, Math.round(ms / 1000));
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${seconds.toString().padStart(2, "0")}`;
}
