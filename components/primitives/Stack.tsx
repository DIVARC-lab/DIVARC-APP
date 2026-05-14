/* DIVARC — Design System Structurel · Étape 5
 *
 * <Stack> — flex column avec gap typé.
 *
 * Remplace les `<div className="flex flex-col gap-X">` dispersés.
 * Force l'usage d'un token de spacing (jamais de gap arbitraire).
 *
 * Pourquoi un composant et pas juste Tailwind ?
 *   - Garantit la sémantique : un Stack = un empilement vertical, on
 *     lit le code en sachant directement la structure.
 *   - Permet `divider={<Divider />}` (séparateurs entre items) sans
 *     boilerplate React.Children.map dans chaque page.
 *   - Si un jour on veut changer la base (gap → margin pour cas IE
 *     ou subgrid), un seul endroit à modifier.
 */

import {
  Children,
  Fragment,
  isValidElement,
  type ReactNode,
} from "react";
import { cn } from "@/lib/utils/cn";
import { spacing, type SpacingToken } from "@/lib/design/spacing";

type StackProps = {
  gap?: SpacingToken;
  align?: "start" | "center" | "end" | "stretch" | "baseline";
  justify?: "start" | "center" | "end" | "between" | "around" | "evenly";
  divider?: ReactNode;
  as?: "div" | "section" | "article" | "ul" | "ol";
  className?: string;
  children: ReactNode;
};

const ALIGN_CLASS: Record<NonNullable<StackProps["align"]>, string> = {
  start: "items-start",
  center: "items-center",
  end: "items-end",
  stretch: "items-stretch",
  baseline: "items-baseline",
};

const JUSTIFY_CLASS: Record<NonNullable<StackProps["justify"]>, string> = {
  start: "justify-start",
  center: "justify-center",
  end: "justify-end",
  between: "justify-between",
  around: "justify-around",
  evenly: "justify-evenly",
};

export function Stack({
  gap = "lg",
  align = "stretch",
  justify,
  divider,
  as: Tag = "div",
  className,
  children,
}: StackProps) {
  const items = divider ? withDividers(children, divider) : children;

  return (
    <Tag
      className={cn(
        "flex flex-col",
        ALIGN_CLASS[align],
        justify ? JUSTIFY_CLASS[justify] : null,
        className,
      )}
      style={{ gap: spacing[gap] }}
    >
      {items}
    </Tag>
  );
}

function withDividers(children: ReactNode, divider: ReactNode): ReactNode {
  /* Children.toArray() filtre déjà null/undefined/booleans, mais on
     reste défensif côté types : on tape juste tous les enfants restants. */
  const arr = Children.toArray(children);
  return arr.map((child, i) => (
    <Fragment key={isValidElement(child) && child.key ? child.key : i}>
      {child}
      {i < arr.length - 1 ? divider : null}
    </Fragment>
  ));
}
