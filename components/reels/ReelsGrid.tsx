"use client";

import { Eye, Pin, Play } from "lucide-react";
import Link from "next/link";
import type { ReelWithDetails } from "@/lib/database.types";

/* ReelsGrid — grille 3 cols mobile / 4 cols desktop des reels d'un user
 * (profil) ou d'un son. Style TikTok : thumbnail vidéo + compteur views
 * bas-gauche.
 *
 * Tap → ouvre /reels/[id] qui affiche le reel positionné dans le feed.
 */
type Props = {
  reels: ReelWithDetails[];
  /** Quelle ligne afficher en bas-gauche : views (par défaut), plays, likes. */
  metric?: "views" | "plays" | "likes";
  /** Indique les reels épinglés (V2 — pour l'instant on rend tous comme normal). */
  pinnedIds?: string[];
};

export function ReelsGrid({ reels, metric = "views", pinnedIds }: Props) {
  if (reels.length === 0) {
    return (
      <div className="rounded-2xl border-2 border-dashed border-line p-8 text-center">
        <Play
          className="w-7 h-7 text-night-muted mx-auto mb-2"
          aria-hidden
        />
        <p className="text-[13px] text-night-muted">
          Aucun reel pour l&apos;instant.
        </p>
      </div>
    );
  }

  return (
    <ul className="grid grid-cols-3 sm:grid-cols-4 gap-1 sm:gap-2">
      {reels.map((reel) => {
        const value =
          metric === "views"
            ? reel.views_count
            : metric === "plays"
              ? reel.plays_count
              : reel.likes_count;
        const isPinned = pinnedIds?.includes(reel.id);
        return (
          <li key={reel.id} className="relative">
            <Link
              href={`/reels/${reel.id}`}
              className="group block relative aspect-[9/16] rounded-lg overflow-hidden bg-night/5"
              aria-label={`Reel ${reel.description ? reel.description.slice(0, 40) : ""}`}
            >
              {reel.poster_url ? (
                /* eslint-disable-next-line @next/next/no-img-element */
                <img
                  src={reel.poster_url}
                  alt=""
                  loading="lazy"
                  className="absolute inset-0 w-full h-full object-cover"
                />
              ) : (
                <div className="absolute inset-0 bg-gradient-to-br from-night to-night-soft" />
              )}

              {/* Gradient bottom pour lisibilité du compteur. */}
              <div
                className="pointer-events-none absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-black/80 to-transparent"
                aria-hidden
              />

              {/* Badge "épinglé". */}
              {isPinned ? (
                <span className="absolute top-1.5 left-1.5 inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded bg-cream text-night text-[9px] uppercase tracking-wider font-bold">
                  <Pin className="w-2.5 h-2.5" aria-hidden />
                  Épinglé
                </span>
              ) : null}

              {/* Compteur metric bas-gauche. */}
              <span className="absolute bottom-1.5 left-1.5 inline-flex items-center gap-1 text-cream text-[11px] font-bold">
                {metric === "views" ? (
                  <Eye className="w-3 h-3" aria-hidden />
                ) : (
                  <Play className="w-3 h-3 fill-cream" aria-hidden />
                )}
                {formatCompact(value)}
              </span>

              {/* Hover : icône play centrale. */}
              <span
                className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity bg-black/30"
                aria-hidden
              >
                <Play className="w-8 h-8 text-cream fill-cream" aria-hidden />
              </span>
            </Link>
          </li>
        );
      })}
    </ul>
  );
}

function formatCompact(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}k`;
  return String(n);
}
