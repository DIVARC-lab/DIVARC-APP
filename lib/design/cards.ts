/* DIVARC — Design System Structurel · Étape 2
 *
 * Tokens des cards : radius, shadow, border, background, minHeight.
 *
 * Choix DIVARC (≠ spec générique) :
 *   - Radius scale = 8/12/20/28/36 (la scale historique DIVARC, conservée
 *     par décision produit). PAS 8/12/16/20/24.
 *   - Couleurs : on pointe vers les tokens DIVARC existants
 *     (`var(--color-line)`, `var(--color-night)`, `var(--color-cream)`…)
 *     plutôt que des hex hardcodés ou des renaming navy/ivory.
 *   - Shadow : on réutilise les ombres définies dans globals.css
 *     (`var(--shadow-soft)`, etc.) — pas de réinvention.
 *
 * Ce module est consommé par <Card>, <Surface> et leurs sous-composants.
 */

import { spacing } from "./spacing";

export const CARD_TOKENS = {
  /* Radius — scale DIVARC (8/12/20/28/36). */
  radius: {
    sm: 8,
    md: 12,
    lg: 20,
    xl: 28,
    "2xl": 36,
    full: 9999,
  },

  /* Shadow — 5 niveaux d'élévation. `soft`/`night`/`gold` viennent
     déjà de globals.css. Les niveaux xs/sm/md/lg ajoutent la finesse
     manquante (élévation progressive). */
  shadow: {
    none: "none",
    xs: "0 1px 2px rgba(10, 31, 68, 0.04)",
    sm: "0 2px 4px rgba(10, 31, 68, 0.06)",
    md: "0 4px 8px rgba(10, 31, 68, 0.08), 0 2px 4px rgba(10, 31, 68, 0.04)",
    lg: "0 8px 16px rgba(10, 31, 68, 0.10), 0 4px 8px rgba(10, 31, 68, 0.06)",
    xl: "0 16px 32px rgba(10, 31, 68, 0.12), 0 8px 16px rgba(10, 31, 68, 0.08)",
    /* Aliases vers les ombres DIVARC historiques. */
    soft: "var(--shadow-soft)",
    night: "var(--shadow-night)",
    gold: "var(--shadow-gold)",
  },

  /* Border — 3 niveaux. `subtle` = line, `default` = line-strong. */
  border: {
    none: "none",
    subtle: "1px solid var(--color-line)",
    default: "1px solid var(--color-line-strong)",
  },

  /* Background — toujours via tokens, jamais de hex.
     Pointe sur les variables CSS définies dans :root de globals.css. */
  background: {
    surface: "var(--color-surface)",
    surface2: "var(--color-surface-2)",
    bg: "var(--color-bg)",
    bgSoft: "var(--color-bg-soft)",
    bgDeep: "var(--color-bg-deep)",
    cream: "var(--color-cream)",
    night: "var(--color-night)",
    transparent: "transparent",
  },

  /* Min-heights — assurent une cohérence visuelle d'alignement entre
     cards de même type (ex: liste de suggestions). */
  minHeight: {
    compact: 64,
    standard: 80,
    media: 120,
  },

  /* Paddings standards — ré-exposés depuis SPACING pour ergonomie. */
  padding: {
    none: 0,
    compact: { x: spacing.md, y: spacing.md },
    default: { x: spacing.xl, y: spacing.lg },
    feature: { x: spacing["2xl"], y: spacing["2xl"] },
  },
} as const;

export type CardRadius = keyof typeof CARD_TOKENS.radius;
export type CardShadow = keyof typeof CARD_TOKENS.shadow;
export type CardBorder = keyof typeof CARD_TOKENS.border;
export type CardBackground = keyof typeof CARD_TOKENS.background;
export type CardMinHeight = keyof typeof CARD_TOKENS.minHeight;
