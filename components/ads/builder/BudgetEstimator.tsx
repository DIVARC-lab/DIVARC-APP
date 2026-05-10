"use client";

import { Eye, MousePointerClick, TrendingUp } from "lucide-react";

/* Estimateur d'impact pour un budget donné — style Meta Ads Manager
 * "Estimated daily results".
 *
 * Calcule des fourchettes basées sur :
 *   - Budget quotidien
 *   - CPM moyen DIVARC (estimation V1 : 5€ CPM)
 *   - CTR moyen (1.5%)
 *   - CR moyen (2% du clic)
 */

export function BudgetEstimator({
  dailyBudget,
  audienceSize,
  optimizationGoal,
}: {
  dailyBudget: number;
  audienceSize: number | null;
  optimizationGoal: string;
}) {
  if (dailyBudget <= 0 || !audienceSize || audienceSize < 100) {
    return null;
  }

  /* Hypothèses V1 conservatrices DIVARC. */
  const CPM = 5; // 5€ pour 1000 impressions
  const CTR = 0.015; // 1.5%
  const CR_FROM_CLICK = 0.02; // 2% conversions / clics

  const dailyImpressions = (dailyBudget / CPM) * 1000;
  const dailyClicks = dailyImpressions * CTR;
  const dailyConversions = dailyClicks * CR_FROM_CLICK;
  const dailyReach = Math.min(audienceSize, dailyImpressions * 0.6);

  /* On affiche en ranges ±25% pour être honnête. */
  const range = (n: number, pct = 0.25) => ({
    min: Math.round(n * (1 - pct)),
    max: Math.round(n * (1 + pct)),
  });

  const impR = range(dailyImpressions);
  const clicksR = range(dailyClicks);
  const reachR = range(dailyReach);
  const convR = range(dailyConversions, 0.4);

  return (
    <div className="rounded-xl bg-white border border-line p-4 space-y-3">
      <p className="text-[11px] uppercase tracking-wider font-bold text-night-muted">
        Estimation quotidienne
      </p>

      <ul className="space-y-2.5">
        <Stat
          icon={Eye}
          label="Impressions"
          value={`${formatN(impR.min)} - ${formatN(impR.max)}`}
          color="text-blue-600 bg-blue-50"
        />
        <Stat
          icon={TrendingUp}
          label="Reach unique"
          value={`${formatN(reachR.min)} - ${formatN(reachR.max)}`}
          color="text-violet-600 bg-violet-50"
        />
        <Stat
          icon={MousePointerClick}
          label="Clics"
          value={`${formatN(clicksR.min)} - ${formatN(clicksR.max)}`}
          color="text-emerald-600 bg-emerald-50"
        />
        {optimizationGoal === "conversions" ? (
          <Stat
            icon={TrendingUp}
            label="Conversions"
            value={`${convR.min} - ${convR.max}`}
            color="text-gold-deep bg-gold/15"
          />
        ) : null}
      </ul>

      <p className="text-[10.5px] text-night-muted leading-snug pt-2 border-t border-line">
        Ces estimations sont basées sur des moyennes DIVARC et peuvent
        varier selon le creative, le ciblage et la concurrence sur tes
        placements.
      </p>
    </div>
  );
}

function Stat({
  icon: Icon,
  label,
  value,
  color,
}: {
  icon: typeof Eye;
  label: string;
  value: string;
  color: string;
}) {
  return (
    <li className="flex items-center gap-3">
      <span
        aria-hidden
        className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${color}`}
      >
        <Icon className="w-3.5 h-3.5" aria-hidden />
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-[10.5px] uppercase tracking-wider text-night-muted">
          {label}
        </p>
        <p className="text-[14px] font-bold text-night leading-tight">
          {value}
        </p>
      </div>
    </li>
  );
}

function formatN(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1000).toFixed(1)}k`;
  return n.toString();
}
