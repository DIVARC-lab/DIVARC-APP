import type { PostBackgroundColor } from "@/lib/database.types";

/* Mode "Pensée rapide" — gradients de fond pour textes courts.
 *
 * Convention : 8 valeurs alignées avec le check constraint de la
 * migration 0052_posts_enriched.sql. Chaque palette retourne :
 *   - tailwindBg : string (className tailwind à appliquer)
 *   - textColor : "cream" | "night" — couleur de texte adaptée au contraste
 *   - label : nom human-friendly (FR)
 *
 * Ordre de cycle : null → navy → gold → cream → gradient_dawn →
 * gradient_dusk → gradient_ocean → gradient_forest → gradient_rose → null.
 */

export type BackgroundPalette = {
  id: PostBackgroundColor;
  /** className tailwind à appliquer sur le background. */
  bg: string;
  /** Couleur du texte par défaut sur ce fond. */
  text: "cream" | "night";
  label: string;
};

export const BACKGROUND_PALETTES: BackgroundPalette[] = [
  {
    id: "navy",
    bg: "bg-night",
    text: "cream",
    label: "Nuit",
  },
  {
    id: "gold",
    bg: "bg-gradient-to-br from-gold to-gold-deep",
    text: "night",
    label: "Or",
  },
  {
    id: "cream",
    bg: "bg-cream",
    text: "night",
    label: "Crème",
  },
  {
    id: "gradient_dawn",
    bg: "bg-gradient-to-br from-amber-200 via-rose-300 to-rose-500",
    text: "cream",
    label: "Aube",
  },
  {
    id: "gradient_dusk",
    bg: "bg-gradient-to-br from-indigo-500 via-purple-500 to-rose-600",
    text: "cream",
    label: "Crépuscule",
  },
  {
    id: "gradient_ocean",
    bg: "bg-gradient-to-br from-cyan-400 via-blue-500 to-indigo-700",
    text: "cream",
    label: "Océan",
  },
  {
    id: "gradient_forest",
    bg: "bg-gradient-to-br from-emerald-400 via-emerald-600 to-teal-800",
    text: "cream",
    label: "Forêt",
  },
  {
    id: "gradient_rose",
    bg: "bg-gradient-to-br from-pink-300 via-rose-500 to-fuchsia-700",
    text: "cream",
    label: "Rose",
  },
];

/* Limite caractères pour activer le mode "pensée rapide" (gradient).
 * Au-delà, on bascule en textarea normal pour préserver la lisibilité. */
export const THOUGHT_MODE_MAX_CHARS = 130;

export function getPalette(
  id: PostBackgroundColor | null,
): BackgroundPalette | null {
  if (!id) return null;
  return BACKGROUND_PALETTES.find((p) => p.id === id) ?? null;
}

/** Cycle dans l'ordre : null → 8 palettes → null (retour à textarea). */
export function nextBackgroundColor(
  current: PostBackgroundColor | null,
): PostBackgroundColor | null {
  if (current === null) return BACKGROUND_PALETTES[0]?.id ?? null;
  const idx = BACKGROUND_PALETTES.findIndex((p) => p.id === current);
  if (idx === -1 || idx === BACKGROUND_PALETTES.length - 1) return null;
  return BACKGROUND_PALETTES[idx + 1]?.id ?? null;
}
