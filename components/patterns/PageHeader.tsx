/* DIVARC — Design System Structurel · Étape 11a
 *
 * <PageHeader> — header de page standardisé.
 *
 * 3 variants :
 *   - standard  : titre 32-40px, eyebrow kicker, subtitle, actions à droite.
 *   - hero      : titre 54px, padding vertical large, KickerLabel + sous-titre
 *                 inspirant (landing-style). Pour pages "vitrine".
 *   - compact   : titre 22px, padding réduit, eyebrow optionnel.
 *
 * Utilise DisplayHeading (Instrument Serif) + KickerLabel (gold uppercase)
 * qui existent déjà dans components/ui/. Ne PAS dupliquer.
 *
 * Anti-pattern : ne pas mettre `<h1>` ou typo display ad-hoc dans une
 * page — toujours passer par ce composant.
 */

import type { ReactNode } from "react";
import { cn } from "@/lib/utils/cn";
import { Container } from "../primitives/Container";
import { Row } from "../primitives/Row";
import { Stack } from "../primitives/Stack";
import { DisplayHeading } from "../ui/DisplayHeading";
import { KickerLabel } from "../ui/KickerLabel";

type PageHeaderProps = {
  title: ReactNode;
  subtitle?: ReactNode;
  /* Petit label gold uppercase au-dessus du titre. Sans le "·" prefix. */
  eyebrow?: ReactNode;
  variant?: "standard" | "hero" | "compact";
  /* Boutons / CTA à droite du titre. */
  actions?: ReactNode;
  /* Ajoute une bordure sous le header pour séparer du contenu. */
  divider?: boolean;
  className?: string;
};

export function PageHeader({
  title,
  subtitle,
  eyebrow,
  variant = "standard",
  actions,
  divider = false,
  className,
}: PageHeaderProps) {
  if (variant === "hero") {
    return (
      <section
        className={cn(
          "py-12 lg:py-20",
          divider && "border-b border-line",
          className,
        )}
      >
        <Container maxWidth="default" paddingX="page">
          <Stack gap="lg" align="start">
            {eyebrow ? <KickerLabel>{eyebrow}</KickerLabel> : null}
            <DisplayHeading as="h1" size="xl">
              {title}
            </DisplayHeading>
            {subtitle ? (
              <p className="text-lg lg:text-xl text-night-muted max-w-2xl">
                {subtitle}
              </p>
            ) : null}
            {actions ? <div className="pt-2">{actions}</div> : null}
          </Stack>
        </Container>
      </section>
    );
  }

  if (variant === "compact") {
    return (
      <header
        className={cn("py-4", divider && "border-b border-line", className)}
      >
        <Container maxWidth="default" paddingX="page">
          <Row justify="between" align="center" gap="md">
            <Stack gap="xs" className="min-w-0">
              {eyebrow ? (
                <p className="text-[11px] font-extrabold uppercase tracking-[0.18em] text-night-muted">
                  {eyebrow}
                </p>
              ) : null}
              <h1 className="text-xl font-semibold text-night truncate">
                {title}
              </h1>
              {subtitle ? (
                <p className="text-sm text-night-muted truncate">{subtitle}</p>
              ) : null}
            </Stack>
            {actions ? <div className="shrink-0">{actions}</div> : null}
          </Row>
        </Container>
      </header>
    );
  }

  /* standard */
  return (
    <header
      className={cn("py-6 lg:py-8", divider && "border-b border-line", className)}
    >
      <Container maxWidth="default" paddingX="page">
        <Row justify="between" align="end" gap="lg" wrap>
          <Stack gap="sm" className="min-w-0">
            {eyebrow ? <KickerLabel>{eyebrow}</KickerLabel> : null}
            <DisplayHeading as="h1" size="lg">
              {title}
            </DisplayHeading>
            {subtitle ? (
              <p className="text-base text-night-muted max-w-2xl">
                {subtitle}
              </p>
            ) : null}
          </Stack>
          {actions ? <div className="shrink-0">{actions}</div> : null}
        </Row>
      </Container>
    </header>
  );
}
