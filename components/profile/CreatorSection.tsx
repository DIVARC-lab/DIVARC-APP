import { Eye, ExternalLink, Heart, Palette, TrendingUp, Users } from "lucide-react";
import Link from "next/link";
import { safeFormatDate } from "@/lib/utils/date";
import type {
  CreatorCollaboration,
  CreatorFeatured,
  CreatorMediaKit,
  CreatorStats,
} from "@/lib/database.types";

/* CreatorSection — toute la facette créateur sur le profil public.
 *
 * Affichage conditionné aux données disponibles :
 *   - Stats card (vues, likes, engagement, followers actifs, audience)
 *   - Featured content grid (3 cols)
 *   - Collaborations chronologiques
 *   - Media Kit CTA si is_open_to_partnerships
 *
 * V4 : preview rich des featured (vidéos auto-play, post embed). */

const COLLAB_TYPE_LABELS: Record<
  NonNullable<CreatorCollaboration["collaboration_type"]>,
  string
> = {
  sponsorship: "Sponsorship",
  partnership: "Partenariat",
  ambassador: "Ambassadeur",
  affiliate: "Affilié",
  placement: "Placement",
  review: "Test produit",
  event: "Événement",
  other: "Autre",
};

const CURRENCY_SYMBOLS: Record<string, string> = {
  EUR: "€",
  USD: "$",
  XAF: "FCFA",
  XOF: "CFA",
  MAD: "MAD",
  TND: "TND",
  DZD: "DZD",
  CAD: "CA$",
  CHF: "CHF",
  GBP: "£",
};

type Props = {
  stats: CreatorStats | null;
  featured: CreatorFeatured[];
  collaborations: CreatorCollaboration[];
  mediaKit: CreatorMediaKit | null;
};

export function CreatorSection({
  stats,
  featured,
  collaborations,
  mediaKit,
}: Props) {
  const hasAny =
    stats || featured.length > 0 || collaborations.length > 0 || mediaKit;
  if (!hasAny) {
    return (
      <div className="rounded-2xl bg-white border border-line p-6 text-center">
        <Palette className="w-6 h-6 text-night-dim mx-auto mb-2" aria-hidden />
        <p className="text-[13px] text-night-muted">
          Aucune info créateur pour l&apos;instant.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* Stats */}
      {stats ? <StatsCard stats={stats} /> : null}

      {/* Featured grid */}
      {featured.length > 0 ? (
        <section className="rounded-2xl bg-white border border-line overflow-hidden">
          <header className="px-5 py-4 border-b border-line">
            <h2 className="text-[14px] font-bold text-night">
              Contenus à la une
            </h2>
          </header>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-px bg-line">
            {featured.map((item) => (
              <FeaturedCard key={item.id} item={item} />
            ))}
          </div>
        </section>
      ) : null}

      {/* Collaborations */}
      {collaborations.length > 0 ? (
        <section className="rounded-2xl bg-white border border-line overflow-hidden">
          <header className="px-5 py-4 border-b border-line">
            <h2 className="text-[14px] font-bold text-night">Collaborations</h2>
          </header>
          <ul className="divide-y divide-line">
            {collaborations.map((c) => (
              <li key={c.id} className="px-5 py-3.5 flex items-center gap-3">
                <div className="shrink-0 w-10 h-10 rounded-xl bg-bg-soft border border-line flex items-center justify-center text-night-muted font-bold">
                  {c.brand_logo_url ? (
                    /* eslint-disable-next-line @next/next/no-img-element */
                    <img
                      src={c.brand_logo_url}
                      alt=""
                      className="w-full h-full rounded-xl object-cover"
                    />
                  ) : (
                    c.brand_name.charAt(0).toUpperCase()
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-[13.5px] font-semibold text-night">
                    {c.brand_name}
                    {c.collaboration_type ? (
                      <span className="ml-2 text-[11px] font-bold uppercase tracking-wider text-gold-deep">
                        {COLLAB_TYPE_LABELS[c.collaboration_type]}
                      </span>
                    ) : null}
                  </p>
                  {c.start_month ? (
                    <p className="text-[11.5px] text-night-muted">
                      {safeFormatDate(c.start_month, {
                        month: "short",
                        year: "numeric",
                      })}
                      {c.is_ongoing
                        ? " – Présent"
                        : c.end_month
                          ? ` – ${safeFormatDate(c.end_month, { month: "short", year: "numeric" })}`
                          : ""}
                    </p>
                  ) : null}
                </div>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {/* Media Kit CTA */}
      {mediaKit && mediaKit.is_open_to_partnerships ? (
        <MediaKitCard mediaKit={mediaKit} />
      ) : null}
    </div>
  );
}

function StatsCard({ stats }: { stats: CreatorStats }) {
  return (
    <section className="rounded-2xl bg-gradient-to-br from-night via-night to-night-soft text-cream p-5 border border-night/40">
      <h2 className="text-[11px] font-bold uppercase tracking-wider text-gold mb-3">
        Stats créateur
      </h2>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <StatBox
          icon={Eye}
          label="Vues"
          value={formatBigNumber(stats.total_views)}
        />
        <StatBox
          icon={Heart}
          label="Likes"
          value={formatBigNumber(stats.total_likes)}
        />
        <StatBox
          icon={TrendingUp}
          label="Engagement"
          value={`${stats.avg_engagement_rate.toFixed(1)}%`}
        />
        <StatBox
          icon={Users}
          label="Followers actifs"
          value={formatBigNumber(stats.monthly_active_followers)}
        />
      </div>
      {stats.content_categories.length > 0 ? (
        <div className="mt-4 flex flex-wrap gap-1.5">
          {stats.content_categories.map((cat) => (
            <span
              key={cat}
              className="inline-flex items-center px-2.5 py-1 rounded-full bg-cream/10 text-cream/80 text-[11px] font-semibold"
            >
              {cat}
            </span>
          ))}
        </div>
      ) : null}
    </section>
  );
}

function StatBox({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof Eye;
  label: string;
  value: string;
}) {
  return (
    <div>
      <Icon className="w-4 h-4 text-gold mb-1" aria-hidden />
      <p className="text-2xl font-display italic tabular-nums">{value}</p>
      <p className="text-[10.5px] uppercase tracking-wider text-cream/60">
        {label}
      </p>
    </div>
  );
}

function FeaturedCard({ item }: { item: CreatorFeatured }) {
  let href: string;
  let title: string;
  let thumbnail: string | null = null;
  switch (item.content_type) {
    case "post":
      href = `/feed/${item.post_id}`;
      title = "Post";
      break;
    case "reel":
      href = `/reels/${item.reel_id}`;
      title = "Reel";
      break;
    case "story_highlight":
      href = `#highlight-${item.story_highlight_id}`;
      title = "Highlight";
      break;
    case "external":
    default:
      href = item.external_url ?? "#";
      title = item.external_title ?? "Lien externe";
      thumbnail = item.external_thumbnail_url;
      break;
  }

  return (
    <Link
      href={href}
      target={item.content_type === "external" ? "_blank" : undefined}
      rel={item.content_type === "external" ? "noopener noreferrer" : undefined}
      className="relative aspect-square bg-bg-soft overflow-hidden group"
      style={
        thumbnail
          ? {
              backgroundImage: `url(${thumbnail})`,
              backgroundSize: "cover",
              backgroundPosition: "center",
            }
          : undefined
      }
    >
      <div className="absolute inset-0 bg-gradient-to-t from-black/70 to-black/0" />
      <div className="absolute bottom-2 left-2 right-2 text-cream">
        <p className="text-[12px] font-bold truncate">{title}</p>
        {item.content_type === "external" ? (
          <span className="inline-flex items-center gap-0.5 text-[10px] text-cream/70">
            <ExternalLink className="w-2.5 h-2.5" aria-hidden />
            Externe
          </span>
        ) : null}
      </div>
    </Link>
  );
}

function MediaKitCard({ mediaKit }: { mediaKit: CreatorMediaKit }) {
  const symbol = mediaKit.rate_currency
    ? (CURRENCY_SYMBOLS[mediaKit.rate_currency] ?? mediaKit.rate_currency)
    : "";
  return (
    <section className="rounded-2xl bg-white border border-gold/40 p-5">
      <div className="flex items-start gap-3">
        <span className="w-10 h-10 rounded-xl bg-gold-deep text-white flex items-center justify-center shrink-0">
          <Palette className="w-5 h-5" aria-hidden />
        </span>
        <div className="flex-1 min-w-0">
          <h2 className="text-[14px] font-bold text-night">
            Ouvert aux partenariats
          </h2>
          {mediaKit.notes ? (
            <p className="mt-1 text-[12.5px] text-night-muted">
              {mediaKit.notes}
            </p>
          ) : null}
          <div className="mt-3 flex flex-wrap gap-3 text-[12.5px]">
            {mediaKit.rate_post_amount != null ? (
              <span className="inline-flex items-center gap-1 text-night-soft">
                <strong className="text-night">
                  {mediaKit.rate_post_amount}
                  {symbol}
                </strong>
                / post
              </span>
            ) : null}
            {mediaKit.rate_reel_amount != null ? (
              <span className="inline-flex items-center gap-1 text-night-soft">
                <strong className="text-night">
                  {mediaKit.rate_reel_amount}
                  {symbol}
                </strong>
                / reel
              </span>
            ) : null}
            {mediaKit.rate_story_amount != null ? (
              <span className="inline-flex items-center gap-1 text-night-soft">
                <strong className="text-night">
                  {mediaKit.rate_story_amount}
                  {symbol}
                </strong>
                / story
              </span>
            ) : null}
          </div>
          <div className="mt-3 flex flex-wrap gap-2">
            {mediaKit.booking_url ? (
              <a
                href={mediaKit.booking_url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 px-3 py-1.5 rounded-full bg-night text-cream text-[12px] font-semibold hover:bg-night-soft"
              >
                Réserver
                <ExternalLink className="w-3 h-3" aria-hidden />
              </a>
            ) : null}
            {mediaKit.contact_email ? (
              <a
                href={`mailto:${mediaKit.contact_email}`}
                className="inline-flex items-center gap-1 px-3 py-1.5 rounded-full border border-line text-night text-[12px] font-semibold hover:bg-bg-soft"
              >
                Contact
              </a>
            ) : null}
            {mediaKit.media_kit_pdf_url ? (
              <a
                href={mediaKit.media_kit_pdf_url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 px-3 py-1.5 rounded-full border border-line text-night text-[12px] font-semibold hover:bg-bg-soft"
              >
                Media Kit (PDF)
              </a>
            ) : null}
          </div>
        </div>
      </div>
    </section>
  );
}

function formatBigNumber(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}k`;
  return n.toString();
}
