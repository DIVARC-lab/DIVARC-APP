"use client";

import { Flame } from "lucide-react";
import { getLinkLevelInfo } from "@/lib/liens/levels";

type LinkBadgeProps = {
  linkXp: number | null;
  linkLevel: number | null;
  streakDays: number | null;
  /* Variant compact (chip) ou full (avec progress). */
  variant?: "chip" | "full";
};

/* Petit badge affiché dans le ChatHeader montrant le niveau + streak du
 * lien avec ce contact. Tap → ouvre la page settings de la conv pour
 * voir le détail. */
export function LinkBadge({
  linkXp,
  linkLevel,
  streakDays,
  variant = "chip",
}: LinkBadgeProps) {
  const info = getLinkLevelInfo(linkXp);
  /* Fallback : si link_level est défini en DB et diffère de notre calcul
     (cas où la migration n'est pas appliquée encore mais l'XP est null),
     on préfère le calcul local. */
  const level = info.level || linkLevel || 1;

  if (variant === "chip") {
    return (
      <span
        className="inline-flex items-center gap-1 px-1.5 h-4 rounded-full bg-gold/20 border border-gold/40 text-[9px] font-extrabold uppercase tracking-[0.06em] text-gold-deep shrink-0"
        title={`Niveau ${level} — ${info.label} · ${info.xp} XP${streakDays && streakDays > 0 ? ` · 🔥 ${streakDays}j` : ""}`}
      >
        <span aria-hidden>{info.emoji}</span>
        <span>Lv{level}</span>
        {streakDays && streakDays > 1 ? (
          <span className="inline-flex items-center gap-0.5 pl-0.5 border-l border-gold/40 ml-0.5">
            <Flame className="w-2.5 h-2.5" aria-hidden />
            {streakDays}
          </span>
        ) : null}
      </span>
    );
  }

  /* Variant full : 2 lignes avec progress bar et label complet. */
  return (
    <div className="rounded-2xl bg-white border border-line p-4">
      <div className="flex items-center gap-3">
        <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-gold/20 to-gold/5 flex items-center justify-center text-2xl">
          {info.emoji}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-[11px] font-extrabold uppercase tracking-[0.12em] text-gold-deep">
            Niveau {info.level} · {info.label}
          </p>
          <p className="text-xs text-night-muted mt-0.5">
            {info.description}
          </p>
        </div>
        {streakDays && streakDays > 0 ? (
          <div className="flex flex-col items-center px-3 py-1 rounded-xl bg-gold/10 border border-gold/30">
            <Flame className="w-4 h-4 text-gold-deep" aria-hidden />
            <span className="text-[10px] font-extrabold text-gold-deep mt-0.5">
              {streakDays}j
            </span>
          </div>
        ) : null}
      </div>

      {info.xpRequiredForNext !== null ? (
        <div className="mt-3">
          <div className="flex items-baseline justify-between mb-1">
            <span className="text-[10px] font-semibold uppercase tracking-wider text-night-muted">
              {info.xpInLevel} / {info.xpRequiredForNext} XP
            </span>
            <span className="text-[10px] text-muted">
              Prochain : niveau {info.level + 1}
            </span>
          </div>
          <div className="h-1.5 rounded-full bg-night/5 overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-gold to-gold-deep rounded-full transition-all duration-500"
              style={{ width: `${Math.round(info.progressRatio * 100)}%` }}
            />
          </div>
        </div>
      ) : (
        <div className="mt-3 text-center">
          <span className="text-[10px] font-extrabold uppercase tracking-wider text-gold-deep">
            🏆 Niveau maximum atteint
          </span>
        </div>
      )}
    </div>
  );
}
