"use client";

/* Étape 22 — Player replay MP4 (VOD) pour les lives terminés.
 *
 * Player HTML5 natif (controls). MP4 streamé depuis Supabase Storage.
 * Track la vue côté server au mount via RPC track_replay_view
 * (idempotent : 1 vue / user). */

import { Clock3, Eye, Share2 } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";

type Props = {
  sessionId: string;
  title: string;
  description: string | null;
  recordingId: string | null;
  vodUrl: string;
  durationSeconds: number | null;
  initialViewCount: number;
  thumbnailUrl: string | null;
};

function formatDuration(s: number | null): string {
  if (!s || s <= 0) return "—";
  const minutes = Math.floor(s / 60);
  const seconds = s % 60;
  if (minutes >= 60) {
    const h = Math.floor(minutes / 60);
    const m = minutes % 60;
    return `${h} h ${m.toString().padStart(2, "0")} min`;
  }
  return `${minutes}:${seconds.toString().padStart(2, "0")}`;
}

export function LiveReplayPlayer({
  sessionId,
  title,
  description,
  recordingId,
  vodUrl,
  durationSeconds,
  initialViewCount,
  thumbnailUrl,
}: Props) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const [viewCount, setViewCount] = useState(initialViewCount);
  const trackedRef = useRef(false);

  /* Track view au premier play (idempotent côté DB). */
  useEffect(() => {
    if (!recordingId) return;
    const video = videoRef.current;
    if (!video) return;

    async function track() {
      if (trackedRef.current) return;
      trackedRef.current = true;
      try {
        const supabase = createClient();
        /* eslint-disable-next-line @typescript-eslint/no-explicit-any */
        const { data } = await (supabase as any).rpc("track_replay_view", {
          p_recording_id: recordingId,
        });
        if (typeof data === "number") setViewCount(data);
      } catch {
        /* silencieux */
      }
    }

    function onPlay() {
      void track();
    }

    video.addEventListener("play", onPlay, { once: true });
    return () => {
      video.removeEventListener("play", onPlay);
    };
  }, [recordingId]);

  function handleShare() {
    const url =
      typeof window !== "undefined"
        ? `${window.location.origin}/lives/${sessionId}`
        : "";
    if (typeof navigator !== "undefined" && navigator.share) {
      navigator.share({ title, url }).catch(() => undefined);
    } else if (typeof navigator !== "undefined" && navigator.clipboard) {
      navigator.clipboard.writeText(url).then(() => {
        toast.success("Lien copié dans le presse-papier.");
      });
    }
  }

  return (
    <div className="flex flex-col bg-night text-cream">
      <div className="relative bg-black aspect-video w-full">
        <video
          ref={videoRef}
          src={vodUrl}
          poster={thumbnailUrl ?? undefined}
          controls
          playsInline
          preload="metadata"
          className="w-full h-full object-contain bg-black"
        />
      </div>

      <div className="px-4 sm:px-6 py-4">
        <h2 className="text-[16px] font-bold text-cream">{title}</h2>
        <div className="mt-2 flex items-center gap-4 text-[11px] text-cream/60">
          <span className="inline-flex items-center gap-1">
            <Eye className="w-3.5 h-3.5" aria-hidden />
            <span className="tabular-nums">
              {viewCount.toLocaleString("fr-FR")}
            </span>{" "}
            vue{viewCount > 1 ? "s" : ""}
          </span>
          <span className="inline-flex items-center gap-1">
            <Clock3 className="w-3.5 h-3.5" aria-hidden />
            {formatDuration(durationSeconds)}
          </span>
          <button
            type="button"
            onClick={handleShare}
            className="ml-auto inline-flex items-center gap-1.5 h-8 px-3 rounded-full bg-cream/10 text-cream hover:bg-cream/20 text-[11px] font-bold transition-colors"
          >
            <Share2 className="w-3.5 h-3.5" aria-hidden />
            Partager
          </button>
        </div>

        {description ? (
          <p className="mt-3 text-[12.5px] text-cream/80 leading-relaxed whitespace-pre-wrap">
            {description}
          </p>
        ) : null}

        <p className="mt-4 text-[10px] text-cream/40 italic">
          Replay enregistré automatiquement à la fin du live.
        </p>
      </div>
    </div>
  );
}
