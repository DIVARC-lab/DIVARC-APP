"use client";

import { useState } from "react";

/* DaypartingGrid — sélecteur visuel 7 jours × 24 heures.
 *
 * UX inspirée Meta Ads + Google Ads. Click = toggle 1 cellule.
 * Drag-select = toggle plage. Boutons rapides "Heures de bureau",
 * "Soirées", "Weekends".
 *
 * Storage : { mon: ["09-18"], tue: ["09-18"], ... } compatible
 * avec ads_ad_sets.dayparting (jsonb).
 */

const DAYS = [
  { id: "mon", label: "Lundi", short: "Lu" },
  { id: "tue", label: "Mardi", short: "Ma" },
  { id: "wed", label: "Mercredi", short: "Me" },
  { id: "thu", label: "Jeudi", short: "Je" },
  { id: "fri", label: "Vendredi", short: "Ve" },
  { id: "sat", label: "Samedi", short: "Sa" },
  { id: "sun", label: "Dimanche", short: "Di" },
] as const;

type DayId = (typeof DAYS)[number]["id"];
const HOURS = Array.from({ length: 24 }, (_, i) => i);

export type DaypartSchedule = Record<DayId, boolean[]>;

const DEFAULT_SCHEDULE: DaypartSchedule = DAYS.reduce(
  (acc, day) => {
    acc[day.id] = Array(24).fill(true); // all enabled by default
    return acc;
  },
  {} as DaypartSchedule,
);

export function DaypartingGrid({
  value,
  onChange,
}: {
  value: DaypartSchedule | null;
  onChange: (v: DaypartSchedule) => void;
}) {
  const schedule = value ?? DEFAULT_SCHEDULE;
  const [dragMode, setDragMode] = useState<boolean | null>(null);

  function toggleCell(day: DayId, hour: number) {
    const next = { ...schedule };
    next[day] = [...schedule[day]];
    next[day][hour] = !next[day][hour];
    onChange(next);
  }

  function applyPreset(name: "all" | "business" | "evenings" | "weekends" | "none") {
    const next: DaypartSchedule = DAYS.reduce(
      (acc, d) => {
        acc[d.id] = Array(24).fill(false);
        return acc;
      },
      {} as DaypartSchedule,
    );
    if (name === "all") {
      for (const d of DAYS) next[d.id] = Array(24).fill(true);
    } else if (name === "business") {
      for (const d of ["mon", "tue", "wed", "thu", "fri"] as const) {
        for (let h = 9; h < 18; h++) next[d][h] = true;
      }
    } else if (name === "evenings") {
      for (const d of DAYS) {
        for (let h = 18; h < 23; h++) next[d.id][h] = true;
      }
    } else if (name === "weekends") {
      for (const d of ["sat", "sun"] as const) {
        next[d] = Array(24).fill(true);
      }
    }
    onChange(next);
  }

  const totalCellsActive = DAYS.reduce(
    (sum, d) => sum + schedule[d.id].filter(Boolean).length,
    0,
  );
  const isFullActive = totalCellsActive === 7 * 24;

  return (
    <div className="space-y-2.5">
      {/* Presets */}
      <div className="flex items-center gap-1.5 flex-wrap">
        <button
          type="button"
          onClick={() => applyPreset("all")}
          className={`px-2.5 py-1 rounded-full text-[11px] font-semibold border ${
            isFullActive
              ? "border-night bg-night text-cream"
              : "border-line bg-white text-night-muted hover:bg-bg-soft"
          }`}
        >
          24h/24 7j/7
        </button>
        <button
          type="button"
          onClick={() => applyPreset("business")}
          className="px-2.5 py-1 rounded-full text-[11px] font-semibold border border-line bg-white text-night-muted hover:bg-bg-soft"
        >
          Heures bureau (9h-18h L-V)
        </button>
        <button
          type="button"
          onClick={() => applyPreset("evenings")}
          className="px-2.5 py-1 rounded-full text-[11px] font-semibold border border-line bg-white text-night-muted hover:bg-bg-soft"
        >
          Soirées (18h-23h)
        </button>
        <button
          type="button"
          onClick={() => applyPreset("weekends")}
          className="px-2.5 py-1 rounded-full text-[11px] font-semibold border border-line bg-white text-night-muted hover:bg-bg-soft"
        >
          Weekends
        </button>
        <button
          type="button"
          onClick={() => applyPreset("none")}
          className="ml-auto px-2.5 py-1 rounded-full text-[11px] text-night-muted hover:text-red-700"
        >
          Tout effacer
        </button>
      </div>

      {/* Grid 7×24 */}
      <div
        className="rounded-xl border border-line bg-white overflow-x-auto"
        onMouseUp={() => setDragMode(null)}
        onMouseLeave={() => setDragMode(null)}
      >
        <table className="w-full text-center" style={{ minWidth: 600 }}>
          <thead>
            <tr>
              <th className="w-12" aria-hidden />
              {HOURS.map((h) => (
                <th
                  key={h}
                  className="text-[8.5px] font-mono text-night-muted py-1"
                >
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {DAYS.map((day) => (
              <tr key={day.id}>
                <td className="text-[10.5px] font-bold text-night-muted py-0.5 pr-1.5">
                  {day.short}
                </td>
                {HOURS.map((h) => {
                  const active = schedule[day.id][h];
                  return (
                    <td
                      key={h}
                      onMouseDown={() => {
                        const newVal = !active;
                        setDragMode(newVal);
                        toggleCell(day.id, h);
                      }}
                      onMouseEnter={() => {
                        if (dragMode !== null && active !== dragMode) {
                          toggleCell(day.id, h);
                        }
                      }}
                      className={`w-3 h-5 cursor-pointer transition-colors ${
                        active
                          ? "bg-night hover:bg-night/80"
                          : "bg-bg-soft hover:bg-line border-r border-line"
                      } border-r border-white`}
                      title={`${day.label} ${h}h${active ? " — activé" : " — désactivé"}`}
                    />
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <p className="text-[11px] text-night-muted">
        {totalCellsActive} h/sem activée{totalCellsActive > 1 ? "s" : ""}{" "}
        ({((totalCellsActive / (7 * 24)) * 100).toFixed(0)}% du temps)
      </p>
    </div>
  );
}
