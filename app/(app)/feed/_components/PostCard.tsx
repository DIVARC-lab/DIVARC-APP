"use client";

/**
 * PostCard — direction "Bold" du handoff design team.
 *
 * Implémenté pixel d'après design_handoff_divarc_refonte/feed-mobile-bold.jsx
 * #BoldPostCard. Tout le JSX a été restructuré : `<article>` rounded-[28px]
 * sans border (juste shadow soft 2-stops), header compact 16/18/8, sub-meta
 * avec dot gold + visibility en mots ("Amis"/"Public"/"Moi"), body éditorial
 * (1ère phrase font-display italic 19px + reste 13.5px), photos en
 * rounded-[18px] avec marges, footer pills h-9 dont bookmark "Sauver" cream
 * à droite.
 *
 * Server actions et imports inchangés — props identiques. 100% Tailwind v4
 * (utilities arbitraires `text-[19px]`, gradients via `bg-gradient-to-br`,
 * shadows via `shadow-[...]`). Aucun `style={{}}` inline.
 */
import { Globe, Lock, MapPin, MessageCircle, Quote, Users } from "lucide-react";
import Link from "next/link";
import { memo } from "react";
import { Avatar } from "@/components/ui/Avatar";
import type { PostWithDetails } from "@/lib/database.types";
import { getPalette } from "@/lib/posts/backgroundColors";
import { ACTIVITIES } from "@/lib/posts/sentiments";
import { cn } from "@/lib/utils/cn";
import { renderPostBody } from "@/lib/utils/postBody";
import { PostPoll } from "./PostPoll";
import { formatRelative } from "@/lib/utils/relativeTime";
import { BookmarkButton } from "./BookmarkButton";
import { ReactionsBar } from "./ReactionsBar";
import { PostMenu } from "./PostMenu";
import { SharePostButton } from "./SharePostButton";
import { WhyThisPost } from "@/components/feed/WhyThisPost";
import type { RankingSignalDisplay } from "@/components/feed/WhyThisPost";
import { useTrackImpression } from "@/lib/hooks/useTrackImpression";
import { useTrackDwell } from "@/lib/hooks/useTrackDwell";
import { mergeRefs } from "@/lib/utils/mergeRefs";
import type { EventSurface } from "@/lib/database.types";
import { PostCarousel } from "./PostCarousel";
import { PostPhotos } from "./PostPhotos";
import { PostVideoPlayer } from "./PostVideoPlayer";

type PostCardProps = {
  post: PostWithDetails;
  currentUserId: string;
  showActions?: boolean;
  /** "hero" = première card du feed avec photo en pleine largeur top
   *  (au-dessus du header). Sinon photo intégrée dans le corps. */
  hero?: boolean;
  /** Surface d'affichage pour le tracking (default feed_home). */
  surface?: EventSurface;
  /** Position dans le feed pour le tracking. */
  position?: number;
  /** Signaux de ranking (depuis /api/feed/personalized) pour
      <WhyThisPost />. Si absent, popover affiche message générique. */
  rankingSignals?: RankingSignalDisplay[];
};

function PostCardInner({
  post,
  currentUserId,
  showActions = true,
  hero = false,
  surface = "feed_home",
  position,
  rankingSignals,
}: PostCardProps) {
  const impressionRef = useTrackImpression(post.id, { surface, position });
  const dwellRef = useTrackDwell(post.id, { surface });
  const author = post.author;
  const displayName = author?.full_name ?? author?.username ?? "Utilisateur";
  const isOwn = post.author_id === currentUserId;

  /* Découpe première phrase / reste — pattern Bold du proto. Si pas de
     point dans le body, tout reste en italic display. */
  const fullBody = post.body ?? "";
  const firstDot = fullBody.indexOf(".");
  const firstSentence =
    firstDot > 0 ? fullBody.slice(0, firstDot + 1) : fullBody;
  const restBody = firstDot > 0 ? fullBody.slice(firstDot + 1).trim() : "";

  const hasMedia = post.video_url || post.photos.length > 0;
  const heroMedia = hero && hasMedia;

  return (
    <article
      ref={mergeRefs<HTMLElement>(impressionRef, dwellRef)}
      className="overflow-hidden rounded-[28px] bg-white shadow-[0_1px_2px_rgba(10,31,68,0.04),0_20px_50px_-28px_rgba(10,31,68,0.22)]"
    >
      {/* Hero media — au-dessus du header pour la 1ère card du feed */}
      {heroMedia && post.video_url ? (
        <PostVideoPlayer
          url={post.video_url}
          hlsUrl={post.video_hls_url}
          thumbnailUrl={post.video_thumbnail_url}
          durationMs={post.video_duration_ms}
          width={post.video_width}
          height={post.video_height}
          postId={post.id}
        />
      ) : heroMedia && post.is_carousel && post.carousel_slides ? (
        <Link href={`/feed/${post.id}`} className="block">
          <PostCarousel
            slides={post.carousel_slides}
            alt={displayName}
            rounded={false}
          />
        </Link>
      ) : heroMedia && post.photos.length > 0 ? (
        <Link href={`/feed/${post.id}`} className="block">
          <PostPhotos photos={post.photos} alt={displayName} rounded={false} />
        </Link>
      ) : null}

      <header className="flex items-center gap-3 pt-5 sm:pt-4 px-5 sm:px-[18px] pb-3 sm:pb-2">
        <Link
          href={`/u/${author?.username ?? ""}`}
          className="shrink-0"
          aria-label={`Profil de ${displayName}`}
        >
          <Avatar
            src={author?.avatar_url ?? null}
            fullName={displayName}
            size="md-bold"
          />
        </Link>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-bold text-night truncate">
            {displayName}
            {(() => {
              /* Plugin Moment : "X se sent heureux 😊" ou "X regarde Y 🎬"
                 affiché en italique non-bold après le nom. */
              if (post.activity_type) {
                const kind = ACTIVITIES.find(
                  (a) => a.type === post.activity_type,
                );
                if (!kind) return null;
                return (
                  <span className="font-normal text-night-soft italic">
                    {" "}
                    {kind.verb}
                    {post.activity_detail ? ` ${post.activity_detail}` : ""}{" "}
                    <span className="not-italic">{kind.emoji}</span>
                  </span>
                );
              }
              if (post.sentiment_emoji && post.sentiment_label) {
                return (
                  <span className="font-normal text-night-soft italic">
                    {" "}
                    se sent {post.sentiment_label}{" "}
                    <span className="not-italic">{post.sentiment_emoji}</span>
                  </span>
                );
              }
              return null;
            })()}
          </p>
          <p className="mt-0.5 flex items-center gap-1.5 text-[11px] text-night-dim">
            <span
              aria-hidden
              className="inline-block w-[5px] h-[5px] rounded-full bg-gold"
            />
            <Link
              href={`/feed/${post.id}`}
              className="hover:text-night transition-colors"
            >
              {formatRelative(post.created_at)}
            </Link>
            <span aria-hidden>·</span>
            <span className="inline-flex items-center gap-1">
              <VisibilityBadge visibility={post.visibility} />
              {post.visibility === "public"
                ? "Public"
                : post.visibility === "private"
                  ? "Moi"
                  : "Amis"}
            </span>
            {post.edited_at ? (
              <>
                <span aria-hidden>·</span>
                <span className="italic">modifié</span>
              </>
            ) : null}
            {post.location_name ? (
              <>
                <span aria-hidden>·</span>
                <span className="inline-flex items-center gap-0.5 text-gold-deep font-semibold">
                  <MapPin className="w-2.5 h-2.5" aria-hidden />
                  {post.location_name}
                  {post.location_city &&
                  post.location_city !== post.location_name
                    ? `, ${post.location_city}`
                    : ""}
                </span>
              </>
            ) : null}
          </p>
        </div>
        <div className="flex items-center gap-1 shrink-0">
          <WhyThisPost
            postId={post.id}
            authorId={post.author_id}
            signals={rankingSignals}
          />
          <PostMenu
            postId={post.id}
            isOwn={isOwn}
            authorName={author?.full_name ?? author?.username ?? null}
            initialBookmarked={post.is_bookmarked}
          />
        </div>
      </header>

      {fullBody ? (
        (() => {
          /* Mode "pensée rapide" : si le post a un background_color
             stocké et qu'aucun média n'est attaché, on rend une carte
             gradient pleine largeur avec le texte centré en Cormorant
             grand format (style Facebook "thoughts"). */
          const palette = getPalette(post.background_color);
          if (palette && !post.video_url && post.photos.length === 0) {
            return (
              <div className="px-5 sm:px-[18px] pb-3.5">
                <div
                  className={cn(
                    "rounded-[18px] overflow-hidden flex items-center justify-center min-h-[260px] px-6 py-10",
                    palette.bg,
                  )}
                >
                  <p
                    className={cn(
                      "text-center font-display italic text-[26px] sm:text-[30px] leading-[1.2] whitespace-pre-wrap break-words",
                      palette.text === "cream" ? "text-cream" : "text-night",
                    )}
                  >
                    {renderPostBody(fullBody)}
                  </p>
                </div>
              </div>
            );
          }
          /* Rendu standard : 1ère phrase Cormorant + reste Inter. */
          return (
            <div className="px-5 sm:px-[18px] pb-3.5">
              <p className="font-display italic text-[19px] font-normal leading-[1.3] text-night whitespace-pre-wrap break-words">
                {renderPostBody(firstSentence)}
              </p>
              {restBody ? (
                <p className="mt-1.5 text-[13.5px] leading-[1.5] text-night-soft whitespace-pre-wrap break-words">
                  {renderPostBody(restBody)}
                </p>
              ) : null}
            </div>
          );
        })()
      ) : null}

      {/* Chantier Feed 4.4 — chip "cite un post" si quoted_post_id présent. */}
      {post.quoted_post_id ? (
        <div className="px-5 sm:px-[18px] pb-3">
          <Link
            href={`/feed/${post.quoted_post_id}`}
            onClick={(e) => e.stopPropagation()}
            className="inline-flex items-center gap-1.5 h-7 px-3 rounded-full bg-bg-soft hover:bg-night/8 text-[11.5px] font-extrabold text-night-soft hover:text-night transition-colors"
          >
            <Quote className="w-3 h-3" aria-hidden />
            Cite un post →
          </Link>
        </div>
      ) : null}

      {/* Plugin Sondage (Phase 1.6). */}
      {post.poll ? (
        <PostPoll
          poll={{
            id: post.poll.id,
            question: post.poll.question,
            multi_choice: post.poll.multi_choice,
            is_anonymous: post.poll.is_anonymous,
            ends_at: post.poll.ends_at,
            total_votes: post.poll.total_votes,
            options: post.poll.options.map((o) => ({
              id: o.id,
              position: o.position,
              label: o.label,
              votes_count: o.votes_count,
            })),
            user_voted_option_ids: post.poll.user_voted_option_ids,
          }}
          currentUserId={currentUserId}
        />
      ) : null}

      {/* Plugin Tag amis : "avec @user1, @user2 et N autres". */}
      {post.tagged_users && post.tagged_users.length > 0 ? (
        <div className="px-5 sm:px-[18px] pb-3 -mt-1">
          <p className="text-[12px] text-night-soft">
            <span className="text-night-muted">avec </span>
            {post.tagged_users.slice(0, 3).map((u, idx) => (
              <span key={u.id}>
                {idx > 0 ? ", " : ""}
                <Link
                  href={`/u/${u.username ?? u.id}`}
                  className="font-bold text-night hover:underline"
                >
                  {u.full_name ??
                    (u.username ? `@${u.username}` : "Utilisateur")}
                </Link>
              </span>
            ))}
            {post.tagged_users.length > 3 ? (
              <span className="text-night-muted">
                {" "}
                et {post.tagged_users.length - 3} autre
                {post.tagged_users.length - 3 > 1 ? "s" : ""}
              </span>
            ) : null}
          </p>
        </div>
      ) : null}

      {/* Media inline (non-hero) — radius 18 + padding x */}
      {!heroMedia && post.video_url ? (
        <div className="px-5 sm:px-[18px] pb-3.5">
          <div className="overflow-hidden rounded-[18px]">
            <PostVideoPlayer
              url={post.video_url}
              hlsUrl={post.video_hls_url}
              thumbnailUrl={post.video_thumbnail_url}
              durationMs={post.video_duration_ms}
              width={post.video_width}
              height={post.video_height}
              postId={post.id}
            />
          </div>
        </div>
      ) : !heroMedia && post.is_carousel && post.carousel_slides ? (
        <Link href={`/feed/${post.id}`} className="block px-5 sm:px-[18px] pb-3.5">
          <div className="overflow-hidden rounded-[18px]">
            <PostCarousel
              slides={post.carousel_slides}
              alt={displayName}
              rounded={false}
            />
          </div>
        </Link>
      ) : !heroMedia && post.photos.length > 0 ? (
        <Link href={`/feed/${post.id}`} className="block px-5 sm:px-[18px] pb-3.5">
          <div className="overflow-hidden rounded-[18px]">
            <PostPhotos
              photos={post.photos}
              alt={displayName}
              rounded={false}
            />
          </div>
        </Link>
      ) : null}

      {/* Link preview — affichée uniquement s'il n'y a pas de média
          (cohérence avec le composer qui les rend mutuellement exclusifs). */}
      {post.link_preview && !post.video_url && post.photos.length === 0 ? (
        <a
          href={post.link_preview.url}
          target="_blank"
          rel="noopener noreferrer"
          className="block mx-[18px] mb-3.5 rounded-xl overflow-hidden border border-line bg-bg-soft hover:bg-bg-soft/70 transition-colors"
        >
          {post.link_preview.image_url ? (
            <div className="relative w-full aspect-[16/9] bg-night/5">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={post.link_preview.image_url}
                alt=""
                loading="lazy"
                className="absolute inset-0 w-full h-full object-cover"
              />
            </div>
          ) : null}
          <div className="px-3 py-2.5">
            <p className="text-[10.5px] uppercase tracking-wider font-bold text-night-muted truncate">
              {post.link_preview.site_name ?? hostnameOf(post.link_preview.url)}
            </p>
            {post.link_preview.title ? (
              <p className="mt-0.5 text-[13.5px] font-bold text-night line-clamp-2 leading-snug">
                {post.link_preview.title}
              </p>
            ) : null}
            {post.link_preview.description ? (
              <p className="mt-1 text-[11.5px] text-night-muted line-clamp-2 leading-snug">
                {post.link_preview.description}
              </p>
            ) : null}
          </div>
        </a>
      ) : null}

      {showActions ? (
        <footer
          className={cn(
            "flex items-center px-5 sm:px-3 h-[68px] sm:h-[60px]",
            "pt-3 pb-5 sm:pt-0 sm:pb-3.5",
            "gap-2 sm:gap-1",
            "border-t border-line/60 sm:border-t-0 mt-2 sm:mt-0",
          )}
        >
          {/* Like (via ReactionsBar) */}
          <ReactionsBar
            postId={post.id}
            initialTotal={post.total_reactions ?? post.likes_count}
          />
          {/* Commenter — toujours visible */}
          <Link
            href={`/feed/${post.id}`}
            className="inline-flex items-center justify-center gap-1.5 h-11 min-w-[100px] sm:min-w-[88px] px-4 sm:px-3 rounded-full text-night-soft text-[13px] font-bold tabular-nums hover:bg-night/5 hover:text-night transition-colors"
            aria-label="Voir les commentaires"
          >
            <MessageCircle className="w-4 h-4 shrink-0" aria-hidden />
            <span className="truncate">
              {post.comments_count > 0 ? post.comments_count : "Commenter"}
            </span>
          </Link>
          {/* Citer — desktop uniquement (sur mobile, dans le menu ...) */}
          <Link
            href={`/feed/quote/${post.id}`}
            aria-label="Citer ce post"
            className="hidden sm:inline-flex items-center justify-center h-11 w-11 shrink-0 rounded-full text-night-soft hover:bg-night/5 hover:text-night transition-colors"
          >
            <Quote className="w-[15px] h-[15px]" aria-hidden />
          </Link>
          {/* Partager — toujours visible (Web Share API + fallback) */}
          <SharePostButton postId={post.id} />
          {/* Bookmark — desktop uniquement (sur mobile, dans le menu ...) */}
          <div className="hidden sm:block ml-auto shrink-0">
            <BookmarkButton
              postId={post.id}
              initialBookmarked={post.is_bookmarked}
            />
          </div>
        </footer>
      ) : null}
    </article>
  );
}

/* Chantier Feed 6.2 — memoization PostCard.
 * Comparaison fine sur les champs qui changent visiblement. */
export const PostCard = memo(PostCardInner, (prev, next) => {
  if (prev.currentUserId !== next.currentUserId) return false;
  if (prev.hero !== next.hero) return false;
  if (prev.showActions !== next.showActions) return false;
  const a = prev.post;
  const b = next.post;
  return (
    a.id === b.id &&
    a.updated_at === b.updated_at &&
    a.edited_at === b.edited_at &&
    a.deleted_at === b.deleted_at &&
    a.likes_count === b.likes_count &&
    a.comments_count === b.comments_count &&
    a.total_reactions === b.total_reactions &&
    a.is_liked === b.is_liked &&
    a.is_bookmarked === b.is_bookmarked &&
    a.quoted_post_id === b.quoted_post_id
  );
});

function hostnameOf(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return url;
  }
}

function VisibilityBadge({
  visibility,
}: {
  visibility: PostWithDetails["visibility"];
}) {
  if (visibility === "public") {
    return (
      <Globe
        className="w-3 h-3"
        aria-hidden
        aria-label="Visible par tous"
      />
    );
  }
  if (visibility === "friends") {
    return (
      <Users
        className="w-3 h-3"
        aria-hidden
        aria-label="Visible par tes amis"
      />
    );
  }
  return (
    <Lock
      className="w-3 h-3"
      aria-hidden
      aria-label="Visible par toi uniquement"
    />
  );
}
