"use client";

import {
  CornerDownRight,
  Heart,
  Loader2,
  MessageCircle,
  Send,
  Trash2,
  X,
} from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { Avatar } from "@/components/ui/Avatar";
import { cn } from "@/lib/utils/cn";
import { formatRelative } from "@/lib/utils/relativeTime";
import { linkifyMentions } from "@/lib/utils/linkifyMentions";
import {
  addReelComment,
  deleteReelComment,
} from "@/app/(app)/reels/comments-actions";

/* ReelCommentsSheet — bottom-sheet TikTok-style avec THREADS V2.
 *
 * Layout :
 *   - Mobile : bottom-sheet 75vh
 *   - Desktop : panel right side 420px
 *
 * Features V2 :
 *   - Threads (replies) : root comments + replies indentées
 *     "Voir N réponses" expandable, bouton "Répondre" par comment
 *   - Composer adapte le placeholder ("Réponse à @user…") quand replyTo set
 *   - Optimistic update à l'ajout (root + reply)
 *   - Self-delete sur tes propres comments
 *   - V3 : like comments + mentions auto-link
 */

type Comment = {
  id: string;
  author_id: string;
  body: string;
  parent_id: string | null;
  likes_count: number;
  created_at: string;
};

type Author = {
  id: string;
  full_name: string | null;
  username: string | null;
  avatar_url: string | null;
};

type Props = {
  reelId: string;
  currentUserId: string;
  initialCount: number;
  allowComments: boolean;
  onClose: () => void;
};

export function ReelCommentsSheet({
  reelId,
  currentUserId,
  initialCount,
  allowComments,
  onClose,
}: Props) {
  const [comments, setComments] = useState<Comment[]>([]);
  const [authorById, setAuthorById] = useState<Map<string, Author>>(new Map());
  const [likedIds, setLikedIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [body, setBody] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [count, setCount] = useState(initialCount);
  const inputRef = useRef<HTMLInputElement>(null);
  /* V2 threads : si replyTo set, le prochain comment publié sera une
     réponse à ce comment (parent_id = replyTo.id). */
  const [replyTo, setReplyTo] = useState<{
    commentId: string;
    username: string | null;
  } | null>(null);
  /* Threads expandables : Set<rootCommentId> qui ont leurs replies visibles. */
  const [expandedThreads, setExpandedThreads] = useState<Set<string>>(
    new Set(),
  );

  /* Group comments par parent_id : root list + map repliesByParent. */
  const { rootComments, repliesByParent } = useMemo(() => {
    const roots: Comment[] = [];
    const repliesMap = new Map<string, Comment[]>();
    for (const c of comments) {
      if (c.parent_id) {
        const arr = repliesMap.get(c.parent_id) ?? [];
        arr.push(c);
        repliesMap.set(c.parent_id, arr);
      } else {
        roots.push(c);
      }
    }
    /* Replies triées par date asc (chronologique dans le thread). */
    for (const arr of repliesMap.values()) {
      arr.sort(
        (a, b) =>
          new Date(a.created_at).getTime() - new Date(b.created_at).getTime(),
      );
    }
    return { rootComments: roots, repliesByParent: repliesMap };
  }, [comments]);

  /* Fetch initial. */
  useEffect(() => {
    async function load() {
      try {
        const res = await fetch(`/api/reels/${reelId}/comments`, {
          cache: "no-store",
        });
        if (!res.ok) return;
        const json = (await res.json()) as {
          comments: Comment[];
          authors: Author[];
          liked_ids?: string[];
        };
        setComments(json.comments);
        const map = new Map<string, Author>();
        for (const a of json.authors) map.set(a.id, a);
        setAuthorById(map);
        setLikedIds(new Set(json.liked_ids ?? []));
      } finally {
        setLoading(false);
      }
    }
    void load();
  }, [reelId]);

  /* Focus input quand sheet s'ouvre. */
  useEffect(() => {
    setTimeout(() => inputRef.current?.focus(), 100);
  }, []);

  const submit = useCallback(async () => {
    const text = body.trim();
    if (!text || submitting || !allowComments) return;
    setSubmitting(true);

    /* Si on répond à un comment, parent_id = celui du root du thread
       (Twitter-style flat replies). On résout le root si replyTo
       pointe sur une reply (parent_id non null), pour éviter les
       arbres profonds. */
    let parentRoot: string | null = null;
    if (replyTo) {
      const target = comments.find((c) => c.id === replyTo.commentId);
      parentRoot = target?.parent_id ?? target?.id ?? null;
    }

    /* Optimistic add. */
    const tempId = `temp-${Date.now()}`;
    const optimistic: Comment = {
      id: tempId,
      author_id: currentUserId,
      body: text,
      parent_id: parentRoot,
      likes_count: 0,
      created_at: new Date().toISOString(),
    };
    setComments((prev) => [optimistic, ...prev]);
    setCount((c) => c + 1);
    setBody("");
    /* Auto-expand le thread parent pour que la nouvelle reply soit visible. */
    if (parentRoot) {
      setExpandedThreads((prev) => {
        const next = new Set(prev);
        next.add(parentRoot);
        return next;
      });
    }
    /* Reset replyTo après envoi. */
    const sentReplyTo = replyTo;
    setReplyTo(null);

    try {
      const result = await addReelComment({
        reel_id: reelId,
        body: text,
        parent_id: parentRoot ?? undefined,
      });
      if (!result.ok) {
        /* Rollback + restore replyTo. */
        setComments((prev) => prev.filter((c) => c.id !== tempId));
        setCount((c) => Math.max(0, c - 1));
        setReplyTo(sentReplyTo);
        toast.error(result.error);
        return;
      }
      setComments((prev) =>
        prev.map((c) =>
          c.id === tempId ? { ...c, id: result.comment_id } : c,
        ),
      );
    } catch {
      setComments((prev) => prev.filter((c) => c.id !== tempId));
      setCount((c) => Math.max(0, c - 1));
      setReplyTo(sentReplyTo);
      toast.error("Erreur réseau.");
    } finally {
      setSubmitting(false);
    }
  }, [body, submitting, allowComments, reelId, currentUserId, replyTo, comments]);

  const toggleCommentLike = useCallback(async (commentId: string) => {
    const wasLiked = likedIds.has(commentId);
    /* Optimistic. */
    setLikedIds((prev) => {
      const next = new Set(prev);
      if (wasLiked) next.delete(commentId);
      else next.add(commentId);
      return next;
    });
    setComments((prev) =>
      prev.map((c) =>
        c.id === commentId
          ? {
              ...c,
              likes_count: Math.max(0, c.likes_count + (wasLiked ? -1 : 1)),
            }
          : c,
      ),
    );

    try {
      const res = await fetch(`/api/reels/comments/${commentId}/like`, {
        method: wasLiked ? "DELETE" : "POST",
      });
      if (!res.ok) throw new Error("HTTP " + res.status);
    } catch {
      /* Rollback. */
      setLikedIds((prev) => {
        const next = new Set(prev);
        if (wasLiked) next.add(commentId);
        else next.delete(commentId);
        return next;
      });
      setComments((prev) =>
        prev.map((c) =>
          c.id === commentId
            ? {
                ...c,
                likes_count: Math.max(0, c.likes_count + (wasLiked ? 1 : -1)),
              }
            : c,
        ),
      );
    }
  }, [likedIds]);

  const remove = useCallback(async (commentId: string) => {
    setComments((prev) => prev.filter((c) => c.id !== commentId));
    setCount((c) => Math.max(0, c - 1));
    const result = await deleteReelComment(commentId);
    if (!result.ok) {
      toast.error(result.error);
      /* V2 : refetch pour rollback propre. */
    }
  }, []);

  /* ESC ferme. */
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-[60] bg-black/60 flex items-end sm:items-center justify-center"
      role="dialog"
      aria-modal="true"
      aria-label="Commentaires"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        className={cn(
          "w-full sm:max-w-md sm:w-[420px] bg-cream sm:rounded-2xl flex flex-col overflow-hidden",
          "h-[75vh] sm:h-[80vh] sm:max-h-[700px]",
        )}
      >
        {/* Header. */}
        <header className="flex items-center justify-between px-4 py-3 border-b border-line">
          <p className="font-display italic text-[18px] text-night">
            {count} {count > 1 ? "commentaires" : "commentaire"}
          </p>
          <button
            type="button"
            onClick={onClose}
            className="text-night-muted hover:text-night"
            aria-label="Fermer"
          >
            <X className="w-5 h-5" aria-hidden />
          </button>
        </header>

        {/* Liste. */}
        <div className="flex-1 overflow-y-auto px-1 pt-2 pb-2 min-h-0">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-5 h-5 text-night-muted animate-spin" aria-hidden />
            </div>
          ) : comments.length === 0 ? (
            <div className="px-6 py-12 text-center">
              <p className="text-[14px] text-night-soft mb-1 font-display italic">
                Sois le premier à commenter
              </p>
              <p className="text-[12.5px] text-night-muted">
                {allowComments
                  ? "Lance la discussion."
                  : "L'auteur a désactivé les commentaires."}
              </p>
            </div>
          ) : (
            <ul className="divide-y divide-line">
              {rootComments.map((comment) => {
                const replies = repliesByParent.get(comment.id) ?? [];
                const isExpanded = expandedThreads.has(comment.id);
                return (
                  <li key={comment.id} className="px-4 py-3">
                    <CommentRow
                      comment={comment}
                      author={authorById.get(comment.author_id) ?? null}
                      currentUserId={currentUserId}
                      isLiked={likedIds.has(comment.id)}
                      onLike={() => toggleCommentLike(comment.id)}
                      onReply={() =>
                        setReplyTo({
                          commentId: comment.id,
                          username:
                            authorById.get(comment.author_id)?.username ??
                            null,
                        })
                      }
                      onDelete={() => remove(comment.id)}
                    />

                    {replies.length > 0 ? (
                      <div className="ml-10 mt-2">
                        {!isExpanded ? (
                          <button
                            type="button"
                            onClick={() =>
                              setExpandedThreads((prev) => {
                                const next = new Set(prev);
                                next.add(comment.id);
                                return next;
                              })
                            }
                            className="inline-flex items-center gap-1 text-[11.5px] font-bold text-night-muted hover:text-night"
                          >
                            <CornerDownRight
                              className="w-3 h-3"
                              aria-hidden
                            />
                            Voir {replies.length}{" "}
                            {replies.length > 1 ? "réponses" : "réponse"}
                          </button>
                        ) : (
                          <ul className="space-y-2.5 border-l-2 border-line pl-3">
                            {replies.map((reply) => (
                              <li key={reply.id}>
                                <CommentRow
                                  comment={reply}
                                  author={
                                    authorById.get(reply.author_id) ?? null
                                  }
                                  currentUserId={currentUserId}
                                  isLiked={likedIds.has(reply.id)}
                                  onLike={() => toggleCommentLike(reply.id)}
                                  onReply={() =>
                                    setReplyTo({
                                      commentId: reply.id,
                                      username:
                                        authorById.get(reply.author_id)
                                          ?.username ?? null,
                                    })
                                  }
                                  onDelete={() => remove(reply.id)}
                                  small
                                />
                              </li>
                            ))}
                            <li>
                              <button
                                type="button"
                                onClick={() =>
                                  setExpandedThreads((prev) => {
                                    const next = new Set(prev);
                                    next.delete(comment.id);
                                    return next;
                                  })
                                }
                                className="text-[11px] text-night-muted hover:text-night"
                              >
                                Masquer les réponses
                              </button>
                            </li>
                          </ul>
                        )}
                      </div>
                    ) : null}
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        {/* Composer. */}
        {allowComments ? (
          <footer className="border-t border-line bg-bg-soft">
            {/* Banner "Réponse à @user" si replyTo set. */}
            {replyTo ? (
              <div className="px-3 py-1.5 border-b border-line bg-night/[0.02] flex items-center justify-between gap-2 text-[11.5px]">
                <span className="text-night-muted truncate">
                  Réponse à{" "}
                  <span className="font-bold text-night">
                    @{replyTo.username ?? "user"}
                  </span>
                </span>
                <button
                  type="button"
                  onClick={() => setReplyTo(null)}
                  className="text-night-muted hover:text-red-600 shrink-0"
                  aria-label="Annuler la réponse"
                >
                  <X className="w-3.5 h-3.5" aria-hidden />
                </button>
              </div>
            ) : null}
            <div className="px-3 py-2.5 flex items-center gap-2">
            <input
              ref={inputRef}
              type="text"
              value={body}
              onChange={(e) => setBody(e.target.value.slice(0, 1000))}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  void submit();
                }
              }}
              placeholder={
                replyTo
                  ? `Réponse à @${replyTo.username ?? "user"}…`
                  : "Ajoute un commentaire…"
              }
              maxLength={1000}
              className="flex-1 px-3 py-2 rounded-full bg-white border border-line text-[13px]"
            />
            <button
              type="button"
              onClick={submit}
              disabled={!body.trim() || submitting}
              className="w-10 h-10 rounded-full bg-night text-cream flex items-center justify-center disabled:opacity-40"
              aria-label="Envoyer"
            >
              {submitting ? (
                <Loader2 className="w-4 h-4 animate-spin" aria-hidden />
              ) : (
                <Send className="w-4 h-4" aria-hidden />
              )}
            </button>
            </div>
          </footer>
        ) : (
          <footer className="border-t border-line bg-bg-soft px-3 py-3 text-center">
            <p className="text-[11.5px] text-night-muted">
              Les commentaires sont désactivés sur ce reel.
            </p>
          </footer>
        )}
      </div>
    </div>
  );
}

/* CommentRow — un commentaire individuel (root ou reply).
   small=true rend une version compacte pour les replies indentées. */
function CommentRow({
  comment,
  author,
  currentUserId,
  isLiked,
  onLike,
  onReply,
  onDelete,
  small,
}: {
  comment: Comment;
  author: Author | null;
  currentUserId: string;
  isLiked: boolean;
  onLike: () => void;
  onReply: () => void;
  onDelete: () => void;
  small?: boolean;
}) {
  const isOwn = comment.author_id === currentUserId;
  const displayName =
    author?.full_name ??
    (author?.username ? `@${author.username}` : "Utilisateur");
  return (
    <div className="flex items-start gap-2.5">
      <Avatar
        src={author?.avatar_url ?? null}
        fullName={author?.full_name ?? null}
        size="sm"
      />
      <div className="min-w-0 flex-1">
        <p className={cn("text-[12.5px]", small && "text-[12px]")}>
          <Link
            href={`/u/${author?.username ?? comment.author_id}`}
            className="font-bold text-night hover:underline"
          >
            {displayName}
          </Link>
          <span className="ml-2 text-[10.5px] text-night-muted">
            {formatRelative(comment.created_at)}
          </span>
        </p>
        <p
          className={cn(
            "text-night mt-0.5 leading-snug whitespace-pre-wrap break-words",
            small ? "text-[12.5px]" : "text-[13px]",
          )}
        >
          {linkifyMentions(comment.body)}
        </p>
        <div className="mt-1 flex items-center gap-3">
          <button
            type="button"
            onClick={onReply}
            className="inline-flex items-center gap-1 text-[10.5px] font-bold text-night-muted hover:text-night"
          >
            <MessageCircle className="w-2.5 h-2.5" aria-hidden />
            Répondre
          </button>
          {comment.likes_count > 0 ? (
            <span className="text-[10.5px] text-night-muted tabular-nums">
              {comment.likes_count}{" "}
              {comment.likes_count > 1 ? "j'aime" : "j'aime"}
            </span>
          ) : null}
        </div>
      </div>
      <div className="flex flex-col items-center gap-1.5 shrink-0">
        <button
          type="button"
          onClick={onLike}
          aria-label={isLiked ? "Retirer le j'aime" : "J'aime"}
          aria-pressed={isLiked}
          className="text-night-muted hover:text-rose-500 transition-colors"
        >
          <Heart
            className={cn(
              "w-3.5 h-3.5",
              isLiked ? "fill-rose-500 text-rose-500" : "",
            )}
            strokeWidth={2}
          />
        </button>
        {isOwn ? (
          <button
            type="button"
            onClick={onDelete}
            className="text-night-muted hover:text-red-600"
            aria-label="Supprimer ce commentaire"
          >
            <Trash2 className="w-3 h-3" aria-hidden />
          </button>
        ) : null}
      </div>
    </div>
  );
}
