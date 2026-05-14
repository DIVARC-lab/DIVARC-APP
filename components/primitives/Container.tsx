/* DIVARC — Design System Structurel · Étape 4
 *
 * <Container> — primitive de mise en page horizontale.
 *
 * Centralise toute la logique de max-width + padding horizontal de page.
 * REMPLACE les `<div className="max-w-2xl mx-auto px-4">` dispersés.
 *
 * Choix produit :
 *   - 5 max-widths sémantiques (narrow→full) via CONTAINER_WIDTHS.
 *   - `paddingX="page"` par défaut = px-4 sur mobile, lg:px-6 sur desktop
 *     (alignement spec : PAGE_PADDING_X_MOBILE=16, PAGE_PADDING_X_DESKTOP=24).
 *   - `paddingY` optionnel via tokens SemanticSpacing.
 *   - `maxWidth` accepte un token simple OU un objet responsive
 *     `{ mobile, tablet?, desktop }` pour absorber les pages historiques
 *     style `max-w-2xl lg:max-w-5xl` (marketplace, jobs, c/[slug]…).
 *
 * Anti-patterns à éviter :
 *   - max-width custom en pixels : utiliser un des 5 presets.
 *   - padding hardcodé : utiliser `paddingX="page"` ou un token.
 */

import type { ReactNode } from "react";
import { cn } from "@/lib/utils/cn";
import {
  CONTAINER_WIDTHS,
  type ContainerWidth,
} from "@/lib/design/layout";
import { spacing, type SpacingToken } from "@/lib/design/spacing";

type ResponsiveMaxWidth = {
  mobile: ContainerWidth;
  tablet?: ContainerWidth;
  desktop: ContainerWidth;
};

type ContainerProps = {
  maxWidth?: ContainerWidth | ResponsiveMaxWidth;
  /* "page" = padding responsive standardisé. Sinon, token SemanticSpacing. */
  paddingX?: "page" | "none" | SpacingToken;
  paddingY?: SpacingToken;
  as?: "div" | "section" | "article" | "main";
  className?: string;
  children: ReactNode;
};

/* Classes statiques pré-déclarées pour que Tailwind v4 les détecte au scan.
 * Indispensable : `max-w-[Xpx]` dynamique ne serait pas généré sinon. */
const MAX_W_MOBILE: Record<ContainerWidth, string> = {
  narrow: "max-w-[480px]",
  text: "max-w-[680px]",
  default: "max-w-[1100px]",
  wide: "max-w-[1280px]",
  full: "max-w-[1536px]",
};

const MAX_W_TABLET: Record<ContainerWidth, string> = {
  narrow: "md:max-w-[480px]",
  text: "md:max-w-[680px]",
  default: "md:max-w-[1100px]",
  wide: "md:max-w-[1280px]",
  full: "md:max-w-[1536px]",
};

const MAX_W_DESKTOP: Record<ContainerWidth, string> = {
  narrow: "lg:max-w-[480px]",
  text: "lg:max-w-[680px]",
  default: "lg:max-w-[1100px]",
  wide: "lg:max-w-[1280px]",
  full: "lg:max-w-[1536px]",
};

export function Container({
  maxWidth = "default",
  paddingX = "page",
  paddingY,
  as: Tag = "div",
  className,
  children,
}: ContainerProps) {
  const px =
    paddingX === "page"
      ? "px-4 lg:px-6"
      : paddingX === "none"
        ? "px-0"
        : null;

  const customPaddingX =
    paddingX !== "page" && paddingX !== "none" && paddingX !== undefined
      ? spacing[paddingX]
      : undefined;

  /* maxWidth peut être :
   *   - un string (token simple) → applique en style inline pour back-compat
   *   - un object responsive → applique via classes Tailwind statiques. */
  const isResponsive = typeof maxWidth === "object";
  const responsiveClasses = isResponsive
    ? cn(
        MAX_W_MOBILE[maxWidth.mobile],
        maxWidth.tablet ? MAX_W_TABLET[maxWidth.tablet] : null,
        MAX_W_DESKTOP[maxWidth.desktop],
      )
    : null;
  const inlineMaxWidth = isResponsive
    ? undefined
    : CONTAINER_WIDTHS[maxWidth];

  return (
    <Tag
      className={cn("mx-auto w-full", responsiveClasses, px, className)}
      style={{
        maxWidth: inlineMaxWidth,
        paddingLeft: customPaddingX,
        paddingRight: customPaddingX,
        paddingTop: paddingY ? spacing[paddingY] : undefined,
        paddingBottom: paddingY ? spacing[paddingY] : undefined,
      }}
    >
      {children}
    </Tag>
  );
}
