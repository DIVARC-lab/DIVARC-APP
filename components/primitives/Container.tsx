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

type ContainerProps = {
  maxWidth?: ContainerWidth;
  /* "page" = padding responsive standardisé. Sinon, token SemanticSpacing. */
  paddingX?: "page" | "none" | SpacingToken;
  paddingY?: SpacingToken;
  as?: "div" | "section" | "article" | "main";
  className?: string;
  children: ReactNode;
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

  return (
    <Tag
      className={cn("mx-auto w-full", px, className)}
      style={{
        maxWidth: CONTAINER_WIDTHS[maxWidth],
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
