"use client";

/* Étape 17 — Barre de progression goal live (overlay viewer + host).
 *
 * Polling 6s sur /api/lives/[id]/goal. Affiche :
 *  - Label du goal + icône type
 *  - Barre de progression visuelle avec %
 *  - Valeur courante / cible formatée (€ si revenue)
 *  - Badge "Objectif atteint !" si current >= target
 *
 * Retourne null s'il n'y a pas de goal actif. */

import { Coins, Gift, Target, Users } from "lucide-react";
import { useEffect, useRef, useState } from "react";

type Goal = {
  id: string;
  goal_type: "revenue" | "viewers" | "gifts";
  target_value: number;
  current_value: number;
  label: string;
  status: "active" | "achieved" | "ended";
  achieved_at: string | null;
};

type Props = {
  sessionId: string;
};

function formatGoalValue(type: Goal["goal_type"], value: number): string {
  if (type === "revenue") return `${(value / 100).toFixed(2)} €`;
  return value.toLocaleString("fr-FR");
}

function iconFor(type: Goal["goal_type"]) {
  switch (type) {
    case "revenue":
      return Coins;
    case "viewers":
      return Users;
    case "gifts":
      return Gift;
    default:
      return Target;
  }
}

export function LiveGoalBar({ sessionId }: Props) {
  const [goal, setGoal] = useState<Goal | null>(null);
  const timerRef = useRef<number | null>(null);

  useEffect(() => {
    let alive = true;

    async function refresh() {
      try {
        const res = await fetch(`/api/lives/${sessionId}/goal`, {
          cache: "no-store",
        });
        if (!res.ok) return;
        const data = (await res.json()) as { goal: Goal | null };
        if (alive) setGoal(data.goal);
      } catch {
        /* silencieux */
      }
    }

    void refresh();
    timerRef.current = window.setInterval(() => {
      void refresh();
    }, 6000);

    return () => {
      alive = false;
      if (timerRef.current !== null) window.clearInterval(timerRef.current);
    };
  }, [sessionId]);

  if (!goal) return null;

  const pct = Math.min(
    100,
    Math.round((goal.current_value / Math.max(1, goal.target_value)) * 100),
  );
  const achieved = goal.current_value >= goal.target_value;
  const Icon = iconFor(goal.goal_type);

  return (
    <div
      className={`rounded-2xl backdrop-blur-md border shadow-lg px-3 py-2.5 ${
        achieved
          ? "bg-emerald-500/90 border-emerald-300"
          : "bg-night/85 border-cream/15"
      }`}
      aria-live="polite"
    >
      <div className="flex items-center gap-2 mb-1.5">
        <Icon
          className={`w-3.5 h-3.5 ${achieved ? "text-white" : "text-gold"}`}
          aria-hidden
        />
        <p
          className={`text-[11px] font-bold truncate flex-1 ${
            achieved ? "text-white" : "text-cream"
          }`}
        >
          {goal.label}
        </p>
        {achieved ? (
          <span className="shrink-0 inline-flex items-center px-1.5 h-4 rounded-full bg-white text-emerald-700 text-[9px] font-extrabold uppercase tracking-wider">
            Atteint !
          </span>
        ) : null}
      </div>
      <div
        className={`relative h-2 rounded-full overflow-hidden ${
          achieved ? "bg-white/30" : "bg-cream/15"
        }`}
        role="progressbar"
        aria-valuenow={pct}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label={goal.label}
      >
        <div
          className={`absolute inset-y-0 left-0 transition-[width] duration-700 ease-out ${
            achieved ? "bg-white" : "bg-gold"
          }`}
          style={{ width: `${pct}%` }}
        />
      </div>
      <div className="flex items-center justify-between mt-1.5">
        <span
          className={`text-[10px] font-extrabold tabular-nums ${
            achieved ? "text-white" : "text-cream"
          }`}
        >
          {formatGoalValue(goal.goal_type, goal.current_value)}
        </span>
        <span
          className={`text-[10px] font-bold tabular-nums ${
            achieved ? "text-white/80" : "text-cream/60"
          }`}
        >
          / {formatGoalValue(goal.goal_type, goal.target_value)} · {pct}%
        </span>
      </div>
    </div>
  );
}
