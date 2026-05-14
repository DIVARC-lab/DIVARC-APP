/* DIVARC — Design System Structurel · Étape 11b
 *
 * <SectionHeader> — header de section intra-page.
 *
 * Pour structurer les blocs DANS une page (ex: "Posts récents (12)",
 * "Suggestions", "Activité"). Plus modeste qu'un PageHeader.
 *
 * - level 2 : h2, titre 20px, default
 * - level 3 : h3, titre 16-18px, pour sous-sections
 *
 * Anti-pattern : utiliser <h2>/<h3> direct dans une page — toujours
 * passer par SectionHeader pour cohérence typo + count + action.
 */

import type { ReactNode } from "react";
import { cn } from "@/lib/utils/cn";
import { Row } from "../primitives/Row";
import { Stack } from "../primitives/Stack";

type SectionHeaderProps = {
  title: ReactNode;
  subtitle?: ReactNode;
  /* Compteur affiché entre parenthèses, ex: "(12)". 0 = affiché aussi. */
  count?: number;
  /* Bouton ou lien à droite ("Voir tout", "+ Ajouter"). */
  action?: ReactNode;
  level?: 2 | 3;
  divider?: "top" | "bottom" | "none";
  className?: string;
};

export function SectionHeader({
  title,
  subtitle,
  count,
  action,
  level = 2,
  divider = "none",
  className,
}: SectionHeaderProps) {
  const Tag = level === 2 ? "h2" : "h3";
  const titleClass =
    level === 2
      ? "text-xl font-semibold text-night"
      : "text-base font-semibold text-night";

  return (
    <header className={cn(className)}>
      {divider === "top" ? <div className="border-t border-line mb-6" /> : null}
      <Row justify="between" align="end" gap="md">
        <Stack gap="xs" className="min-w-0">
          <Row align="baseline" gap="sm">
            <Tag className={titleClass}>{title}</Tag>
            {count !== undefined ? (
              <span className="text-sm text-night-muted tabular-nums">
                ({count})
              </span>
            ) : null}
          </Row>
          {subtitle ? (
            <p className="text-sm text-night-muted">{subtitle}</p>
          ) : null}
        </Stack>
        {action ? <div className="shrink-0">{action}</div> : null}
      </Row>
      {divider === "bottom" ? (
        <div className="border-t border-line mt-2" />
      ) : null}
    </header>
  );
}
