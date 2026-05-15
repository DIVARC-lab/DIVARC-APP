"use client";

import Image from "next/image";
import { useState } from "react";
import { cn } from "@/lib/utils/cn";
import type { PostPhoto, PostWithDetails } from "@/lib/database.types";
import {
  classifyMediaShape,
  SHAPE_ASPECT_CLASS,
  SHAPE_SIZES,
} from "@/lib/feed/mediaFormat";
import { PhotoCommentsModal } from "./PhotoCommentsModal";
import { PhotoLightbox } from "./PhotoLightbox";

type PostPhotosProps = {
  photos: PostPhoto[];
  alt: string;
  rounded?: boolean;
  /* Si fournis, le click ouvre la modale style Facebook (photo +
     commentaires latéraux) au lieu de la simple PhotoLightbox. Le
     feed passe toujours ces props ; la page détail single-post peut
     les omettre pour garder un viewer photo simple. */
  post?: PostWithDetails;
  currentUserId?: string;
  currentAuthorName?: string | null;
  currentAuthorAvatarUrl?: string | null;
};

/* PostPhotos — routeur de layouts photos selon le nombre.
 *
 * Pattern FB-style : la grille est statique (pas de swipe inline), le
 * user tape sur une photo pour ouvrir un Lightbox plein écran.
 *
 * Layouts :
 *  - 1 photo   : Single (aspect natif clampé)
 *  - 2 photos  : GridTwo  — 2×1 carré 1:1
 *  - 3 photos  : GridThree — 1 grande + 2 petites
 *  - 4 photos  : GridFour  — 2×2
 *  - 5+ photos : GridFivePlus — 2 top + 3 bottom + overlay +N
 *
 * Click photo → ouvre PhotoLightbox sur l'index cliqué (étape 5+6).
 */
export function PostPhotos({
  photos,
  alt,
  rounded = true,
  post,
  currentUserId,
  currentAuthorName = null,
  currentAuthorAvatarUrl = null,
}: PostPhotosProps) {
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);

  if (photos.length === 0) return null;

  function handleOpen(index: number, e: React.MouseEvent) {
    /* Empêche la navigation parent (Link wrapping PostPhotos dans PostCard
       navigue vers /feed/[id]). Le user veut voir la photo en grand sans
       quitter le feed. */
    e.preventDefault();
    e.stopPropagation();
    setLightboxIndex(index);
  }

  const handler = (idx: number) => (e: React.MouseEvent) => handleOpen(idx, e);

  const grid =
    photos.length === 1 ? (
      <Single photo={photos[0]!} alt={alt} rounded={rounded} onClick={handler(0)} />
    ) : photos.length === 2 ? (
      <GridTwo photos={photos} alt={alt} rounded={rounded} onPhotoClick={handler} />
    ) : photos.length === 3 ? (
      <GridThree photos={photos} alt={alt} rounded={rounded} onPhotoClick={handler} />
    ) : photos.length === 4 ? (
      <GridFour photos={photos} alt={alt} rounded={rounded} onPhotoClick={handler} />
    ) : (
      <GridFivePlus photos={photos} alt={alt} rounded={rounded} onPhotoClick={handler} />
    );

  /* Mode "Facebook" : si on a le post complet et l'user courant, on
     ouvre la modale photo+commentaires latéraux. Sinon fallback sur
     PhotoLightbox basique (juste la photo, pas de commentaires). */
  const useCommentsModal = post && currentUserId;

  return (
    <>
      {grid}
      {useCommentsModal ? (
        <PhotoCommentsModal
          post={post}
          photos={photos}
          initialIndex={lightboxIndex ?? 0}
          currentUserId={currentUserId}
          currentAuthorName={currentAuthorName}
          currentAuthorAvatarUrl={currentAuthorAvatarUrl}
          open={lightboxIndex !== null}
          onClose={() => setLightboxIndex(null)}
        />
      ) : (
        <PhotoLightbox
          photos={photos}
          initialIndex={lightboxIndex ?? 0}
          alt={alt}
          open={lightboxIndex !== null}
          onClose={() => setLightboxIndex(null)}
        />
      )}
    </>
  );
}

/* ============ Layout : 1 photo ============ */

function Single({
  photo,
  alt,
  rounded,
  onClick,
}: {
  photo: PostPhoto;
  alt: string;
  rounded: boolean;
  onClick: (e: React.MouseEvent) => void;
}) {
  /* Formats Facebook officiels : 4:5 portrait (1080×1350), 1.91:1
     paysage (1200×630), 1:1 carré (1080×1080), 9:16 reel (1080×1920).
     Le wrapper applique l'aspect-ratio exact ; `object-cover` centre
     le média sans étirement. Container responsive (largeur = parent),
     hauteur calculée automatiquement par le navigateur. */
  const dims = readPhotoDims(photo);
  const shape = classifyMediaShape(dims.w, dims.h);

  return (
    <button
      type="button"
      onClick={onClick}
      aria-label="Agrandir la photo"
      className={cn(
        "relative w-full bg-night/5 overflow-hidden cursor-zoom-in flex items-center justify-center",
        rounded && "rounded-2xl",
      )}
    >
      <div className={cn("relative w-full", SHAPE_ASPECT_CLASS[shape])}>
        <Image
          src={photo.url}
          alt={alt}
          fill
          sizes={SHAPE_SIZES[shape]}
          className="object-cover object-center"
          unoptimized={photo.url.includes("?")}
        />
      </div>
    </button>
  );
}

/* Lit width/height d'une PostPhoto en gérant tous les cas (props
 * width/height directes OU champ `aspect_ratio` sérialisé "w/h").
 * Retourne null/null si rien d'utilisable (le classifier tombera sur
 * "square" par défaut). */
function readPhotoDims(photo: PostPhoto): {
  w: number | null;
  h: number | null;
} {
  if (
    photo.width &&
    photo.height &&
    Number.isFinite(photo.width) &&
    Number.isFinite(photo.height) &&
    photo.width > 0 &&
    photo.height > 0
  ) {
    return { w: photo.width, h: photo.height };
  }
  if (photo.aspect_ratio) {
    const raw = photo.aspect_ratio.trim();
    if (raw.includes("/")) {
      const [w, h] = raw.split("/").map(Number);
      if (w && h && Number.isFinite(w) && Number.isFinite(h)) {
        return { w, h };
      }
    } else {
      const num = Number(raw);
      if (Number.isFinite(num) && num > 0) {
        /* Si on n'a que le ratio, on synthétise (1080, 1080/ratio). */
        return { w: 1080, h: 1080 / num };
      }
    }
  }
  return { w: null, h: null };
}

/* ============ Layout : 2 photos (FB-style grille 2×1) ============ */

function GridTwo({
  photos,
  alt,
  rounded,
  onPhotoClick,
}: {
  photos: PostPhoto[];
  alt: string;
  rounded: boolean;
  onPhotoClick: (idx: number) => (e: React.MouseEvent) => void;
}) {
  return (
    <div
      className={cn(
        "relative w-full grid grid-cols-2 gap-[2px] bg-night/5 overflow-hidden",
        rounded && "rounded-2xl",
      )}
    >
      {photos.slice(0, 2).map((photo, idx) => (
        <button
          key={photo.id}
          type="button"
          onClick={onPhotoClick(idx)}
          aria-label={`Agrandir photo ${idx + 1}`}
          className="relative bg-night/5 cursor-zoom-in"
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
        </button>
      ))}
    </div>
  );
}

/* ============ Layout : 3 photos ============ */

function GridThree({
  photos,
  alt,
  rounded,
  onPhotoClick,
}: {
  photos: PostPhoto[];
  alt: string;
  rounded: boolean;
  onPhotoClick: (idx: number) => (e: React.MouseEvent) => void;
}) {
  return (
    <div
      className={cn(
        "relative w-full grid grid-cols-2 gap-[2px] bg-night/5 overflow-hidden",
        rounded && "rounded-2xl",
      )}
      style={{ aspectRatio: "4 / 3" }}
    >
      <button
        type="button"
        onClick={onPhotoClick(0)}
        aria-label="Agrandir photo 1"
        className="relative row-span-2 bg-night/5 cursor-zoom-in"
      >
        <Image
          src={photos[0]!.url}
          alt={`${alt} — photo 1`}
          fill
          sizes="(max-width: 640px) 50vw, 340px"
          className="object-cover"
          unoptimized={photos[0]!.url.includes("?")}
        />
      </button>
      {photos.slice(1, 3).map((photo, idx) => (
        <button
          key={photo.id}
          type="button"
          onClick={onPhotoClick(idx + 1)}
          aria-label={`Agrandir photo ${idx + 2}`}
          className="relative bg-night/5 cursor-zoom-in"
        >
          <Image
            src={photo.url}
            alt={`${alt} — photo ${idx + 2}`}
            fill
            sizes="(max-width: 640px) 50vw, 340px"
            className="object-cover"
            unoptimized={photo.url.includes("?")}
          />
        </button>
      ))}
    </div>
  );
}

/* ============ Layout : 4 photos (grille 2×2 carrée) ============ */

function GridFour({
  photos,
  alt,
  rounded,
  onPhotoClick,
}: {
  photos: PostPhoto[];
  alt: string;
  rounded: boolean;
  onPhotoClick: (idx: number) => (e: React.MouseEvent) => void;
}) {
  return (
    <div
      className={cn(
        "relative w-full grid grid-cols-2 gap-[2px] bg-night/5 overflow-hidden",
        rounded && "rounded-2xl",
      )}
    >
      {photos.slice(0, 4).map((photo, idx) => (
        <button
          key={photo.id}
          type="button"
          onClick={onPhotoClick(idx)}
          aria-label={`Agrandir photo ${idx + 1}`}
          className="relative bg-night/5 cursor-zoom-in"
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
        </button>
      ))}
    </div>
  );
}

/* ============ Layout : 5+ photos ============ */

function GridFivePlus({
  photos,
  alt,
  rounded,
  onPhotoClick,
}: {
  photos: PostPhoto[];
  alt: string;
  rounded: boolean;
  onPhotoClick: (idx: number) => (e: React.MouseEvent) => void;
}) {
  const top = photos.slice(0, 2);
  const bottom = photos.slice(2, 5);
  const remaining = photos.length - 5;

  return (
    <div
      className={cn(
        "relative w-full flex flex-col gap-[2px] bg-night/5 overflow-hidden",
        rounded && "rounded-2xl",
      )}
      style={{ aspectRatio: "3 / 2" }}
    >
      <div className="grid grid-cols-2 gap-[2px] flex-[2_2_0%]">
        {top.map((photo, idx) => (
          <button
            key={photo.id}
            type="button"
            onClick={onPhotoClick(idx)}
            aria-label={`Agrandir photo ${idx + 1}`}
            className="relative bg-night/5 cursor-zoom-in"
          >
            <Image
              src={photo.url}
              alt={`${alt} — photo ${idx + 1}`}
              fill
              sizes="(max-width: 640px) 50vw, 340px"
              className="object-cover"
              unoptimized={photo.url.includes("?")}
            />
          </button>
        ))}
      </div>
      <div className="grid grid-cols-3 gap-[2px] flex-[1_1_0%]">
        {bottom.map((photo, idx) => {
          const realIdx = idx + 2;
          const isLast = idx === bottom.length - 1;
          const showOverlay = isLast && remaining > 0;
          return (
            <button
              key={photo.id}
              type="button"
              onClick={onPhotoClick(realIdx)}
              aria-label={
                showOverlay
                  ? `Voir les ${remaining + 1} photos restantes`
                  : `Agrandir photo ${realIdx + 1}`
              }
              className="relative bg-night/5 cursor-zoom-in"
            >
              <Image
                src={photo.url}
                alt={`${alt} — photo ${realIdx + 1}`}
                fill
                sizes="(max-width: 640px) 33vw, 220px"
                className="object-cover"
                unoptimized={photo.url.includes("?")}
              />
              {showOverlay ? (
                <div
                  aria-hidden
                  className="absolute inset-0 bg-night/55 flex items-center justify-center"
                >
                  <span className="font-display italic text-cream text-3xl sm:text-4xl tracking-tight">
                    +{remaining}
                  </span>
                </div>
              ) : null}
            </button>
          );
        })}
      </div>
    </div>
  );
}

/* Helpers : classification de format média + lecture des dimensions
   sont définies inline / importées depuis `lib/feed/mediaFormat.ts`. */
