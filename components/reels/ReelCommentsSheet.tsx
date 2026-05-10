"use client";

import { Loader2, Send, Trash2, X } from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { Avatar } from "@/components/ui/Avatar";
import { cn } from "@/lib/utils/cn";
import { formatRelative } from "@/lib/utils/relativeTime";
import {
  addReelComment,
  deleteReelComment,
} from "@/app/(app)/reels/comments-actions";

/* ReelCommentsSheet — bottom-sheet TikTok-style pour les commentaires
 * d'un reel. Rendu en overlay sur le ReelView quand le user tap le
 * bouton "comments" droit.
 *
 * Layout :
 *   - Mobile : bottom-sheet 70vh
 *   - Desktop : panel right side 420px
 *
 * Features V1.5 :
 *   - Liste flat triée par date desc
 *   - Composer en bas (input + bouton send)
 *   - Optimistic update à l'ajout
 *   - Self-delete (bouton trash sur tes propres commentaires)
 *   - V2 : threads (replies), like comments, mentions auto-link
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
  const [loading, setLoading] = useState(true);
  const [body, setBody] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [count, setCount] = useState(initialCount);
  const inputRef = useRef<HTMLInputElement>(null);

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
        };
        setComments(json.comments);
        const map = new Map<string, Author>();
        for (const a of json.authors) map.set(a.id, a);
        setAuthorById(map);
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

    /* Optimistic add. */
    const tempId = `temp-${Date.now()}`;
    const optimistic: Comment = {
      id: tempId,
      author_id: currentUserId,
      body: text,
      parent_id: null,
      likes_count: 0,
      created_at: new Date().toISOString(),
    };
    setComments((prev) => [optimistic, ...prev]);
    setCount((c) => c + 1);
    setBody("");

    try {
      const result = await addReelComment({
        reel_id: reelId,
        body: text,
      });
      if (!result.ok) {
        /* Rollback. */
        setComments((prev) => prev.filter((c) => c.id !== tempId));
        setCount((c) => Math.max(0, c - 1));
        toast.error(result.error);
        return;
      }
      /* Remplace l'optimistic par l'id serveur. */
      setComments((prev) =>
        prev.map((c) =>
          c.id === tempId ? { ...c, id: result.comment_id } : c,
        ),
      );
    } catch {
      setComments((prev) => prev.filter((c) => c.id !== tempId));
      setCount((c) => Math.max(0, c - 1));
      toast.error("Erreur réseau.");
    } finally {
      setSubmitting(false);
    }
  }, [body, submitting, allowComments, reelId, currentUserId]);

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
              {comments.map((comment) => {
                const author = authorById.get(comment.author_id);
                const isOwn = comment.author_id === currentUserId;
                const displayName =
                  author?.full_name ??
                  (author?.username ? `@${author.username}` : "Utilisateur");
                return (
                  <li key={comment.id} className="px-4 py-3">
                    <div className="flex items-start gap-2.5">
                      <Avatar
                        src={author?.avatar_url ?? null}
                        fullName={author?.full_name ?? null}
                        size="sm"
                      />
                      <div className="min-w-0 flex-1">
                        <p className="text-[12.5px]">
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
                        <p className="text-[13px] text-night mt-0.5 leading-snug whitespace-pre-wrap break-words">
                          {comment.body}
                        </p>
                      </div>
                      {isOwn ? (
                        <button
                          type="button"
                          onClick={() => remove(comment.id)}
                          className="text-night-muted hover:text-red-600 shrink-0"
                          aria-label="Supprimer ce commentaire"
                        >
                          <Trash2 className="w-3.5 h-3.5" aria-hidden />
                        </button>
                      ) : null}
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        {/* Composer. */}
        {allowComments ? (
          <footer className="border-t border-line bg-bg-soft px-3 py-2.5 flex items-center gap-2">
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
              placeholder="Ajoute un commentaire…"
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
