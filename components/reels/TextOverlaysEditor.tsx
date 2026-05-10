"use client";

import { Plus, Trash2 } from "lucide-react";
import { useRef, useState } from "react";
import { cn } from "@/lib/utils/cn";
import {
  DEFAULT_OVERLAY,
  MAX_OVERLAYS,
  MAX_TEXT_LENGTH,
  OVERLAY_COLORS,
  OVERLAY_SIZES,
  type TextOverlay,
} from "@/lib/reels/textOverlays";

/* TextOverlaysEditor — plugin V3.6 pour le ReelCreator.
 *
 * Affiche la vidéo source en preview + un panel d'édition à droite/bas
 * avec les overlays (liste + édition de l'overlay sélectionné).
 *
 * UX :
 *   - Click "Ajouter un texte" → nouvel overlay au centre (50,50) avec
 *     intervalle [currentTime, currentTime+3s]
 *   - Click sur un overlay → sélection + édition
 *   - Range sliders pour start/end + sliders x/y % du frame
 *   - Color swatches preset + 4 tailles preset
 *
 * Render preview : on synchronise les overlays actifs avec timeUpdate
 * sur la <video>. Drag sur la preview = pas implémenté V3.6 (UX numérique
 * via sliders, drag-resize-rotate = V4). */

type Props = {
  videoUrl: string;
  durationSeconds: number;
  initial: TextOverlay[];
  onApply: (overlays: TextOverlay[]) => void;
  onClose: () => void;
};

export function TextOverlaysEditor({
  videoUrl,
  durationSeconds,
  initial,
  onApply,
  onClose,
}: Props) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [overlays, setOverlays] = useState<TextOverlay[]>(initial);
  const [selectedId, setSelectedId] = useState<string | null>(
    initial[0]?.id ?? null,
  );
  const [currentTime, setCurrentTime] = useState(0);

  const selected = overlays.find((o) => o.id === selectedId) ?? null;

  function addOverlay() {
    if (overlays.length >= MAX_OVERLAYS) return;
    const startTime = videoRef.current?.currentTime ?? 0;
    const endTime = Math.min(startTime + 3, durationSeconds);
    const newOverlay: TextOverlay = {
      id: crypto.randomUUID(),
      ...DEFAULT_OVERLAY,
      start_s: startTime,
      end_s: endTime,
    };
    setOverlays((prev) => [...prev, newOverlay]);
    setSelectedId(newOverlay.id);
  }

  function updateOverlay(id: string, patch: Partial<TextOverlay>) {
    setOverlays((prev) =>
      prev.map((o) => (o.id === id ? { ...o, ...patch } : o)),
    );
  }

  function deleteOverlay(id: string) {
    setOverlays((prev) => prev.filter((o) => o.id !== id));
    if (selectedId === id) setSelectedId(null);
  }

  function handleApply() {
    /* Strip empty texts. */
    const cleaned = overlays.filter((o) => o.text.trim().length > 0);
    onApply(cleaned);
    onClose();
  }

  /* Overlays actifs au currentTime — affichés en preview. */
  const activeOverlays = overlays.filter(
    (o) => currentTime >= o.start_s && currentTime <= o.end_s,
  );

  return (
    <div className="fixed inset-0 z-50 bg-black flex flex-col">
      {/* Header */}
      <header className="flex items-center justify-between px-4 py-3 border-b border-white/10">
        <div>
          <h2 className="text-white text-base font-bold">Textes</h2>
          <p className="text-white/60 text-[11px] mt-0.5">
            {overlays.length}/{MAX_OVERLAYS} · positions et timing
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onClose}
            className="text-white/80 hover:text-white text-[13px] font-semibold"
          >
            Annuler
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
        {/* Preview vidéo avec overlays */}
        <div className="relative bg-black flex-1 flex items-center justify-center min-h-0">
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
            {/* Render overlays actifs */}
            {activeOverlays.map((o) => (
              <OverlayPreview
                key={o.id}
                overlay={o}
                isSelected={o.id === selectedId}
                onClick={() => setSelectedId(o.id)}
              />
            ))}
          </div>
        </div>

        {/* Panel édition */}
        <div className="lg:w-[380px] bg-white flex flex-col overflow-hidden">
          {/* Liste des overlays */}
          <div className="border-b border-line p-3 flex gap-2 overflow-x-auto">
            <button
              type="button"
              onClick={addOverlay}
              disabled={overlays.length >= MAX_OVERLAYS}
              className="shrink-0 flex items-center gap-1.5 px-3 h-9 rounded-full bg-night text-cream text-[12px] font-semibold hover:bg-night-soft disabled:opacity-40"
            >
              <Plus className="w-3.5 h-3.5" aria-hidden />
              Ajouter
            </button>
            {overlays.map((o, idx) => (
              <button
                key={o.id}
                type="button"
                onClick={() => setSelectedId(o.id)}
                className={cn(
                  "shrink-0 px-3 h-9 rounded-full text-[12px] font-semibold border transition-colors max-w-[140px] truncate",
                  o.id === selectedId
                    ? "bg-gold-deep text-white border-gold-deep"
                    : "bg-white text-night border-line hover:border-night/30",
                )}
              >
                T{idx + 1}: {o.text.slice(0, 12) || "…"}
              </button>
            ))}
          </div>

          {selected ? (
            <SelectedOverlayEditor
              overlay={selected}
              durationSeconds={durationSeconds}
              onUpdate={(patch) => updateOverlay(selected.id, patch)}
              onDelete={() => deleteOverlay(selected.id)}
            />
          ) : (
            <div className="flex-1 flex items-center justify-center px-6 text-center">
              <p className="text-night-muted text-[13px]">
                Sélectionne un texte pour l&apos;éditer, ou ajoute-en un.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

/* Render preview d'un overlay — % positioning + style. */
function OverlayPreview({
  overlay,
  isSelected,
  onClick,
}: {
  overlay: TextOverlay;
  isSelected: boolean;
  onClick: () => void;
}) {
  const bgStyle =
    overlay.bg === "solid"
      ? { backgroundColor: "rgba(0,0,0,0.55)", padding: "4px 10px" }
      : overlay.bg === "outline"
        ? { textShadow: "0 0 6px rgba(0,0,0,0.9), 0 0 2px rgba(0,0,0,0.9)" }
        : undefined;
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "absolute -translate-x-1/2 -translate-y-1/2 rounded select-none",
        isSelected && "ring-2 ring-gold-deep ring-offset-2 ring-offset-black",
      )}
      style={{
        left: `${overlay.x_pct}%`,
        top: `${overlay.y_pct}%`,
        color: overlay.color,
        fontSize: `${overlay.font_size_px * 0.55}px`,
        fontWeight: overlay.weight === "bold" ? 800 : 500,
        textAlign: overlay.align,
        ...bgStyle,
      }}
    >
      {overlay.text}
    </button>
  );
}

function SelectedOverlayEditor({
  overlay,
  durationSeconds,
  onUpdate,
  onDelete,
}: {
  overlay: TextOverlay;
  durationSeconds: number;
  onUpdate: (patch: Partial<TextOverlay>) => void;
  onDelete: () => void;
}) {
  return (
    <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
      <textarea
        value={overlay.text}
        onChange={(e) =>
          onUpdate({ text: e.target.value.slice(0, MAX_TEXT_LENGTH) })
        }
        placeholder="Ton texte…"
        rows={2}
        className="w-full px-3 py-2 rounded-xl border border-line bg-bg-soft text-[14px] text-night resize-none focus:border-gold-deep focus:outline-none"
      />
      <p className="text-[11px] text-night-dim text-right -mt-3">
        {overlay.text.length}/{MAX_TEXT_LENGTH}
      </p>

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
            value={overlay.start_s}
            onChange={(e) =>
              onUpdate({
                start_s: Math.min(Number(e.target.value), overlay.end_s - 0.1),
              })
            }
            className="flex-1 accent-gold-deep"
          />
          <span className="tabular-nums text-night w-12 text-right">
            {overlay.start_s.toFixed(1)}s
          </span>
        </div>
        <div className="flex items-center gap-2 text-[12px]">
          <span className="text-night-muted w-8">Fin</span>
          <input
            type="range"
            min={overlay.start_s + 0.1}
            max={durationSeconds}
            step={0.1}
            value={overlay.end_s}
            onChange={(e) => onUpdate({ end_s: Number(e.target.value) })}
            className="flex-1 accent-gold-deep"
          />
          <span className="tabular-nums text-night w-12 text-right">
            {overlay.end_s.toFixed(1)}s
          </span>
        </div>
      </div>

      {/* Position */}
      <div className="space-y-2">
        <Label>Position</Label>
        <div className="flex items-center gap-2 text-[12px]">
          <span className="text-night-muted w-8">X</span>
          <input
            type="range"
            min={0}
            max={100}
            value={overlay.x_pct}
            onChange={(e) => onUpdate({ x_pct: Number(e.target.value) })}
            className="flex-1 accent-gold-deep"
          />
          <span className="tabular-nums text-night w-10 text-right">
            {overlay.x_pct}%
          </span>
        </div>
        <div className="flex items-center gap-2 text-[12px]">
          <span className="text-night-muted w-8">Y</span>
          <input
            type="range"
            min={0}
            max={100}
            value={overlay.y_pct}
            onChange={(e) => onUpdate({ y_pct: Number(e.target.value) })}
            className="flex-1 accent-gold-deep"
          />
          <span className="tabular-nums text-night w-10 text-right">
            {overlay.y_pct}%
          </span>
        </div>
      </div>

      {/* Taille */}
      <div className="space-y-2">
        <Label>Taille</Label>
        <div className="flex gap-2">
          {OVERLAY_SIZES.map((s) => (
            <button
              key={s.id}
              type="button"
              onClick={() => onUpdate({ font_size_px: s.px })}
              className={cn(
                "flex-1 h-9 rounded-lg text-[12px] font-semibold border transition-colors",
                overlay.font_size_px === s.px
                  ? "bg-gold-deep text-white border-gold-deep"
                  : "bg-white text-night border-line hover:border-night/30",
              )}
            >
              {s.label}
            </button>
          ))}
        </div>
      </div>

      {/* Couleur */}
      <div className="space-y-2">
        <Label>Couleur</Label>
        <div className="flex flex-wrap gap-2">
          {OVERLAY_COLORS.map((c) => (
            <button
              key={c}
              type="button"
              onClick={() => onUpdate({ color: c })}
              aria-label={`Couleur ${c}`}
              className={cn(
                "w-9 h-9 rounded-full border-2 transition-colors",
                overlay.color === c
                  ? "border-gold-deep ring-2 ring-gold-deep/30"
                  : "border-line hover:border-night/30",
              )}
              style={{ backgroundColor: c }}
            />
          ))}
        </div>
      </div>

      {/* Fond */}
      <div className="space-y-2">
        <Label>Fond</Label>
        <div className="flex gap-2">
          {(["none", "solid", "outline"] as const).map((bg) => (
            <button
              key={bg}
              type="button"
              onClick={() => onUpdate({ bg })}
              className={cn(
                "flex-1 h-9 rounded-lg text-[12px] font-semibold border transition-colors capitalize",
                overlay.bg === bg
                  ? "bg-gold-deep text-white border-gold-deep"
                  : "bg-white text-night border-line hover:border-night/30",
              )}
            >
              {bg === "none" ? "Aucun" : bg === "solid" ? "Plein" : "Contour"}
            </button>
          ))}
        </div>
      </div>

      {/* Weight */}
      <div className="space-y-2">
        <Label>Style</Label>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => onUpdate({ weight: "regular" })}
            className={cn(
              "flex-1 h-9 rounded-lg text-[12px] font-normal border transition-colors",
              overlay.weight === "regular"
                ? "bg-gold-deep text-white border-gold-deep"
                : "bg-white text-night border-line",
            )}
          >
            Normal
          </button>
          <button
            type="button"
            onClick={() => onUpdate({ weight: "bold" })}
            className={cn(
              "flex-1 h-9 rounded-lg text-[12px] font-extrabold border transition-colors",
              overlay.weight === "bold"
                ? "bg-gold-deep text-white border-gold-deep"
                : "bg-white text-night border-line",
            )}
          >
            Gras
          </button>
        </div>
      </div>

      {/* Delete */}
      <button
        type="button"
        onClick={onDelete}
        className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl border border-red-200 bg-red-50 text-red-600 text-[13px] font-semibold hover:bg-red-100 transition-colors"
      >
        <Trash2 className="w-3.5 h-3.5" aria-hidden />
        Supprimer ce texte
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
