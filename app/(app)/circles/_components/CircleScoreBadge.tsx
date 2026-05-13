"use client";

import { Eye, Flame, X } from "lucide-react";
import { useState } from "react";
import type { DiscoverScoreBreakdown } from "@/lib/queries/circles";
import { cn } from "@/lib/utils/cn";

type Props = {
  score: number;
  breakdown: DiscoverScoreBreakdown | null;
};

/* Badge "Score X.X" cliquable qui affiche le breakdown complet de la
 * formule de classement. Promesse-produit : tout est transparent. */
export function CircleScoreBadge({ score, breakdown }: Props) {
  const [open, setOpen] = useState(false);

  if (!breakdown || score <= 0) return null;

  const rounded = Math.round(score * 10) / 10;
  const grade =
    rounded >= 60 ? "high" : rounded >= 30 ? "mid" : "low";

  return (
    <>
      <button
        type="button"
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          setOpen(true);
        }}
        aria-label={`Score d'activité ${rounded}/100 — voir comment c'est calculé`}
        className={cn(
          "inline-flex items-center gap-1 h-6 px-2 rounded-full text-[10px] font-extrabold transition-colors",
          grade === "high" && "bg-gold/15 text-gold-deep hover:bg-gold/25",
          grade === "mid" && "bg-night/10 text-night hover:bg-night/15",
          grade === "low" && "bg-bg-soft text-night-dim hover:bg-line",
        )}
      >
        <Flame className="w-3 h-3" aria-hidden />
        <span className="tabular-nums">{rounded.toFixed(1)}</span>
        <Eye className="w-2.5 h-2.5 opacity-60" aria-hidden />
      </button>

      {open ? (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Détail du score d'activité"
          className="fixed inset-0 z-[70] flex items-end sm:items-center justify-center bg-night/55 backdrop-blur-sm sm:p-4 overflow-y-auto"
          onClick={() => setOpen(false)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="w-full sm:max-w-md bg-white border-t sm:border border-line rounded-t-3xl sm:rounded-3xl shadow-[0_40px_100px_-30px_rgba(10,31,68,0.55)] max-h-[92dvh] overflow-y-auto"
          >
            <header className="flex items-start justify-between gap-3 px-5 pt-5 pb-3 border-b border-line">
              <div className="min-w-0">
                <p className="text-[11px] font-extrabold uppercase tracking-[0.16em] text-gold-deep">
                  · Score d&apos;activité
                </p>
                <h2 className="mt-1 font-display italic text-[24px] text-night leading-tight">
                  {rounded.toFixed(1)}{" "}
                  <span className="text-night-dim text-[14px] not-italic font-normal">
                    / 100
                  </span>
                </h2>
                <p className="mt-1 text-[12px] text-night-soft">
                  Formule transparente, calculée en temps réel. Aucun ML.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setOpen(false)}
                aria-label="Fermer"
                className="w-9 h-9 rounded-full hover:bg-night/5 inline-flex items-center justify-center shrink-0"
              >
                <X className="w-4 h-4 text-night-dim" aria-hidden />
              </button>
            </header>

            <div className="px-5 py-4 space-y-3">
              <ComponentBar
                label="Posts publiés (7j)"
                value={breakdown.posts_7d}
                cap={breakdown.caps.posts}
                points={breakdown.pts_posts}
                weight={breakdown.weights.posts}
                tone="gold"
              />
              <ComponentBar
                label="Engagement (upvotes + helpful, 7j)"
                value={breakdown.engagement_7d}
                cap={breakdown.caps.engagement}
                points={breakdown.pts_engagement}
                weight={breakdown.weights.engagement}
                tone="night"
              />
              <ComponentBar
                label="Nouveaux membres (7j)"
                value={breakdown.new_members_7d}
                cap={breakdown.caps.new_members}
                points={breakdown.pts_new_members}
                weight={breakdown.weights.new_members}
                tone="emerald"
              />
              <ComponentBar
                label="Diversité publieurs (7j)"
                value={breakdown.unique_posters_7d}
                cap={breakdown.caps.diversity}
                points={breakdown.pts_diversity}
                weight={breakdown.weights.diversity}
                tone="violet"
              />
            </div>

            <footer className="px-5 pb-5 pt-2 border-t border-line">
              <p className="text-[11px] text-night-dim leading-relaxed">
                Chaque composante est plafonnée puis pondérée par un poids
                fixe. Le score final est la somme × 100. Tu peux changer
                de tri à tout moment.
              </p>
            </footer>
          </div>
        </div>
      ) : null}
    </>
  );
}

function ComponentBar({
  label,
  value,
  cap,
  points,
  weight,
  tone,
}: {
  label: string;
  value: number;
  cap: number;
  points: number;
  weight: number;
  tone: "gold" | "night" | "emerald" | "violet";
}) {
  const ratio = Math.min(value / cap, 1);
  const toneBar = {
    gold: "bg-gradient-to-r from-gold to-gold-deep",
    night: "bg-night",
    emerald: "bg-emerald-500",
    violet: "bg-violet-500",
  }[tone];

  return (
    <div>
      <div className="flex items-baseline justify-between gap-2">
        <span className="text-[12px] font-bold text-night">{label}</span>
        <span className="text-[10px] text-night-dim tabular-nums">
          {value} / {cap} · {Math.round(weight * 100)}%
        </span>
      </div>
      <div className="mt-1.5 relative h-2 rounded-full bg-bg-soft overflow-hidden">
        <div
          className={cn("absolute inset-y-0 left-0 rounded-full", toneBar)}
          style={{ width: `${ratio * 100}%` }}
        />
      </div>
      <p className="mt-1 text-[10px] text-night-dim text-right tabular-nums">
        = {points.toFixed(1)} pts
      </p>
    </div>
  );
}
