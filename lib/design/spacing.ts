/* DIVARC — Design System Structurel · Étape 1
 *
 * Scale d'espacement RIGIDE. Multiples de 4px uniquement.
 * Toute valeur hors de cette scale est une erreur.
 *
 * Deux exports :
 *   - `spacing` : la scale brute (pixels), utilisée dans les primitives
 *     (`style={{ gap: spacing.lg }}` ou tokens Tailwind via les classes).
 *   - `SPACING` : alias sémantiques (CARD_PADDING_X, PAGE_PADDING_X_MOBILE…)
 *     utilisés quand le sens importe plus que la valeur.
 *
 * NE PAS importer dans du code serveur lourd (RSC) : ces constantes
 * sont des nombres, pas des effets de bord — c'est tree-shakable.
 */

export const spacing = {
  none: 0,
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  "2xl": 24,
  "3xl": 32,
  "4xl": 48,
  "5xl": 64,
  "6xl": 96,
  "7xl": 128,
} as const;

export type SpacingToken = keyof typeof spacing;

/* === Aliases sémantiques ===
 * Pour les usages où le nom métier > la valeur brute. Si on change
 * un jour `CARD_PADDING_X` de 20px à 24px, on le change ici une fois.
 */
export const SPACING = {
  /* Cards — padding interne */
  CARD_PADDING_X: spacing.xl,
  CARD_PADDING_Y: spacing.lg,
  CARD_PADDING_X_COMPACT: spacing.lg,
  CARD_PADDING_Y_COMPACT: spacing.md,

  /* Cards — gaps internes */
  CARD_ITEM_GAP: spacing.md,
  CARD_SECTION_GAP: spacing.lg,

  /* Entre cards */
  CARDS_GAP: spacing.lg,

  /* Page — rythme vertical */
  SECTION_GAP: spacing["2xl"],
  BLOCK_GAP: spacing["3xl"],

  /* Page — padding externe */
  PAGE_PADDING_X_MOBILE: spacing.lg,
  PAGE_PADDING_X_DESKTOP: spacing["2xl"],
  PAGE_PADDING_Y_TOP: spacing["2xl"],
  PAGE_PADDING_Y_BOTTOM: spacing["4xl"],

  /* Forms */
  FIELD_GAP: spacing.lg,
  LABEL_TO_INPUT: spacing.sm,
  INPUT_PADDING_X: spacing.md,
  INPUT_PADDING_Y: spacing.md,

  /* Lists */
  LIST_ITEM_GAP: spacing.sm,
  LIST_ITEM_PADDING_X: spacing.lg,
  LIST_ITEM_PADDING_Y: spacing.md,

  /* Buttons */
  BUTTON_PADDING_X: spacing.lg,
  BUTTON_PADDING_Y: spacing.md,
  BUTTON_PADDING_X_SM: spacing.md,
  BUTTON_PADDING_Y_SM: spacing.sm,
} as const;

export type SemanticSpacing = keyof typeof SPACING;

/* Helpers — convertit un token en chaîne CSS (px ou rem).
 * Préférer `px` pour éviter les bugs root-font-size sur PWA. */
export function px(token: SpacingToken): string {
  return `${spacing[token]}px`;
}
