"use client";

/* QuotedPostCard — Chantier Feed 4.4.
 *
 * Affichage compact d'un post cité à l'intérieur d'un autre post (quote).
 * - Card rounded encadrée, taille réduite (60% du PostCard).
 * - Lien vers le post cité.
 * - Fallback "Post indisponible" si quoted_post_id non résolu.
 */
import Link from "next/link";
import { Quote } from "lucide-react";
import { Avatar } from "@/components/ui/Avatar";
import { formatRelative } from "@/lib/utils/relativeTime";
import { renderPostBody } from "@/lib/utils/postBody";

type Props = {
  quoted: {
    id: string;
    body: string | null;
    created_at: string;
    author: {
      full_name: string | null;
      username: string | null;
      avatar_url: string | null;
    } | null;
  } | null;
};

export function QuotedPostCard({ quoted }: Props) {
  if (!quoted) {
    return (
      <div className="rounded-2xl bg-bg-soft border border-line p-3 text-[12px] text-night-dim italic">
        Post indisponible (supprimé ou inaccessible).
      </div>
    );
  }

  const name =
    quoted.author?.full_name ?? quoted.author?.username ?? "Auteur inconnu";

  return (
    <Link
      href={`/feed/${quoted.id}`}
      className="block rounded-2xl bg-bg-soft border border-line hover:border-night-dim/30 transition-colors p-3"
      onClick={(e) => e.stopPropagation()}
    >
      <div className="flex items-start gap-2">
        <Quote
          className="w-3 h-3 text-night-dim shrink-0 mt-1"
          aria-hidden
        />
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 mb-1">
            <Avatar
              src={quoted.author?.avatar_url ?? null}
              fullName={name}
              size="sm"
            />
            <span className="text-[11.5px] font-bold text-night truncate">
              {name}
            </span>
            {quoted.author?.username ? (
              <span className="text-[10px] text-night-dim truncate">
                @{quoted.author.username}
              </span>
            ) : null}
            <span className="text-[10px] text-night-dim ml-auto shrink-0">
              {formatRelative(quoted.created_at)}
            </span>
          </div>
          {quoted.body ? (
            <p className="text-[12.5px] text-night-soft leading-relaxed line-clamp-4">
              {renderPostBody(quoted.body)}
            </p>
          ) : null}
        </div>
      </div>
    </Link>
  );
}
