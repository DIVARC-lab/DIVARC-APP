"use client";

/* PhotoCommentsModal — visionneuse photo style Facebook.
 *
 * Layout :
 *  - Desktop xl+ (≥1280px) : 2 colonnes
 *      [Photo plein écran fond noir, flex-[3]] [Sidebar commentaires
 *       blanche, flex-[2] max-w-[480px]]
 *  - Mobile / tablet (<xl) : photo PLEIN ÉCRAN sur fond noir (object-contain
 *    pour voir la photo intégralement, jamais cropée). Bouton flottant
 *    "💬 Commentaires (N)" en bas qui ouvre un bottom-sheet avec :
 *      · Réactions
 *      · Liste commentaires (scroll)
 *      · Composer commentaire
 *    Le bottom-sheet se ferme via tap backdrop ou bouton X.
 *
 * Interactions photo :
 *  - Click backdrop → ferme
 *  - Bouton X → ferme la modale entière
 *  - ESC → ferme
 *  - Flèche gauche/droite (kbd) → navigation
 *  - Chevrons desktop → navigation
 *  - Swipe touch mobile → navigation (seuil 50px)
 *  - Dots indicateurs visuels mobile
 */

import {
  ChevronLeft,
  ChevronRight,
  Loader2,
  MessageCircle,
  X,
} from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { Avatar } from "@/components/ui/Avatar";
import type {
  CommentWithAuthor,
  PostPhoto,
  PostWithDetails,
} from "@/lib/database.types";
import { cn } from "@/lib/utils/cn";
import { formatRelative } from "@/lib/utils/relativeTime";
import { renderPostBody } from "@/lib/utils/postBody";
import { loadPostDetails } from "../actions";
import { CommentForm } from "./CommentForm";
import { CommentList } from "./CommentList";
import { ReactionsBar } from "./ReactionsBar";

type PhotoCommentsModalProps = {
  post: PostWithDetails;
  photos: PostPhoto[];
  initialIndex: number;
  currentUserId: string;
  currentAuthorName: string | null;
  currentAuthorAvatarUrl: string | null;
  open: boolean;
  onClose: () => void;
};

export function PhotoCommentsModal({
  post,
  photos,
  initialIndex,
  currentUserId,
  currentAuthorName,
  currentAuthorAvatarUrl,
  open,
  onClose,
}: PhotoCommentsModalProps) {
  const [index, setIndex] = useState(initialIndex);
  const [mobileCommentsOpen, setMobileCommentsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const touchStartXRef = useRef<number | null>(null);
  const [comments, setComments] = useState<CommentWithAuthor[]>([]);
  const [loadingComments, setLoadingComments] = useState(false);

  useEffect(() => {
    if (open) {
      setIndex(initialIndex);
      setMobileCommentsOpen(false);
    }
  }, [open, initialIndex]);

  const goPrev = useCallback(() => {
    setIndex((i) => (i === 0 ? photos.length - 1 : i - 1));
  }, [photos.length]);

  const goNext = useCallback(() => {
    setIndex((i) => (i === photos.length - 1 ? 0 : i + 1));
  }, [photos.length]);

  /* Keyboard navigation + ESC. */
  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") {
        if (mobileCommentsOpen) setMobileCommentsOpen(false);
        else onClose();
      } else if (e.key === "ArrowLeft") goPrev();
      else if (e.key === "ArrowRight") goNext();
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, onClose, goPrev, goNext, mobileCommentsOpen]);

  /* Body scroll lock. */
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  /* Focus container à l'ouverture. */
  useEffect(() => {
    if (open && containerRef.current) {
      containerRef.current.focus();
    }
  }, [open]);

  /* Fetch comments au mount. */
  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    setLoadingComments(true);
    loadPostDetails(post.id).then((res) => {
      if (cancelled) return;
      if (res.ok) setComments(res.comments);
      setLoadingComments(false);
    });
    return () => {
      cancelled = true;
    };
  }, [open, post.id]);

  if (!open) return null;

  const photo = photos[index] ?? photos[0]!;
  const single = photos.length === 1;
  const author = post.author;
  const displayName =
    author?.full_name ?? author?.username ?? "Utilisateur";
  const commentsCount = post.comments_count ?? comments.length;

  function handleBackdropClick(e: React.MouseEvent) {
    if (e.target === e.currentTarget) onClose();
  }

  function handleTouchStart(e: React.TouchEvent) {
    touchStartXRef.current = e.touches[0]?.clientX ?? null;
  }

  function handleTouchEnd(e: React.TouchEvent) {
    if (touchStartXRef.current === null) return;
    const endX = e.changedTouches[0]?.clientX ?? touchStartXRef.current;
    const delta = endX - touchStartXRef.current;
    touchStartXRef.current = null;
    if (Math.abs(delta) < 50) return;
    if (delta > 0) goPrev();
    else goNext();
  }

  return (
    <div
      ref={containerRef}
      role="dialog"
      aria-modal="true"
      aria-label="Visionneuse de photos"
      tabIndex={-1}
      onClick={handleBackdropClick}
      className="fixed inset-0 z-[60] bg-night flex items-stretch xl:items-center justify-center xl:p-6"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className={cn(
          "relative bg-night overflow-hidden flex flex-col xl:flex-row",
          "w-full h-full xl:max-w-[1400px] xl:max-h-[92vh] xl:rounded-3xl xl:shadow-[0_40px_100px_-30px_rgba(0,0,0,0.8)]",
        )}
      >
        {/* Close X — toujours visible top-right. */}
        <button
          type="button"
          onClick={onClose}
          aria-label="Fermer"
          className={cn(
            "absolute right-3 top-3 z-30 w-10 h-10 rounded-full",
            "bg-white/10 hover:bg-white/20 xl:bg-white/95 xl:hover:bg-white",
            "text-cream xl:text-night-muted xl:hover:text-night",
            "flex items-center justify-center transition-colors",
            "xl:border xl:border-line xl:shadow-soft",
          )}
          style={{ top: "calc(env(safe-area-inset-top, 0px) + 12px)" }}
        >
          <X className="w-5 h-5" aria-hidden />
        </button>

        {/* ============ Colonne PHOTO ============
            Mobile : prend TOUT l'écran (flex-1 min-h-0)
            Desktop xl+ : flex-[3] (60% de la modale) */}
        <div
          className="relative bg-night xl:flex-[3] xl:min-w-0 flex flex-col items-center justify-center min-h-0 flex-1 overflow-hidden"
          onTouchStart={handleTouchStart}
          onTouchEnd={handleTouchEnd}
        >
          {/* Compteur top-left. */}
          {!single ? (
            <div
              aria-hidden
              className="absolute left-3 z-20 px-2.5 py-1 rounded-full bg-night/70 backdrop-blur-md text-cream text-[11px] font-semibold tabular-nums"
              style={{ top: "calc(env(safe-area-inset-top, 0px) + 16px)" }}
            >
              {index + 1} / {photos.length}
            </div>
          ) : null}

          {/* Photo centrée, object-contain = jamais cropée, voir intégralement. */}
          <div
            className="relative w-full flex-1 min-h-0"
            onClick={handleBackdropClick}
          >
            <Image
              key={photo.id}
              src={photo.url}
              alt={displayName}
              fill
              sizes="(max-width: 1280px) 100vw, 60vw"
              priority
              className="object-contain"
              unoptimized={photo.url.includes("?")}
            />
          </div>

          {/* Chevrons desktop. */}
          {!single ? (
            <>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  goPrev();
                }}
                aria-label="Photo précédente"
                className={cn(
                  "hidden sm:flex absolute left-4 top-1/2 -translate-y-1/2 z-20",
                  "w-12 h-12 rounded-full bg-white/10 hover:bg-white/20",
                  "items-center justify-center text-cream transition-colors",
                )}
              >
                <ChevronLeft className="w-6 h-6" aria-hidden />
              </button>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  goNext();
                }}
                aria-label="Photo suivante"
                className={cn(
                  "hidden sm:flex absolute right-4 top-1/2 -translate-y-1/2 z-20",
                  "w-12 h-12 rounded-full bg-white/10 hover:bg-white/20",
                  "items-center justify-center text-cream transition-colors",
                )}
              >
                <ChevronRight className="w-6 h-6" aria-hidden />
              </button>
            </>
          ) : null}

          {/* Dots indicateurs en bas mobile, au-dessus du bouton commentaires. */}
          {!single ? (
            <div className="shrink-0 flex items-center justify-center gap-1.5 py-3 xl:hidden">
              {photos.map((p, idx) => (
                <button
                  key={p.id}
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setIndex(idx);
                  }}
                  aria-label={`Aller à la photo ${idx + 1}`}
                  className={cn(
                    "h-1.5 rounded-full transition-all",
                    idx === index ? "w-6 bg-cream" : "w-1.5 bg-cream/40",
                  )}
                />
              ))}
            </div>
          ) : null}

          {/* Bouton flottant "Commentaires" — mobile only, ouvre bottom-sheet. */}
          <button
            type="button"
            onClick={() => setMobileCommentsOpen(true)}
            aria-label={`Voir les commentaires (${commentsCount})`}
            className={cn(
              "xl:hidden absolute right-3 z-20 flex items-center gap-2 px-4 h-11",
              "rounded-full bg-white/95 text-night font-semibold text-sm",
              "shadow-[0_4px_12px_rgba(0,0,0,0.3)] active:scale-95 transition-transform",
            )}
            style={{
              bottom: "calc(env(safe-area-inset-bottom, 0px) + 16px)",
            }}
          >
            <MessageCircle className="w-4 h-4" aria-hidden />
            <span className="tabular-nums">{commentsCount}</span>
          </button>
        </div>

        {/* ============ Sidebar commentaires DESKTOP only (xl+) ============ */}
        <aside className="hidden xl:flex xl:flex-col flex-1 min-h-0 bg-bg xl:flex-[2] xl:max-w-[480px] xl:border-l xl:border-line">
          <CommentsContent
            post={post}
            displayName={displayName}
            author={author}
            comments={comments}
            loadingComments={loadingComments}
            currentUserId={currentUserId}
            currentAuthorName={currentAuthorName}
            currentAuthorAvatarUrl={currentAuthorAvatarUrl}
            onClose={onClose}
          />
        </aside>
      </div>

      {/* ============ Bottom-sheet commentaires MOBILE ============ */}
      {mobileCommentsOpen ? (
        <div
          className="xl:hidden fixed inset-0 z-[65] flex flex-col justify-end"
          onClick={(e) => {
            if (e.target === e.currentTarget) setMobileCommentsOpen(false);
          }}
        >
          {/* Backdrop semi-transparent (la photo reste visible en arrière). */}
          <div
            className="absolute inset-0 bg-night/60 backdrop-blur-sm"
            aria-hidden
            onClick={() => setMobileCommentsOpen(false)}
          />
          {/* Sheet content. */}
          <div
            onClick={(e) => e.stopPropagation()}
            className="relative bg-bg rounded-t-3xl shadow-[0_-20px_60px_-10px_rgba(0,0,0,0.5)] flex flex-col"
            style={{
              maxHeight: "85%",
              paddingBottom: "env(safe-area-inset-bottom, 0px)",
            }}
          >
            {/* Drag handle */}
            <div className="flex justify-center pt-3 pb-1">
              <span aria-hidden className="w-10 h-1 rounded-full bg-night/15" />
            </div>
            {/* Header avec X */}
            <div className="flex items-center justify-between px-5 py-2 border-b border-line">
              <h2 className="text-sm font-bold text-night">
                Commentaires
                {comments.length > 0 ? (
                  <span className="text-night-muted ml-1.5 tabular-nums font-semibold">
                    ({comments.length})
                  </span>
                ) : null}
              </h2>
              <button
                type="button"
                onClick={() => setMobileCommentsOpen(false)}
                aria-label="Fermer les commentaires"
                className="w-9 h-9 rounded-full hover:bg-night/5 flex items-center justify-center text-night-muted"
              >
                <X className="w-4 h-4" aria-hidden />
              </button>
            </div>
            <CommentsContent
              post={post}
              displayName={displayName}
              author={author}
              comments={comments}
              loadingComments={loadingComments}
              currentUserId={currentUserId}
              currentAuthorName={currentAuthorName}
              currentAuthorAvatarUrl={currentAuthorAvatarUrl}
              onClose={onClose}
              hideHeader
            />
          </div>
        </div>
      ) : null}
    </div>
  );
}

/* ============ Sous-composant : contenu du panneau commentaires ============
   Partagé entre la sidebar desktop et le bottom-sheet mobile. */

type CommentsContentProps = {
  post: PostWithDetails;
  displayName: string;
  author: PostWithDetails["author"];
  comments: CommentWithAuthor[];
  loadingComments: boolean;
  currentUserId: string;
  currentAuthorName: string | null;
  currentAuthorAvatarUrl: string | null;
  onClose: () => void;
  hideHeader?: boolean;
};

function CommentsContent({
  post,
  displayName,
  author,
  comments,
  loadingComments,
  currentUserId,
  currentAuthorName,
  currentAuthorAvatarUrl,
  onClose,
  hideHeader = false,
}: CommentsContentProps) {
  return (
    <>
      {!hideHeader ? (
        <header className="shrink-0 px-5 pt-5 pb-3 border-b border-line">
          <div className="flex items-start gap-3">
            <Avatar
              src={author?.avatar_url ?? null}
              fullName={displayName}
              size="md"
            />
            <div className="flex-1 min-w-0">
              <Link
                href={author?.username ? `/u/${author.username}` : "#"}
                className="text-sm font-bold text-night hover:underline"
                onClick={onClose}
              >
                {displayName}
              </Link>
              <p className="text-xs text-night-muted">
                {formatRelative(post.created_at)}
              </p>
            </div>
            <Link
              href={`/feed/${post.id}`}
              onClick={onClose}
              className="text-[11px] font-semibold text-gold-deep hover:underline shrink-0"
            >
              Voir la page →
            </Link>
          </div>
        </header>
      ) : null}

      <div className="flex-1 min-h-0 overflow-y-auto">
        {hideHeader ? (
          <header className="px-5 pt-4 pb-3 border-b border-line">
            <div className="flex items-start gap-3">
              <Avatar
                src={author?.avatar_url ?? null}
                fullName={displayName}
                size="md"
              />
              <div className="flex-1 min-w-0">
                <Link
                  href={author?.username ? `/u/${author.username}` : "#"}
                  className="text-sm font-bold text-night hover:underline"
                  onClick={onClose}
                >
                  {displayName}
                </Link>
                <p className="text-xs text-night-muted">
                  {formatRelative(post.created_at)}
                </p>
              </div>
              <Link
                href={`/feed/${post.id}`}
                onClick={onClose}
                className="text-[11px] font-semibold text-gold-deep hover:underline shrink-0"
              >
                Voir la page →
              </Link>
            </div>
          </header>
        ) : null}

        {post.body ? (
          <div className="px-5 py-4 text-[14.5px] leading-relaxed text-night whitespace-pre-wrap break-words">
            {renderPostBody(post.body)}
          </div>
        ) : null}

        <div className="px-5 py-3 border-t border-line">
          <ReactionsBar
            postId={post.id}
            initialTotal={post.total_reactions ?? post.likes_count ?? 0}
          />
        </div>

        <div className="px-5 py-4 border-t border-line">
          {!hideHeader ? (
            <h3 className="text-xs font-extrabold uppercase tracking-[0.18em] text-night-muted mb-3">
              Commentaires
              {comments.length > 0 ? (
                <span className="text-night-muted/60 ml-1.5 tabular-nums">
                  ({comments.length})
                </span>
              ) : null}
            </h3>
          ) : null}
          {loadingComments ? (
            <div className="flex justify-center py-6">
              <Loader2
                className="w-4 h-4 text-night-muted animate-spin"
                aria-hidden
              />
            </div>
          ) : (
            <CommentList
              comments={comments}
              postId={post.id}
              currentUserId={currentUserId}
            />
          )}
        </div>
      </div>

      <div className="shrink-0 px-5 py-3 border-t border-line bg-bg">
        <CommentForm
          postId={post.id}
          authorName={currentAuthorName}
          authorAvatarUrl={currentAuthorAvatarUrl}
        />
      </div>
    </>
  );
}
