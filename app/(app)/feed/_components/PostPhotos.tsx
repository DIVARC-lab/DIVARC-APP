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

/* PostPhotos — routeur de layouts photos selon le nombre.
 *
 * Pattern FB-style : la grille est statique (pas de swipe), le user
 * tape sur une photo pour ouvrir un Lightbox plein écran (étape 5).
 *
 * Layouts :
 *  - 1 photo   : Single (aspect natif clampé)
 *  - 2 photos  : Grid 2×1 carré 1:1 — implémenté étape 1 ✅
 *  - 3 photos  : Grid 1 grande + 2 petites — étape 2 (TODO)
 *  - 4 photos  : Grid 2×2 — étape 3 (TODO)
 *  - 5+ photos : Grid 3+2 avec +N — étape 4 (TODO)
 *
 * Fallback carousel : tant que les étapes 2-4 ne sont pas faites, on
 * route les counts ≥3 vers l'ancien comportement (1 active + dots).
 */
export function PostPhotos({ photos, alt, rounded = true }: PostPhotosProps) {
  if (photos.length === 0) return null;
  if (photos.length === 1) return <Single photo={photos[0]!} alt={alt} rounded={rounded} />;
  if (photos.length === 2) return <GridTwo photos={photos} alt={alt} rounded={rounded} />;
  /* Fallback : carousel pour 3+ photos en attendant étapes 2-4. */
  return <Carousel photos={photos} alt={alt} rounded={rounded} />;
}

/* ============ Layout : 1 photo ============ */

function Single({
  photo,
  alt,
  rounded,
}: {
  photo: PostPhoto;
  alt: string;
  rounded: boolean;
}) {
  const nativeRatio = computeAspectRatio(photo);
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
          src={photo.url}
          alt={alt}
          fill
          sizes="(max-width: 640px) 100vw, 600px"
          className="object-cover"
          unoptimized={photo.url.includes("?")}
        />
      </div>
    </div>
  );
}

/* ============ Layout : 2 photos (FB-style grille 2×1) ============ */

/* Grille statique : 2 colonnes égales, aspect 1:1 chacune, gap 2px
 * (look FB : photos collées avec ligne blanche fine). Tap = lightbox
 * (étape 5+6). En attendant la lightbox, le wrapper Link de PostCard
 * route vers /feed/[id] comme avant. */
function GridTwo({
  photos,
  alt,
  rounded,
}: {
  photos: PostPhoto[];
  alt: string;
  rounded: boolean;
}) {
  return (
    <div
      className={cn(
        "relative w-full grid grid-cols-2 gap-[2px] bg-night/5 overflow-hidden",
        rounded && "rounded-2xl",
      )}
    >
      {photos.slice(0, 2).map((photo, idx) => (
        <div
          key={photo.id}
          className="relative aspect-square bg-night/5"
          style={{ aspectRatio: "1 / 1" }}
        >
          <Image
            src={photo.url}
            alt={`${alt} — photo ${idx + 1}`}
            fill
            sizes="(max-width: 640px) 50vw, 340px"
            className="object-cover"
            unoptimized={photo.url.includes("?")}
          />
        </div>
      ))}
    </div>
  );
}

/* ============ Carousel legacy (fallback 3+ photos) ============ */

function Carousel({
  photos,
  alt,
  rounded,
}: {
  photos: PostPhoto[];
  alt: string;
  rounded: boolean;
}) {
  const [activeIndex, setActiveIndex] = useState(0);
  const active = photos[activeIndex] ?? photos[0]!;
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
    </div>
  );
}

/* ============ Helpers ============ */

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
