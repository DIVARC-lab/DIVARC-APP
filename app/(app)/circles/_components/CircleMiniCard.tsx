import { Lock } from "lucide-react";
import Link from "next/link";
import { ArcDeco } from "@/components/marketing/ArcDeco";
import type { CircleColor, CircleWithMembership } from "@/lib/database.types";
import { cn } from "@/lib/utils/cn";

const COLOR_BG: Record<CircleColor, string> = {
  gold: "bg-gradient-to-br from-gold via-gold-soft to-gold-deep text-night",
  navy: "bg-gradient-to-br from-night via-night-soft to-night-muted text-cream",
  emerald: "bg-gradient-to-br from-emerald-500 to-emerald-800 text-cream",
  rose: "bg-gradient-to-br from-rose-400 to-rose-700 text-cream",
  violet: "bg-gradient-to-br from-violet-400 to-violet-700 text-cream",
  cream: "bg-gradient-to-br from-cream via-bg to-gold/30 text-night",
};

/* Carte compacte pour carrousels thématiques (Trending / Locaux / Nouveaux).
 * Layout minimal : avatar tone + nom + members count. */
export function CircleMiniCard({ circle }: { circle: CircleWithMembership }) {
  const tone = COLOR_BG[circle.color ?? "gold"];

  return (
    <Link
      href={`/circles/${circle.slug}`}
      className="group block h-full p-3 rounded-[14px] bg-white border border-line hover:border-gold/50 hover:shadow-[0_8px_20px_-12px_rgba(10,31,68,0.15)] transition-all"
    >
      <span
        aria-hidden
        className={cn(
          "relative shrink-0 w-12 h-12 rounded-[12px] flex items-center justify-center text-[22px] overflow-hidden",
          tone,
        )}
      >
        <span
          aria-hidden
          className="absolute inset-0 opacity-[0.18] pointer-events-none"
        >
          <ArcDeco size={48} tone="gold" opacity={1} stroke={1} />
        </span>
        <span className="relative">
          {circle.emoji ?? circle.name.charAt(0).toUpperCase()}
        </span>
      </span>

      <div className="mt-2.5">
        <div className="flex items-center gap-1">
          <p className="text-[13px] font-extrabold text-night truncate">
            {circle.name}
          </p>
          {circle.is_private ? (
            <Lock
              className="w-[10px] h-[10px] text-night-dim shrink-0"
              aria-hidden
            />
          ) : null}
        </div>
        {circle.tagline ? (
          <p className="mt-0.5 text-[11px] text-night-dim line-clamp-2 leading-snug">
            {circle.tagline}
          </p>
        ) : circle.description ? (
          <p className="mt-0.5 text-[11px] text-night-dim line-clamp-2 leading-snug">
            {circle.description}
          </p>
        ) : null}
        <p className="mt-1.5 text-[10px] text-night-dim font-bold tabular-nums">
          {circle.members_count.toLocaleString("fr-FR")} membre
          {circle.members_count > 1 ? "s" : ""}
        </p>
      </div>
    </Link>
  );
}
