/* Filtres CSS preset pour les photos (V2 quick win).
 *
 * Application via property `filter` CSS dans le composer + persistance
 * au moment de l'upload (apply via canvas avant push storage).
 *
 * Pour V2 simple : on persiste le filtre dans post_photos (colonne
 * jsonb metadata existante côté V3) ; pour V2 light, on stocke juste
 * le nom du filtre côté client et on l'applique au render via classe
 * CSS (pas de re-encoding de la photo). Cohérence garantie car les
 * mêmes constants sont partagées entre composer et PostPhotos.
 *
 * V3 : appliquer le filtre via canvas avant upload pour figer le
 * rendu (résistant aux changements de classe CSS futurs).
 */

export type PhotoFilter =
  | "none"
  | "vivid"
  | "bw"
  | "vintage"
  | "gold"
  | "cool"
  | "warm";

export type PhotoFilterPreset = {
  id: PhotoFilter;
  label: string;
  /** CSS filter property value (browser-native, sans plugin). */
  cssFilter: string;
  /** Couleur de tile (preview) dans le picker. */
  swatchClass: string;
};

export const PHOTO_FILTERS: PhotoFilterPreset[] = [
  {
    id: "none",
    label: "Aucun",
    cssFilter: "none",
    swatchClass: "bg-gradient-to-br from-bg-soft to-line",
  },
  {
    id: "vivid",
    label: "Vif",
    cssFilter: "saturate(1.4) contrast(1.1) brightness(1.05)",
    swatchClass: "bg-gradient-to-br from-rose-400 to-amber-300",
  },
  {
    id: "bw",
    label: "N&B",
    cssFilter: "grayscale(1) contrast(1.1)",
    swatchClass: "bg-gradient-to-br from-night to-night-soft",
  },
  {
    id: "vintage",
    label: "Vintage",
    cssFilter: "sepia(0.4) saturate(0.9) contrast(0.95) brightness(0.95)",
    swatchClass: "bg-gradient-to-br from-amber-700 to-yellow-200",
  },
  {
    id: "gold",
    label: "Doré DIVARC",
    cssFilter: "saturate(1.2) brightness(1.05) hue-rotate(-8deg)",
    swatchClass: "bg-gradient-to-br from-gold to-gold-deep",
  },
  {
    id: "cool",
    label: "Froid",
    cssFilter: "saturate(0.9) hue-rotate(15deg) brightness(1.02)",
    swatchClass: "bg-gradient-to-br from-cyan-400 to-indigo-500",
  },
  {
    id: "warm",
    label: "Chaud",
    cssFilter: "saturate(1.15) hue-rotate(-12deg) brightness(1.05)",
    swatchClass: "bg-gradient-to-br from-orange-400 to-rose-500",
  },
];

export function getFilter(id: PhotoFilter): PhotoFilterPreset {
  return (
    PHOTO_FILTERS.find((f) => f.id === id) ??
    PHOTO_FILTERS[0]!
  );
}

/* Applique un filtre CSS à une image via canvas et retourne un Blob.
 * V3 : utilisé pour persister le filtre avant upload Storage. V2 :
 * utilisé uniquement pour preview, pas appliqué au upload. */
export async function applyFilterToImage(
  file: File,
  filter: PhotoFilter,
): Promise<Blob | null> {
  const preset = getFilter(filter);
  if (preset.id === "none") return file;

  return new Promise((resolve) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      try {
        const canvas = document.createElement("canvas");
        canvas.width = img.naturalWidth;
        canvas.height = img.naturalHeight;
        const ctx = canvas.getContext("2d");
        if (!ctx) {
          URL.revokeObjectURL(url);
          resolve(null);
          return;
        }
        ctx.filter = preset.cssFilter;
        ctx.drawImage(img, 0, 0);
        canvas.toBlob(
          (blob) => {
            URL.revokeObjectURL(url);
            resolve(blob);
          },
          "image/jpeg",
          0.92,
        );
      } catch {
        URL.revokeObjectURL(url);
        resolve(null);
      }
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      resolve(null);
    };
    img.src = url;
  });
}
