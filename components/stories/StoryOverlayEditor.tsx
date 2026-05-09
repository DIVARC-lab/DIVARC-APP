"use client";

import { Smile, Type, X } from "lucide-react";
import { useRef, useState } from "react";
import { cn } from "@/lib/utils/cn";
import type {
  StoryCaptionPosition,
  StorySticker,
} from "@/lib/database.types";

const STICKER_PALETTE = [
  "✨", "💫", "🌟", "⭐", "🔥", "💛", "🤍", "👀",
  "🎉", "🎊", "💎", "🌹", "🌻", "🍷", "☕", "🥐",
] as const;

const DEFAULT_CAPTION_POSITION: StoryCaptionPosition = {
  x: 0.5,
  y: 0.85,
  scale: 1,
};

type StoryOverlayEditorProps = {
  /** URL absolue de la photo (image fond non-mutable). */
  photoUrl: string;
  /** Filtre CSS appliqué sur l'image de fond, pas sur les overlays. */
  imageFilter?: string;
  /** Caption tapé dans le champ standard, rendu en overlay si position définie. */
  caption: string;
  /** Position du caption (NULL = bas standard). */
  captionPosition: StoryCaptionPosition | null;
  /** Stickers actuellement posés. */
  stickers: StorySticker[];
  onChangeCaptionPosition: (next: StoryCaptionPosition | null) => void;
  onChangeStickers: (next: StorySticker[]) => void;
  /** Bouton X de suppression photo (rendu par le parent). */
  onRemovePhoto: () => void;
};

/* Editor d'overlays pour stories photo : caption draggable + emoji stickers
 * draggables. Positions stockées en fraction (0..1) du conteneur pour rester
 * résolution-indépendant à l'affichage côté StoryViewer. */
export function StoryOverlayEditor({
  photoUrl,
  imageFilter,
  caption,
  captionPosition,
  stickers,
  onChangeCaptionPosition,
  onChangeStickers,
  onRemovePhoto,
}: StoryOverlayEditorProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [activeStickers, setActiveStickers] = useState(false);

  /* Drag handler générique : mouse + touch. Met à jour x/y en fraction. */
  function startDrag(
    event: React.PointerEvent,
    onMove: (x: number, y: number) => void,
  ) {
    event.preventDefault();
    event.stopPropagation();
    const container = containerRef.current;
    if (!container) return;
    const rect = container.getBoundingClientRect();

    function handleMove(e: PointerEvent) {
      const x = Math.max(0.05, Math.min(0.95, (e.clientX - rect.left) / rect.width));
      const y = Math.max(0.05, Math.min(0.95, (e.clientY - rect.top) / rect.height));
      onMove(x, y);
    }
    function handleUp() {
      window.removeEventListener("pointermove", handleMove);
      window.removeEventListener("pointerup", handleUp);
    }
    window.addEventListener("pointermove", handleMove);
    window.addEventListener("pointerup", handleUp);
  }

  function addSticker(emoji: string) {
    onChangeStickers([
      ...stickers,
      { emoji, x: 0.5, y: 0.5, scale: 1, rotation: 0 },
    ]);
    setActiveStickers(false);
  }

  function moveSticker(index: number, x: number, y: number) {
    const next = stickers.slice();
    const sticker = next[index];
    if (!sticker) return;
    next[index] = { ...sticker, x, y };
    onChangeStickers(next);
  }

  function removeSticker(index: number) {
    onChangeStickers(stickers.filter((_, i) => i !== index));
  }

  function moveCaption(x: number, y: number) {
    const current = captionPosition ?? DEFAULT_CAPTION_POSITION;
    onChangeCaptionPosition({ ...current, x, y });
  }

  function toggleCaptionOverlay() {
    if (captionPosition) {
      onChangeCaptionPosition(null);
    } else {
      onChangeCaptionPosition(DEFAULT_CAPTION_POSITION);
    }
  }

  const captionEffective = captionPosition ?? null;

  return (
    <div className="w-full max-w-sm mx-auto">
      <div
        ref={containerRef}
        className="relative aspect-[4/5] sm:aspect-square w-full rounded-3xl overflow-hidden bg-night/5 border border-line touch-none select-none"
      >
        {/* Image de fond — filter appliqué seulement ici */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={photoUrl}
          alt=""
          className="absolute inset-0 w-full h-full object-cover"
          style={{ filter: imageFilter || undefined }}
          draggable={false}
        />

        {/* Caption overlay (draggable si position définie) */}
        {captionEffective && caption.trim() ? (
          <div
            role="button"
            tabIndex={0}
            onPointerDown={(e) =>
              startDrag(e, (x, y) => moveCaption(x, y))
            }
            className="absolute -translate-x-1/2 -translate-y-1/2 px-4 py-2 cursor-grab active:cursor-grabbing"
            style={{
              left: `${captionEffective.x * 100}%`,
              top: `${captionEffective.y * 100}%`,
            }}
          >
            <p
              className="font-display italic text-cream text-2xl leading-tight text-center max-w-[260px] break-words"
              style={{
                textShadow:
                  "0 2px 12px rgba(10,31,68,0.85), 0 0 4px rgba(10,31,68,0.6)",
              }}
            >
              {caption}
            </p>
          </div>
        ) : null}

        {/* Stickers — chacun draggable */}
        {stickers.map((sticker, index) => (
          <div
            key={index}
            className="absolute -translate-x-1/2 -translate-y-1/2 cursor-grab active:cursor-grabbing"
            style={{
              left: `${sticker.x * 100}%`,
              top: `${sticker.y * 100}%`,
              transform: `translate(-50%, -50%) scale(${sticker.scale}) rotate(${sticker.rotation}deg)`,
              fontSize: "48px",
              filter: "drop-shadow(0 4px 12px rgba(10,31,68,0.4))",
            }}
            onPointerDown={(e) =>
              startDrag(e, (x, y) => moveSticker(index, x, y))
            }
          >
            <span aria-hidden>{sticker.emoji}</span>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                removeSticker(index);
              }}
              aria-label={`Retirer sticker ${sticker.emoji}`}
              className="absolute -top-2 -right-2 w-5 h-5 rounded-full bg-red-500 text-white text-[10px] font-bold flex items-center justify-center"
              style={{ fontSize: "12px" }}
            >
              <X className="w-3 h-3" aria-hidden />
            </button>
          </div>
        ))}

        {/* Bouton X retirer photo */}
        <button
          type="button"
          onClick={onRemovePhoto}
          aria-label="Retirer la photo"
          className="absolute top-3 right-3 w-11 h-11 rounded-full bg-white/95 text-red-500 flex items-center justify-center shadow-soft"
        >
          <X className="w-4 h-4" aria-hidden />
        </button>
      </div>

      {/* Toolbar overlay : toggle caption overlay + stickers */}
      <div className="mt-3 flex items-center justify-center gap-2">
        <button
          type="button"
          onClick={toggleCaptionOverlay}
          aria-pressed={captionPosition !== null}
          disabled={!caption.trim()}
          className={cn(
            "inline-flex items-center gap-1.5 h-11 px-4 rounded-full text-xs font-bold transition-colors",
            captionPosition
              ? "bg-night text-cream"
              : "bg-white border border-line text-night-muted hover:border-night/30",
            !caption.trim() && "opacity-50 cursor-not-allowed",
          )}
        >
          <Type className="w-3.5 h-3.5" aria-hidden />
          {captionPosition ? "Caption sur photo" : "Caption en bas"}
        </button>
        <button
          type="button"
          onClick={() => setActiveStickers((v) => !v)}
          aria-pressed={activeStickers}
          aria-label="Ajouter un sticker emoji"
          className={cn(
            "inline-flex items-center gap-1.5 h-11 px-4 rounded-full text-xs font-bold transition-colors",
            activeStickers
              ? "bg-night text-cream"
              : "bg-white border border-line text-night-muted hover:border-night/30",
          )}
        >
          <Smile className="w-3.5 h-3.5" aria-hidden />
          Sticker
        </button>
      </div>

      {activeStickers ? (
        <div className="mt-3 grid grid-cols-8 gap-2 p-3 rounded-2xl bg-white border border-line">
          {STICKER_PALETTE.map((emoji) => (
            <button
              key={emoji}
              type="button"
              onClick={() => addSticker(emoji)}
              aria-label={`Ajouter ${emoji}`}
              className="w-11 h-11 rounded-xl text-2xl hover:bg-night/5 transition-colors flex items-center justify-center"
            >
              {emoji}
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}
