/* DIVARC — Design System Structurel · Étape 7b
 *
 * <Surface> — zone de fond paramétrable. Brique de base sous Card.
 *
 * À utiliser quand on a besoin d'un fond/bordure/ombre/radius sans
 * la sémantique complète d'une <Card> (qui implique header/body/footer).
 *
 * Exemples d'usage :
 *   - Sidebar background (variant="bgSoft")
 *   - Hero section (variant="bgDeep")
 *   - Empty state container
 *   - Banner premium (variant="night")
 *
 * Si tu hésites entre Surface et Card : utilise Card si tu y mets du
 * contenu structuré (titre + corps + actions). Sinon Surface.
 */

import type { ReactNode } from "react";
import { cn } from "@/lib/utils/cn";
import {
  CARD_TOKENS,
  type CardBackground,
  type CardBorder,
  type CardRadius,
  type CardShadow,
} from "@/lib/design/cards";
import { spacing, type SpacingToken } from "@/lib/design/spacing";

type SurfaceProps = {
  variant?: CardBackground;
  radius?: CardRadius;
  shadow?: CardShadow;
  border?: CardBorder;
  padding?: SpacingToken;
  paddingX?: SpacingToken;
  paddingY?: SpacingToken;
  as?: "div" | "section" | "article" | "aside" | "header" | "footer";
  className?: string;
  children: ReactNode;
};

export function Surface({
  variant = "surface",
  radius = "md",
  shadow = "none",
  border = "none",
  padding,
  paddingX,
  paddingY,
  as: Tag = "div",
  className,
  children,
}: SurfaceProps) {
  const radiusValue = CARD_TOKENS.radius[radius];
  const isNightBg = variant === "night";

  return (
    <Tag
      className={cn(isNightBg && "text-cream", className)}
      style={{
        background: CARD_TOKENS.background[variant],
        border: CARD_TOKENS.border[border],
        boxShadow: CARD_TOKENS.shadow[shadow],
        borderRadius: radiusValue === 9999 ? "9999px" : `${radiusValue}px`,
        padding: padding ? spacing[padding] : undefined,
        paddingLeft: paddingX ? spacing[paddingX] : undefined,
        paddingRight: paddingX ? spacing[paddingX] : undefined,
        paddingTop: paddingY ? spacing[paddingY] : undefined,
        paddingBottom: paddingY ? spacing[paddingY] : undefined,
      }}
    >
      {children}
    </Tag>
  );
}
