"use client";

/* CommentsPanel — panneau commentaires réutilisable.
 *
 * Composition :
 *  - Header optionnel (auteur du post + meta + lien vers /feed/[id])
 *  - Body scrollable :
 *      · Texte du post (renderPostBody preserve les line breaks + URLs)
 *      · ReactionsBar
 *      · Section "Commentaires" + liste paginée
 *  - Composer fixed bottom (CommentForm)
 *
 * Utilisé dans :
 *  - PostMediaViewer (PhotoCommentsModal) — sidebar droite desktop + bottom-sheet mobile
 *  - PostDetailModal — sidebar droite
 *  - Future: panneau commentaires sur Reels fullscreen
 *
 * Comportement Facebook :
 *  - Liste de commentaires chronologique avec replies imbriqués
 *  - Reactions par commentaire (8 emojis)
 *  - Composer auto-focus si `autoFocusComposer` fourni
 *  - Loading state pendant le fetch initial */

import { Loader2 } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";
import { Avatar } from "@/components/ui/Avatar";
import { loadPostDetails } from "@/app/(app)/feed/actions";
import { CommentForm } from "@/app/(app)/feed/_components/CommentForm";
import { CommentList } from "@/app/(app)/feed/_components/CommentList";
import { ReactionsBar } from "@/app/(app)/feed/_components/ReactionsBar";
import type {
  CommentWithAuthor,
  PostWithDetails,
} from "@/lib/database.types";
import { renderPostBody } from "@/lib/utils/postBody";
import { formatRelative } from "@/lib/utils/relativeTime";

type CommentsPanelProps = {
  post: PostWithDetails;
  currentUserId: string;
  currentAuthorName: string | null;
  currentAuthorAvatarUrl: string | null;
  /* Si true, on affiche le header avec l'auteur + meta. Mettre à false
     quand le viewer parent affiche déjà cette info. */
  showAuthorHeader?: boolean;
  /* Auto-focus le composer au mount (utile en bottom-sheet mobile
     pour quand l'user tape "💬" → veut écrire directement). */
  autoFocusComposer?: boolean;
  /* Callback appelé à la fermeture (pour fermer le viewer parent). */
  onClose?: () => void;
};

export function CommentsPanel({
  post,
  currentUserId,
  currentAuthorName,
  currentAuthorAvatarUrl,
  showAuthorHeader = true,
  autoFocusComposer = false,
  onClose,
}: CommentsPanelProps) {
  const [comments, setComments] = useState<CommentWithAuthor[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    loadPostDetails(post.id).then((res) => {
      if (cancelled) return;
      if (res.ok) setComments(res.comments);
      setLoading(false);
    });
    return () => {
      cancelled = true;
    };
  }, [post.id]);

  const author = post.author;
  const displayName =
    author?.full_name ?? author?.username ?? "Utilisateur";

  return (
    <>
      {showAuthorHeader ? (
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
          {loading ? (
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
