"use client";

import {
  AlertCircle,
  ArrowDown,
  ArrowUp,
  ArrowUpDown,
  Download,
  KeyRound,
  Loader2,
  Search,
  Sparkles,
  X,
} from "lucide-react";
import { useState } from "react";

/* KeywordPlannerClient — recherche de mots-clés avec volumes / CPC /
 * compétition / intent. UI inspirée Google Keyword Planner.
 *
 * Workflow :
 *   1. User saisit 1-50 keywords (CSV ou un par ligne)
 *   2. Choix pays + langue (FR/fr par défaut)
 *   3. POST /api/ads/keywords/research → cache hit + DataForSEO fetch
 *   4. Tableau triable + export CSV
 */

type KeywordResult = {
  keyword: string;
  country: string;
  language: string;
  search_volume: number | null;
  cpc_estimate: number | null;
  competition_index: number | null;
  competition_level: "low" | "medium" | "high" | null;
  intent: string | null;
  unavailable?: boolean;
};

type SortKey = "keyword" | "search_volume" | "cpc_estimate" | "competition_index";
type SortDir = "asc" | "desc";

export function KeywordPlannerClient({ accountId }: { accountId: string }) {
  void accountId; // utilisé pour audit V2
  const [input, setInput] = useState("");
  const [country, setCountry] = useState("FR");
  const [language, setLanguage] = useState("fr");
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<KeywordResult[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [warning, setWarning] = useState<string | null>(null);
  const [sortKey, setSortKey] = useState<SortKey>("search_volume");
  const [sortDir, setSortDir] = useState<SortDir>("desc");

  const submit = async () => {
    const keywords = input
      .split(/[\n,;]+/)
      .map((s) => s.trim())
      .filter((s) => s.length >= 2)
      .slice(0, 50);
    if (keywords.length === 0) {
      setError("Saisis au moins 1 mot-clé.");
      return;
    }
    setError(null);
    setWarning(null);
    setLoading(true);
    try {
      const res = await fetch("/api/ads/keywords/research", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ keywords, country, language }),
      });
      const json = (await res.json().catch(() => ({}))) as {
        results?: KeywordResult[];
        error?: string;
        dataforseo_available?: boolean;
        cache_hits?: number;
        cache_misses?: number;
      };
      if (!res.ok) {
        setError(json.error ?? "Erreur API.");
        return;
      }
      setResults(json.results ?? []);
      if (json.dataforseo_available === false && (json.cache_misses ?? 0) > 0) {
        setWarning(
          "DataForSEO temporairement indisponible (DATAFORSEO_LOGIN absent ou erreur). Seuls les mots-clés en cache ont été retournés.",
        );
      }
    } catch {
      setError("Erreur réseau.");
    } finally {
      setLoading(false);
    }
  };

  const sorted = [...results].sort((a, b) => {
    const av = a[sortKey];
    const bv = b[sortKey];
    if (av === null && bv === null) return 0;
    if (av === null) return 1;
    if (bv === null) return -1;
    const cmp =
      typeof av === "string" && typeof bv === "string"
        ? av.localeCompare(bv)
        : (av as number) - (bv as number);
    return sortDir === "asc" ? cmp : -cmp;
  });

  const setSort = (k: SortKey) => {
    if (sortKey === k) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(k);
      setSortDir(k === "keyword" ? "asc" : "desc");
    }
  };

  const exportCSV = () => {
    const header = "keyword,volume,cpc_eur,competition,intent\n";
    const rows = sorted
      .map((r) =>
        [
          r.keyword,
          r.search_volume ?? "",
          r.cpc_estimate ?? "",
          r.competition_level ?? "",
          r.intent ?? "",
        ].join(","),
      )
      .join("\n");
    const blob = new Blob([header + rows], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `keywords-${country}-${language}-${Date.now()}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-5">
      {/* === Input === */}
      <div className="rounded-2xl bg-white border border-line p-4 space-y-3">
        <div>
          <label className="block text-[11.5px] font-bold uppercase tracking-wider text-night-muted mb-1.5">
            Mots-clés (1-50, virgule ou retour à la ligne)
          </label>
          <textarea
            rows={4}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder={`ex:\nménage à domicile\nfemme de ménage paris\nservice nettoyage\n…`}
            className="w-full px-3 py-2 rounded-lg border border-line bg-white text-[13px] font-mono"
          />
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          <div>
            <label className="block text-[10.5px] font-bold uppercase tracking-wider text-night-muted mb-1">
              Pays
            </label>
            <select
              value={country}
              onChange={(e) => setCountry(e.target.value)}
              className="w-full px-2 py-1.5 rounded-lg border border-line bg-white text-[12.5px]"
            >
              <option value="FR">🇫🇷 France</option>
              <option value="BE">🇧🇪 Belgique</option>
              <option value="CH">🇨🇭 Suisse</option>
              <option value="LU">🇱🇺 Luxembourg</option>
              <option value="CA">🇨🇦 Canada</option>
              <option value="DE">🇩🇪 Allemagne</option>
              <option value="ES">🇪🇸 Espagne</option>
              <option value="IT">🇮🇹 Italie</option>
              <option value="US">🇺🇸 États-Unis</option>
              <option value="GB">🇬🇧 Royaume-Uni</option>
            </select>
          </div>
          <div>
            <label className="block text-[10.5px] font-bold uppercase tracking-wider text-night-muted mb-1">
              Langue
            </label>
            <select
              value={language}
              onChange={(e) => setLanguage(e.target.value)}
              className="w-full px-2 py-1.5 rounded-lg border border-line bg-white text-[12.5px]"
            >
              <option value="fr">Français</option>
              <option value="en">English</option>
              <option value="es">Español</option>
              <option value="de">Deutsch</option>
              <option value="it">Italiano</option>
              <option value="pt">Português</option>
              <option value="nl">Nederlands</option>
            </select>
          </div>
          <button
            type="button"
            onClick={submit}
            disabled={loading || input.trim().length < 2}
            className="self-end col-span-2 sm:col-span-2 px-4 py-2 rounded-lg bg-night text-cream text-[13px] font-bold disabled:opacity-40 inline-flex items-center justify-center gap-2"
          >
            {loading ? (
              <>
                <Loader2 className="w-[14px] h-[14px] animate-spin" aria-hidden />
                Recherche…
              </>
            ) : (
              <>
                <Search className="w-[14px] h-[14px]" aria-hidden />
                Analyser
              </>
            )}
          </button>
        </div>
      </div>

      {error ? (
        <div className="rounded-xl bg-red-50 border border-red-200 p-3 text-[12px] text-red-800 inline-flex items-start gap-2">
          <AlertCircle className="w-[14px] h-[14px] mt-0.5 shrink-0" aria-hidden />
          <span>{error}</span>
          <button
            type="button"
            onClick={() => setError(null)}
            className="ml-auto"
          >
            <X className="w-[12px] h-[12px]" aria-hidden />
          </button>
        </div>
      ) : null}

      {warning ? (
        <div className="rounded-xl bg-amber-50 border border-amber-200 p-3 text-[12px] text-amber-900 inline-flex items-start gap-2">
          <AlertCircle className="w-[14px] h-[14px] mt-0.5 shrink-0" aria-hidden />
          <span>{warning}</span>
        </div>
      ) : null}

      {/* === Résultats === */}
      {results.length > 0 ? (
        <>
          <div className="flex items-baseline justify-between gap-2">
            <p className="text-[11.5px] font-bold uppercase tracking-wider text-night-muted">
              {results.length} résultats · trié par {sortKey} {sortDir}
            </p>
            <button
              type="button"
              onClick={exportCSV}
              className="inline-flex items-center gap-1 px-3 py-1.5 rounded-full bg-white border border-line text-[11.5px] font-bold text-night hover:bg-bg-soft"
            >
              <Download className="w-[12px] h-[12px]" aria-hidden />
              Exporter CSV
            </button>
          </div>
          <div className="rounded-2xl bg-white border border-line overflow-hidden overflow-x-auto">
            <table className="w-full text-[12.5px]">
              <thead className="bg-bg-soft text-[10.5px] uppercase tracking-wider text-night-muted font-bold">
                <tr>
                  <Th onClick={() => setSort("keyword")} active={sortKey === "keyword"} dir={sortDir}>
                    Mot-clé
                  </Th>
                  <Th
                    onClick={() => setSort("search_volume")}
                    active={sortKey === "search_volume"}
                    dir={sortDir}
                    align="right"
                  >
                    Volume / mois
                  </Th>
                  <Th
                    onClick={() => setSort("cpc_estimate")}
                    active={sortKey === "cpc_estimate"}
                    dir={sortDir}
                    align="right"
                  >
                    CPC € (top page)
                  </Th>
                  <Th
                    onClick={() => setSort("competition_index")}
                    active={sortKey === "competition_index"}
                    dir={sortDir}
                    align="center"
                  >
                    Compétition
                  </Th>
                  <th className="px-3 py-2 text-left">Intent</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {sorted.map((r) => (
                  <tr key={r.keyword} className="hover:bg-bg-soft">
                    <td className="px-3 py-2 font-mono text-[12px]">
                      {r.keyword}
                    </td>
                    <td className="px-3 py-2 text-right font-bold">
                      {r.search_volume !== null
                        ? r.search_volume.toLocaleString("fr-FR")
                        : r.unavailable
                          ? "—"
                          : "Aucun"}
                    </td>
                    <td className="px-3 py-2 text-right">
                      {r.cpc_estimate !== null
                        ? `${r.cpc_estimate.toFixed(2)} €`
                        : "—"}
                    </td>
                    <td className="px-3 py-2 text-center">
                      <CompetitionBadge level={r.competition_level} />
                    </td>
                    <td className="px-3 py-2">
                      <IntentBadge intent={r.intent} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      ) : null}

      {/* Empty state. */}
      {results.length === 0 && !loading ? (
        <div className="rounded-2xl bg-bg-soft border border-line p-6 text-center">
          <KeyRound
            className="w-7 h-7 text-night-muted mx-auto mb-2"
            aria-hidden
          />
          <p className="text-[13px] font-semibold text-night mb-1">
            Recherche tes mots-clés
          </p>
          <p className="text-[11.5px] text-night-muted leading-snug max-w-md mx-auto">
            Volume = combien de personnes cherchent ce mot-clé chaque mois ·
            CPC = coût par clic moyen sur Google Ads · Intent indique
            l&apos;objectif derrière la recherche.
          </p>
        </div>
      ) : null}
    </div>
  );
}

function Th({
  onClick,
  active,
  dir,
  align,
  children,
}: {
  onClick: () => void;
  active: boolean;
  dir: SortDir;
  align?: "left" | "right" | "center";
  children: React.ReactNode;
}) {
  return (
    <th
      className={`px-3 py-2 ${
        align === "right"
          ? "text-right"
          : align === "center"
            ? "text-center"
            : "text-left"
      }`}
    >
      <button
        type="button"
        onClick={onClick}
        className={`inline-flex items-center gap-1 ${
          active ? "text-night" : "text-night-muted hover:text-night"
        }`}
      >
        {children}
        {active ? (
          dir === "asc" ? (
            <ArrowUp className="w-[10px] h-[10px]" aria-hidden />
          ) : (
            <ArrowDown className="w-[10px] h-[10px]" aria-hidden />
          )
        ) : (
          <ArrowUpDown className="w-[10px] h-[10px]" aria-hidden />
        )}
      </button>
    </th>
  );
}

function CompetitionBadge({ level }: { level: string | null }) {
  if (!level) return <span className="text-night-muted">—</span>;
  const cls =
    level === "low"
      ? "bg-emerald-50 text-emerald-700 border-emerald-200"
      : level === "medium"
        ? "bg-amber-50 text-amber-700 border-amber-200"
        : "bg-red-50 text-red-700 border-red-200";
  const label =
    level === "low" ? "Faible" : level === "medium" ? "Moyenne" : "Forte";
  return (
    <span
      className={`inline-block text-[10.5px] uppercase tracking-wider font-bold px-2 py-0.5 rounded border ${cls}`}
    >
      {label}
    </span>
  );
}

function IntentBadge({ intent }: { intent: string | null }) {
  if (!intent) return <span className="text-night-muted">—</span>;
  const map: Record<string, { label: string; cls: string }> = {
    informational: {
      label: "Info",
      cls: "bg-blue-50 text-blue-700 border-blue-200",
    },
    commercial: {
      label: "Comparatif",
      cls: "bg-purple-50 text-purple-700 border-purple-200",
    },
    transactional: {
      label: "Achat",
      cls: "bg-emerald-50 text-emerald-700 border-emerald-200",
    },
    navigational: {
      label: "Marque",
      cls: "bg-night/5 text-night-muted border-line",
    },
    mixed: {
      label: "Mixte",
      cls: "bg-night/5 text-night-muted border-line",
    },
  };
  const v = map[intent] ?? { label: intent, cls: "bg-night/5 text-night-muted border-line" };
  return (
    <span
      className={`inline-block text-[10.5px] font-bold px-2 py-0.5 rounded border ${v.cls}`}
    >
      {v.label}
    </span>
  );
}
