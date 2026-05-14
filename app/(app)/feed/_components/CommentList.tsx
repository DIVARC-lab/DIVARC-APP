"use client";

import { Heart, MessageCircle, SmilePlus, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import {
  useEffect,
  useMemo,
  useRef,
  useState,
  useTransition,
} from "react";
import { toast } from "sonner";
import { Avatar } from "@/components/ui/Avatar";
import type {
  CommentReactionEmoji,
  CommentWithAuthor,
} from "@/lib/database.types";
import { COMMENT_REACTION_EMOJIS } from "@/lib/database.types";
import { cn } from "@/lib/utils/cn";
import { formatRelative } from "@/lib/utils/relativeTime";
import {
  addComment,
  deleteComment,
  setCommentReaction,
  toggleCommentLike,
} from "../actions";

type CommentListProps = {
  comments: CommentWithAuthor[];
  postId: string;
  currentUserId: string;
};

/* Groupe les commentaires par parent_comment_id pour rendre un thread :
 * racines + replies enfants. Maintient l'ordre chronologique. */
function groupThread(comments: CommentWithAuthor[]) {
  const roots: CommentWithAuthor[] = [];
  const repliesByParent = new Map<string, CommentWithAuthor[]>();
  for (const c of comments) {
    if (c.parent_comment_id) {
      const arr = repliesByParent.get(c.parent_comment_id) ?? [];
      arr.push(c);
      repliesByParent.set(c.parent_comment_id, arr);
    } else {
      roots.push(c);
    }
  }
  return { roots, repliesByParent };
}

export function CommentList({
  comments,
  postId,
  currentUserId,
}: CommentListProps) {
  const { roots, repliesByParent } = useMemo(
    () => groupThread(comments),
    [comments],
  );

  if (roots.length === 0) {
    return (
      <p className="text-sm text-muted py-6 text-center">
        Aucun commentaire pour l&apos;instant. Sois le premier à réagir.
      </p>
    );
  }

  return (
    <ul className="space-y-4">
      {roots.map((root) => (
        <CommentItem
          key={root.id}
          comment={root}
          replies={repliesByParent.get(root.id) ?? []}
          postId={postId}
          currentUserId={currentUserId}
        />
      ))}
    </ul>
  );
}

type CommentItemProps = {
  comment: CommentWithAuthor;
  replies: CommentWithAuthor[];
  postId: string;
  currentUserId: string;
  /* True quand le commentaire est une réponse (rendu plus compact +
     pas de bouton "Répondre" pour limiter à 1 niveau de threading). */
  isReply?: boolean;
};

function CommentItem({
  comment,
  replies,
  postId,
  currentUserId,
  isReply = false,
}: CommentItemProps) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [showReplyForm, setShowReplyForm] = useState(false);
  const [showReactionPicker, setShowReactionPicker] = useState(false);
  const [showReplies, setShowReplies] = useState(false);

  /* Optimistic UI : on track les valeurs côté client pour feedback
     immédiat sans attendre router.refresh(). */
  const [likedOpt, setLikedOpt] = useState(comment.liked_by_me ?? false);
  const [likesCountOpt, setLikesCountOpt] = useState(comment.likes_count);
  const [reactionOpt, setReactionOpt] = useState<CommentReactionEmoji | null>(
    comment.my_reaction ?? null,
  );

  /* Sync si props changent (router.refresh re-fetch). */
  useEffect(() => {
    setLikedOpt(comment.liked_by_me ?? false);
    setLikesCountOpt(comment.likes_count);
    setReactionOpt(comment.my_reaction ?? null);
  }, [comment.liked_by_me, comment.likes_count, comment.my_reaction]);

  const author = comment.author;
  const displayName =
    author?.full_name ?? author?.username ?? "Utilisateur";
  const isOwn = comment.author_id === currentUserId;

  /* Top 3 emojis utilisés sur ce commentaire (summary affiché sous le
     body, click ouvre le picker pour réagir aussi). */
  const topReactions = useMemo(() => {
    const summary = comment.reactions_summary ?? {};
    return (Object.entries(summary) as Array<[CommentReactionEmoji, number]>)
      .filter(([, count]) => count > 0)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3);
  }, [comment.reactions_summary]);

  function handleDelete() {
    if (!confirm("Supprimer ce commentaire ?")) return;
    startTransition(async () => {
      const result = await deleteComment(comment.id, postId);
      if (result.ok) {
        toast.success("Commentaire supprimé.");
        router.refresh();
      }
    });
  }

  function handleLike() {
    /* Optimistic toggle. */
    const next = !likedOpt;
    setLikedOpt(next);
    setLikesCountOpt((c) => c + (next ? 1 : -1));

    startTransition(async () => {
      const res = await toggleCommentLike(comment.id);
      if (!res.ok) {
        /* Rollback. */
        setLikedOpt(!next);
        setLikesCountOpt((c) => c + (next ? -1 : 1));
        toast.error(res.error);
        return;
      }
      router.refresh();
    });
  }

  function handleReaction(emoji: CommentReactionEmoji) {
    setShowReactionPicker(false);
    const prevReaction = reactionOpt;
    const nextReaction = prevReaction === emoji ? null : emoji;
    setReactionOpt(nextReaction);

    startTransition(async () => {
      const res = await setCommentReaction(comment.id, emoji);
      if (!res.ok) {
        setReactionOpt(prevReaction);
        toast.error(res.error);
        return;
      }
      router.refresh();
    });
  }

  return (
    <li className={cn("flex gap-3", isReply && "pl-0")}>
      <Avatar
        src={author?.avatar_url ?? null}
        fullName={displayName}
        size="sm"
      />
      <div className="flex-1 min-w-0">
        <div className="rounded-2xl bg-night/[0.04] px-4 py-2.5">
          <div className="flex items-center gap-2 flex-wrap">
            <p className="text-sm font-semibold text-night">{displayName}</p>
            <time
              dateTime={comment.created_at}
              className="text-[10px] text-muted"
            >
              {formatRelative(comment.created_at)}
            </time>
          </div>
          <p className="mt-1 text-sm text-night-muted whitespace-pre-wrap break-words">
            {comment.body}
          </p>

          {/* Résumé réactions (3 emojis top + count total) */}
          {topReactions.length > 0 ? (
            <button
              type="button"
              onClick={() => setShowReactionPicker((s) => !s)}
              className="mt-2 inline-flex items-center gap-1 px-2 h-6 rounded-full bg-white border border-line text-[11px] font-semibold text-night-muted hover:border-night/30 transition-colors"
              aria-label="Voir et changer les réactions"
            >
              <span className="flex -space-x-1">
                {topReactions.map(([emoji]) => (
                  <span key={emoji} className="text-[12px] leading-none">
                    {emoji}
                  </span>
                ))}
              </span>
              <span className="tabular-nums">{comment.reactions_count}</span>
            </button>
          ) : null}
        </div>

        {/* Barre actions : Like · Répondre · Réagir · Supprimer */}
        <div className="mt-1 ml-1 flex items-center gap-3 flex-wrap">
          <button
            type="button"
            onClick={handleLike}
            disabled={pending}
            aria-pressed={likedOpt}
            className={cn(
              "inline-flex items-center gap-1 text-[11px] font-semibold transition-colors",
              likedOpt
                ? "text-red-600"
                : "text-night-muted hover:text-night",
            )}
          >
            <Heart
              className={cn("w-3 h-3", likedOpt && "fill-red-600")}
              aria-hidden
            />
            J&apos;aime
            {likesCountOpt > 0 ? (
              <span className="tabular-nums">· {likesCountOpt}</span>
            ) : null}
          </button>

          {!isReply ? (
            <button
              type="button"
              onClick={() => setShowReplyForm((s) => !s)}
              className="inline-flex items-center gap-1 text-[11px] font-semibold text-night-muted hover:text-night transition-colors"
            >
              <MessageCircle className="w-3 h-3" aria-hidden />
              Répondre
            </button>
          ) : null}

          <div className="relative">
            <button
              type="button"
              onClick={() => setShowReactionPicker((s) => !s)}
              className={cn(
                "inline-flex items-center gap-1 text-[11px] font-semibold transition-colors",
                reactionOpt
                  ? "text-gold-deep"
                  : "text-night-muted hover:text-night",
              )}
            >
              {reactionOpt ? (
                <span className="text-[13px] leading-none">{reactionOpt}</span>
              ) : (
                <SmilePlus className="w-3 h-3" aria-hidden />
              )}
              {reactionOpt ? "Ta réaction" : "Réagir"}
            </button>
            {showReactionPicker ? (
              <ReactionPicker
                current={reactionOpt}
                onPick={handleReaction}
                onClose={() => setShowReactionPicker(false)}
              />
            ) : null}
          </div>

          {isOwn ? (
            <button
              type="button"
              onClick={handleDelete}
              disabled={pending}
              className="inline-flex items-center gap-1 text-[11px] text-night-muted hover:text-red-600 transition-colors"
            >
              <Trash2 className="w-3 h-3" aria-hidden />
              Supprimer
            </button>
          ) : null}
        </div>

        {/* Form de réponse inline */}
        {showReplyForm && !isReply ? (
          <ReplyForm
            postId={postId}
            parentCommentId={comment.id}
            onPublished={() => setShowReplyForm(false)}
          />
        ) : null}

        {/* Replies — collapsible si > 0. Cliquer "Voir les X réponses". */}
        {replies.length > 0 && !isReply ? (
          <div className="mt-3">
            {!showReplies ? (
              <button
                type="button"
                onClick={() => setShowReplies(true)}
                className="text-[12px] font-semibold text-gold-deep hover:underline"
              >
                Voir les {replies.length} réponse
                {replies.length > 1 ? "s" : ""}
              </button>
            ) : (
              <ul className="mt-2 space-y-3 pl-4 border-l-2 border-line">
                {replies.map((reply) => (
                  <CommentItem
                    key={reply.id}
                    comment={reply}
                    replies={[]}
                    postId={postId}
                    currentUserId={currentUserId}
                    isReply
                  />
                ))}
                <li>
                  <button
                    type="button"
                    onClick={() => setShowReplies(false)}
                    className="text-[11px] font-semibold text-night-muted hover:text-night"
                  >
                    Masquer les réponses
                  </button>
                </li>
              </ul>
            )}
          </div>
        ) : null}
      </div>
    </li>
  );
}

/* Picker d'emoji 8-valeurs (FB-like + DIVARC). Click → onPick. */
function ReactionPicker({
  current,
  onPick,
  onClose,
}: {
  current: CommentReactionEmoji | null;
  onPick: (emoji: CommentReactionEmoji) => void;
  onClose: () => void;
}) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        onClose();
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [onClose]);

  return (
    <div
      ref={ref}
      role="menu"
      aria-label="Choisir une réaction"
      className="absolute left-0 bottom-full mb-1.5 z-20 inline-flex items-center gap-1 p-1.5 rounded-full bg-white border border-line shadow-[0_8px_24px_-8px_rgba(10,31,68,0.25)]"
    >
      {COMMENT_REACTION_EMOJIS.map((emoji) => (
        <button
          key={emoji}
          type="button"
          onClick={() => onPick(emoji)}
          aria-pressed={current === emoji}
          className={cn(
            "w-8 h-8 rounded-full text-[18px] leading-none flex items-center justify-center transition-transform",
            current === emoji
              ? "bg-gold/20 scale-110"
              : "hover:bg-night/5 hover:scale-110",
          )}
        >
          {emoji}
        </button>
      ))}
    </div>
  );
}

/* Form de réponse inline (rendu sous chaque commentaire racine).
 * Réutilise l'action addComment avec parent_comment_id. */
function ReplyForm({
  postId,
  parentCommentId,
  onPublished,
}: {
  postId: string;
  parentCommentId: string;
  onPublished: () => void;
}) {
  const router = useRouter();
  const formRef = useRef<HTMLFormElement>(null);
  const [pending, startTransition] = useTransition();

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    startTransition(async () => {
      const result = await addComment(postId, undefined, fd);
      if (result.status === "success") {
        formRef.current?.reset();
        onPublished();
        router.refresh();
      } else {
        toast.error(result.message ?? "Réponse impossible.");
      }
    });
  }

  return (
    <form ref={formRef} onSubmit={handleSubmit} className="mt-2 flex gap-2">
      <input
        type="hidden"
        name="parent_comment_id"
        value={parentCommentId}
      />
      <textarea
        name="body"
        rows={1}
        autoFocus
        placeholder="Ta réponse…"
        maxLength={2000}
        className="flex-1 resize-none rounded-2xl border border-line bg-bg px-3 py-2 text-sm focus:outline-none focus:border-night focus:ring-2 focus:ring-night/15"
      />
      <button
        type="submit"
        disabled={pending}
        className="inline-flex items-center px-3 h-8 rounded-full bg-night text-cream text-xs font-semibold hover:bg-night-soft transition disabled:opacity-60 shrink-0"
      >
        {pending ? "…" : "Répondre"}
      </button>
    </form>
  );
}
