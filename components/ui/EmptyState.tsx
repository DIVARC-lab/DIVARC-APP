import Link from "next/link";
import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils/cn";
import { Button } from "./Button";

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
  tone?: "default" | "soft";
};

/** Centred empty state used by feed, search, jobs, marketplace, etc.
 *  Matches the DIVARC grammar: gold kicker · italic display heading
 *  · short copy · primary CTA. */
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
}: EmptyStateProps) {
  return (
    <div
      className={cn(
        "text-center py-16 px-6 rounded-3xl border border-line",
        tone === "soft"
          ? "bg-gradient-to-br from-cream via-bg to-gold/10 border-gold/30"
          : "bg-white",
        className,
      )}
    >
      <div
        aria-hidden
        className={cn(
          "w-20 h-20 mx-auto rounded-3xl flex items-center justify-center mb-5",
          tone === "soft"
            ? "bg-white border border-gold/30"
            : "bg-gradient-to-br from-cream via-bg to-gold/15 border border-gold/30",
        )}
      >
        {Icon ? (
          <Icon className="w-7 h-7 text-gold-deep" aria-hidden />
        ) : emoji ? (
          <span className="text-4xl leading-none">{emoji}</span>
        ) : null}
      </div>
      {kicker ? (
        <span className="text-[11px] font-extrabold uppercase tracking-[0.18em] text-gold-deep">
          · {kicker}
        </span>
      ) : null}
      <h2 className="mt-2 font-display italic text-2xl sm:text-3xl text-night leading-[1.1] text-balance">
        {title}
      </h2>
      {body ? (
        <p className="mt-2 text-muted-strong max-w-sm mx-auto leading-relaxed">
          {body}
        </p>
      ) : null}
      {ctaHref && ctaLabel ? (
        <div className="mt-6 flex flex-wrap items-center justify-center gap-2">
          <Button asChild>
            <Link href={ctaHref}>{ctaLabel}</Link>
          </Button>
          {secondaryHref && secondaryLabel ? (
            <Button variant="ghost" asChild>
              <Link href={secondaryHref}>{secondaryLabel}</Link>
            </Button>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
