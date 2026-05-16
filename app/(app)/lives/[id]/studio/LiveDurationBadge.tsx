"use client";

/* Étape 25 — Badge durée live + indicateur REC dans le studio.
 *
 * Compte le temps écoulé depuis startedAt. Affiché en overlay
 * top-center pour que le host garde un œil sur la durée et confirme
 * que l'enregistrement est actif. */

import { CircleDot } from "lucide-react";
import { useEffect, useState } from "react";

type Props = {
  startedAt: string | null;
  isRecording: boolean;
};

function formatElapsed(ms: number): string {
  const totalSeconds = Math.floor(ms / 1000);
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  const s = totalSeconds % 60;
  const pad = (n: number) => n.toString().padStart(2, "0");
  return h > 0 ? `${pad(h)}:${pad(m)}:${pad(s)}` : `${pad(m)}:${pad(s)}`;
}

export function LiveDurationBadge({ startedAt, isRecording }: Props) {
  const [now, setNow] = useState<number>(() => Date.now());

  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(id);
  }, []);

  if (!startedAt) return null;
  const elapsed = Math.max(0, now - new Date(startedAt).getTime());

  return (
    <div
      className="inline-flex items-center gap-2 h-8 px-3 rounded-full bg-night/85 backdrop-blur border border-cream/15 shadow"
      aria-live="polite"
    >
      <span className="inline-flex items-center gap-1 text-rose-300">
        <CircleDot className="w-3 h-3 animate-pulse" aria-hidden />
        <span className="text-[10px] font-extrabold uppercase tracking-wider">
          Live
        </span>
      </span>
      <span
        className="text-[11px] font-bold text-cream tabular-nums"
        aria-label="Durée du live"
      >
        {formatElapsed(elapsed)}
      </span>
      {isRecording ? (
        <span
          className="inline-flex items-center gap-1 px-1.5 h-5 rounded-full bg-rose-600 text-white text-[9px] font-extrabold uppercase tracking-wider"
          aria-label="Enregistrement actif"
        >
          <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
          Rec
        </span>
      ) : null}
    </div>
  );
}
