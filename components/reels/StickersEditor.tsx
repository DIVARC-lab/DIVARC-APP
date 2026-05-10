"use client";

import { RotateCcw, Smile, Trash2, X } from "lucide-react";
import { useRef, useState } from "react";
import { cn } from "@/lib/utils/cn";
import {
  DEFAULT_STICKER,
  MAX_SCALE,
  MAX_STICKERS,
  MIN_SCALE,
  STICKER_BASE_SIZE_PX,
  STICKER_EMOJI_PRESETS,
  type Sticker,
} from "@/lib/reels/stickers";

/* StickersEditor — V3.9 plugin pour le ReelCreator.
 *
 * Layout : preview vidéo + panel droit (picker + timeline + transformations).
 *
 * Gestes touch/pointer :
 *   - 1 doigt drag → translate (x_pct, y_pct)
 *   - 2 doigts pinch → scale
 *   - 2 doigts rotate → rotation_deg
 *
 * V3.9 limitation : pas de upload custom stickers (V4). Picker = emoji
 * preset uniquement. Image stickers existent dans le schema pour V4. */

type Props = {
  videoUrl: string;
  durationSeconds: number;
  initial: Sticker[];
  onApply: (stickers: Sticker[]) => void;
  onClose: () => void;
};

export function StickersEditor({
  videoUrl,
  durationSeconds,
  initial,
  onApply,
  onClose,
}: Props) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const previewRef = useRef<HTMLDivElement>(null);
  const [stickers, setStickers] = useState<Sticker[]>(initial);
  const [selectedId, setSelectedId] = useState<string | null>(
    initial[0]?.id ?? null,
  );
  const [currentTime, setCurrentTime] = useState(0);

  const selected = stickers.find((s) => s.id === selectedId) ?? null;
  const activeStickers = stickers.filter(
    (s) => currentTime >= s.start_s && currentTime <= s.end_s,
  );

  function addEmoji(emoji: string) {
    if (stickers.length >= MAX_STICKERS) return;
    const startTime = videoRef.current?.currentTime ?? 0;
    const endTime = Math.min(startTime + 3, durationSeconds);
    const newSticker: Sticker = {
      id: crypto.randomUUID(),
      ...DEFAULT_STICKER,
      content: emoji,
      start_s: startTime,
      end_s: endTime,
    };
    setStickers((prev) => [...prev, newSticker]);
    setSelectedId(newSticker.id);
  }

  function updateSticker(id: string, patch: Partial<Sticker>) {
    setStickers((prev) =>
      prev.map((s) => (s.id === id ? { ...s, ...patch } : s)),
    );
  }

  function deleteSticker(id: string) {
    setStickers((prev) => prev.filter((s) => s.id !== id));
    if (selectedId === id) setSelectedId(null);
  }

  function handleApply() {
    onApply(stickers);
    onClose();
  }

  return (
    <div className="fixed inset-0 z-50 bg-black flex flex-col">
      <header className="flex items-center justify-between px-4 py-3 border-b border-white/10">
        <div>
          <h2 className="text-white text-base font-bold">Stickers</h2>
          <p className="text-white/60 text-[11px] mt-0.5">
            {stickers.length}/{MAX_STICKERS} · drag + pinch
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
        {/* Preview vidéo + stickers actifs avec gestures. */}
        <div className="relative bg-black flex-1 flex items-center justify-center min-h-0">
          <div
            ref={previewRef}
            className="relative aspect-[9/16] h-full max-h-full max-w-full"
          >
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
            {activeStickers.map((s) => (
              <StickerNode
                key={s.id}
                sticker={s}
                isSelected={s.id === selectedId}
                containerRef={previewRef}
                onSelect={() => setSelectedId(s.id)}
                onUpdate={(patch) => updateSticker(s.id, patch)}
              />
            ))}
          </div>
        </div>

        {/* Panel droit. */}
        <div className="lg:w-[380px] bg-white flex flex-col overflow-y-auto">
          {/* Liste stickers + bouton ajouter */}
          <div className="border-b border-line p-3 flex gap-2 overflow-x-auto">
            {stickers.map((s, idx) => (
              <button
                key={s.id}
                type="button"
                onClick={() => setSelectedId(s.id)}
                className={cn(
                  "shrink-0 w-10 h-10 rounded-full border-2 flex items-center justify-center text-[18px] transition-colors",
                  s.id === selectedId
                    ? "border-gold-deep bg-gold/10"
                    : "border-line bg-white hover:border-night/30",
                )}
              >
                <span aria-label={`Sticker ${idx + 1}`}>
                  {s.kind === "emoji" ? s.content : "🖼"}
                </span>
              </button>
            ))}
          </div>

          {/* Picker emoji */}
          <div className="border-b border-line px-4 py-3">
            <p className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-night-muted mb-2">
              <Smile className="w-3.5 h-3.5" aria-hidden />
              Ajouter un emoji
            </p>
            <div className="grid grid-cols-8 gap-1.5">
              {STICKER_EMOJI_PRESETS.map((emoji) => (
                <button
                  key={emoji}
                  type="button"
                  onClick={() => addEmoji(emoji)}
                  disabled={stickers.length >= MAX_STICKERS}
                  className="w-9 h-9 rounded-lg bg-bg-soft hover:bg-night/5 disabled:opacity-30 flex items-center justify-center text-[18px]"
                >
                  {emoji}
                </button>
              ))}
            </div>
          </div>

          {/* Édition du sticker sélectionné */}
          {selected ? (
            <SelectedStickerEditor
              sticker={selected}
              durationSeconds={durationSeconds}
              onUpdate={(patch) => updateSticker(selected.id, patch)}
              onDelete={() => deleteSticker(selected.id)}
            />
          ) : (
            <div className="px-6 py-8 text-center text-night-muted text-[13px]">
              Pick un emoji ou tape un sticker existant pour l&apos;éditer.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

/* Node draggable/resizable/rotatable d'un sticker. Pointer events
 * unifient touch + mouse. Pinch via 2 pointers (gérés via map des
 * pointers actifs). */
function StickerNode({
  sticker,
  isSelected,
  containerRef,
  onSelect,
  onUpdate,
}: {
  sticker: Sticker;
  isSelected: boolean;
  containerRef: React.RefObject<HTMLDivElement | null>;
  onSelect: () => void;
  onUpdate: (patch: Partial<Sticker>) => void;
}) {
  const pointers = useRef<Map<number, { x: number; y: number }>>(new Map());
  const initialState = useRef<{
    x_pct: number;
    y_pct: number;
    scale: number;
    rotation_deg: number;
    pinchDist: number;
    pinchAngle: number;
  } | null>(null);

  function handlePointerDown(e: React.PointerEvent) {
    e.stopPropagation();
    onSelect();
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
    pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });

    if (pointers.current.size === 1) {
      initialState.current = {
        x_pct: sticker.x_pct,
        y_pct: sticker.y_pct,
        scale: sticker.scale,
        rotation_deg: sticker.rotation_deg,
        pinchDist: 0,
        pinchAngle: 0,
      };
    } else if (pointers.current.size === 2) {
      const [p1, p2] = Array.from(pointers.current.values());
      if (p1 && p2) {
        const dx = p2.x - p1.x;
        const dy = p2.y - p1.y;
        initialState.current = {
          x_pct: sticker.x_pct,
          y_pct: sticker.y_pct,
          scale: sticker.scale,
          rotation_deg: sticker.rotation_deg,
          pinchDist: Math.hypot(dx, dy),
          pinchAngle: (Math.atan2(dy, dx) * 180) / Math.PI,
        };
      }
    }
  }

  function handlePointerMove(e: React.PointerEvent) {
    if (!pointers.current.has(e.pointerId)) return;
    pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    const container = containerRef.current?.getBoundingClientRect();
    if (!container || !initialState.current) return;

    if (pointers.current.size === 1) {
      /* Drag — translate */
      const arr = Array.from(pointers.current.values());
      const p = arr[0];
      if (!p) return;
      const initial = Array.from(pointers.current.keys())[0];
      if (initial === undefined) return;
      const dx = ((p.x - container.left) / container.width) * 100;
      const dy = ((p.y - container.top) / container.height) * 100;
      onUpdate({
        x_pct: Math.max(0, Math.min(100, dx)),
        y_pct: Math.max(0, Math.min(100, dy)),
      });
    } else if (pointers.current.size === 2) {
      /* Pinch — scale + rotation */
      const [p1, p2] = Array.from(pointers.current.values());
      if (!p1 || !p2) return;
      const dx = p2.x - p1.x;
      const dy = p2.y - p1.y;
      const dist = Math.hypot(dx, dy);
      const angle = (Math.atan2(dy, dx) * 180) / Math.PI;
      const init = initialState.current;
      const newScale = Math.max(
        MIN_SCALE,
        Math.min(MAX_SCALE, init.scale * (dist / init.pinchDist || 1)),
      );
      const angleDiff = angle - init.pinchAngle;
      let newRot = init.rotation_deg + angleDiff;
      while (newRot > 180) newRot -= 360;
      while (newRot < -180) newRot += 360;
      onUpdate({ scale: newScale, rotation_deg: newRot });
    }
  }

  function handlePointerUp(e: React.PointerEvent) {
    pointers.current.delete(e.pointerId);
    if (pointers.current.size === 0) initialState.current = null;
  }

  const size = STICKER_BASE_SIZE_PX * sticker.scale;
  return (
    <div
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerUp}
      style={{
        position: "absolute",
        left: `${sticker.x_pct}%`,
        top: `${sticker.y_pct}%`,
        width: size,
        height: size,
        transform: `translate(-50%, -50%) rotate(${sticker.rotation_deg}deg)`,
        touchAction: "none",
        userSelect: "none",
        cursor: "move",
      }}
      className={cn(
        "flex items-center justify-center",
        isSelected && "ring-2 ring-gold-deep ring-offset-2 ring-offset-black rounded",
      )}
    >
      {sticker.kind === "emoji" ? (
        <span
          aria-hidden
          style={{ fontSize: size * 0.85, lineHeight: 1 }}
        >
          {sticker.content}
        </span>
      ) : (
        /* eslint-disable-next-line @next/next/no-img-element */
        <img
          src={sticker.content}
          alt=""
          draggable={false}
          style={{ width: "100%", height: "100%", objectFit: "contain" }}
        />
      )}
    </div>
  );
}

function SelectedStickerEditor({
  sticker,
  durationSeconds,
  onUpdate,
  onDelete,
}: {
  sticker: Sticker;
  durationSeconds: number;
  onUpdate: (patch: Partial<Sticker>) => void;
  onDelete: () => void;
}) {
  return (
    <div className="flex-1 px-5 py-4 space-y-4">
      <div className="rounded-xl border border-line bg-bg-soft p-3 text-center">
        <div className="text-[40px] leading-none">
          {sticker.kind === "emoji" ? sticker.content : "🖼"}
        </div>
        <p className="mt-2 text-[11px] text-night-muted">
          Drag = déplacer · Pinch = scale + rotation
        </p>
      </div>

      {/* Timing */}
      <div className="space-y-2">
        <Label>Apparition</Label>
        <div className="flex items-center gap-2 text-[12px]">
          <span className="text-night-muted w-8">Début</span>
          <input
            type="range"
            min={0}
            max={durationSeconds}
            step={0.1}
            value={sticker.start_s}
            onChange={(e) =>
              onUpdate({
                start_s: Math.min(Number(e.target.value), sticker.end_s - 0.1),
              })
            }
            className="flex-1 accent-gold-deep"
          />
          <span className="tabular-nums text-night w-12 text-right">
            {sticker.start_s.toFixed(1)}s
          </span>
        </div>
        <div className="flex items-center gap-2 text-[12px]">
          <span className="text-night-muted w-8">Fin</span>
          <input
            type="range"
            min={sticker.start_s + 0.1}
            max={durationSeconds}
            step={0.1}
            value={sticker.end_s}
            onChange={(e) => onUpdate({ end_s: Number(e.target.value) })}
            className="flex-1 accent-gold-deep"
          />
          <span className="tabular-nums text-night w-12 text-right">
            {sticker.end_s.toFixed(1)}s
          </span>
        </div>
      </div>

      {/* Scale + Rotation manuels (fallback si pinch indispo) */}
      <div className="space-y-2">
        <Label>Échelle</Label>
        <div className="flex items-center gap-2 text-[12px]">
          <input
            type="range"
            min={MIN_SCALE}
            max={MAX_SCALE}
            step={0.05}
            value={sticker.scale}
            onChange={(e) => onUpdate({ scale: Number(e.target.value) })}
            className="flex-1 accent-gold-deep"
          />
          <span className="tabular-nums text-night w-12 text-right">
            {sticker.scale.toFixed(2)}x
          </span>
        </div>
      </div>

      <div className="space-y-2">
        <Label>Rotation</Label>
        <div className="flex items-center gap-2 text-[12px]">
          <input
            type="range"
            min={-180}
            max={180}
            step={1}
            value={sticker.rotation_deg}
            onChange={(e) =>
              onUpdate({ rotation_deg: Number(e.target.value) })
            }
            className="flex-1 accent-gold-deep"
          />
          <span className="tabular-nums text-night w-12 text-right">
            {Math.round(sticker.rotation_deg)}°
          </span>
          <button
            type="button"
            onClick={() => onUpdate({ rotation_deg: 0 })}
            aria-label="Reset rotation"
            className="w-7 h-7 rounded-full border border-line text-night-muted hover:bg-bg-soft flex items-center justify-center"
          >
            <RotateCcw className="w-3 h-3" aria-hidden />
          </button>
        </div>
      </div>

      <button
        type="button"
        onClick={onDelete}
        className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl border border-red-200 bg-red-50 text-red-600 text-[13px] font-semibold hover:bg-red-100 transition-colors"
      >
        <Trash2 className="w-3.5 h-3.5" aria-hidden />
        Supprimer ce sticker
      </button>
    </div>
  );
}

function Label({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-[11px] font-bold uppercase tracking-wider text-night-muted">
      {children}
    </p>
  );
}
