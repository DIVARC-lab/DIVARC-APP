/* DIVARC — Design System Structurel · Étape 8
 *
 * <Card> — LE cœur du design system structurel.
 *
 * 8 VARIANTS RIGIDES — interdiction d'en ajouter sans discussion produit.
 *   - default      : 90% des usages. Posts, items de liste, sections.
 *   - feature      : hero / mise en avant. Plus de padding, plus de shadow.
 *   - compact      : padding réduit. Listes denses, suggestions.
 *   - media        : image en plein bord, padding=0. Marketplace, reels.
 *   - interactive  : cliquable avec hover state (lift + shadow).
 *   - highlight    : background cream pour mettre en valeur.
 *   - premium      : background night + texte cream. Beta privée, founders.
 *   - outlined     : border-strong sans shadow. Settings, info secondaire.
 *
 * Si tu crois avoir besoin d'un 9ᵉ variant : tu te trompes. Trouve
 * celui qui correspond le mieux et adapte avec className overrides
 * (rare et exceptionnel) ou ré-ouvre la spec.
 */

"use client";

import type { ReactNode, CSSProperties } from "react";
import Link from "next/link";
import { cn } from "@/lib/utils/cn";
import { CARD_TOKENS } from "@/lib/design/cards";
import { spacing } from "@/lib/design/spacing";

export type CardVariant =
  | "default"
  | "feature"
  | "compact"
  | "media"
  | "interactive"
  | "highlight"
  | "premium"
  | "outlined";

type CardProps = {
  variant?: CardVariant;
  /* Force le state cliquable même sans onClick/href (rare).
     Plus souvent : un href ou onClick suffit, on déduit le state. */
  interactive?: boolean;
  onClick?: () => void;
  href?: string;
  /* href externe ? <Link> Next ne marche pas pour https://, fallback <a>. */
  external?: boolean;
  ariaLabel?: string;
  className?: string;
  children: ReactNode;
};

const VARIANT_STYLES: Record<CardVariant, CSSProperties> = {
  default: {
    background: CARD_TOKENS.background.surface,
    border: CARD_TOKENS.border.subtle,
    borderRadius: CARD_TOKENS.radius.md,
    boxShadow: CARD_TOKENS.shadow.xs,
    padding: spacing.lg,
  },
  feature: {
    background: CARD_TOKENS.background.surface,
    border: CARD_TOKENS.border.subtle,
    borderRadius: CARD_TOKENS.radius.lg,
    boxShadow: CARD_TOKENS.shadow.md,
    padding: spacing["2xl"],
  },
  compact: {
    background: CARD_TOKENS.background.surface,
    border: CARD_TOKENS.border.subtle,
    borderRadius: CARD_TOKENS.radius.md,
    boxShadow: CARD_TOKENS.shadow.xs,
    padding: spacing.md,
  },
  media: {
    background: CARD_TOKENS.background.surface,
    border: CARD_TOKENS.border.subtle,
    borderRadius: CARD_TOKENS.radius.lg,
    boxShadow: CARD_TOKENS.shadow.sm,
    padding: 0,
    overflow: "hidden",
  },
  interactive: {
    background: CARD_TOKENS.background.surface,
    border: CARD_TOKENS.border.subtle,
    borderRadius: CARD_TOKENS.radius.md,
    boxShadow: CARD_TOKENS.shadow.sm,
    padding: spacing.lg,
  },
  highlight: {
    background: CARD_TOKENS.background.cream,
    border: CARD_TOKENS.border.subtle,
    borderRadius: CARD_TOKENS.radius.md,
    padding: spacing.lg,
  },
  premium: {
    background: CARD_TOKENS.background.night,
    border: CARD_TOKENS.border.none,
    borderRadius: CARD_TOKENS.radius.lg,
    boxShadow: CARD_TOKENS.shadow.md,
    padding: spacing["2xl"],
  },
  outlined: {
    background: CARD_TOKENS.background.surface,
    border: CARD_TOKENS.border.default,
    borderRadius: CARD_TOKENS.radius.md,
    padding: spacing.lg,
  },
};

export function Card({
  variant = "default",
  interactive,
  onClick,
  href,
  external,
  ariaLabel,
  className,
  children,
}: CardProps) {
  const isClickable = interactive || !!onClick || !!href;
  const style = VARIANT_STYLES[variant];

  /* Classes communes pour le state cliquable : transition, hover,
     focus-ring, cursor. text-cream auto pour premium. */
  const baseClass = cn(
    "block w-full text-left",
    variant === "premium" && "text-cream",
    isClickable && [
      "cursor-pointer transition-all duration-200",
      "hover:-translate-y-0.5 hover:shadow-md",
      "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold-deep/40 focus-visible:ring-offset-2",
    ],
    className,
  );

  /* Cas 1 : href Next interne. */
  if (href && !external) {
    return (
      <Link
        href={href}
        aria-label={ariaLabel}
        className={baseClass}
        style={style}
        onClick={onClick}
      >
        {children}
      </Link>
    );
  }

  /* Cas 2 : href externe. */
  if (href && external) {
    return (
      <a
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        aria-label={ariaLabel}
        className={baseClass}
        style={style}
      >
        {children}
      </a>
    );
  }

  /* Cas 3 : onClick → <button>. Sémantique correcte pour a11y. */
  if (onClick) {
    return (
      <button
        type="button"
        onClick={onClick}
        aria-label={ariaLabel}
        className={baseClass}
        style={style}
      >
        {children}
      </button>
    );
  }

  /* Cas 4 : static (default). */
  return (
    <div className={baseClass} style={style} aria-label={ariaLabel}>
      {children}
    </div>
  );
}
