/* AR / video effects — V3.12 catalogue.
 *
 * V3.12 ship : effets CSS filter appliqués à la <video> au playback. Pas
 * de tracking facial (mediapipe arrive V4 avec face_mesh + glasses/mask
 * overlay). Les effets CSS sont gratuits côté perf et fonctionnent sur
 * tous les browsers.
 *
 * Persisté dans reels.effects_used (column existante migration 0054) :
 * array de string ids. Composer applique en preview, ReelView au playback.
 *
 * V4 ext : effets WebGL/canvas avancés (face landmarks, AR overlays). */

export type ReelEffect = {
  id: string;
  label: string;
  /** CSS filter property value appliqué au <video>. */
  cssFilter: string;
  /** Swatch couleur pour le picker UX. */
  swatchClass: string;
  /** Marqueur indicateur AR (V4 — pour l'instant tous CSS). */
  kind: "css" | "ar";
};

export const REEL_EFFECTS: ReelEffect[] = [
  {
    id: "none",
    label: "Aucun",
    cssFilter: "none",
    swatchClass: "bg-gradient-to-br from-bg-soft to-line",
    kind: "css",
  },
  {
    id: "vivid",
    label: "Vif",
    cssFilter: "saturate(1.5) contrast(1.15) brightness(1.05)",
    swatchClass: "bg-gradient-to-br from-rose-400 to-amber-300",
    kind: "css",
  },
  {
    id: "vintage",
    label: "Vintage",
    cssFilter: "sepia(0.45) saturate(0.9) contrast(0.95) brightness(0.95)",
    swatchClass: "bg-gradient-to-br from-amber-700 to-yellow-200",
    kind: "css",
  },
  {
    id: "noir",
    label: "Noir",
    cssFilter: "grayscale(1) contrast(1.2) brightness(0.95)",
    swatchClass: "bg-gradient-to-br from-night to-night-soft",
    kind: "css",
  },
  {
    id: "dream",
    label: "Rêve",
    cssFilter: "blur(0.6px) saturate(1.2) brightness(1.1) contrast(0.95)",
    swatchClass: "bg-gradient-to-br from-purple-300 to-pink-300",
    kind: "css",
  },
  {
    id: "cool",
    label: "Froid",
    cssFilter: "saturate(0.9) hue-rotate(20deg) brightness(1.02)",
    swatchClass: "bg-gradient-to-br from-cyan-400 to-indigo-500",
    kind: "css",
  },
  {
    id: "warm",
    label: "Chaud",
    cssFilter: "saturate(1.2) hue-rotate(-15deg) brightness(1.06)",
    swatchClass: "bg-gradient-to-br from-orange-400 to-rose-500",
    kind: "css",
  },
  {
    id: "gold-divarc",
    label: "Doré DIVARC",
    cssFilter: "saturate(1.3) brightness(1.08) hue-rotate(-8deg) contrast(1.05)",
    swatchClass: "bg-gradient-to-br from-gold to-gold-deep",
    kind: "css",
  },
  {
    id: "cyberpunk",
    label: "Cyberpunk",
    cssFilter:
      "saturate(1.6) contrast(1.2) hue-rotate(280deg) brightness(0.95)",
    swatchClass: "bg-gradient-to-br from-fuchsia-500 to-cyan-400",
    kind: "css",
  },
];

export function getEffect(id: string): ReelEffect {
  return REEL_EFFECTS.find((e) => e.id === id) ?? REEL_EFFECTS[0]!;
}

/* Concatène les cssFilter de plusieurs effets (V3.12 : on ne stack qu'1
 * effet à la fois pour simplifier UX, mais helper prêt pour V4). */
export function combineFilters(effectIds: string[]): string {
  const filters = effectIds
    .map((id) => getEffect(id).cssFilter)
    .filter((f) => f !== "none");
  return filters.length === 0 ? "none" : filters.join(" ");
}
