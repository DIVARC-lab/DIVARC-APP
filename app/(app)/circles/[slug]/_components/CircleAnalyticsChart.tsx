"use client";

/* CircleAnalyticsChart — line chart SVG natif (pas de lib externe).
 *
 * Affiche 4 séries (posts, comments, reactions, new_members) sur N
 * jours. Hover sur un point → tooltip avec date + valeur.
 *
 * Choix design Tailwind v4 + couleurs DIVARC :
 *  - posts        : night-soft (axe primaire)
 *  - comments     : gold
 *  - reactions    : rose-500
 *  - new_members  : emerald-500
 *
 * Pas de dépendance externe (recharts/visx) : on dessine en SVG pur
 * avec polyline + circle hover. ~150 lignes total. */

import { useMemo, useState } from "react";
import type { CircleDailyActivity } from "@/lib/queries/circleAnalytics";

type Props = {
  data: CircleDailyActivity[];
  height?: number;
};

type Series = {
  key: keyof Omit<CircleDailyActivity, "day">;
  label: string;
  color: string;
};

const SERIES: Series[] = [
  { key: "posts", label: "Posts", color: "#0A1F44" },
  { key: "comments", label: "Commentaires", color: "#F4B942" },
  { key: "reactions", label: "Réactions", color: "#E11D48" },
  { key: "new_members", label: "Nouveaux membres", color: "#10B981" },
];

export function CircleAnalyticsChart({ data, height = 240 }: Props) {
  const [hoverIdx, setHoverIdx] = useState<number | null>(null);

  const { width, paddingX, paddingY, max } = {
    width: 720,
    paddingX: 32,
    paddingY: 24,
    max: Math.max(
      1,
      ...data.flatMap((d) => SERIES.map((s) => d[s.key] as number)),
    ),
  };

  const points = useMemo(() => {
    if (data.length < 2) return {};
    const innerW = width - paddingX * 2;
    const innerH = height - paddingY * 2;
    const stepX = innerW / (data.length - 1);
    const result: Record<string, string> = {};
    for (const s of SERIES) {
      result[s.key] = data
        .map((d, i) => {
          const x = paddingX + i * stepX;
          const y =
            paddingY +
            innerH -
            ((d[s.key] as number) / max) * innerH;
          return `${x.toFixed(1)},${y.toFixed(1)}`;
        })
        .join(" ");
    }
    return result;
  }, [data, width, height, paddingX, paddingY, max]);

  if (data.length === 0) {
    return (
      <div className="text-center text-[13px] text-night-muted py-12">
        Aucune donnée d&apos;activité pour cette période.
      </div>
    );
  }

  /* Axe X : on affiche ~5 labels max (premier, derniers, milieux). */
  const xLabels = data
    .map((d, i) => ({ d, i }))
    .filter(
      (_, i, arr) =>
        i === 0 ||
        i === arr.length - 1 ||
        i % Math.max(1, Math.floor(arr.length / 4)) === 0,
    );

  return (
    <div className="relative bg-white border border-line rounded-3xl p-5">
      {/* Légende */}
      <div className="flex flex-wrap items-center gap-3 mb-3">
        {SERIES.map((s) => (
          <div
            key={s.key}
            className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-night-muted"
          >
            <span
              aria-hidden
              className="w-2.5 h-2.5 rounded-full"
              style={{ background: s.color }}
            />
            {s.label}
          </div>
        ))}
      </div>

      {/* SVG */}
      <div className="w-full overflow-x-auto">
        <svg
          width={width}
          height={height}
          viewBox={`0 0 ${width} ${height}`}
          className="w-full max-w-full"
        >
          {/* Gridlines horizontales (5 niveaux) */}
          {[0, 0.25, 0.5, 0.75, 1].map((ratio) => {
            const y = paddingY + (height - paddingY * 2) * (1 - ratio);
            return (
              <g key={ratio}>
                <line
                  x1={paddingX}
                  y1={y}
                  x2={width - paddingX}
                  y2={y}
                  stroke="#E5E7EB"
                  strokeWidth={1}
                  strokeDasharray="2 4"
                />
                <text
                  x={paddingX - 6}
                  y={y + 3}
                  textAnchor="end"
                  className="fill-night-muted"
                  style={{ fontSize: 10 }}
                >
                  {Math.round(max * ratio)}
                </text>
              </g>
            );
          })}

          {/* Polylines */}
          {SERIES.map((s) =>
            points[s.key] ? (
              <polyline
                key={s.key}
                points={points[s.key]}
                fill="none"
                stroke={s.color}
                strokeWidth={2}
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            ) : null,
          )}

          {/* Points + hover zones */}
          {data.map((d, i) => {
            const innerW = width - paddingX * 2;
            const innerH = height - paddingY * 2;
            const stepX = innerW / Math.max(1, data.length - 1);
            const x = paddingX + i * stepX;
            return (
              <g key={d.day}>
                {/* Hover zone invisible */}
                <rect
                  x={x - stepX / 2}
                  y={paddingY}
                  width={stepX}
                  height={innerH}
                  fill="transparent"
                  onMouseEnter={() => setHoverIdx(i)}
                  onMouseLeave={() => setHoverIdx(null)}
                  onTouchStart={() => setHoverIdx(i)}
                />
                {hoverIdx === i ? (
                  <line
                    x1={x}
                    y1={paddingY}
                    x2={x}
                    y2={height - paddingY}
                    stroke="#0A1F44"
                    strokeWidth={1}
                    strokeDasharray="2 2"
                    opacity={0.4}
                  />
                ) : null}
                {SERIES.map((s) => {
                  const y =
                    paddingY +
                    innerH -
                    ((d[s.key] as number) / max) * innerH;
                  return (
                    <circle
                      key={s.key}
                      cx={x}
                      cy={y}
                      r={hoverIdx === i ? 4 : 2.5}
                      fill={s.color}
                    />
                  );
                })}
              </g>
            );
          })}

          {/* Labels X */}
          {xLabels.map(({ d, i }) => {
            const stepX = (width - paddingX * 2) / Math.max(1, data.length - 1);
            const x = paddingX + i * stepX;
            return (
              <text
                key={d.day}
                x={x}
                y={height - 4}
                textAnchor="middle"
                className="fill-night-muted"
                style={{ fontSize: 10 }}
              >
                {formatDayShort(d.day)}
              </text>
            );
          })}
        </svg>
      </div>

      {/* Tooltip flottant */}
      {hoverIdx !== null && data[hoverIdx] ? (
        <div className="absolute top-12 right-6 bg-night text-cream rounded-xl px-3 py-2 text-[11px] font-semibold pointer-events-none shadow-lg">
          <div className="opacity-70 mb-1">{formatDayLong(data[hoverIdx].day)}</div>
          {SERIES.map((s) => (
            <div key={s.key} className="flex items-center gap-1.5">
              <span
                aria-hidden
                className="w-1.5 h-1.5 rounded-full"
                style={{ background: s.color }}
              />
              <span className="opacity-70">{s.label}</span>
              <span className="ml-auto tabular-nums">
                {data[hoverIdx][s.key]}
              </span>
            </div>
          ))}
        </div>
      ) : null}
    </div>
  );
}

function formatDayShort(iso: string): string {
  /* "2026-05-15" → "15 mai" */
  const d = new Date(iso);
  return d.toLocaleDateString("fr-FR", { day: "numeric", month: "short" });
}
function formatDayLong(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString("fr-FR", {
    weekday: "short",
    day: "numeric",
    month: "short",
  });
}
