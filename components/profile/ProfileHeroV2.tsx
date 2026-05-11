import {
  AtSign,
  BadgeCheck,
  Cloud,
  Link as LinkIcon,
  MapPin,
  Music2,
  Palette,
} from "lucide-react";
import Link from "next/link";
import { AnimatedAvatar } from "./AnimatedAvatar";
import { ParallaxCover } from "./ParallaxCover";
import { cn } from "@/lib/utils/cn";
import { getCoverBackground } from "@/lib/profile/coverHelpers";
import type { ExtendedProfileHeader } from "@/lib/queries/extendedProfile";
import type {
  ProfileSocialLink,
  ProfileSocialLinkKind,
  UserBadge,
} from "@/lib/database.types";

/* ProfileHeroV2 — header redesign V2 du profil :
 *   - Cover photo OU gradient (ratio 4:1 desktop, 3:1 tablet, 16:9 mobile)
 *   - Avatar 168px (desktop) / 128px (tablet) / 96px (mobile)
 *     dépassant de moitié sous le cover, à gauche
 *   - Bloc identité : nom + pronouns + badge ✓ + headline + meta row +
 *     stats clickables + actions bar
 *   - Profile completion bar (own only — passed via prop)
 *
 * Server component (statique) + composants client passés en children
 * pour les boutons d'action interactifs. */

/* Lucide v1 ne fournit plus d'icônes de brand. On utilise LinkIcon
 * comme fallback + label texte. Les icônes "génériques" (Palette pour
 * Behance, Music2 pour TikTok, etc.) restent affichées car non-brand. */
const SOCIAL_ICONS: Record<ProfileSocialLinkKind, typeof LinkIcon> = {
  instagram: LinkIcon,
  twitter: LinkIcon,
  linkedin: LinkIcon,
  github: LinkIcon,
  youtube: LinkIcon,
  tiktok: Music2,
  behance: Palette,
  dribbble: LinkIcon,
  mastodon: AtSign,
  bluesky: Cloud,
  custom: LinkIcon,
};

type Props = {
  profile: ExtendedProfileHeader;
  email?: string | null;
  badges?: UserBadge[];
  actionsBar?: React.ReactNode;
  /** Bouton de partage (QR + copy + share native) — slot pour ShareProfileButton. */
  shareButton?: React.ReactNode;
  isOwn?: boolean;
};

export function ProfileHeroV2({
  profile,
  email,
  badges = [],
  actionsBar,
  shareButton,
  isOwn = false,
}: Props) {
  const cover = getCoverBackground(profile.cover_photo_url, profile.cover_gradient);
  const social = (profile.social_links ?? []) as ProfileSocialLink[];
  const displayName = profile.full_name ?? profile.username ?? "Utilisateur";
  const isVerified = profile.identity_verified_at !== null;
  const founderBadge = badges.find((b) => b.badge_type === "founder");

  return (
    <section
      aria-label="En-tête du profil"
      className="relative bg-bg-soft"
    >
      {/* Cover avec parallax au scroll */}
      <ParallaxCover
        style={
          cover.type === "image"
            ? undefined
            : { backgroundImage: cover.css }
        }
      >
        {cover.type === "image" ? (
          /* eslint-disable-next-line @next/next/no-img-element */
          <img
            src={cover.url}
            alt=""
            className="absolute inset-0 w-full h-full object-cover"
          />
        ) : null}
        {/* Overlay subtil pour lisibilité texte au-dessus si on en met */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/15 to-transparent pointer-events-none" />
      </ParallaxCover>

      {/* Identité + actions */}
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 pb-6">
        <div className="flex flex-col sm:flex-row sm:items-end gap-3 sm:gap-5 -mt-12 sm:-mt-16 lg:-mt-20">
          {/* Avatar avec scale-in animation */}
          <div className="shrink-0">
            <div className="relative inline-block">
              <AnimatedAvatar
                src={profile.avatar_url}
                fullName={displayName}
                className="ring-4 ring-white shadow-[0_8px_28px_-12px_rgba(10,31,68,0.4)]"
              />
              {isVerified ? (
                <span
                  aria-label="Profil vérifié"
                  className="absolute -bottom-1 -right-1 w-7 h-7 rounded-full bg-white shadow-md flex items-center justify-center"
                >
                  <BadgeCheck
                    className="w-5 h-5 text-[#3B82F6] fill-[#DBEAFE]"
                    aria-hidden
                  />
                </span>
              ) : null}
            </div>
          </div>

          {/* Bloc texte + actions */}
          <div className="flex-1 min-w-0">
            <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3">
              {/* Identité */}
              <div className="min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <h1 className="text-2xl sm:text-3xl font-display italic text-night truncate">
                    {displayName}
                  </h1>
                  {profile.pronouns ? (
                    <span className="text-sm text-night-muted">
                      ({profile.pronouns})
                    </span>
                  ) : null}
                  {founderBadge ? (
                    <span
                      aria-label="Membre fondateur"
                      className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-gold/15 text-gold-deep text-[10.5px] font-bold uppercase tracking-wide"
                    >
                      ✦ Fondateur
                    </span>
                  ) : null}
                </div>
                <p className="text-sm text-night-muted">
                  @{profile.username ?? "—"}
                </p>
                {profile.headline ? (
                  <p className="mt-1 text-[14px] text-night-soft leading-snug max-w-2xl">
                    {profile.headline}
                  </p>
                ) : null}

                <MetaRow
                  profile={profile}
                  email={email}
                  socialLinks={social}
                />
                <StatsRow profile={profile} />
              </div>

              {/* Actions bar (client component injecté) + share */}
              {(actionsBar || shareButton) ? (
                <div className="shrink-0 self-start sm:self-end flex items-center gap-2">
                  {actionsBar}
                  {shareButton}
                </div>
              ) : null}
            </div>

            {/* Completion bar (own only) */}
            {isOwn && profile.profile_completion_score < 100 ? (
              <CompletionBar score={profile.profile_completion_score} />
            ) : null}
          </div>
        </div>
      </div>
    </section>
  );
}

function MetaRow({
  profile,
  email,
  socialLinks,
}: {
  profile: ExtendedProfileHeader;
  email?: string | null;
  socialLinks: ProfileSocialLink[];
}) {
  const items: Array<{ key: string; node: React.ReactNode }> = [];

  if (profile.show_location && profile.location) {
    items.push({
      key: "location",
      node: (
        <span className="inline-flex items-center gap-1">
          <MapPin className="w-3.5 h-3.5" aria-hidden />
          {profile.location}
        </span>
      ),
    });
  }

  if (profile.website) {
    items.push({
      key: "website",
      node: (
        <a
          href={profile.website}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1 text-night hover:text-gold-deep transition-colors"
        >
          <LinkIcon className="w-3.5 h-3.5" aria-hidden />
          {hostnameOf(profile.website)}
        </a>
      ),
    });
  }

  for (const link of socialLinks) {
    const Icon = SOCIAL_ICONS[link.kind] ?? LinkIcon;
    items.push({
      key: `social-${link.kind}-${link.url}`,
      node: (
        <a
          href={link.url}
          target="_blank"
          rel="noopener noreferrer"
          aria-label={link.label ?? link.kind}
          className="inline-flex items-center gap-1 text-night hover:text-gold-deep transition-colors"
        >
          <Icon className="w-3.5 h-3.5" aria-hidden />
          {link.label ?? capitalize(link.kind)}
        </a>
      ),
    });
  }

  if (profile.show_email && email) {
    items.push({
      key: "email",
      node: (
        <a
          href={`mailto:${email}`}
          className="inline-flex items-center gap-1 text-night hover:text-gold-deep transition-colors"
        >
          <AtSign className="w-3.5 h-3.5" aria-hidden />
          {email}
        </a>
      ),
    });
  }

  if (items.length === 0) return null;

  return (
    <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1.5 text-[12.5px] text-night-muted">
      {items.map((item, idx) => (
        <span key={item.key} className="inline-flex items-center gap-3">
          {idx > 0 ? <span className="text-night-dim">·</span> : null}
          {item.node}
        </span>
      ))}
    </div>
  );
}

function StatsRow({ profile }: { profile: ExtendedProfileHeader }) {
  return (
    <div className="mt-2.5 flex items-center gap-4 text-[13px]">
      <Link
        href={`/u/${profile.username ?? ""}?tab=followers`}
        className="hover:text-gold-deep transition-colors"
      >
        <span className="font-bold text-night">{profile.followers_count}</span>{" "}
        <span className="text-night-muted">
          abonné{profile.followers_count !== 1 ? "s" : ""}
        </span>
      </Link>
      <Link
        href={`/u/${profile.username ?? ""}?tab=following`}
        className="hover:text-gold-deep transition-colors"
      >
        <span className="font-bold text-night">{profile.following_count}</span>{" "}
        <span className="text-night-muted">abonnements</span>
      </Link>
    </div>
  );
}

function CompletionBar({ score }: { score: number }) {
  return (
    <Link
      href="/profile"
      className="mt-4 flex items-center gap-3 px-3 py-2 rounded-xl bg-gold/10 hover:bg-gold/15 transition-colors border border-gold/20"
    >
      <div className="flex-1 min-w-0">
        <p className="text-[11.5px] font-bold uppercase tracking-wide text-gold-deep mb-1">
          Profil complété : {score}%
        </p>
        <div className="h-1.5 rounded-full bg-night/10 overflow-hidden">
          <div
            className={cn(
              "h-full rounded-full transition-all",
              score >= 70 ? "bg-gold-deep" : "bg-gold",
            )}
            style={{ width: `${Math.max(score, 4)}%` }}
          />
        </div>
      </div>
      <span className="text-[11px] font-semibold text-gold-deep shrink-0">
        Améliorer →
      </span>
    </Link>
  );
}

function hostnameOf(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return url;
  }
}

function capitalize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}
