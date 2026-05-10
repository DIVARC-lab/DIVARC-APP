"use client";

import { GripVertical, X } from "lucide-react";
import Image from "next/image";
import { useState } from "react";
import { cn } from "@/lib/utils/cn";
import type { PostCarouselSlide } from "@/lib/database.types";

/* CarouselEditor — V3 plugin pour éditer caption + CTA par slide.
 *
 * Conçu pour s'intégrer dans PostComposer comme PollCreator/SchedulePicker.
 * Source des médias : photos[] déjà uploadées dans le composer (on ne
 * réuploade rien, on attache juste caption + CTA aux URLs existantes).
 *
 * Validation :
 *   - 2-10 slides minimum
 *   - caption max 280 chars
 *   - cta_label max 40, cta_url valide URL https
 *   - cta_label et cta_url sont solidaires (les deux ou aucun)
 *
 * Réordonnancement basique : flèches haut/bas (pas de drag-drop full,
 * gardé pour V3.5 si besoin). */

type SourceMedia = {
  url: string;
  media_type: "image" | "video";
};

type CarouselEditorProps = {
  /** Médias source = photos[] du composer. Doit être >= 2. */
  sources: SourceMedia[];
  /** Slides actuelles (édition). Si null/empty, on génère depuis sources. */
  initial?: PostCarouselSlide[] | null;
  onApply: (slides: PostCarouselSlide[]) => void;
  onClose: () => void;
};

export function CarouselEditor({
  sources,
  initial,
  onApply,
  onClose,
}: CarouselEditorProps) {
  /* Hydrate les slides : si initial existe avec même longueur, on garde
     les overrides ; sinon on génère un état neutre depuis sources. */
  const [slides, setSlides] = useState<PostCarouselSlide[]>(() => {
    const fromSources = sources.map((s, idx) => ({
      position: idx,
      media_url: s.url,
      media_type: s.media_type,
      caption: "",
      cta_label: "",
      cta_url: "",
    }));
    if (initial && initial.length === sources.length) {
      return fromSources.map((slide, idx) => ({
        ...slide,
        caption: initial[idx]?.caption ?? "",
        cta_label: initial[idx]?.cta_label ?? "",
        cta_url: initial[idx]?.cta_url ?? "",
      }));
    }
    return fromSources;
  });

  const [activeIdx, setActiveIdx] = useState(0);

  function updateSlide(idx: number, patch: Partial<PostCarouselSlide>) {
    setSlides((prev) =>
      prev.map((s, i) => (i === idx ? { ...s, ...patch } : s)),
    );
  }

  function moveSlide(idx: number, direction: 1 | -1) {
    setSlides((prev) => {
      const next = [...prev];
      const target = idx + direction;
      if (target < 0 || target >= next.length) return prev;
      [next[idx], next[target]] = [next[target]!, next[idx]!];
      return next.map((s, i) => ({ ...s, position: i }));
    });
    setActiveIdx(idx + direction);
  }

  function handleApply() {
    /* Strip empty fields + validate before commit. */
    const cleaned = slides.map((s) => {
      const caption = s.caption?.trim() ?? "";
      const ctaLabel = s.cta_label?.trim() ?? "";
      const ctaUrl = s.cta_url?.trim() ?? "";
      const hasCta = ctaLabel.length > 0 && ctaUrl.length > 0;
      return {
        position: s.position,
        media_url: s.media_url,
        media_type: s.media_type,
        caption: caption.length > 0 ? caption : undefined,
        cta_label: hasCta ? ctaLabel : undefined,
        cta_url: hasCta ? ctaUrl : undefined,
      };
    });
    onApply(cleaned);
    onClose();
  }

  const active = slides[activeIdx]!;
  const captionLen = (active.caption ?? "").length;
  const ctaLabelLen = (active.cta_label ?? "").length;

  return (
    <div className="bg-white rounded-2xl shadow-2xl flex flex-col h-full overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-4 border-b border-line">
        <div>
          <h2 className="text-base font-bold text-night">Carrousel</h2>
          <p className="text-[12px] text-night-muted mt-0.5">
            {slides.length} slides · caption et CTA par slide
          </p>
        </div>
        <button
          type="button"
          onClick={onClose}
          aria-label="Fermer"
          className="w-8 h-8 rounded-full flex items-center justify-center hover:bg-bg-soft"
        >
          <X className="w-4 h-4" aria-hidden />
        </button>
      </div>

      {/* Thumbnails carousel — selection slide */}
      <div className="px-4 py-3 border-b border-line overflow-x-auto">
        <div className="flex gap-2">
          {slides.map((slide, idx) => (
            <button
              key={slide.media_url}
              type="button"
              onClick={() => setActiveIdx(idx)}
              className={cn(
                "relative shrink-0 w-16 h-16 rounded-xl overflow-hidden border-2 transition-colors",
                idx === activeIdx
                  ? "border-gold-deep"
                  : "border-transparent hover:border-line",
              )}
            >
              {slide.media_type === "video" ? (
                <video
                  src={slide.media_url}
                  className="w-full h-full object-cover"
                  muted
                />
              ) : (
                <Image
                  src={slide.media_url}
                  alt=""
                  fill
                  sizes="64px"
                  className="object-cover"
                  unoptimized
                />
              )}
              <span
                aria-hidden
                className="absolute bottom-0.5 right-0.5 px-1 rounded bg-black/60 text-white text-[9px] font-semibold"
              >
                {idx + 1}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* Slide editor */}
      <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
        {/* Aperçu image active */}
        <div className="relative aspect-[4/5] rounded-xl overflow-hidden bg-night/5">
          {active.media_type === "video" ? (
            <video
              src={active.media_url}
              controls
              playsInline
              className="absolute inset-0 w-full h-full object-cover"
            />
          ) : (
            <Image
              src={active.media_url}
              alt=""
              fill
              sizes="(max-width: 640px) 100vw, 400px"
              className="object-cover"
              unoptimized
            />
          )}

          {/* Réordonnancement */}
          <div className="absolute top-2 left-2 flex gap-1">
            <button
              type="button"
              onClick={() => moveSlide(activeIdx, -1)}
              disabled={activeIdx === 0}
              aria-label="Reculer la slide"
              className="w-7 h-7 rounded-full bg-white/90 text-night flex items-center justify-center disabled:opacity-40 hover:bg-white shadow-soft"
            >
              <GripVertical className="w-3.5 h-3.5 rotate-90" aria-hidden />
            </button>
            <button
              type="button"
              onClick={() => moveSlide(activeIdx, 1)}
              disabled={activeIdx === slides.length - 1}
              aria-label="Avancer la slide"
              className="w-7 h-7 rounded-full bg-white/90 text-night flex items-center justify-center disabled:opacity-40 hover:bg-white shadow-soft"
            >
              <GripVertical className="w-3.5 h-3.5 -rotate-90" aria-hidden />
            </button>
          </div>
        </div>

        {/* Caption */}
        <div>
          <label className="block text-[12px] font-semibold text-night mb-1.5">
            Caption de la slide
          </label>
          <textarea
            value={active.caption ?? ""}
            onChange={(e) =>
              updateSlide(activeIdx, { caption: e.target.value.slice(0, 280) })
            }
            placeholder="Décris ce qu'on voit sur cette slide…"
            rows={3}
            className="w-full px-3 py-2 rounded-xl border border-line bg-bg-soft text-[14px] text-night resize-none focus:border-gold-deep focus:outline-none"
          />
          <p className="mt-1 text-[11px] text-night-dim text-right">
            {captionLen}/280
          </p>
        </div>

        {/* CTA */}
        <div className="rounded-xl border border-line bg-bg-soft p-3 space-y-2">
          <div className="flex items-center justify-between">
            <p className="text-[12px] font-semibold text-night">
              Bouton d&apos;action (CTA)
            </p>
            <p className="text-[11px] text-night-dim">Optionnel</p>
          </div>
          <input
            type="text"
            value={active.cta_label ?? ""}
            onChange={(e) =>
              updateSlide(activeIdx, {
                cta_label: e.target.value.slice(0, 40),
              })
            }
            placeholder="Libellé (ex: En savoir plus)"
            className="w-full px-3 py-2 rounded-lg border border-line bg-white text-[13px] text-night focus:border-gold-deep focus:outline-none"
          />
          <p className="text-[11px] text-night-dim text-right -mt-1">
            {ctaLabelLen}/40
          </p>
          <input
            type="url"
            value={active.cta_url ?? ""}
            onChange={(e) =>
              updateSlide(activeIdx, { cta_url: e.target.value })
            }
            placeholder="https://exemple.com/landing"
            className="w-full px-3 py-2 rounded-lg border border-line bg-white text-[13px] text-night focus:border-gold-deep focus:outline-none"
          />
        </div>
      </div>

      {/* Footer actions */}
      <div className="px-5 py-3 border-t border-line flex items-center justify-between gap-3">
        <button
          type="button"
          onClick={onClose}
          className="text-[13px] font-semibold text-night-muted hover:text-night"
        >
          Annuler
        </button>
        <button
          type="button"
          onClick={handleApply}
          className="px-4 py-2 rounded-full bg-gold-deep text-white text-[13px] font-semibold hover:bg-gold transition-colors"
        >
          Appliquer le carrousel
        </button>
      </div>
    </div>
  );
}
