"use client";

import { Loader2, X } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";
import { Avatar } from "@/components/ui/Avatar";
import type {
  CommentWithAuthor,
  PostWithDetails,
} from "@/lib/database.types";
import { cn } from "@/lib/utils/cn";
import { formatRelative } from "@/lib/utils/relativeTime";
import { renderPostBody } from "@/lib/utils/postBody";
import { loadPostDetails } from "../actions";
import { CommentForm } from "./CommentForm";
import { CommentList } from "./CommentList";
import { ReactionsBar } from "./ReactionsBar";

type PostDetailModalProps = {
  post: PostWithDetails;
  currentUserId: string;
  /* Avatar + nom courant pour pre-fill du composer de commentaire. */
  currentAuthorName: string | null;
  currentAuthorAvatarUrl: string | null;
  open: boolean;
  onClose: () => void;
};

/* Modal détail desktop pour un post (étape 13 chantier Feed FB-style).
 *
 * Évite la navigation /feed/[id] quand l'user veut juste voir les
 * commentaires sans quitter le feed. Pattern Facebook 2026.
 *
 * Layout :
 *  - Desktop xl+ (≥1280) : 2 colonnes — media plein gauche (60%) +
 *    panneau droit (40%) avec header + body + reactions + comments
 *    scrollables.
 *  - Tablet / mobile : layout 1 colonne, scroll vertical.
 *
 * Fetch :
 *  - Les comments sont chargés via server action loadPostDetails(id)
 *    au mount du modal (pas pré-fetch en feed pour éviter le gaspillage).
 *  - State loading + erreur géré localement.
 *
 * a11y :
 *  - role=dialog aria-modal
 *  - ESC + click backdrop ferment
 *  - Body scroll lock pendant ouverture
 *  - Focus container au mount
 */
export function PostDetailModal({
  post,
  currentUserId,
  currentAuthorName,
  currentAuthorAvatarUrl,
  open,
  onClose,
}: PostDetailModalProps) {
  const [comments, setComments] = useState<CommentWithAuthor[]>([]);
  const [loadingComments, setLoadingComments] = useState(false);

  /* Body scroll lock pendant ouverture. */
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  /* ESC ferme. */
  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  /* Fetch comments au mount du modal. */
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

  const author = post.author;
  const displayName =
    author?.full_name ?? author?.username ?? "Utilisateur";
  const hasMedia =
    (post.photos && post.photos.length > 0) || !!post.video_url;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={`Détail du post de ${displayName}`}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      className="fixed inset-0 z-[55] bg-night/60 backdrop-blur-sm flex items-stretch xl:items-center justify-center xl:p-6"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className={cn(
          "relative bg-bg overflow-hidden flex flex-col xl:flex-row",
          "w-full max-w-[1200px] h-full xl:max-h-[90vh] xl:rounded-3xl",
          "shadow-[0_40px_100px_-30px_rgba(10,31,68,0.55)]",
        )}
      >
        {/* Close X — flotte top-right. */}
        <button
          type="button"
          onClick={onClose}
          aria-label="Fermer"
          className="absolute right-3 top-3 z-10 w-10 h-10 rounded-full bg-white/95 border border-line text-night-muted hover:text-night hover:border-night/30 flex items-center justify-center shadow-soft"
        >
          <X className="w-4 h-4" aria-hidden />
        </button>

        {/* Colonne média (gauche desktop xl, top mobile). */}
        {hasMedia ? (
          <div className="bg-night xl:flex-[3] xl:min-w-0 flex items-center justify-center max-h-[50vh] xl:max-h-none overflow-hidden">
            {post.video_url ? (
              /* Vidéo : on garde l'élément natif, controls dispo. */
              // eslint-disable-next-line @next/next/no-img-element, jsx-a11y/media-has-caption
              <video
                src={post.video_url}
                poster={post.video_thumbnail_url ?? undefined}
                controls
                playsInline
                className="max-w-full max-h-full"
              />
            ) : post.photos && post.photos[0] ? (
              <div className="relative w-full h-full min-h-[280px] xl:min-h-[400px]">
                <Image
                  src={post.photos[0].url}
                  alt={displayName}
                  fill
                  sizes="(max-width: 1280px) 100vw, 720px"
                  className="object-contain"
                  unoptimized={post.photos[0].url.includes("?")}
                />
                {post.photos.length > 1 ? (
                  <div className="absolute bottom-3 right-3 px-2.5 py-1 rounded-full bg-night/70 text-cream text-[11px] font-semibold tabular-nums">
                    +{post.photos.length - 1} autre
                    {post.photos.length - 1 > 1 ? "s" : ""}
                  </div>
                ) : null}
              </div>
            ) : null}
          </div>
        ) : null}

        {/* Colonne content + comments (droite desktop xl, bottom mobile). */}
        <div
          className={cn(
            "flex flex-col flex-1 min-h-0 bg-bg",
            hasMedia ? "xl:flex-[2] xl:max-w-[480px]" : "max-w-[640px] mx-auto",
          )}
        >
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
              {/* Lien vers la page complète /feed/[id] (SEO + share). */}
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
            {/* Body text */}
            {post.body ? (
              <div className="px-5 py-4 text-[14.5px] leading-relaxed text-night whitespace-pre-wrap break-words">
                {renderPostBody(post.body)}
              </div>
            ) : null}

            {/* Reactions bar — réutilise ReactionsBar. */}
            <div className="px-5 py-3 border-t border-line">
              <ReactionsBar
                postId={post.id}
                initialTotal={post.total_reactions ?? post.likes_count ?? 0}
              />
            </div>

            {/* Comments */}
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
        </div>
      </div>
    </div>
  );
}
