"use client";

import {
  CheckCircle2,
  ChevronRight,
  Lightbulb,
  Loader2,
  RefreshCw,
  Sparkles,
  TrendingUp,
  X,
} from "lucide-react";
import { useCallback, useEffect, useState } from "react";

/* RecommendationsPanel — recos IA permanentes affichées sur le dashboard
 * du compte publicitaire. Génération via heuristiques V1 (cf
 * /api/ads/recommendations/generate).
 *
 * Actions :
 *   - Apply (one-click) → applied
 *   - Dismiss → dismissed
 *   - Auto-expire après 7 jours
 */

type Recommendation = {
  id: string;
  type: string;
  severity: "low" | "medium" | "high" | "critical";
  title: string;
  description: string;
  action_payload: Record<string, unknown> | null;
  estimated_impact: Record<string, unknown> | null;
  status: string;
  generated_at: string;
};

type Props = {
  accountId: string;
};

export function RecommendationsPanel({ accountId }: Props) {
  const [items, setItems] = useState<Recommendation[]>([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [acting, setActing] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const res = await fetch(
        `/api/ads/recommendations/list?account=${accountId}&status=pending`,
        { cache: "no-store" },
      );
      if (!res.ok) return;
      const json = (await res.json()) as { recommendations?: Recommendation[] };
      setItems(json.recommendations ?? []);
    } finally {
      setLoading(false);
    }
  }, [accountId]);

  useEffect(() => {
    void load();
  }, [load]);

  const generate = async () => {
    setGenerating(true);
    try {
      await fetch("/api/ads/recommendations/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ad_account_id: accountId }),
      });
      await load();
    } finally {
      setGenerating(false);
    }
  };

  const act = async (id: string, action: "apply" | "dismiss") => {
    setActing(id);
    try {
      const res = await fetch(`/api/ads/recommendations/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      });
      if (res.ok) {
        setItems((prev) => prev.filter((r) => r.id !== id));
      }
    } finally {
      setActing(null);
    }
  };

  if (loading) {
    return (
      <div className="rounded-2xl bg-white border border-line p-4 text-center text-[12px] text-night-muted">
        <Loader2 className="w-[14px] h-[14px] animate-spin inline-block mr-1" aria-hidden />
        Chargement des recommandations…
      </div>
    );
  }

  return (
    <div className="rounded-2xl bg-white border border-line overflow-hidden">
      <header className="px-4 py-3 flex items-center gap-2 border-b border-line">
        <span className="w-7 h-7 rounded-lg bg-gold/15 text-gold-deep flex items-center justify-center shrink-0">
          <Lightbulb className="w-[14px] h-[14px]" aria-hidden />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-[13px] font-bold text-night">
            Recommandations IA
          </p>
          <p className="text-[10.5px] text-night-muted">
            {items.length === 0
              ? "Tout va bien — aucune action recommandée."
              : `${items.length} action${items.length > 1 ? "s" : ""} suggérée${items.length > 1 ? "s" : ""}`}
          </p>
        </div>
        <button
          type="button"
          onClick={generate}
          disabled={generating}
          className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10.5px] font-bold text-night-muted hover:text-night hover:bg-bg-soft border border-line disabled:opacity-50"
        >
          {generating ? (
            <Loader2 className="w-[10px] h-[10px] animate-spin" aria-hidden />
          ) : (
            <RefreshCw className="w-[10px] h-[10px]" aria-hidden />
          )}
          Analyser
        </button>
      </header>

      {items.length === 0 ? (
        <div className="px-4 py-6 text-center">
          <CheckCircle2
            className="w-7 h-7 text-emerald-500 mx-auto mb-1.5"
            aria-hidden
          />
          <p className="text-[12.5px] text-night-soft">
            Tes campagnes tournent sans alerte.
          </p>
          <p className="text-[10.5px] text-night-muted mt-1">
            Clique « Analyser » pour rafraîchir.
          </p>
        </div>
      ) : (
        <ul className="divide-y divide-line">
          {items.map((r) => (
            <li key={r.id} className="px-4 py-3">
              <div className="flex items-start gap-2">
                <SeverityDot severity={r.severity} />
                <div className="min-w-0 flex-1">
                  <p className="text-[12.5px] font-bold text-night">
                    {r.title}
                  </p>
                  <p className="text-[11.5px] text-night-soft mt-0.5 leading-snug">
                    {r.description}
                  </p>
                  {r.estimated_impact &&
                  typeof r.estimated_impact === "object" ? (
                    <p className="text-[10.5px] text-emerald-700 mt-1 inline-flex items-center gap-1 font-semibold">
                      <TrendingUp className="w-[10px] h-[10px]" aria-hidden />
                      {String(
                        (r.estimated_impact as Record<string, unknown>).delta ??
                          "Impact estimé positif",
                      )}
                    </p>
                  ) : null}
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <button
                    type="button"
                    onClick={() => act(r.id, "apply")}
                    disabled={acting === r.id}
                    className="inline-flex items-center gap-0.5 px-2.5 py-1 rounded-full bg-night text-cream text-[10.5px] font-bold disabled:opacity-50"
                  >
                    {acting === r.id ? (
                      <Loader2 className="w-[10px] h-[10px] animate-spin" aria-hidden />
                    ) : (
                      <CheckCircle2 className="w-[10px] h-[10px]" aria-hidden />
                    )}
                    Appliquer
                  </button>
                  <button
                    type="button"
                    onClick={() => act(r.id, "dismiss")}
                    disabled={acting === r.id}
                    className="text-night-muted hover:text-red-600 disabled:opacity-50"
                    aria-label="Ignorer"
                  >
                    <X className="w-[14px] h-[14px]" aria-hidden />
                  </button>
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function SeverityDot({
  severity,
}: {
  severity: "low" | "medium" | "high" | "critical";
}) {
  const cls =
    severity === "critical"
      ? "bg-red-500"
      : severity === "high"
        ? "bg-amber-500"
        : severity === "medium"
          ? "bg-blue-500"
          : "bg-night-muted";
  return (
    <span
      aria-label={`Sévérité ${severity}`}
      className={`mt-1.5 w-2 h-2 rounded-full ${cls} shrink-0`}
    />
  );
}
