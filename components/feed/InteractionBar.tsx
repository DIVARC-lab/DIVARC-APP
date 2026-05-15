"use client";

/* InteractionBar — barre d'actions sous un post du feed.
 *
 * Composition :
 *  - [Réactions] (ReactionsBar : 8 emojis DIVARC, optimistic UI)
 *  - [Commenter] (bouton qui ouvre le viewer média ou nav /feed/[id])
 *  - [Partager] (bouton qui ouvre la fiche de partage vers conv)
 *  - [Sauvegarder] (optionnel — bookmark dans collection user)
 *
 * Pattern Facebook :
 *  - Layout horizontal, hauteur 44px, icône + texte (desktop) / icône
 *    seule (mobile <sm)
 *  - États visuels : actif/inactif via icon fill + couleur gold-deep
 *  - Hover desktop : bg-night/5 sur la zone
 *  - Compteurs tabular-nums pour stabilité visuelle
 *
 * Composant générique : utilisable depuis FeedPostCard (feed), depuis
 * PostMediaViewer (modal photo), et depuis la page détail single-post. */

import { Bookmark, MessageCircle, Share2 } from "lucide-react";
import { useState } from "react";
import { ReactionsBar } from "@/app/(app)/feed/_components/ReactionsBar";
import { SharePostButton } from "@/app/(app)/feed/_components/SharePostButton";
import { cn } from "@/lib/utils/cn";

type InteractionBarProps = {
  postId: string;
  /* Counts initiaux pour l'affichage des compteurs sous les boutons. */
  initialReactions: number;
  initialComments: number;
  /* Handler clic "Commenter" : ouvre le viewer / la modale détail / nav
     selon le contexte. Si non fourni, le bouton est un Link vers /feed/[id]. */
  onCommentClick?: () => void;
  /* Bookmark (optionnel). Si non fourni, le bouton n'apparaît pas. */
  onBookmarkToggle?: () => void;
  isBookmarked?: boolean;
  /* Affichage compact (mobile <sm) : icônes seules sans label texte. */
  compact?: boolean;
};

export function InteractionBar({
  postId,
  initialReactions,
  initialComments,
  onCommentClick,
  onBookmarkToggle,
  isBookmarked = false,
  compact = false,
}: InteractionBarProps) {
  /* Compteur commentaires en local pour rester sync avec optimistic
     ajouts dans CommentsPanel (event bus simple via window). */
  const [commentsCount] = useState(initialComments);

  return (
    <div
      role="toolbar"
      aria-label="Interactions sur le post"
      className="flex items-center gap-1 px-2 py-1 border-t border-line"
    >
      <div className="flex-1 min-w-0">
        <ReactionsBar postId={postId} initialTotal={initialReactions} />
      </div>

      <ActionButton
        onClick={onCommentClick}
        Icon={MessageCircle}
        label="Commenter"
        count={commentsCount}
        compact={compact}
      />

      <SharePostButton postId={postId} />

      {onBookmarkToggle ? (
        <ActionButton
          onClick={onBookmarkToggle}
          Icon={Bookmark}
          label={isBookmarked ? "Sauvegardé" : "Sauvegarder"}
          active={isBookmarked}
          compact={compact}
        />
      ) : null}
    </div>
  );
}

type ActionButtonProps = {
  onClick?: () => void;
  Icon: typeof MessageCircle;
  label: string;
  count?: number;
  active?: boolean;
  compact?: boolean;
};

function ActionButton({
  onClick,
  Icon,
  label,
  count,
  active = false,
  compact = false,
}: ActionButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label + (typeof count === "number" ? ` (${count})` : "")}
      className={cn(
        "h-10 px-3 sm:px-4 rounded-full inline-flex items-center gap-1.5 transition-colors",
        active
          ? "text-gold-deep hover:bg-gold/10"
          : "text-night-muted hover:bg-night/5 hover:text-night",
      )}
    >
      <Icon
        className="w-[18px] h-[18px] shrink-0"
        strokeWidth={active ? 2.4 : 2}
        fill={active ? "currentColor" : "none"}
        aria-hidden
      />
      {!compact ? (
        <span className="text-[13px] font-semibold hidden sm:inline">
          {label}
        </span>
      ) : null}
      {typeof count === "number" && count > 0 ? (
        <span className="text-[12px] font-bold tabular-nums">{count}</span>
      ) : null}
    </button>
  );
}
