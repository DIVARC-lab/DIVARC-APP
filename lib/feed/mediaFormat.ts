/* Formats média Facebook officiels pour le feed.
 *
 *  - Portrait mobile : 1080 × 1350  → ratio 4:5  (0.800)
 *  - Paysage desktop : 1200 × 630   → ratio 40:21 (1.905)
 *  - Carré          : 1080 × 1080  → ratio 1:1   (1.000)
 *  - Reel           : 1080 × 1920  → ratio 9:16  (0.5625)
 *
 * Ces formats sont utilisés tels quels comme containers CSS
 * (`aspect-ratio` exact pour matcher les dimensions Facebook) afin de
 * garantir :
 *  - Aucun étirement (le ratio source est respecté via object-cover qui
 *    crop centré au pire, mais le container fait toujours le bon ratio)
 *  - Aucun overflow (overflow-hidden sur le wrapper)
 *  - Aucun flou (sizes Next/Image bien dimensionné par format)
 *  - Responsive natif (les aspect-ratio en CSS suivent la largeur du
 *    container)
 *  - Média centré (object-cover center par défaut + flex center)
 */

export const FB_FORMAT = {
  portrait: { w: 1080, h: 1350, ratio: 1080 / 1350, css: "1080 / 1350" }, // 4:5
  landscape: { w: 1200, h: 630, ratio: 1200 / 630, css: "1200 / 630" }, // 40:21
  square: { w: 1080, h: 1080, ratio: 1, css: "1 / 1" }, // 1:1
  reel: { w: 1080, h: 1920, ratio: 1080 / 1920, css: "1080 / 1920" }, // 9:16
} as const;

export type MediaShape = keyof typeof FB_FORMAT;

/* Seuils de classification basés sur les frontières Facebook :
 *  - reel       : ratio ≤ 0.65 (très vertical, type 9:16)
 *  - portrait   : 0.65 < ratio ≤ 0.92 (centre sur 4:5 = 0.8)
 *  - square     : 0.92 < ratio ≤ 1.15 (centre sur 1:1)
 *  - landscape  : ratio > 1.15 (au-delà du carré → paysage 1.91:1) */
export function classifyMediaShape(
  width: number | null | undefined,
  height: number | null | undefined,
): MediaShape {
  if (!width || !height || width <= 0 || height <= 0) {
    return "square";
  }
  const ratio = width / height;
  if (ratio <= 0.65) return "reel";
  if (ratio <= 0.92) return "portrait";
  if (ratio <= 1.15) return "square";
  return "landscape";
}

/* Classes Tailwind aspect-ratio pour chaque format. Utilise les
 * dimensions Facebook exactes pour que le navigateur calcule la hauteur
 * pile au pixel près à partir de la largeur disponible. */
export const SHAPE_ASPECT_CLASS: Record<MediaShape, string> = {
  portrait: "aspect-[1080/1350]",
  landscape: "aspect-[1200/630]",
  square: "aspect-square",
  reel: "aspect-[1080/1920]",
};

/* `sizes` Next/Image optimal par format pour servir la bonne résolution :
 *  - portrait/square : ~600px max width en mobile feed, ~680px desktop
 *  - landscape : full width mobile, ~680px desktop
 *  - reel : ~480px max (largeur vertical strip) */
export const SHAPE_SIZES: Record<MediaShape, string> = {
  portrait: "(max-width: 640px) 100vw, 680px",
  landscape: "(max-width: 640px) 100vw, 680px",
  square: "(max-width: 640px) 100vw, 680px",
  reel: "(max-width: 640px) 100vw, 480px",
};

/* Hauteur max approchée pour le wrapper du média dans le feed.
 *  - reel : 720px (vertical étiré) → max-h-[720px]
 *  - autres : pas de cap dur (l'aspect-ratio + width naturelle suffit) */
export const SHAPE_MAX_HEIGHT: Record<MediaShape, string> = {
  portrait: "",
  landscape: "",
  square: "",
  reel: "max-h-[720px]",
};
