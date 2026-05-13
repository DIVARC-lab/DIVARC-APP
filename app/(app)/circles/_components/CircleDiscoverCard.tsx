import {
  Briefcase,
  Calendar,
  Lock,
  MapPin,
  MessageSquare,
  BookOpen,
  Sparkles,
  Store,
  TrendingUp,
} from "lucide-react";
import Link from "next/link";
import { ArcDeco } from "@/components/marketing/ArcDeco";
import type { CircleColor } from "@/lib/database.types";
import type { CircleDiscoverResult } from "@/lib/queries/circles";
import { getCircleCategory } from "@/lib/circles/categories";
import { cn } from "@/lib/utils/cn";
import { CircleScoreBadge } from "./CircleScoreBadge";

const COLOR_BG: Record<CircleColor, string> = {
  gold: "bg-gradient-to-br from-gold via-gold-soft to-gold-deep text-night",
  navy: "bg-gradient-to-br from-night via-night-soft to-night-muted text-cream",
  emerald: "bg-gradient-to-br from-emerald-500 to-emerald-800 text-cream",
  rose: "bg-gradient-to-br from-rose-400 to-rose-700 text-cream",
  violet: "bg-gradient-to-br from-violet-400 to-violet-700 text-cream",
  cream: "bg-gradient-to-br from-cream via-bg to-gold/30 text-night",
};

type Props = {
  circle: CircleDiscoverResult;
};

/* Carte enrichie pour la section "Découvrir" — affiche cover/avatar, stats
 * 7j, modules activés, tags, et CTAs. Server component (pas de state). */
export function CircleDiscoverCard({ circle }: Props) {
  const tone = COLOR_BG[circle.color ?? "gold"];
  const category = getCircleCategory(circle.primary_category);
  const modules = circle.modules ?? {
    social_feed: true,
    marketplace: false,
    jobs: false,
    library: false,
    events: false,
  };

  return (
    <article className="group relative overflow-hidden rounded-[18px] bg-white border border-line hover:border-gold/40 hover:shadow-[0_12px_30px_-16px_rgba(10,31,68,0.18)] transition-all">
      {/* Cover (ou fallback gradient) */}
      <div className="relative h-[100px] sm:h-[120px] overflow-hidden">
        {circle.cover_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={circle.cover_url}
            alt=""
            className="absolute inset-0 w-full h-full object-cover"
            loading="lazy"
          />
        ) : (
          <div
            aria-hidden
            className={cn("absolute inset-0", tone)}
            style={{
              backgroundImage: circle.color_accent
                ? `linear-gradient(135deg, ${circle.color_accent}, color-mix(in srgb, ${circle.color_accent} 60%, #0A1F44))`
                : undefined,
            }}
          />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-black/10 to-transparent" />
        <div
          aria-hidden
          className="absolute -right-8 -bottom-8 opacity-25 pointer-events-none"
        >
          <ArcDeco size={160} tone="gold" opacity={1} stroke={1.2} />
        </div>

        {/* Badges contextuels */}
        <div className="absolute top-2.5 left-2.5 right-2.5 flex items-start justify-between gap-2">
          <div className="flex items-center gap-1.5 flex-wrap">
            {circle.is_local && circle.location_city ? (
              <span className="inline-flex items-center gap-1 h-6 px-2 rounded-full bg-white/90 backdrop-blur-sm text-night text-[10px] font-bold">
                <MapPin className="w-3 h-3" aria-hidden />
                {circle.location_city}
              </span>
            ) : null}
            {circle.score > 0 && circle.breakdown ? (
              <span className="bg-white/90 backdrop-blur-sm rounded-full">
                <CircleScoreBadge
                  score={circle.score}
                  breakdown={circle.breakdown}
                />
              </span>
            ) : null}
          </div>
          {circle.is_private || circle.type === "private" ? (
            <span className="inline-flex items-center gap-1 h-6 px-2 rounded-full bg-night/85 text-cream text-[10px] font-bold">
              <Lock className="w-3 h-3" aria-hidden />
              Privé
            </span>
          ) : null}
        </div>
      </div>

      <div className="p-4 -mt-7 relative">
        {/* Avatar overlap cover */}
        <div className="flex items-start gap-3">
          <span
            aria-hidden
            className={cn(
              "relative shrink-0 w-14 h-14 rounded-[14px] flex items-center justify-center text-[28px] overflow-hidden ring-4 ring-white",
              tone,
            )}
          >
            <span
              aria-hidden
              className="absolute inset-0 opacity-[0.18] pointer-events-none"
            >
              <ArcDeco size={56} tone="gold" opacity={1} stroke={1} />
            </span>
            <span className="relative">
              {circle.emoji ?? circle.name.charAt(0).toUpperCase()}
            </span>
          </span>
          <div className="min-w-0 flex-1 pt-7">
            <h3 className="font-display italic text-[18px] sm:text-[20px] text-night leading-tight truncate">
              {circle.name}
            </h3>
            {category ? (
              <p className="text-[10px] font-extrabold uppercase tracking-[0.12em] text-gold-deep">
                · {category.label}
              </p>
            ) : null}
          </div>
        </div>

        {/* Tagline ou description */}
        {circle.tagline || circle.description ? (
          <p className="mt-3 text-[12.5px] text-night-soft leading-[1.5] line-clamp-2">
            {circle.tagline ?? circle.description}
          </p>
        ) : null}

        {/* Tags */}
        {circle.tags && circle.tags.length > 0 ? (
          <div className="mt-2.5 flex flex-wrap gap-1">
            {circle.tags.slice(0, 4).map((tag) => (
              <span
                key={tag}
                className="inline-flex h-5 px-1.5 rounded-md bg-bg-soft text-[10px] font-bold text-night-dim"
              >
                #{tag}
              </span>
            ))}
          </div>
        ) : null}

        {/* Modules activés (icônes) */}
        <div className="mt-3 flex items-center gap-2 text-night-dim text-[11px]">
          <span className="font-extrabold uppercase tracking-[0.1em] text-[9px]">
            Modules
          </span>
          {modules.social_feed ? (
            <ModuleIcon Icon={MessageSquare} label="Posts" />
          ) : null}
          {modules.marketplace ? (
            <ModuleIcon Icon={Store} label="Marketplace" />
          ) : null}
          {modules.jobs ? <ModuleIcon Icon={Briefcase} label="Jobs" /> : null}
          {modules.library ? (
            <ModuleIcon Icon={BookOpen} label="Library" />
          ) : null}
          {modules.events ? (
            <ModuleIcon Icon={Calendar} label="Événements" />
          ) : null}
        </div>

        {/* Stats 7j (transparence : on montre les vrais chiffres) */}
        <div className="mt-3 pt-3 border-t border-line flex items-center justify-between gap-2 text-[11px] text-night-dim">
          <span className="inline-flex items-center gap-1 font-semibold">
            <span aria-hidden className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
            <span className="tabular-nums">
              {circle.members_count.toLocaleString("fr-FR")}
            </span>
            <span>membre{circle.members_count > 1 ? "s" : ""}</span>
          </span>
          {circle.posts_count_7d > 0 ? (
            <span className="inline-flex items-center gap-1 font-semibold text-gold-deep">
              <TrendingUp className="w-3 h-3" aria-hidden />
              <span className="tabular-nums">{circle.posts_count_7d}</span>
              <span>posts (7j)</span>
            </span>
          ) : circle.new_members_count_7d > 0 ? (
            <span className="inline-flex items-center gap-1 font-semibold">
              <Sparkles className="w-3 h-3 text-gold-deep" aria-hidden />
              <span className="tabular-nums">+{circle.new_members_count_7d}</span>
              <span>cette semaine</span>
            </span>
          ) : null}
        </div>

        {/* CTAs */}
        <div className="mt-3 flex items-center gap-2">
          <Link
            href={`/circles/${circle.slug}`}
            className="inline-flex items-center justify-center h-9 px-3.5 rounded-full bg-white border border-line text-night-dim text-[12px] font-bold hover:border-night/30 hover:text-night transition-colors"
          >
            Aperçu
          </Link>
          <Link
            href={`/circles/${circle.slug}`}
            className="flex-1 inline-flex items-center justify-center h-9 px-4 rounded-full bg-night text-cream text-[12px] font-extrabold hover:bg-night-soft transition-colors"
          >
            Rejoindre
          </Link>
        </div>
      </div>
    </article>
  );
}

function ModuleIcon({
  Icon,
  label,
}: {
  Icon: typeof MessageSquare;
  label: string;
}) {
  return (
    <span
      title={label}
      aria-label={label}
      className="inline-flex items-center justify-center w-5 h-5 rounded-md bg-bg-soft"
    >
      <Icon className="w-3 h-3 text-night-dim" aria-hidden />
    </span>
  );
}
