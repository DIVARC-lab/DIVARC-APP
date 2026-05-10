"use client";

import { Sparkles, X } from "lucide-react";
import { useRef, useState } from "react";
import { cn } from "@/lib/utils/cn";
import { getEffect, REEL_EFFECTS } from "@/lib/reels/effects";

/* EffectsPicker — V3.12 picker d'effets vidéo (CSS filters).
 *
 * Modal fullscreen avec preview vidéo (filter appliqué) + grille d'effets.
 * À l'apply, retourne l'array effects_used (1 effet en V3.12, multi-stack
 * possible V4).
 *
 * V4 ext : effets AR mediapipe (face_mesh, glasses, masks). Le wiring
 * effect_used array est déjà prêt. */

type Props = {
  videoUrl: string;
  initial: string[];
  onApply: (effects: string[]) => void;
  onClose: () => void;
};

export function EffectsPicker({
  videoUrl,
  initial,
  onApply,
  onClose,
}: Props) {
  const videoRef = useRef<HTMLVideoElement>(null);
  /* V3.12 : 1 seul effet sélectionnable. On stocke array pour compat
     futur multi-stack. */
  const [selectedId, setSelectedId] = useState<string>(
    initial[0] ?? "none",
  );

  const current = getEffect(selectedId);

  function handleApply() {
    onApply(selectedId === "none" ? [] : [selectedId]);
    onClose();
  }

  return (
    <div className="fixed inset-0 z-50 bg-black flex flex-col">
      <header className="flex items-center justify-between px-4 py-3 border-b border-white/10">
        <div>
          <h2 className="text-white text-base font-bold flex items-center gap-1.5">
            <Sparkles className="w-4 h-4 text-gold" aria-hidden />
            Effets
          </h2>
          <p className="text-white/60 text-[11px] mt-0.5">
            {current.label} · CSS filter
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
            className="px-4 py-2 rounded-full bg-gold-deep text-white text-[13px] font-semibold hover:bg-gold transition-colors"
          >
            Appliquer
          </button>
        </div>
      </header>

      <div className="flex-1 flex flex-col lg:flex-row overflow-hidden">
        <div className="flex-1 flex items-center justify-center bg-black p-4 min-h-0">
          <div className="relative aspect-[9/16] h-full max-h-full max-w-full">
            <video
              ref={videoRef}
              src={videoUrl}
              controls
              playsInline
              autoPlay
              loop
              muted
              style={{ filter: current.cssFilter }}
              className="absolute inset-0 w-full h-full object-contain"
            />
          </div>
        </div>

        <div className="lg:w-[360px] bg-white flex flex-col overflow-y-auto">
          <div className="px-4 py-4">
            <p className="text-[11px] font-bold uppercase tracking-wider text-night-muted mb-3">
              Choisis ton effet
            </p>
            <div className="grid grid-cols-3 gap-3">
              {REEL_EFFECTS.map((effect) => (
                <button
                  key={effect.id}
                  type="button"
                  onClick={() => setSelectedId(effect.id)}
                  className={cn(
                    "flex flex-col items-center gap-2 p-3 rounded-xl border-2 transition-colors",
                    selectedId === effect.id
                      ? "border-gold-deep bg-gold/10"
                      : "border-line hover:border-night/30",
                  )}
                >
                  <span
                    aria-hidden
                    className={cn(
                      "w-12 h-12 rounded-full shadow-soft",
                      effect.swatchClass,
                    )}
                  />
                  <span className="text-[11px] font-semibold text-night text-center">
                    {effect.label}
                  </span>
                </button>
              ))}
            </div>
            <p className="mt-4 text-[11px] text-night-dim">
              Effets AR (face mesh, masks) arrivent en V4. Pour l&apos;instant
              ce sont des filtres CSS appliqués au playback — aucune
              dégradation perf.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
