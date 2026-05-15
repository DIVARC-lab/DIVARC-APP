import { ArrowLeft, Hourglass, Lock, MapPin, Users2 } from "lucide-react";
import Link from "next/link";
import { ArcDeco } from "@/components/marketing/ArcDeco";
import type {
  CircleColor,
  CircleWithMembership,
} from "@/lib/database.types";
import { getCircleCategory } from "@/lib/circles/categories";
import { cn } from "@/lib/utils/cn";

const COLOR_HERO: Record<CircleColor, string> = {
  gold: "from-gold via-gold-soft to-gold-deep text-night",
  navy: "from-night via-night-soft to-night-muted text-cream",
  emerald: "from-emerald-500 to-emerald-800 text-cream",
  rose: "from-rose-400 to-rose-700 text-cream",
  violet: "from-violet-400 to-violet-700 text-cream",
  cream: "from-cream via-bg to-gold/30 text-night",
};

const LIGHT_TEXT_COLORS = new Set<CircleColor>([
  "navy",
  "emerald",
  "rose",
  "violet",
]);

/* Hero cover du cercle — cover_url image OU fallback gradient depuis
 * color_accent. Avatar overlap + nom + tagline + meta + CTAs (côté layout). */
export function CircleHero({
  circle,
  actionsSlot,
}: {
  circle: CircleWithMembership;
  actionsSlot: React.ReactNode;
}) {
  const tone = COLOR_HERO[circle.color ?? "gold"];
  const lightText = LIGHT_TEXT_COLORS.has(circle.color ?? "gold");
  const category = getCircleCategory(circle.primary_category);

  return (
    <header className="relative">
      {/* Cover */}
      <div className="relative h-[180px] sm:h-[240px] overflow-hidden bg-bg-soft">
        {circle.cover_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={circle.cover_url}
            alt=""
            className="absolute inset-0 w-full h-full object-cover"
          />
        ) : (
          <div
            aria-hidden
            className={cn("absolute inset-0 bg-gradient-to-br", tone)}
            style={
              circle.color_accent
                ? {
                    backgroundImage: `linear-gradient(135deg, ${circle.color_accent}, color-mix(in srgb, ${circle.color_accent} 60%, #0A1F44))`,
                  }
                : undefined
            }
          />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/45 via-black/10 to-black/10" />
        <div
          aria-hidden
          className="absolute -right-12 -bottom-12 opacity-25 pointer-events-none"
        >
          <ArcDeco size={260} tone="gold" opacity={1} stroke={1.3} />
        </div>

        {/* Back button glass */}
        <Link
          href="/circles"
          aria-label="Retour aux cercles"
          className="absolute top-3 left-3 inline-flex items-center justify-center w-9 h-9 rounded-full bg-white/90 backdrop-blur-sm text-night hover:bg-white transition-colors shadow-sm"
        >
          <ArrowLeft className="w-4 h-4" aria-hidden />
        </Link>

        {/* Type badge + lifecycle badge (Chantier Cercles v3) */}
        <div className="absolute top-3 right-3 flex flex-col items-end gap-1.5">
          {circle.is_private || circle.type === "private" ? (
            <span className="inline-flex items-center gap-1 h-7 px-2.5 rounded-full bg-night/85 backdrop-blur-sm text-cream text-[11px] font-bold">
              <Lock className="w-3 h-3" aria-hidden />
              Privé
            </span>
          ) : null}
          {circle.lifecycle === "ephemeral" && circle.expires_at ? (
            <EphemeralBadge expiresAt={circle.expires_at} />
          ) : null}
          {circle.lifecycle === "archived_ephemeral" ? (
            <span className="inline-flex items-center gap-1 h-7 px-2.5 rounded-full bg-night-muted/80 backdrop-blur-sm text-cream text-[11px] font-bold">
              Archivé
            </span>
          ) : null}
        </div>
      </div>

      {/* Identity block — overlap cover */}
      <div className="px-4 sm:px-8 -mt-10 sm:-mt-14 relative">
        <div className="flex items-end gap-3 sm:gap-4">
          <span
            aria-hidden
            className={cn(
              "relative shrink-0 w-20 h-20 sm:w-28 sm:h-28 rounded-[18px] flex items-center justify-center text-[36px] sm:text-[44px] overflow-hidden ring-4 ring-bg-soft bg-gradient-to-br",
              tone,
            )}
          >
            <span
              aria-hidden
              className="absolute inset-0 opacity-20 pointer-events-none"
            >
              <ArcDeco size={112} tone="gold" opacity={1} stroke={1.2} />
            </span>
            <span className="relative">
              {circle.emoji ?? circle.name.charAt(0).toUpperCase()}
            </span>
          </span>
          <div className="flex-1 min-w-0 pb-1.5 sm:pb-2.5">
            {category ? (
              <p
                className={cn(
                  "text-[10px] sm:text-[11px] font-extrabold uppercase tracking-[0.16em] truncate",
                  lightText ? "text-gold" : "text-gold-deep",
                )}
              >
                · {category.label}
              </p>
            ) : null}
            <h1 className="mt-1 font-display italic text-[26px] sm:text-[38px] text-night leading-tight tracking-[-0.02em] truncate">
              {circle.name}
            </h1>
          </div>
        </div>

        {circle.tagline ? (
          <p className="mt-3 text-[14px] sm:text-[15px] text-night-soft leading-snug text-pretty">
            {circle.tagline}
          </p>
        ) : null}

        {/* Meta line */}
        <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1 text-[12px] text-night-dim">
          <span className="inline-flex items-center gap-1.5">
            <Users2 className="w-3.5 h-3.5" aria-hidden />
            <span className="font-bold text-night tabular-nums">
              {circle.members_count.toLocaleString("fr-FR")}
            </span>
            <span>membre{circle.members_count > 1 ? "s" : ""}</span>
          </span>
          {circle.active_members_count_7d > 0 ? (
            <span className="inline-flex items-center gap-1.5">
              <span aria-hidden className="w-1.5 h-1.5 rounded-full bg-online" />
              <span className="font-bold text-success tabular-nums">
                {circle.active_members_count_7d}
              </span>
              <span>actif{circle.active_members_count_7d > 1 ? "s" : ""} (7j)</span>
            </span>
          ) : null}
          {circle.is_local && circle.location_city ? (
            <span className="inline-flex items-center gap-1.5">
              <MapPin className="w-3.5 h-3.5" aria-hidden />
              <span className="font-bold text-night">
                {circle.location_city}
              </span>
            </span>
          ) : null}
        </div>

        {/* Actions slot (Rejoindre / Inviter / etc.) */}
        <div className="mt-4 pb-4">{actionsSlot}</div>
      </div>
    </header>
  );
}

/* Badge éphémère avec countdown jours. Affiché dans le hero quand
 * lifecycle = 'ephemeral'. */
function EphemeralBadge({ expiresAt }: { expiresAt: string }) {
  const expires = new Date(expiresAt);
  const now = new Date();
  const diffMs = expires.getTime() - now.getTime();
  const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
  const label =
    diffDays <= 0
      ? "Expiré"
      : diffDays === 1
        ? "Termine demain"
        : diffDays <= 7
          ? `${diffDays} jours restants`
          : diffDays <= 30
            ? `${Math.ceil(diffDays / 7)} sem restantes`
            : `${Math.ceil(diffDays / 30)} mois restants`;
  return (
    <span className="inline-flex items-center gap-1 h-7 px-2.5 rounded-full bg-rose-500/95 backdrop-blur-sm text-white text-[11px] font-bold">
      <Hourglass className="w-3 h-3" aria-hidden />
      {label}
    </span>
  );
}
