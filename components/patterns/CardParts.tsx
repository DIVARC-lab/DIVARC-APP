/* DIVARC — Design System Structurel · Étape 9
 *
 * Sous-composants <Card> : CardHeader, CardBody, CardFooter, CardMedia.
 *
 * À utiliser TOUJOURS ensemble pour structurer une card cohérente :
 *
 *   <Card variant="default">
 *     <CardHeader title="…" subtitle="…" avatar={…} trailing={<Menu/>} />
 *     <CardBody>…</CardBody>
 *     <CardFooter align="between">…</CardFooter>
 *   </Card>
 *
 * Note : ces sous-composants ne sont PAS dans Card.tsx pour garder
 * un fichier par responsabilité (Card.tsx = variants + wrapper, CardParts.tsx
 * = structure interne). Import depuis le même chemin patterns/.
 */

import type { ReactNode } from "react";
import { cn } from "@/lib/utils/cn";
import { spacing, type SpacingToken } from "@/lib/design/spacing";
import { Row } from "../primitives/Row";
import { Stack } from "../primitives/Stack";

/* ============ CardHeader ============ */

type CardHeaderProps = {
  title: ReactNode;
  subtitle?: ReactNode;
  /* Avatar à gauche du titre (généralement <Avatar size="md" />). */
  avatar?: ReactNode;
  /* Action à droite : bouton, badge, menu kebab. */
  trailing?: ReactNode;
  /* Ajoute un séparateur sous le header (pleine largeur via margin négative). */
  divider?: boolean;
  className?: string;
};

export function CardHeader({
  title,
  subtitle,
  avatar,
  trailing,
  divider,
  className,
}: CardHeaderProps) {
  return (
    <>
      <Row align="center" gap="md" className={cn("w-full", className)}>
        {avatar ? <div className="shrink-0">{avatar}</div> : null}
        <Stack gap="xs" className="flex-1 min-w-0">
          <h3 className="font-semibold text-night truncate">{title}</h3>
          {subtitle ? (
            <p className="text-sm text-night-muted truncate">{subtitle}</p>
          ) : null}
        </Stack>
        {trailing ? <div className="shrink-0">{trailing}</div> : null}
      </Row>
      {divider ? <CardDivider className="mt-4" /> : null}
    </>
  );
}

/* ============ CardBody ============ */

type CardBodyProps = {
  /* Espacement par rapport au contenu précédent (header).
     Par défaut md (12px) — assez pour respirer sans coller. */
  paddingTop?: SpacingToken | "none";
  className?: string;
  children: ReactNode;
};

export function CardBody({
  paddingTop = "md",
  className,
  children,
}: CardBodyProps) {
  return (
    <div
      className={className}
      style={{
        paddingTop: paddingTop === "none" ? 0 : spacing[paddingTop],
      }}
    >
      {children}
    </div>
  );
}

/* ============ CardFooter ============ */

type CardFooterProps = {
  /* Séparateur au-dessus du footer (recommandé pour clarté). */
  divider?: boolean;
  align?: "start" | "end" | "between";
  className?: string;
  children: ReactNode;
};

export function CardFooter({
  divider = true,
  align = "end",
  className,
  children,
}: CardFooterProps) {
  return (
    <>
      {divider ? <CardDivider className="my-4" /> : null}
      <Row
        justify={align}
        gap="sm"
        className={className}
      >
        {children}
      </Row>
    </>
  );
}

/* ============ CardMedia ============ */

type CardMediaProps = {
  src: string;
  alt: string;
  /* Ratio CSS, ex: "16/9", "1/1", "4/5". */
  aspectRatio?: string;
  /* Contenu superposé : badge prix, durée vidéo, gradient overlay. */
  overlay?: ReactNode;
  /* Loading native HTML. "eager" pour above-the-fold uniquement. */
  loading?: "lazy" | "eager";
  className?: string;
};

export function CardMedia({
  src,
  alt,
  aspectRatio = "16/9",
  overlay,
  loading = "lazy",
  className,
}: CardMediaProps) {
  return (
    <div
      className={cn("relative w-full bg-bg-soft", className)}
      style={{ aspectRatio }}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={src}
        alt={alt}
        loading={loading}
        className="w-full h-full object-cover"
      />
      {overlay ? <div className="absolute inset-0">{overlay}</div> : null}
    </div>
  );
}

/* ============ Divider interne (utilisé par Header/Footer) ============ */

function CardDivider({ className }: { className?: string }) {
  /* La marge négative étend le divider sur toute la largeur de la
     card, même quand celle-ci a un padding interne (spacing.lg = 16px). */
  return (
    <div
      className={cn("border-t border-line", className)}
      style={{ marginLeft: -spacing.lg, marginRight: -spacing.lg }}
    />
  );
}
