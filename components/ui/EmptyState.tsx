import Link from "next/link";
import type { LucideIcon } from "lucide-react";
import { ArrowRight } from "lucide-react";
import { cn } from "@/lib/utils/cn";

type EmptyStateProps = {
  icon?: LucideIcon;
  emoji?: string;
  kicker?: string;
  title: React.ReactNode;
  body?: React.ReactNode;
  ctaHref?: string;
  ctaLabel?: string;
  secondaryHref?: string;
  secondaryLabel?: string;
  className?: string;
  /* "default" = white card pleine largeur, neutre.
     "soft" = gradient cream→bg→gold/10, accent gold-deep visible.
     "navy" = card-night cream-on-night, pour les états "Bienvenue/onboarding". */
  tone?: "default" | "soft" | "navy";
  size?: "md" | "lg";
};

/* Brief Session 9 — composant réutilisable centralisé.
   Grammaire DIVARC : kicker gold · titre italic Instrument Serif · copy
   muted · CTA principal pill gold (Bold direction, cohérent feed
   Session 5 / map Session 8). */
export function EmptyState({
  icon: Icon,
  emoji,
  kicker,
  title,
  body,
  ctaHref,
  ctaLabel,
  secondaryHref,
  secondaryLabel,
  className,
  tone = "default",
  size = "md",
}: EmptyStateProps) {
  const isLarge = size === "lg";
  return (
    <div
      className={cn(
        "text-center rounded-[28px] border",
        isLarge ? "py-16 px-8" : "py-12 px-6",
        tone === "soft" &&
          "bg-gradient-to-br from-cream via-bg to-gold/10 border-gold/30",
        tone === "navy" &&
          "bg-night text-cream border-night shadow-[0_24px_60px_-28px_rgba(10,31,68,0.5)]",
        tone === "default" && "bg-white border-line",
        className,
      )}
    >
      <div
        aria-hidden
        className={cn(
          "mx-auto rounded-2xl flex items-center justify-center",
          isLarge ? "w-20 h-20 mb-5" : "w-16 h-16 mb-4",
          tone === "navy"
            ? "bg-cream/[0.08] border border-cream/15"
            : tone === "soft"
              ? "bg-white border border-gold/30"
              : "bg-gradient-to-br from-cream via-bg to-gold/15 border border-gold/30",
        )}
      >
        {Icon ? (
          <Icon
            className={cn(
              isLarge ? "w-7 h-7" : "w-6 h-6",
              tone === "navy" ? "text-gold" : "text-gold-deep",
            )}
            aria-hidden
          />
        ) : emoji ? (
          <span className={isLarge ? "text-4xl leading-none" : "text-3xl leading-none"}>
            {emoji}
          </span>
        ) : null}
      </div>

      {kicker ? (
        <span
          className={cn(
            "text-[11px] font-extrabold uppercase tracking-[0.18em]",
            tone === "navy" ? "text-gold" : "text-gold-deep",
          )}
        >
          · {kicker}
        </span>
      ) : null}

      <h2
        className={cn(
          "font-display italic leading-[1.1] text-balance",
          isLarge ? "mt-2 text-[28px] sm:text-[34px]" : "mt-1.5 text-[22px] sm:text-[26px]",
          tone === "navy" ? "text-cream" : "text-night",
        )}
      >
        {title}
      </h2>

      {body ? (
        <p
          className={cn(
            "mt-2 max-w-sm mx-auto leading-relaxed",
            isLarge ? "text-[15px]" : "text-sm",
            tone === "navy" ? "text-cream/75" : "text-night-muted",
          )}
        >
          {body}
        </p>
      ) : null}

      {ctaHref && ctaLabel ? (
        <div className="mt-6 flex flex-col sm:flex-row items-center justify-center gap-2">
          <Link
            href={ctaHref}
            className={cn(
              "inline-flex items-center justify-center gap-2 h-12 px-6 rounded-full font-extrabold text-sm transition-colors",
              tone === "navy"
                ? "bg-gold text-night hover:bg-gold-soft shadow-[0_12px_28px_-10px_rgba(244,185,66,0.55)]"
                : "bg-gold text-night hover:bg-gold-soft shadow-[0_12px_28px_-10px_rgba(244,185,66,0.55)]",
            )}
          >
            {ctaLabel}
            <ArrowRight className="w-4 h-4" aria-hidden />
          </Link>
          {secondaryHref && secondaryLabel ? (
            <Link
              href={secondaryHref}
              className={cn(
                "inline-flex items-center justify-center gap-1.5 h-11 px-4 rounded-full text-sm font-semibold transition-colors",
                tone === "navy"
                  ? "text-cream/75 hover:text-cream hover:bg-cream/[0.06]"
                  : "text-night-muted hover:text-night hover:bg-night/5",
              )}
            >
              {secondaryLabel}
            </Link>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
