"use client";

/* PreviewComments — aperçu inline des derniers commentaires sous un
 * post du feed (style Facebook).
 *
 * Affiche jusqu'à 2 commentaires top-level (chronologie ASC = les
 * 2 plus récents en bas). Si le post a > 2 comments, on rend un
 * lien "Voir les N commentaires" en haut qui ouvre la modale détail
 * via le callback `onSeeAll` (ou navigue /feed/[id] si non fourni). */

import Link from "next/link";
import { Avatar } from "@/components/ui/Avatar";
import type { PostPreviewComment } from "@/lib/database.types";

type Props = {
  postId: string;
  comments: PostPreviewComment[];
  totalCount: number;
  onSeeAll?: () => void;
};

export function PreviewComments({
  postId,
  comments,
  totalCount,
  onSeeAll,
}: Props) {
  if (comments.length === 0) return null;
  const hasMore = totalCount > comments.length;

  return (
    <div className="px-5 sm:px-[18px] pb-3 space-y-2.5">
      {hasMore ? (
        onSeeAll ? (
          <button
            type="button"
            onClick={onSeeAll}
            className="text-[13px] font-semibold text-night-muted hover:text-night hover:underline"
          >
            Voir les {totalCount} commentaires
          </button>
        ) : (
          <Link
            href={`/feed/${postId}`}
            className="block text-[13px] font-semibold text-night-muted hover:text-night hover:underline"
          >
            Voir les {totalCount} commentaires
          </Link>
        )
      ) : null}
      {comments.map((c) => (
        <div key={c.id} className="flex items-start gap-2">
          <Avatar
            src={c.author?.avatar_url ?? null}
            fullName={c.author?.full_name ?? c.author?.username ?? "?"}
            size="sm"
          />
          <div className="flex-1 min-w-0">
            <div className="inline-block px-3 py-2 rounded-2xl bg-night/[0.04] max-w-full">
              {c.author?.username ? (
                <Link
                  href={`/u/${c.author.username}`}
                  className="block text-[12.5px] font-bold text-night hover:underline truncate"
                >
                  {c.author.full_name ?? c.author.username}
                </Link>
              ) : (
                <span className="block text-[12.5px] font-bold text-night truncate">
                  {c.author?.full_name ?? "Utilisateur"}
                </span>
              )}
              <p className="text-[13.5px] text-night leading-snug whitespace-pre-wrap break-words [overflow-wrap:anywhere]">
                {c.body}
              </p>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
