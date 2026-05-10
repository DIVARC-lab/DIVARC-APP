"use client";

import { TrendingDown } from "lucide-react";
import type { FunnelData } from "@/lib/queries/adsFunnel";

/* FunnelChart — visualisation funnel + drop-off entre étapes.
 *
 * Pas de dépendance externe (Recharts/D3) — pur SVG/HTML pour
 * minimiser le bundle. Style Stripe Sigma / Mixpanel.
 *
 * Pour chaque étape :
 *   - Bar horizontale (largeur ∝ count)
 *   - Count absolu + % du top of funnel
 *   - Step conversion rate ("78% de l'étape précédente")
 *   - Drop-off rate visualisé en rouge entre les bars
 */

export function FunnelChart({ data }: { data: FunnelData }) {
  const topCount = data.steps[0]?.count ?? 0;
  if (topCount === 0) {
    return (
      <div className="rounded-2xl bg-white border border-line p-8 text-center">
        <p className="text-[13px] text-night-muted">
          Pas encore d&apos;événements pour ce pixel.
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-2xl bg-white border border-line p-5 space-y-4">
      <div className="flex items-baseline justify-between gap-3 flex-wrap">
        <h3 className="text-[15px] font-semibold text-night">
          {data.pixel_name}
        </h3>
        {data.total_value > 0 ? (
          <p className="text-[12px] text-night-muted">
            Valeur totale conversions :{" "}
            <strong className="text-night">
              {data.total_value.toFixed(2)} €
            </strong>
          </p>
        ) : null}
      </div>

      <div className="space-y-1.5">
        {data.steps.map((step, idx) => {
          const widthPct = (step.count / topCount) * 100;
          const isFirst = idx === 0;
          const dropOffPct =
            step.drop_off_rate !== null
              ? (step.drop_off_rate * 100).toFixed(1)
              : null;

          return (
            <div key={step.event_name}>
              {/* Drop-off badge entre les bars (sauf 1ère étape) */}
              {!isFirst && step.drop_off_rate !== null && step.drop_off_rate > 0 ? (
                <div className="ml-[3%] mb-1 flex items-center gap-1.5">
                  <TrendingDown
                    className="w-3 h-3 text-red-600"
                    aria-hidden
                  />
                  <span className="text-[10px] text-red-700 font-semibold">
                    {dropOffPct}% drop-off
                  </span>
                </div>
              ) : null}

              {/* Bar */}
              <div className="flex items-center gap-3">
                <div className="w-32 sm:w-40 shrink-0">
                  <p className="text-[12.5px] font-semibold text-night truncate">
                    {step.label}
                  </p>
                  <p className="text-[10.5px] text-night-muted">
                    {step.event_name}
                  </p>
                </div>
                <div className="flex-1 relative h-9 rounded-lg bg-bg-soft overflow-hidden">
                  <div
                    className={`absolute inset-y-0 left-0 transition-all duration-500 ${
                      idx === data.steps.length - 1
                        ? "bg-gold-deep"
                        : "bg-night"
                    }`}
                    style={{ width: `${Math.max(widthPct, 1)}%` }}
                  />
                  <div className="relative flex items-center h-full px-3 text-[12px] font-semibold gap-2">
                    <span className="text-cream">
                      {step.count.toLocaleString("fr-FR")}
                    </span>
                    {step.total_conversion_rate !== null ? (
                      <span className="text-cream/80 text-[11px]">
                        ({(step.total_conversion_rate * 100).toFixed(1)}% du top)
                      </span>
                    ) : null}
                  </div>
                </div>
                <div className="w-16 sm:w-20 shrink-0 text-right">
                  {step.step_conversion_rate !== null ? (
                    <p className="text-[12px] font-bold text-emerald-700">
                      {(step.step_conversion_rate * 100).toFixed(1)}%
                    </p>
                  ) : (
                    <p className="text-[10.5px] text-night-muted">—</p>
                  )}
                  {step.step_conversion_rate !== null ? (
                    <p className="text-[9px] uppercase tracking-wider text-night-muted font-bold">
                      passage
                    </p>
                  ) : null}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Résumé global */}
      <div className="pt-3 border-t border-line grid grid-cols-3 gap-3 text-center">
        <Stat
          label="Top of funnel"
          value={topCount.toLocaleString("fr-FR")}
        />
        <Stat
          label="Conversions finales"
          value={
            data.steps[data.steps.length - 1]?.count.toLocaleString("fr-FR") ??
            "0"
          }
        />
        <Stat
          label="Taux conversion global"
          value={
            data.steps[data.steps.length - 1]?.total_conversion_rate !== null &&
            data.steps[data.steps.length - 1]!.total_conversion_rate! > 0
              ? `${(data.steps[data.steps.length - 1]!.total_conversion_rate! * 100).toFixed(2)} %`
              : "—"
          }
        />
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-[10px] uppercase tracking-wider text-night-muted font-bold">
        {label}
      </p>
      <p className="text-[16px] font-bold text-night">{value}</p>
    </div>
  );
}
