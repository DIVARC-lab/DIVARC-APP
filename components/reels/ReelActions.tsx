"use client";

/* ReelActions — colonne d'actions latérale (style TikTok/Reels).
 *
 * Layout vertical droite : avatar auteur + bouton follow, like, comment,
 * share, save, duet (optionnel), disque musique animé (optionnel).
 *
 * Composant générique réutilisable :
 *  - ReelView l'utilise comme overlay sur la vidéo (in-feed)
 *  - Un futur ReelDetailView pourra réutiliser (page /reels/[id])
 *  - Une carte preview dans le feed pourrait l'inclure aussi
 *
 * Tous les états (liked, saved, counts) sont passés en props ET les
 * callbacks de toggle sont fournis par le parent. L'optimistic UI
 * (incrémenter le compteur + flip l'icon AVANT le retour serveur) est
 * géré par le parent — ce composant est "dumb" : il affiche ce qu'on
 * lui donne et notifie les clics.
 *
 * Tailwind v4 + Lucide. Pas de Motion ici (les transitions sont en
 * CSS classes — moins coûteux et suffisant pour des toggles). */

import {
  Bookmark,
  Heart,
  MessageCircle,
  Music,
  Send,
  UserPlus,
  Users2,
} from "lucide-react";
import Link from "next/link";
import { Avatar } from "@/components/ui/Avatar";
import { cn } from "@/lib/utils/cn";

export type ReelActionsProps = {
  /* État + callbacks Like. */
  liked: boolean;
  likeCount: number;
  onLikeToggle: () => void;

  /* État Comment. */
  commentCount: number;
  onCommentClick: () => void;

  /* Partage. shareCount peut être absent si non tracké. */
  shareCount?: number;
  onShare: () => void;

  /* Sauvegarde. Optionnel — si onSaveToggle est null, le bouton n'est
     pas rendu (utile en V1 si le module bookmarks n'existe pas pour
     les reels). */
  saved?: boolean;
  onSaveToggle?: () => void;

  /* Auteur. Si fourni → bouton profil + badge follow (sauf si isOwn).
     Si null → on cache l'avatar (cas anonyme). */
  author?: {
    id: string;
    full_name: string | null;
    username: string | null;
    avatar_url: string | null;
  } | null;
  isOwn?: boolean;
  /* État follow + callback (V1 : géré côté ReelView via API existante).
     Si non fourni, le badge `UserPlus` est statique (clic = navigue
     profil au lieu de toggle follow). */
  isFollowing?: boolean;
  onFollowToggle?: () => void;

  /* Duet — bouton qui permet de créer un duo avec ce reel. Visible
     uniquement si autorisé par le reel ET reel pas lui-même un duet. */
  duetReelId?: string | null;
  allowDuets?: boolean;

  /* Sound — disque musique animé qui linke vers /sounds/[id]. */
  sound?: {
    id: string;
    title: string;
  } | null;

  className?: string;
};

export function ReelActions({
  liked,
  likeCount,
  onLikeToggle,
  commentCount,
  onCommentClick,
  shareCount,
  onShare,
  saved,
  onSaveToggle,
  author,
  isOwn = false,
  isFollowing = false,
  onFollowToggle,
  duetReelId,
  allowDuets = false,
  sound,
  className,
}: ReelActionsProps) {
  return (
    <div
      className={cn(
        "absolute right-2 bottom-32 sm:bottom-24 z-10 flex flex-col items-center gap-4",
        className,
      )}
    >
      {/* Avatar auteur + badge follow. */}
      {author ? (
        <div className="relative">
          <Link
            href={`/u/${author.username ?? author.id}`}
            aria-label="Profil de l'auteur"
            className="block"
          >
            <Avatar
              src={author.avatar_url}
              fullName={author.full_name}
              size="md-bold"
            />
          </Link>
          {!isOwn && !isFollowing ? (
            onFollowToggle ? (
              <button
                type="button"
                onClick={onFollowToggle}
                aria-label="S'abonner"
                className="absolute -bottom-2 left-1/2 -translate-x-1/2 w-6 h-6 rounded-full bg-rose-500 hover:bg-rose-600 text-cream text-[10px] font-bold flex items-center justify-center border-2 border-black active:scale-90 transition-transform"
              >
                <UserPlus className="w-3 h-3" aria-hidden />
              </button>
            ) : (
              <span
                aria-hidden
                className="absolute -bottom-2 left-1/2 -translate-x-1/2 w-6 h-6 rounded-full bg-rose-500 text-cream text-[10px] font-bold flex items-center justify-center border-2 border-black"
              >
                <UserPlus className="w-3 h-3" aria-hidden />
              </span>
            )
          ) : null}
        </div>
      ) : null}

      {/* Like. */}
      <ActionBtn
        label={liked ? "Retirer le j'aime" : "J'aime"}
        onClick={onLikeToggle}
        count={likeCount}
      >
        <Heart
          className={cn(
            "w-7 h-7 transition-colors",
            liked ? "text-rose-500 fill-rose-500" : "text-cream",
          )}
          strokeWidth={2}
        />
      </ActionBtn>

      {/* Comment. */}
      <ActionBtn
        label="Commenter"
        onClick={onCommentClick}
        count={commentCount}
      >
        <MessageCircle className="w-7 h-7 text-cream" aria-hidden />
      </ActionBtn>

      {/* Share. */}
      <ActionBtn label="Partager" onClick={onShare} count={shareCount}>
        <Send className="w-7 h-7 text-cream" aria-hidden />
      </ActionBtn>

      {/* Save (optionnel). */}
      {onSaveToggle ? (
        <ActionBtn
          label={saved ? "Retirer des favoris" : "Sauvegarder"}
          onClick={onSaveToggle}
        >
          <Bookmark
            className={cn(
              "w-7 h-7 transition-colors",
              saved ? "text-gold fill-gold" : "text-cream",
            )}
            strokeWidth={2}
          />
        </ActionBtn>
      ) : null}

      {/* Duet (créateur). */}
      {allowDuets && duetReelId && !isOwn ? (
        <Link
          href={`/reels/new?duet=${duetReelId}&layout=right`}
          aria-label="Créer un Duo avec ce reel"
          className="flex flex-col items-center gap-1"
        >
          <span className="w-12 h-12 rounded-full bg-cream/10 hover:bg-cream/20 flex items-center justify-center">
            <Users2 className="w-6 h-6 text-cream" aria-hidden />
          </span>
          <span className="text-[10.5px] font-semibold text-cream/80">
            Duo
          </span>
        </Link>
      ) : null}

      {/* Disque musique. */}
      {sound ? (
        <Link
          href={`/sounds/${sound.id}`}
          aria-label={`Son : ${sound.title}`}
          className="w-9 h-9 rounded-full bg-black border-2 border-cream flex items-center justify-center animate-spin-slow"
        >
          <Music className="w-4 h-4 text-cream" aria-hidden />
        </Link>
      ) : null}
    </div>
  );
}

function ActionBtn({
  label,
  onClick,
  count,
  children,
}: {
  label: string;
  onClick: () => void;
  count?: number;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      className="flex flex-col items-center gap-1 active:scale-95 transition-transform"
    >
      <span className="w-12 h-12 rounded-full bg-cream/10 hover:bg-cream/20 flex items-center justify-center">
        {children}
      </span>
      {typeof count === "number" && count > 0 ? (
        <span className="text-[11px] font-bold text-cream tabular-nums">
          {compactCount(count)}
        </span>
      ) : null}
    </button>
  );
}

/* Formatte un compteur en compact (1.2K, 4.3M) pour ne pas casser
 * la colonne d'actions avec un long nombre. */
function compactCount(n: number): string {
  if (n < 1000) return String(n);
  if (n < 1_000_000) return `${(n / 1000).toFixed(n < 10_000 ? 1 : 0)}K`;
  return `${(n / 1_000_000).toFixed(1)}M`;
}
