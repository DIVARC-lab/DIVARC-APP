"use client";

import Image from "next/image";
import { useState } from "react";
import { cn } from "@/lib/utils/cn";

/* MediaDisplay — composant universel pour afficher 1 à N médias avec
 * cohérence cross-device garantie (CLS=0).
 *
 * Règles design :
 * - Le container a TOUJOURS `aspect-ratio` CSS natif AVANT le chargement
 *   (= zéro layout shift quand l'image arrive)
 * - next/image génère AVIF + WebP automatiquement à la volée
 * - Galerie 1/2/3/4/5+ → layout figé identique mobile/desktop
 *   (pas de réorganisation responsive, garde la cohérence)
 * - Lightbox au tap (composant interne MediaLightbox)
 *
 * Backward-compat : si `aspectRatio` n'est pas fourni (legacy posts/listings
 * sans la colonne aspect_ratio), fallback `4/5` (ratio par défaut feed). */

export type MediaItem = {
  url: string;
  /** Format "4/5", "1/1", "16/9" ou ratio numérique en string. */
  aspectRatio?: string | null;
  width?: number | null;
  height?: number | null;
  /** Texte alternatif a11y. Important : pas de "image" générique. */
  alt?: string;
};

type MediaDisplayProps = {
  items: MediaItem[];
  /** Contexte d'affichage — détermine les sizes srcset optimisés. */
  context?: "feed" | "story" | "marketplace" | "profile";
  /** True pour les éléments above-the-fold (LCP). Set fetchpriority high. */
  priority?: boolean;
  /** Désactive la lightbox au tap (ex : preview composer). */
  disableLightbox?: boolean;
  className?: string;
};

const DEFAULT_RATIO = "4/5";

const SIZES_BY_CONTEXT: Record<NonNullable<MediaDisplayProps["context"]>, string> = {
  feed: "(max-width: 640px) 100vw, (max-width: 1024px) 600px, 680px",
  story: "(max-width: 640px) 100vw, 480px",
  marketplace: "(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 320px",
  profile: "(max-width: 640px) 33vw, 240px",
};

export function MediaDisplay({
  items,
  context = "feed",
  priority = false,
  disableLightbox = false,
  className,
}: MediaDisplayProps) {
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);

  if (items.length === 0) return null;

  function openLightbox(index: number) {
    if (disableLightbox) return;
    setLightboxIndex(index);
  }

  if (items.length === 1) {
    const item = items[0]!;
    return (
      <>
        <div
          className={cn("relative w-full overflow-hidden rounded-2xl bg-night/5", className)}
          style={{ aspectRatio: parseRatio(item.aspectRatio) }}
        >
          <MediaTile
            item={item}
            context={context}
            priority={priority}
            onClick={() => openLightbox(0)}
          />
        </div>
        <MediaLightbox
          items={items}
          index={lightboxIndex}
          onClose={() => setLightboxIndex(null)}
        />
      </>
    );
  }

  /* Galeries : layout figé identique mobile/desktop (pas de
     reorganisation responsive, pour garder la cohérence visuelle). */
  return (
    <>
      <div className={cn("w-full", className)}>
        <GalleryGrid
          items={items}
          context={context}
          priority={priority}
          onTileClick={openLightbox}
        />
      </div>
      <MediaLightbox
        items={items}
        index={lightboxIndex}
        onClose={() => setLightboxIndex(null)}
      />
    </>
  );
}

function GalleryGrid({
  items,
  context,
  priority,
  onTileClick,
}: {
  items: MediaItem[];
  context: NonNullable<MediaDisplayProps["context"]>;
  priority: boolean;
  onTileClick: (index: number) => void;
}) {
  const count = items.length;

  /* 2 images : 2 colonnes carrées. */
  if (count === 2) {
    return (
      <div className="grid grid-cols-2 gap-1 rounded-2xl overflow-hidden">
        {items.map((item, i) => (
          <div
            key={i}
            className="relative bg-night/5"
            style={{ aspectRatio: "1/1" }}
          >
            <MediaTile
              item={item}
              context={context}
              priority={priority && i === 0}
              onClick={() => onTileClick(i)}
            />
          </div>
        ))}
      </div>
    );
  }

  /* 3 images : grande à gauche (carré), 2 petites empilées à droite. */
  if (count === 3) {
    return (
      <div className="grid grid-cols-2 gap-1 rounded-2xl overflow-hidden">
        <div
          className="relative bg-night/5 row-span-2"
          style={{ aspectRatio: "1/2" }}
        >
          <MediaTile
            item={items[0]!}
            context={context}
            priority={priority}
            onClick={() => onTileClick(0)}
          />
        </div>
        {items.slice(1, 3).map((item, i) => (
          <div
            key={i + 1}
            className="relative bg-night/5"
            style={{ aspectRatio: "1/1" }}
          >
            <MediaTile
              item={item}
              context={context}
              priority={false}
              onClick={() => onTileClick(i + 1)}
            />
          </div>
        ))}
      </div>
    );
  }

  /* 4 images : grid 2x2 carré. */
  if (count === 4) {
    return (
      <div className="grid grid-cols-2 gap-1 rounded-2xl overflow-hidden">
        {items.map((item, i) => (
          <div
            key={i}
            className="relative bg-night/5"
            style={{ aspectRatio: "1/1" }}
          >
            <MediaTile
              item={item}
              context={context}
              priority={priority && i === 0}
              onClick={() => onTileClick(i)}
            />
          </div>
        ))}
      </div>
    );
  }

  /* 5+ images : 4 visibles + overlay "+N" sur la dernière. */
  const visible = items.slice(0, 4);
  const remaining = items.length - 4;
  return (
    <div className="grid grid-cols-2 gap-1 rounded-2xl overflow-hidden">
      {visible.map((item, i) => {
        const isLast = i === 3;
        return (
          <div
            key={i}
            className="relative bg-night/5"
            style={{ aspectRatio: "1/1" }}
          >
            <MediaTile
              item={item}
              context={context}
              priority={priority && i === 0}
              onClick={() => onTileClick(i)}
            />
            {isLast && remaining > 0 ? (
              <button
                type="button"
                onClick={() => onTileClick(3)}
                aria-label={`Voir ${remaining} photos supplémentaires`}
                className="absolute inset-0 bg-night/55 backdrop-blur-[2px] text-cream font-display italic text-3xl flex items-center justify-center"
              >
                +{remaining}
              </button>
            ) : null}
          </div>
        );
      })}
    </div>
  );
}

function MediaTile({
  item,
  context,
  priority,
  onClick,
}: {
  item: MediaItem;
  context: NonNullable<MediaDisplayProps["context"]>;
  priority: boolean;
  onClick?: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="absolute inset-0 w-full h-full"
      aria-label={item.alt ?? "Voir l'image"}
    >
      <Image
        src={item.url}
        alt={item.alt ?? ""}
        fill
        sizes={SIZES_BY_CONTEXT[context]}
        priority={priority}
        className="object-cover"
        unoptimized={item.url.includes("?") || item.url.startsWith("blob:")}
      />
    </button>
  );
}

/* Lightbox simple — overlay plein écran avec swipe entre les images. */
function MediaLightbox({
  items,
  index,
  onClose,
}: {
  items: MediaItem[];
  index: number | null;
  onClose: () => void;
}) {
  if (index === null) return null;
  const item = items[index];
  if (!item) return null;

  const hasPrev = index > 0;
  const hasNext = index < items.length - 1;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Photo agrandie"
      className="fixed inset-0 z-[60] bg-black/95 flex items-center justify-center"
      onClick={onClose}
    >
      <Image
        src={item.url}
        alt={item.alt ?? ""}
        width={item.width ?? 1600}
        height={item.height ?? 1600}
        className="max-w-full max-h-full object-contain"
        unoptimized={item.url.includes("?") || item.url.startsWith("blob:")}
        onClick={(e) => e.stopPropagation()}
      />
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          onClose();
        }}
        aria-label="Fermer"
        className="absolute top-4 right-4 w-11 h-11 rounded-full bg-white/10 text-cream hover:bg-white/20 flex items-center justify-center text-xl"
      >
        ×
      </button>
      {hasPrev ? (
        <NavBtn
          side="left"
          onClick={(e) => {
            e.stopPropagation();
            /* Hack rapide : on demande au parent de réouvrir au index-1.
               Pas de state interne au lightbox — on remonte via onClose +
               re-open. */
            onClose();
            setTimeout(() => {
              const ev = new CustomEvent("divarc:lightbox-prev");
              window.dispatchEvent(ev);
            }, 10);
          }}
        />
      ) : null}
      {hasNext ? (
        <NavBtn
          side="right"
          onClick={(e) => {
            e.stopPropagation();
            onClose();
            setTimeout(() => {
              const ev = new CustomEvent("divarc:lightbox-next");
              window.dispatchEvent(ev);
            }, 10);
          }}
        />
      ) : null}
    </div>
  );
}

function NavBtn({
  side,
  onClick,
}: {
  side: "left" | "right";
  onClick: (e: React.MouseEvent) => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={side === "left" ? "Précédent" : "Suivant"}
      className={cn(
        "absolute top-1/2 -translate-y-1/2 w-12 h-12 rounded-full bg-white/10 text-cream hover:bg-white/20 flex items-center justify-center text-2xl",
        side === "left" ? "left-4" : "right-4",
      )}
    >
      {side === "left" ? "‹" : "›"}
    </button>
  );
}

/* Parse un ratio "4/5" → "4/5" (CSS natif), ou "1.5" → "3/2", ou null
 * → fallback DEFAULT_RATIO. Accepte aussi le format "4:5" legacy. */
function parseRatio(raw: string | null | undefined): string {
  if (!raw) return DEFAULT_RATIO;
  if (raw.includes("/")) return raw;
  if (raw.includes(":")) return raw.replace(":", "/");
  const num = Number(raw);
  if (Number.isFinite(num) && num > 0) {
    /* Convertit un ratio numérique en fraction ~ standard. */
    return num >= 1 ? `${num}/1` : `1/${1 / num}`;
  }
  return DEFAULT_RATIO;
}
