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
import { Globe, Lock, MessageCircle, Send, Users } from "lucide-react";
import Link from "next/link";
import { Avatar } from "@/components/ui/Avatar";
import type { PostWithDetails } from "@/lib/database.types";
import { getPalette } from "@/lib/posts/backgroundColors";
import { cn } from "@/lib/utils/cn";
import { renderPostBody } from "@/lib/utils/postBody";
import { formatRelative } from "@/lib/utils/relativeTime";
import { BookmarkButton } from "./BookmarkButton";
import { LikeButton } from "./LikeButton";
import { PostMenu } from "./PostMenu";
import { WhyThisPost } from "@/components/feed/WhyThisPost";
import type { RankingSignalDisplay } from "@/components/feed/WhyThisPost";
import { useTrackImpression } from "@/lib/hooks/useTrackImpression";
import { useTrackDwell } from "@/lib/hooks/useTrackDwell";
import { mergeRefs } from "@/lib/utils/mergeRefs";
import type { EventSurface } from "@/lib/database.types";
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

export function PostCard({
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
          thumbnailUrl={post.video_thumbnail_url}
          durationMs={post.video_duration_ms}
          width={post.video_width}
          height={post.video_height}
        />
      ) : heroMedia && post.photos.length > 0 ? (
        <Link href={`/feed/${post.id}`} className="block">
          <PostPhotos photos={post.photos} alt={displayName} rounded={false} />
        </Link>
      ) : null}

      <header className="flex items-center gap-3 pt-4 px-[18px] pb-2">
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
              <div className="px-[18px] pb-3.5">
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
            <div className="px-[18px] pb-3.5">
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

      {/* Media inline (non-hero) — radius 18 + padding x */}
      {!heroMedia && post.video_url ? (
        <div className="px-[18px] pb-3.5">
          <div className="overflow-hidden rounded-[18px]">
            <PostVideoPlayer
              url={post.video_url}
              thumbnailUrl={post.video_thumbnail_url}
              durationMs={post.video_duration_ms}
              width={post.video_width}
              height={post.video_height}
            />
          </div>
        </div>
      ) : !heroMedia && post.photos.length > 0 ? (
        <Link href={`/feed/${post.id}`} className="block px-[18px] pb-3.5">
          <div className="overflow-hidden rounded-[18px]">
            <PostPhotos
              photos={post.photos}
              alt={displayName}
              rounded={false}
            />
          </div>
        </Link>
      ) : null}

      {showActions ? (
        <footer className="flex items-center gap-1.5 px-3 pb-3.5">
          <LikeButton
            postId={post.id}
            initialLiked={post.is_liked}
            initialCount={post.likes_count}
          />
          <Link
            href={`/feed/${post.id}`}
            className="inline-flex items-center gap-1.5 min-h-11 h-11 px-3 rounded-full text-night-soft text-[13px] font-bold hover:bg-night/5 hover:text-night transition-colors"
            aria-label="Voir les commentaires"
          >
            <MessageCircle className="w-4 h-4" aria-hidden />
            {post.comments_count > 0 ? post.comments_count : "Commenter"}
          </Link>
          <button
            type="button"
            className="inline-flex items-center justify-center h-11 w-11 rounded-full text-night-soft hover:bg-night/5 hover:text-night transition-colors"
            aria-label="Partager"
          >
            <Send className="w-[15px] h-[15px]" aria-hidden />
          </button>
          <div className="ml-auto">
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
