"use client";

import { Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { toast } from "sonner";
import { Avatar } from "@/components/ui/Avatar";
import type { CommentWithAuthor } from "@/lib/database.types";
import { formatRelative } from "@/lib/utils/relativeTime";
import { deleteComment } from "../actions";

type CommentListProps = {
  comments: CommentWithAuthor[];
  postId: string;
  currentUserId: string;
};

export function CommentList({
  comments,
  postId,
  currentUserId,
}: CommentListProps) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  function handleDelete(commentId: string) {
    if (!confirm("Supprimer ce commentaire ?")) return;
    startTransition(async () => {
      const result = await deleteComment(commentId, postId);
      if (result.ok) {
        toast.success("Commentaire supprimé.");
        router.refresh();
      }
    });
  }

  if (comments.length === 0) {
    return (
      <p className="text-sm text-muted py-6 text-center">
        Aucun commentaire pour l&apos;instant. Sois le premier à réagir.
      </p>
    );
  }

  return (
    <ul className="space-y-4">
      {comments.map((comment) => {
        const author = comment.author;
        const displayName =
          author?.full_name ?? author?.username ?? "Utilisateur";
        const isOwn = comment.author_id === currentUserId;
        return (
          <li key={comment.id} className="flex gap-3">
            <Avatar
              src={author?.avatar_url ?? null}
              fullName={displayName}
              size="sm"
            />
            <div className="flex-1 min-w-0">
              <div className="rounded-2xl bg-night/[0.04] px-4 py-2.5">
                <div className="flex items-center gap-2 flex-wrap">
                  <p className="text-sm font-semibold text-night">
                    {displayName}
                  </p>
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
              </div>
              {isOwn ? (
                <button
                  type="button"
                  onClick={() => handleDelete(comment.id)}
                  disabled={pending}
                  className="mt-1 ml-1 inline-flex items-center gap-1 text-[11px] text-night-muted hover:text-red-600 transition-colors"
                >
                  <Trash2 className="w-3 h-3" aria-hidden />
                  Supprimer
                </button>
              ) : null}
            </div>
          </li>
        );
      })}
    </ul>
  );
}
