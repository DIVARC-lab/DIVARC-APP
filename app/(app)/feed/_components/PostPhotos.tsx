import Image from "next/image";
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
  if (photos.length === 3) return <GridThree photos={photos} alt={alt} rounded={rounded} />;
  if (photos.length === 4) return <GridFour photos={photos} alt={alt} rounded={rounded} />;
  return <GridFivePlus photos={photos} alt={alt} rounded={rounded} />;
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

/* ============ Layout : 3 photos (1 grande gauche + 2 petites droite) ============ */

/* Pattern FB : photo 0 occupe la colonne gauche en pleine hauteur,
 * photos 1 et 2 empilées dans la colonne droite. Ratio global 4:3
 * (660px wide → 495px tall en feed center). */
function GridThree({
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
      style={{ aspectRatio: "4 / 3" }}
    >
      <div className="relative row-span-2 bg-night/5">
        <Image
          src={photos[0]!.url}
          alt={`${alt} — photo 1`}
          fill
          sizes="(max-width: 640px) 50vw, 340px"
          className="object-cover"
          unoptimized={photos[0]!.url.includes("?")}
        />
      </div>
      {photos.slice(1, 3).map((photo, idx) => (
        <div key={photo.id} className="relative bg-night/5">
          <Image
            src={photo.url}
            alt={`${alt} — photo ${idx + 2}`}
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

/* ============ Layout : 4 photos (grille 2×2 carrée) ============ */

function GridFour({
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
      {photos.slice(0, 4).map((photo, idx) => (
        <div
          key={photo.id}
          className="relative bg-night/5"
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

/* ============ Layout : 5+ photos (2 grandes top + 3 petites bottom) ============ */

/* Pattern FB classique : 2 photos en haut, 3 en bas, overlay "+N" sur
 * la 5ème si total > 5. Aspect global 3:2. */
function GridFivePlus({
  photos,
  alt,
  rounded,
}: {
  photos: PostPhoto[];
  alt: string;
  rounded: boolean;
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
      {/* Top row : 2 photos plein largeur, aspect 2:1 chacune. */}
      <div className="grid grid-cols-2 gap-[2px] flex-[2_2_0%]">
        {top.map((photo, idx) => (
          <div key={photo.id} className="relative bg-night/5">
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
      {/* Bottom row : 3 photos. Overlay +N sur la dernière si remaining > 0. */}
      <div className="grid grid-cols-3 gap-[2px] flex-[1_1_0%]">
        {bottom.map((photo, idx) => {
          const isLast = idx === bottom.length - 1;
          const showOverlay = isLast && remaining > 0;
          return (
            <div key={photo.id} className="relative bg-night/5">
              <Image
                src={photo.url}
                alt={`${alt} — photo ${idx + 3}`}
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
            </div>
          );
        })}
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
