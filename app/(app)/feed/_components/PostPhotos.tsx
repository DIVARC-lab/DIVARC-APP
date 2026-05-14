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

  /* Aspect ratio natif de l'image — calculé depuis aspect_ratio (string ex "1.78")
   * ou width/height. Clamp entre 0.5 (très portrait) et 2.6 (panoramique 21:8)
   * pour éviter une image de 4 captures côte-à-côte qui prendrait toute la
   * largeur écran et 100px de haut.
   *
   * Si aucune metadata disponible : fallback 4/5 (portrait, ratio Instagram). */
  const ratio = computeAspectRatio(active);
  const aspectStyle = ratio
    ? ({ aspectRatio: ratio } as React.CSSProperties)
    : undefined;

  return (
    <div
      className={cn(
        "relative bg-night/5 overflow-hidden",
        rounded && "rounded-2xl",
      )}
    >
      <div
        className={cn(
          "relative",
          /* Fallback si pas d'aspect natif : portrait mobile, paysage desktop. */
          !ratio && "aspect-[4/5] sm:aspect-[16/10]",
        )}
        style={aspectStyle}
      >
        <Image
          key={active.id}
          src={active.url}
          alt={alt}
          fill
          sizes="(max-width: 640px) 100vw, 600px"
          /* object-contain : préserve l'image entière (pas de crop).
           * Le container a le bon aspect ratio donc pas de bandes noires
           * tant que ratio est dans le range clampé. */
          className="object-contain"
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

/* Calcule un aspect ratio numérique exploitable depuis les metadata d'une
 * photo. Clamp dans [0.5, 2.6] pour éviter les cas extrêmes (image très
 * étroite ou panorama ultra-wide qui deviendrait illisible).
 *
 * Retourne null si aucune metadata exploitable — le caller utilisera alors
 * le fallback CSS aspect-[4/5] sm:aspect-[16/10]. */
function computeAspectRatio(photo: PostPhoto): number | null {
  const MIN = 0.5; /* portrait extrême */
  const MAX = 4.0; /* panorama très large (ex: 4 screenshots smartphones
                       côte-à-côte ≈ 2.25 ; 4 captures desktop ≈ 7
                       seraient clampées). Compromis lisibilité vs preview
                       complète. */

  /* Cas 1 : aspect_ratio stocké en string ("1.78" ou "16/9"). */
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

  /* Cas 2 : width + height en pixels. */
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
