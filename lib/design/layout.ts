/* DIVARC — Design System Structurel · Étape 3
 *
 * Tokens de layout : z-index, breakpoints responsive, max-widths
 * de container par contexte.
 *
 * Pourquoi un fichier centralisé pour le z-index ?
 *   Sans hiérarchie unique, les composants accumulent des `z-50` au
 *   doigt mouillé → bugs où la modale passe sous le toast, ou la
 *   sticky nav passe au-dessus de tout. On définit une ÉCHELLE.
 *
 * Pourquoi des breakpoints centralisés alors qu'on a Tailwind ?
 *   Pour les media-queries JS (matchMedia côté client) et le SSR
 *   qui ont besoin des mêmes seuils que Tailwind. La source de
 *   vérité ici doit matcher Tailwind v4 par défaut (sm/md/lg/xl/2xl).
 */

export const Z_INDEX = {
  /* Couche de base — tout le contenu normal de page. */
  base: 0,
  /* Éléments flottants dans le flux (dropdowns inline). */
  dropdown: 10,
  /* Headers / barres collantes qui suivent le scroll. */
  sticky: 20,
  /* Éléments fixés (bottom-nav mobile, FAB). */
  fixed: 30,
  /* Backdrop de modale (overlay sombre). */
  modalBackdrop: 40,
  /* Modales et drawers. */
  modal: 50,
  /* Popovers (au-dessus des modales si lancés depuis elles). */
  popover: 60,
  /* Toasts/notifications — au-dessus de tout sauf tooltip. */
  toast: 70,
  /* Tooltips — toujours au sommet visuel. */
  tooltip: 80,
  /* Échappatoire pour cas exceptionnels (debug, dev overlay). */
  top: 90,
} as const;

export type ZIndexToken = keyof typeof Z_INDEX;

/* Breakpoints — doivent matcher Tailwind v4 par défaut. Si on
   override Tailwind un jour, on synchronise ici. */
export const BREAKPOINTS = {
  sm: 640,
  md: 768,
  lg: 1024,
  xl: 1280,
  "2xl": 1536,
} as const;

export type Breakpoint = keyof typeof BREAKPOINTS;

/* Max-widths des containers par contexte produit DIVARC.
 * Chaque page choisit explicitement son `maxWidth`. */
export const CONTAINER_WIDTHS = {
  /* Auth, settings simples, dialogs centrés. */
  narrow: 480,
  /* Feed posts, articles long-form, blog. La largeur "lecture". */
  text: 680,
  /* Profil, page Cercle, settings complexes. La largeur "défaut". */
  default: 1100,
  /* Marketplace, listes filtrables avec sidebar. */
  wide: 1280,
  /* Dashboards admin, ads-manager, vues data-heavy. */
  full: 1536,
} as const;

export type ContainerWidth = keyof typeof CONTAINER_WIDTHS;

/* Helper — convertit un breakpoint en media-query CSS, utile pour
   les composants qui font du matchMedia ou injectent du CSS. */
export function mediaQuery(bp: Breakpoint, direction: "up" | "down" = "up"): string {
  const value = BREAKPOINTS[bp];
  return direction === "up"
    ? `(min-width: ${value}px)`
    : `(max-width: ${value - 1}px)`;
}
