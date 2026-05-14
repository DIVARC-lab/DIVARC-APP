"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import Image from "next/image";
import { useState } from "react";
import { cn } from "@/lib/utils/cn";
import type { PostPhoto } from "@/lib/database.types";

type PostPhotosProps = {
  photos: PostPhoto[];
  alt: string;
  rounded?: boolean;
};

export function PostPhotos({ photos, alt, rounded = true }: PostPhotosProps) {
  const [activeIndex, setActiveIndex] = useState(0);

  if (photos.length === 0) return null;

  const active = photos[activeIndex] ?? photos[0]!;
  const single = photos.length === 1;

  /* Aspect ratio natif clampé pour comportement Facebook-like.
   * Zone de tolérance [0.75 portrait, 1.91 paysage 16:8.4 type Instagram].
   * - Dans la zone : container suit le ratio image, pas de crop.
   * - Hors zone (panorama extrême ou portrait très vertical) : clampé +
   *   léger crop via object-cover pour ne pas avoir d'image trop petite
   *   en hauteur (paysage) ni trop haute (portrait extrême).
   *
   * Fallback (posts legacy sans metadata) : aspect 4/5 mobile, 16/10 desktop
   * avec object-cover — comportement d'avant. */
  const nativeRatio = computeAspectRatio(active);

  return (
    <div
      className={cn(
        "relative w-full bg-night/5 overflow-hidden",
        rounded && "rounded-2xl",
      )}
    >
      <div
        className={cn(
          "relative w-full",
          !nativeRatio && "aspect-[4/5] sm:aspect-[16/10]",
        )}
        style={
          nativeRatio
            ? ({ aspectRatio: String(nativeRatio) } as React.CSSProperties)
            : undefined
        }
      >
        <Image
          key={active.id}
          src={active.url}
          alt={alt}
          fill
          sizes="(max-width: 640px) 100vw, 600px"
          className="object-cover"
          unoptimized={active.url.includes("?")}
        />
      </div>
      {!single ? (
        <>
          <button
            type="button"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              setActiveIndex((prev) =>
                prev === 0 ? photos.length - 1 : prev - 1,
              );
            }}
            aria-label="Précédent"
            className="absolute left-3 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full bg-white/95 backdrop-blur-sm border border-line text-night flex items-center justify-center hover:bg-white shadow-soft"
          >
            <ChevronLeft className="w-4 h-4" aria-hidden />
          </button>
          <button
            type="button"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              setActiveIndex((prev) =>
                prev === photos.length - 1 ? 0 : prev + 1,
              );
            }}
            aria-label="Suivant"
            className="absolute right-3 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full bg-white/95 backdrop-blur-sm border border-line text-night flex items-center justify-center hover:bg-white shadow-soft"
          >
            <ChevronRight className="w-4 h-4" aria-hidden />
          </button>
          <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-1.5">
            {photos.map((photo, idx) => (
              <button
                key={photo.id}
                type="button"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  setActiveIndex(idx);
                }}
                aria-label={`Photo ${idx + 1}`}
                className={cn(
                  "h-1.5 rounded-full transition-all",
                  idx === activeIndex
                    ? "w-6 bg-white"
                    : "w-1.5 bg-white/60 hover:bg-white/80",
                )}
              />
            ))}
          </div>
        </>
      ) : null}
    </div>
  );
}

/* Lit aspect_ratio ("1.78" ou "16/9") ou width/height de la PostPhoto.
 * Clamp [0.75 portrait, 1.91 paysage 16:8.4] pour matcher Facebook /
 * Instagram : pas d'image trop petite verticalement sur les panoramas,
 * pas trop haute sur les portraits extrêmes. object-cover crop
 * légèrement hors zone.
 * Retourne null si aucune metadata exploitable → fallback CSS. */
function computeAspectRatio(photo: PostPhoto): number | null {
  const MIN = 0.75;
  const MAX = 1.91;

  if (photo.aspect_ratio) {
    const raw = photo.aspect_ratio.trim();
    let value: number | null = null;
    if (raw.includes("/")) {
      const [w, h] = raw.split("/").map(Number);
      if (w && h && Number.isFinite(w) && Number.isFinite(h)) value = w / h;
    } else {
      const num = Number(raw);
      if (Number.isFinite(num) && num > 0) value = num;
    }
    if (value !== null) return Math.min(Math.max(value, MIN), MAX);
  }

  if (
    photo.width &&
    photo.height &&
    Number.isFinite(photo.width) &&
    Number.isFinite(photo.height) &&
    photo.height > 0
  ) {
    return Math.min(Math.max(photo.width / photo.height, MIN), MAX);
  }

  return null;
}
