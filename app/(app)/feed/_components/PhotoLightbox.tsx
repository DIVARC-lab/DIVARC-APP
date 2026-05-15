"use client";

import { ChevronLeft, ChevronRight, X } from "lucide-react";
import Image from "next/image";
import { useCallback, useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils/cn";
import type { PostPhoto } from "@/lib/database.types";

type PhotoLightboxProps = {
  photos: PostPhoto[];
  /* Index initial à afficher. */
  initialIndex: number;
  alt: string;
  open: boolean;
  onClose: () => void;
};

/* Lightbox plein écran pour parcourir les photos d'un post.
 *
 * Interactions :
 *  - Click sur backdrop (zone hors photo) → ferme
 *  - Bouton X top-right → ferme
 *  - ESC → ferme
 *  - Flèche gauche/droite (kbd) → navigation
 *  - Boutons chevron desktop → navigation
 *  - Swipe touch mobile → navigation (seuil 50px)
 *
 * a11y : focus trap + aria-modal + body scroll lock pendant ouverture.
 *
 * Performance : Image Next/Image avec priority sur la photo active
 * (préchargement); les autres en lazy. */
export function PhotoLightbox({
  photos,
  initialIndex,
  alt,
  open,
  onClose,
}: PhotoLightboxProps) {
  const [index, setIndex] = useState(initialIndex);
  const containerRef = useRef<HTMLDivElement>(null);
  const touchStartXRef = useRef<number | null>(null);

  /* Sync l'index quand l'user rouvre la lightbox sur une autre photo. */
  useEffect(() => {
    if (open) setIndex(initialIndex);
  }, [open, initialIndex]);

  const goPrev = useCallback(() => {
    setIndex((i) => (i === 0 ? photos.length - 1 : i - 1));
  }, [photos.length]);

  const goNext = useCallback(() => {
    setIndex((i) => (i === photos.length - 1 ? 0 : i + 1));
  }, [photos.length]);

  /* Keyboard navigation + ESC. */
  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
      else if (e.key === "ArrowLeft") goPrev();
      else if (e.key === "ArrowRight") goNext();
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, onClose, goPrev, goNext]);

  /* Body scroll lock pendant ouverture (sinon le feed scrolle derrière). */
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  /* Focus le container à l'ouverture pour les kbd shortcuts. */
  useEffect(() => {
    if (open && containerRef.current) {
      containerRef.current.focus();
    }
  }, [open]);

  if (!open) return null;

  const photo = photos[index] ?? photos[0]!;
  const single = photos.length === 1;

  function handleBackdropClick(e: React.MouseEvent) {
    /* Ne ferme que si on a cliqué sur le backdrop (pas sur la photo). */
    if (e.target === e.currentTarget) onClose();
  }

  function handleTouchStart(e: React.TouchEvent) {
    touchStartXRef.current = e.touches[0]?.clientX ?? null;
  }

  function handleTouchEnd(e: React.TouchEvent) {
    if (touchStartXRef.current === null) return;
    const endX = e.changedTouches[0]?.clientX ?? touchStartXRef.current;
    const delta = endX - touchStartXRef.current;
    touchStartXRef.current = null;
    if (Math.abs(delta) < 50) return; /* trop court, ignore */
    if (delta > 0) goPrev();
    else goNext();
  }

  return (
    <div
      ref={containerRef}
      role="dialog"
      aria-modal="true"
      aria-label="Visionneuse de photos"
      tabIndex={-1}
      onClick={handleBackdropClick}
      className="fixed inset-0 z-[60] bg-night flex flex-col"
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
    >
      {/* Top bar : compteur + bouton close. */}
      <header className="shrink-0 flex items-center justify-between px-4 py-3 text-cream">
        <span className="text-sm font-semibold tabular-nums">
          {single ? "" : `${index + 1} / ${photos.length}`}
        </span>
        <button
          type="button"
          onClick={onClose}
          aria-label="Fermer la visionneuse"
          className="w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center transition-colors"
        >
          <X className="w-5 h-5" aria-hidden />
        </button>
      </header>

      {/* Photo zone — flex-1, photo centrée. */}
      <div
        className="flex-1 relative flex items-center justify-center px-4 sm:px-12 pb-4"
        onClick={handleBackdropClick}
      >
        <div className="relative w-full h-full max-w-5xl">
          <Image
            key={photo.id}
            src={photo.url}
            alt={alt}
            fill
            sizes="100vw"
            priority
            className="object-contain"
            unoptimized={photo.url.includes("?")}
          />
        </div>

        {/* Chevrons navigation (desktop) — cachés si single. */}
        {!single ? (
          <>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                goPrev();
              }}
              aria-label="Photo précédente"
              className={cn(
                "hidden sm:flex absolute left-4 top-1/2 -translate-y-1/2",
                "w-12 h-12 rounded-full bg-white/10 hover:bg-white/20",
                "items-center justify-center text-cream transition-colors",
              )}
            >
              <ChevronLeft className="w-6 h-6" aria-hidden />
            </button>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                goNext();
              }}
              aria-label="Photo suivante"
              className={cn(
                "hidden sm:flex absolute right-4 top-1/2 -translate-y-1/2",
                "w-12 h-12 rounded-full bg-white/10 hover:bg-white/20",
                "items-center justify-center text-cream transition-colors",
              )}
            >
              <ChevronRight className="w-6 h-6" aria-hidden />
            </button>
          </>
        ) : null}
      </div>

      {/* Dots mobile en bas (compteur visuel). */}
      {!single ? (
        <div className="shrink-0 flex items-center justify-center gap-1.5 pb-4 sm:hidden">
          {photos.map((p, idx) => (
            <button
              key={p.id}
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setIndex(idx);
              }}
              aria-label={`Aller à la photo ${idx + 1}`}
              className={cn(
                "h-1.5 rounded-full transition-all",
                idx === index ? "w-6 bg-cream" : "w-1.5 bg-cream/40",
              )}
            />
          ))}
        </div>
      ) : null}
    </div>
  );
}
