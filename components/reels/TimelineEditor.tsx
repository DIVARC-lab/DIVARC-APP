"use client";

import { Loader2, Scissors, X } from "lucide-react";
import { useRef, useState } from "react";
import { toast } from "sonner";
import { cn } from "@/lib/utils/cn";
import { trimClip } from "@/lib/reels/ffmpegTrim";

/* TimelineEditor — V3.11 plugin pour trim/split d'une vidéo source.
 *
 * Workflow :
 *   1. Affiche la vidéo + une timeline avec 2 handles (start + end) pour
 *      cropper l'intervalle qu'on garde.
 *   2. Boutons "Couper ici" ajoutent des marqueurs intermédiaires
 *      (informatifs, V3.11 limité au trim simple — split V3.12 si demande).
 *   3. Apply → ffmpeg trimClip(blob, start, end) → File mp4 retourné via
 *      onApply.
 *
 * Limitations V3.11 :
 *   - Trim only (cut start + end). Split full UI = V4.
 *   - Single segment output (pas de réordonnancement multi-segments).
 *   - Pas de preview du résultat — on commit + le composer affiche après.
 */

type Props = {
  videoUrl: string;
  videoBlob: Blob | null;
  durationSeconds: number;
  onApply: (trimmed: Blob, newDuration: number) => void;
  onClose: () => void;
};

export function TimelineEditor({
  videoUrl,
  videoBlob,
  durationSeconds,
  onApply,
  onClose,
}: Props) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [startSec, setStartSec] = useState(0);
  const [endSec, setEndSec] = useState(durationSeconds);
  const [currentTime, setCurrentTime] = useState(0);
  const [processing, setProcessing] = useState(false);
  const [progress, setProgress] = useState(0);

  const newDuration = endSec - startSec;

  function seekTo(t: number) {
    if (videoRef.current) {
      videoRef.current.currentTime = t;
    }
  }

  async function handleApply() {
    if (!videoBlob) {
      toast.error("Source vidéo manquante.");
      return;
    }
    if (newDuration < 1) {
      toast.error("Sélection trop courte (min 1s).");
      return;
    }
    setProcessing(true);
    setProgress(0);
    try {
      const trimmed = await trimClip(videoBlob, startSec, endSec, (p) =>
        setProgress(p),
      );
      onApply(trimmed, newDuration);
      onClose();
    } catch (err) {
      console.error("[timeline:trim]", err);
      toast.error("Trim échoué. Réessaie.");
    } finally {
      setProcessing(false);
      setProgress(0);
    }
  }

  /* Calcul des positions % pour les handles de la timeline. */
  const startPct = (startSec / durationSeconds) * 100;
  const endPct = (endSec / durationSeconds) * 100;
  const playheadPct = (currentTime / durationSeconds) * 100;

  return (
    <div className="fixed inset-0 z-50 bg-black flex flex-col">
      <header className="flex items-center justify-between px-4 py-3 border-b border-white/10">
        <div>
          <h2 className="text-white text-base font-bold">Timeline</h2>
          <p className="text-white/60 text-[11px] mt-0.5">
            Trim : {newDuration.toFixed(1)}s / {durationSeconds.toFixed(1)}s
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onClose}
            aria-label="Fermer"
            className="w-9 h-9 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center"
          >
            <X className="w-4 h-4" aria-hidden />
          </button>
          <button
            type="button"
            onClick={handleApply}
            disabled={processing || newDuration < 1}
            className="px-4 py-2 rounded-full bg-gold-deep text-white text-[13px] font-semibold hover:bg-gold disabled:opacity-50 transition-colors"
          >
            {processing ? "Trim…" : "Appliquer"}
          </button>
        </div>
      </header>

      {/* Preview vidéo. */}
      <div className="flex-1 flex items-center justify-center bg-black p-4 min-h-0">
        <div className="relative aspect-[9/16] h-full max-h-full max-w-full">
          <video
            ref={videoRef}
            src={videoUrl}
            controls
            playsInline
            onTimeUpdate={(e) =>
              setCurrentTime((e.target as HTMLVideoElement).currentTime)
            }
            className="absolute inset-0 w-full h-full object-contain"
          />
          {processing ? (
            <div className="absolute inset-0 bg-black/80 flex flex-col items-center justify-center gap-3 px-6 text-center">
              <Loader2 className="w-8 h-8 animate-spin text-cream" aria-hidden />
              <p className="text-cream font-display italic text-[18px]">
                Trim en cours…
              </p>
              <div className="w-64 h-1.5 rounded-full bg-cream/15 overflow-hidden">
                <div
                  className="h-full bg-gold transition-all"
                  style={{ width: `${Math.round(progress * 100)}%` }}
                />
              </div>
            </div>
          ) : null}
        </div>
      </div>

      {/* Timeline interactive */}
      <div className="bg-night px-4 py-5 border-t border-white/10 space-y-3">
        <div className="relative h-12 rounded-xl bg-cream/5 border border-cream/10 overflow-hidden">
          {/* Zone gardée (entre les handles) */}
          <div
            className="absolute top-0 bottom-0 bg-gold/25 border-x-2 border-gold-deep"
            style={{ left: `${startPct}%`, right: `${100 - endPct}%` }}
          />
          {/* Playhead */}
          <div
            className="absolute top-0 bottom-0 w-px bg-rose-500 pointer-events-none"
            style={{ left: `${playheadPct}%` }}
          />
        </div>

        {/* Sliders start / end */}
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-[12px] text-cream">
            <span className="text-cream/60 w-12">Début</span>
            <input
              type="range"
              min={0}
              max={durationSeconds}
              step={0.1}
              value={startSec}
              onChange={(e) => {
                const v = Math.min(Number(e.target.value), endSec - 0.5);
                setStartSec(v);
                seekTo(v);
              }}
              className="flex-1 accent-gold-deep"
            />
            <span className="tabular-nums w-14 text-right">
              {startSec.toFixed(1)}s
            </span>
          </div>
          <div className="flex items-center gap-2 text-[12px] text-cream">
            <span className="text-cream/60 w-12">Fin</span>
            <input
              type="range"
              min={startSec + 0.5}
              max={durationSeconds}
              step={0.1}
              value={endSec}
              onChange={(e) => {
                const v = Number(e.target.value);
                setEndSec(v);
                seekTo(v);
              }}
              className="flex-1 accent-gold-deep"
            />
            <span className="tabular-nums w-14 text-right">
              {endSec.toFixed(1)}s
            </span>
          </div>
        </div>

        <div className="flex items-center justify-center gap-2 text-[11px] text-cream/50">
          <Scissors className="w-3 h-3" aria-hidden />
          Sélection : {newDuration.toFixed(1)}s · re-encode ffmpeg.wasm
        </div>
      </div>
    </div>
  );
}
