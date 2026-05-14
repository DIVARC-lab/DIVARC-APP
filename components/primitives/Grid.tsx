/* DIVARC — Design System Structurel · Étape 7a
 *
 * <Grid> — CSS grid responsive avec colonnes typées.
 *
 * Remplace les `<div className="grid grid-cols-X md:grid-cols-Y">`
 * éparpillés et garantit des breakpoints cohérents.
 *
 * Limitation Tailwind v4 (et v3) : on NE peut PAS utiliser des classes
 * dynamiques `grid-cols-${n}`. Le scanner JIT ne les détecte qu'au
 * scan source. On pré-déclare donc 1→6 cols en classes statiques
 * (couvre 99% des cas DIVARC : marketplace 4 cols, suggestions 3 cols,
 * cards 2 cols…). Au-delà : `customCols` en escape-hatch.
 */

import type { ReactNode } from "react";
import { cn } from "@/lib/utils/cn";
import { spacing, type SpacingToken } from "@/lib/design/spacing";

type Cols = 1 | 2 | 3 | 4 | 5 | 6;

type ResponsiveCols = {
  mobile: Cols;
  tablet?: Cols;
  desktop: Cols;
};

type GridProps = {
  cols?: Cols | ResponsiveCols;
  gap?: SpacingToken;
  /* Escape hatch — répétition manuelle. Format CSS: "repeat(7, 1fr)"
     ou "200px 1fr 100px". Préférer `cols` quand possible. */
  customCols?: string;
  className?: string;
  children: ReactNode;
};

const MOBILE_COLS: Record<Cols, string> = {
  1: "grid-cols-1",
  2: "grid-cols-2",
  3: "grid-cols-3",
  4: "grid-cols-4",
  5: "grid-cols-5",
  6: "grid-cols-6",
};

const TABLET_COLS: Record<Cols, string> = {
  1: "md:grid-cols-1",
  2: "md:grid-cols-2",
  3: "md:grid-cols-3",
  4: "md:grid-cols-4",
  5: "md:grid-cols-5",
  6: "md:grid-cols-6",
};

const DESKTOP_COLS: Record<Cols, string> = {
  1: "lg:grid-cols-1",
  2: "lg:grid-cols-2",
  3: "lg:grid-cols-3",
  4: "lg:grid-cols-4",
  5: "lg:grid-cols-5",
  6: "lg:grid-cols-6",
};

export function Grid({
  cols = 1,
  gap = "lg",
  customCols,
  className,
  children,
}: GridProps) {
  const colsClass = customCols
    ? null
    : typeof cols === "number"
      ? MOBILE_COLS[cols]
      : cn(
          MOBILE_COLS[cols.mobile],
          cols.tablet ? TABLET_COLS[cols.tablet] : null,
          DESKTOP_COLS[cols.desktop],
        );

  return (
    <div
      className={cn("grid", colsClass, className)}
      style={{
        gap: spacing[gap],
        gridTemplateColumns: customCols ?? undefined,
      }}
    >
      {children}
    </div>
  );
}
