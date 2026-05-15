"use client";

/* PhotoCommentsModal — visionneuse photo style Facebook.
 *
 * Layout :
 *  - Desktop xl+ (≥1280px) : 2 colonnes
 *      [Photo plein écran fond noir, flex-[3]] [Sidebar commentaires
 *       blanche, flex-[2] max-w-[480px]]
 *    La photo a un object-contain (pas crop) + chevrons + dots.
 *  - Mobile / tablet : 1 colonne scrollable
 *      Header X / nom / index + zone photo aspect natif + body +
 *      réactions + commentaires + composer collé en bas.
 *
 * Interactions photo :
 *  - Click backdrop → ferme
 *  - Bouton X → ferme
 *  - ESC → ferme
 *  - Flèche gauche/droite (kbd) → navigation
 *  - Boutons chevron desktop → navigation
 *  - Swipe touch mobile → navigation (seuil 50px)
 *  - Dots / compteur visuel mobile
 *
 * Interactions sidebar :
 *  - Réactions bar (toggle reaction)
 *  - Liste de commentaires (CommentList)
 *  - Composer commentaire (CommentForm) collé en bas
 *
 * a11y :
 *  - role="dialog" aria-modal
 *  - Body scroll lock pendant ouverture
 *  - Focus container au mount
 */

import { ChevronLeft, ChevronRight, Loader2, X } from "lucide-react";
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
  const containerRef = useRef<HTMLDivElement>(null);
  const touchStartXRef = useRef<number | null>(null);
  const [comments, setComments] = useState<CommentWithAuthor[]>([]);
  const [loadingComments, setLoadingComments] = useState(false);

  /* Sync index quand l'user rouvre sur une autre photo. */
  useEffect(() => {
    if (open) setIndex(initialIndex);
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
      if (e.key === "Escape") onClose();
      else if (e.key === "ArrowLeft") goPrev();
      else if (e.key === "ArrowRight") goNext();
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, onClose, goPrev, goNext]);

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

  function handleBackdropClick(e: React.MouseEvent) {
    /* Ne ferme que si on a cliqué sur le backdrop (pas sur l'inner card). */
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
    if (Math.abs(delta) < 50) return; /* trop court, ignore */
    if (delta > 0) goPrev();
    else goNext();
  }

  return (
    <div
      ref={containerRef}
      role="dialog"
      aria-modal="true"
      aria-label="Visionneuse de photos avec commentaires"
      tabIndex={-1}
      onClick={handleBackdropClick}
      className="fixed inset-0 z-[60] bg-night flex items-stretch xl:items-center justify-center xl:p-6"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className={cn(
          "relative bg-night xl:bg-bg overflow-hidden flex flex-col xl:flex-row",
          "w-full h-full xl:max-w-[1400px] xl:max-h-[92vh] xl:rounded-3xl xl:shadow-[0_40px_100px_-30px_rgba(0,0,0,0.8)]",
        )}
      >
        {/* Close X — flotte top-right partout. */}
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
        >
          <X className="w-5 h-5" aria-hidden />
        </button>

        {/* ============ Colonne PHOTO (gauche desktop, top mobile) ============ */}
        <div
          className="relative bg-night xl:flex-[3] xl:min-w-0 flex flex-col items-center justify-center min-h-0 overflow-hidden"
          onTouchStart={handleTouchStart}
          onTouchEnd={handleTouchEnd}
        >
          {/* Compteur visible top-left (mobile) ou centered top (desktop). */}
          {!single ? (
            <div
              aria-hidden
              className="absolute left-3 top-3 z-20 px-2.5 py-1 rounded-full bg-night/70 backdrop-blur-md text-cream text-[11px] font-semibold tabular-nums"
            >
              {index + 1} / {photos.length}
            </div>
          ) : null}

          {/* Photo centrée, object-contain (preserve ratio natif). */}
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

          {/* Chevrons navigation (desktop). */}
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

          {/* Dots compteur mobile en bas. */}
          {!single ? (
            <div className="shrink-0 flex items-center justify-center gap-1.5 py-3 sm:hidden">
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
        </div>

        {/* ============ Colonne COMMENTAIRES (droite desktop, bottom mobile) ============ */}
        <aside className="flex flex-col flex-1 min-h-0 bg-bg xl:flex-[2] xl:max-w-[480px] xl:border-l xl:border-line">
          {/* Header post : avatar + nom + meta */}
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

          {/* Body + reactions + comments — scrollable. */}
          <div className="flex-1 min-h-0 overflow-y-auto">
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
              <h3 className="text-xs font-extrabold uppercase tracking-[0.18em] text-night-muted mb-3">
                Commentaires
                {comments.length > 0 ? (
                  <span className="text-night-muted/60 ml-1.5 tabular-nums">
                    ({comments.length})
                  </span>
                ) : null}
              </h3>

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

          {/* Composer commentaire — fixé bas. */}
          <div className="shrink-0 px-5 py-3 border-t border-line bg-bg">
            <CommentForm
              postId={post.id}
              authorName={currentAuthorName}
              authorAvatarUrl={currentAuthorAvatarUrl}
            />
          </div>
        </aside>
      </div>
    </div>
  );
}
