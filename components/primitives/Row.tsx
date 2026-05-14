/* DIVARC — Design System Structurel · Étape 6
 *
 * <Row> — flex row avec gap typé. Pendant horizontal de <Stack>.
 *
 * Remplace les `<div className="flex items-center gap-X">` ad-hoc.
 *
 * Différence avec Stack :
 *   - Align défaut = "center" (en pratique 90% des rows centrent
 *     verticalement le contenu : avatar + texte, icon + label).
 *   - Wrap optionnel (utile pour barres d'actions sur petit écran).
 *   - Pas de divider (rarement vertical entre éléments d'une row).
 */

import type { ReactNode } from "react";
import { cn } from "@/lib/utils/cn";
import { spacing, type SpacingToken } from "@/lib/design/spacing";

type RowProps = {
  gap?: SpacingToken;
  align?: "start" | "center" | "end" | "stretch" | "baseline";
  justify?: "start" | "center" | "end" | "between" | "around" | "evenly";
  wrap?: boolean;
  as?: "div" | "section" | "header" | "footer" | "nav";
  className?: string;
  children: ReactNode;
};

const ALIGN_CLASS: Record<NonNullable<RowProps["align"]>, string> = {
  start: "items-start",
  center: "items-center",
  end: "items-end",
  stretch: "items-stretch",
  baseline: "items-baseline",
};

const JUSTIFY_CLASS: Record<NonNullable<RowProps["justify"]>, string> = {
  start: "justify-start",
  center: "justify-center",
  end: "justify-end",
  between: "justify-between",
  around: "justify-around",
  evenly: "justify-evenly",
};

export function Row({
  gap = "md",
  align = "center",
  justify = "start",
  wrap = false,
  as: Tag = "div",
  className,
  children,
}: RowProps) {
  return (
    <Tag
      className={cn(
        "flex",
        wrap && "flex-wrap",
        ALIGN_CLASS[align],
        JUSTIFY_CLASS[justify],
        className,
      )}
      style={{ gap: spacing[gap] }}
    >
      {children}
    </Tag>
  );
}
