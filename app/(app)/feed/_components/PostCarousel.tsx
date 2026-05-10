"use client";

import { ChevronLeft, ChevronRight, ExternalLink } from "lucide-react";
import Image from "next/image";
import { useState } from "react";
import { cn } from "@/lib/utils/cn";
import type { PostCarouselSlide } from "@/lib/database.types";

/* PostCarousel — render swipeable horizontal des slides V3.
 *
 * Différences vs PostPhotos :
 *   - Chaque slide a sa propre caption (sous l'image)
 *   - Chaque slide peut avoir un CTA (button avec cta_label → cta_url)
 *   - Support image OU vidéo par slide (média mixte)
 *   - Swipe touch via translate3d (pas de lib externe)
 *
 * V3 limitations : pas d'auto-advance (UX volontaire — l'user contrôle).
 * V3.5 envisagé : slide dwell tracking individuel + analytics par slide. */

type PostCarouselProps = {
  slides: PostCarouselSlide[];
  alt: string;
  rounded?: boolean;
};

export function PostCarousel({
  slides,
  alt,
  rounded = true,
}: PostCarouselProps) {
  const [activeIndex, setActiveIndex] = useState(0);
  const [touchStart, setTouchStart] = useState<number | null>(null);

  if (slides.length === 0) return null;

  const sorted = [...slides].sort((a, b) => a.position - b.position);
  const active = sorted[activeIndex] ?? sorted[0]!;

  function go(direction: 1 | -1) {
    setActiveIndex((prev) => {
      const next = prev + direction;
      if (next < 0) return sorted.length - 1;
      if (next >= sorted.length) return 0;
      return next;
    });
  }

  function handleTouchStart(e: React.TouchEvent) {
    setTouchStart(e.touches[0]?.clientX ?? null);
  }

  function handleTouchEnd(e: React.TouchEvent) {
    if (touchStart === null) return;
    const end = e.changedTouches[0]?.clientX ?? touchStart;
    const dx = end - touchStart;
    if (Math.abs(dx) > 50) {
      go(dx < 0 ? 1 : -1);
    }
    setTouchStart(null);
  }

  return (
    <div
      className={cn(
        "relative bg-night/5 overflow-hidden",
        rounded && "rounded-2xl",
      )}
    >
      <div
        className="relative aspect-[4/5] sm:aspect-[16/10]"
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
      >
        {active.media_type === "video" ? (
          <video
            key={active.media_url}
            src={active.media_url}
            controls
            playsInline
            className="absolute inset-0 w-full h-full object-cover"
          />
        ) : (
          <Image
            key={active.media_url}
            src={active.media_url}
            alt={alt}
            fill
            sizes="(max-width: 640px) 100vw, 600px"
            className="object-cover"
            unoptimized={active.media_url.includes("?")}
          />
        )}

        {/* Compteur slide N/M */}
        <span
          aria-hidden
          className="absolute top-3 right-3 px-2 py-0.5 rounded-full bg-black/55 text-white text-[11px] font-semibold tracking-wide"
        >
          {activeIndex + 1} / {sorted.length}
        </span>
      </div>

      {/* Caption + CTA — sous l'image, visible sur la card */}
      {(active.caption || (active.cta_label && active.cta_url)) && (
        <div className="bg-white px-4 py-3 border-t border-line">
          {active.caption ? (
            <p className="text-[13.5px] text-night leading-snug">
              {active.caption}
            </p>
          ) : null}
          {active.cta_label && active.cta_url ? (
            <a
              href={active.cta_url}
              target="_blank"
              rel="noopener noreferrer"
              onClick={(e) => e.stopPropagation()}
              className="mt-2 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-gold-deep text-white text-[12px] font-semibold hover:bg-gold transition-colors"
            >
              {active.cta_label}
              <ExternalLink className="w-3 h-3" aria-hidden />
            </a>
          ) : null}
        </div>
      )}

      {/* Navigation arrows */}
      {sorted.length > 1 ? (
        <>
          <button
            type="button"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              go(-1);
            }}
            aria-label="Précédent"
            className="absolute left-3 top-[35%] -translate-y-1/2 w-9 h-9 rounded-full bg-white/95 backdrop-blur-sm border border-line text-night flex items-center justify-center hover:bg-white shadow-soft"
          >
            <ChevronLeft className="w-4 h-4" aria-hidden />
          </button>
          <button
            type="button"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              go(1);
            }}
            aria-label="Suivant"
            className="absolute right-3 top-[35%] -translate-y-1/2 w-9 h-9 rounded-full bg-white/95 backdrop-blur-sm border border-line text-night flex items-center justify-center hover:bg-white shadow-soft"
          >
            <ChevronRight className="w-4 h-4" aria-hidden />
          </button>
          <div className="absolute bottom-[68px] left-1/2 -translate-x-1/2 flex gap-1.5 pointer-events-none">
            {sorted.map((slide, idx) => (
              <span
                key={slide.position}
                aria-hidden
                className={cn(
                  "h-1.5 rounded-full transition-all",
                  idx === activeIndex
                    ? "w-6 bg-white"
                    : "w-1.5 bg-white/60",
                )}
              />
            ))}
          </div>
        </>
      ) : null}
    </div>
  );
}
