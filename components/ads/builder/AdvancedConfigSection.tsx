"use client";

import {
  AlertTriangle,
  Calendar,
  ChevronDown,
  ChevronUp,
  Code2,
  Settings,
  Split,
  Target,
  TrendingDown,
  Wallet,
} from "lucide-react";
import { useState } from "react";
import { DaypartingGrid, type DaypartSchedule } from "./DaypartingGrid";

/* AdvancedConfigSection — section dépliable d'options Pro inspirée
 * Meta Ads Manager + Google Ads Manager.
 *
 * Regroupe :
 *   - Buying Type (auction / reservation)
 *   - Bid Strategy détaillée (6 types)
 *   - target_roas / minimum_roas inputs si applicable
 *   - Spending limits campaign-level (daily cap + lifetime cap)
 *   - Schedule complet (start/end DateTime)
 *   - Dayparting grid 7×24
 *   - A/B Testing (toggle + variable + variants + split + durée min)
 *   - Tracking : Pixel + UTM auto
 *
 * Default collapsed pour ne pas saturer l'UI Smart Mode.
 */

export type AdvancedConfig = {
  /* Buying. */
  buying_type: "auction" | "reservation";
  /* Bid strategy. */
  bid_strategy: string;
  bid_amount: string; // string pour input controllé
  target_roas: string;
  minimum_roas: string;
  cost_cap: string;
  bid_cap: string;
  /* Spending caps. */
  spend_cap_lifetime: string;
  /* Schedule. */
  start_datetime: string;
  end_datetime: string;
  delivery_type: "standard" | "accelerated";
  /* Dayparting. */
  dayparting: DaypartSchedule | null;
  /* A/B Testing. */
  ab_test_enabled: boolean;
  ab_test_variable: "creative" | "audience" | "placement" | "optimization";
  ab_test_variants_count: number;
  ab_test_min_days: number;
  ab_test_metric: "ctr" | "cpa" | "roas" | "engagement";
  /* Tracking. */
  pixel_id: string;
  utm_source: string;
  utm_medium: string;
  utm_campaign: string;
};

export const DEFAULT_ADVANCED_CONFIG: AdvancedConfig = {
  buying_type: "auction",
  bid_strategy: "lowest_cost",
  bid_amount: "",
  target_roas: "",
  minimum_roas: "",
  cost_cap: "",
  bid_cap: "",
  spend_cap_lifetime: "",
  start_datetime: "",
  end_datetime: "",
  delivery_type: "standard",
  dayparting: null,
  ab_test_enabled: false,
  ab_test_variable: "creative",
  ab_test_variants_count: 2,
  ab_test_min_days: 7,
  ab_test_metric: "cpa",
  pixel_id: "",
  utm_source: "divarc",
  utm_medium: "cpc",
  utm_campaign: "",
};

export function AdvancedConfigSection({
  config,
  onChange,
  pixels,
}: {
  config: AdvancedConfig;
  onChange: (next: AdvancedConfig) => void;
  pixels: Array<{ id: string; name: string }>;
}) {
  const [expanded, setExpanded] = useState(false);

  function setVal<K extends keyof AdvancedConfig>(
    key: K,
    val: AdvancedConfig[K],
  ) {
    onChange({ ...config, [key]: val });
  }

  /* Détection : config a-t-elle des changements vs default ? */
  const hasOverrides =
    config.buying_type !== "auction" ||
    config.bid_strategy !== "lowest_cost" ||
    !!config.target_roas ||
    !!config.minimum_roas ||
    !!config.cost_cap ||
    !!config.bid_cap ||
    !!config.spend_cap_lifetime ||
    !!config.start_datetime ||
    !!config.end_datetime ||
    config.delivery_type !== "standard" ||
    !!config.dayparting ||
    config.ab_test_enabled ||
    !!config.pixel_id;

  return (
    <section className="rounded-2xl bg-white border border-line overflow-hidden">
      <button
        type="button"
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-between gap-3 px-5 py-4 hover:bg-bg-soft transition-colors"
      >
        <div className="flex items-center gap-2.5 text-left">
          <span
            aria-hidden
            className="w-9 h-9 rounded-xl bg-night/5 text-night flex items-center justify-center"
          >
            <Settings className="w-4 h-4" aria-hidden />
          </span>
          <div>
            <p className="text-[14px] font-semibold text-night">
              Configuration avancée
            </p>
            <p className="text-[11.5px] text-night-muted">
              Bid strategy, schedule, dayparting, A/B testing, tracking…
              {hasOverrides ? (
                <span className="ml-1.5 text-gold-deep font-bold">
                  · Personnalisée
                </span>
              ) : null}
            </p>
          </div>
        </div>
        {expanded ? (
          <ChevronUp className="w-4 h-4 text-night-muted shrink-0" aria-hidden />
        ) : (
          <ChevronDown
            className="w-4 h-4 text-night-muted shrink-0"
            aria-hidden
          />
        )}
      </button>

      {expanded ? (
        <div className="border-t border-line p-5 space-y-6 bg-bg-soft/30">
          {/* Buying Type + Bid Strategy */}
          <Subsection title="Mode d'achat & enchères" icon={Target}>
            <Field label="Type d'achat">
              <select
                value={config.buying_type}
                onChange={(e) =>
                  setVal(
                    "buying_type",
                    e.target.value as AdvancedConfig["buying_type"],
                  )
                }
                className={inputCls}
              >
                <option value="auction">Auction (recommandé)</option>
                <option value="reservation" disabled>
                  Reservation (à venir — premium)
                </option>
              </select>
              <p className="text-[10.5px] text-night-muted mt-1">
                Auction = enchères dynamiques temps réel.
                Reservation = inventaire + prix garantis (pour gros annonceurs).
              </p>
            </Field>

            <Field label="Stratégie d'enchère">
              <select
                value={config.bid_strategy}
                onChange={(e) => setVal("bid_strategy", e.target.value)}
                className={inputCls}
              >
                <option value="lowest_cost">
                  Coût le plus bas (auto-bidding, recommandé)
                </option>
                <option value="cost_cap">Cap coût moyen (cost_cap)</option>
                <option value="bid_cap">Cap enchère (bid_cap)</option>
                <option value="target_cost">Coût cible (target_cost)</option>
                <option value="target_roas">Target ROAS</option>
                <option value="minimum_roas">Minimum ROAS</option>
              </select>
            </Field>

            {(config.bid_strategy === "cost_cap" ||
              config.bid_strategy === "bid_cap" ||
              config.bid_strategy === "target_cost") && (
              <Field label="Montant cap (€)">
                <input
                  type="number"
                  value={config.bid_amount}
                  onChange={(e) => setVal("bid_amount", e.target.value)}
                  min={0}
                  step={0.01}
                  className={inputCls}
                  placeholder="ex: 5.00"
                />
              </Field>
            )}

            {config.bid_strategy === "target_roas" && (
              <Field label="Target ROAS (multiplicateur, ex: 4 = 4x retour)">
                <input
                  type="number"
                  value={config.target_roas}
                  onChange={(e) => setVal("target_roas", e.target.value)}
                  min={0.1}
                  step={0.1}
                  className={inputCls}
                  placeholder="ex: 4.0"
                />
              </Field>
            )}

            {config.bid_strategy === "minimum_roas" && (
              <Field label="Minimum ROAS">
                <input
                  type="number"
                  value={config.minimum_roas}
                  onChange={(e) => setVal("minimum_roas", e.target.value)}
                  min={0.1}
                  step={0.1}
                  className={inputCls}
                  placeholder="ex: 2.0"
                />
              </Field>
            )}
          </Subsection>

          {/* Spending Limits */}
          <Subsection title="Plafonds de dépense" icon={Wallet}>
            <Field
              label="Plafond total campagne (€)"
              helper="Au-delà de ce montant, la campagne se met en pause automatiquement. Optionnel."
            >
              <input
                type="number"
                value={config.spend_cap_lifetime}
                onChange={(e) =>
                  setVal("spend_cap_lifetime", e.target.value)
                }
                min={0}
                step={10}
                className={inputCls}
                placeholder="ex: 5000"
              />
            </Field>
          </Subsection>

          {/* Schedule */}
          <Subsection title="Calendrier de diffusion" icon={Calendar}>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Field label="Date/heure de début">
                <input
                  type="datetime-local"
                  value={config.start_datetime}
                  onChange={(e) =>
                    setVal("start_datetime", e.target.value)
                  }
                  className={inputCls}
                />
              </Field>
              <Field label="Date/heure de fin">
                <input
                  type="datetime-local"
                  value={config.end_datetime}
                  onChange={(e) => setVal("end_datetime", e.target.value)}
                  className={inputCls}
                />
              </Field>
            </div>
            <Field label="Type de livraison">
              <select
                value={config.delivery_type}
                onChange={(e) =>
                  setVal(
                    "delivery_type",
                    e.target.value as AdvancedConfig["delivery_type"],
                  )
                }
                className={inputCls}
              >
                <option value="standard">
                  Standard (recommandé, étalé sur la période)
                </option>
                <option value="accelerated">
                  Accelerated (brûle le budget rapidement, déconseillé)
                </option>
              </select>
              {config.delivery_type === "accelerated" && (
                <p className="text-[10.5px] text-amber-700 mt-1 flex items-start gap-1">
                  <AlertTriangle className="w-3 h-3 shrink-0 mt-0.5" aria-hidden />
                  Mode déconseillé sauf urgence (lancement produit J-J,
                  Black Friday, etc.). Risque d&apos;épuiser le budget vite
                  avec mauvais ROI.
                </p>
              )}
            </Field>

            {/* Dayparting */}
            <Field
              label="Dayparting (heures de diffusion)"
              helper="Sélectionne les jours et heures pendant lesquels diffuser. Par défaut : 24h/24, 7j/7."
            >
              <DaypartingGrid
                value={config.dayparting}
                onChange={(v) => setVal("dayparting", v)}
              />
            </Field>
          </Subsection>

          {/* A/B Testing */}
          <Subsection title="Test A/B" icon={Split}>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={config.ab_test_enabled}
                onChange={(e) =>
                  setVal("ab_test_enabled", e.target.checked)
                }
                className="accent-night"
              />
              <span className="text-[13px] text-night">
                Cette campagne est un test A/B
              </span>
            </label>

            {config.ab_test_enabled && (
              <div className="space-y-3 mt-3 pl-5 border-l-2 border-gold-deep/30">
                <Field label="Variable testée">
                  <select
                    value={config.ab_test_variable}
                    onChange={(e) =>
                      setVal(
                        "ab_test_variable",
                        e.target.value as AdvancedConfig["ab_test_variable"],
                      )
                    }
                    className={inputCls}
                  >
                    <option value="creative">Creative (visuel + texte)</option>
                    <option value="audience">Audience</option>
                    <option value="placement">Placement</option>
                    <option value="optimization">Optimization Goal</option>
                  </select>
                </Field>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <Field label="Nb variants">
                    <input
                      type="number"
                      value={config.ab_test_variants_count}
                      onChange={(e) =>
                        setVal(
                          "ab_test_variants_count",
                          Math.max(2, Math.min(5, Number(e.target.value))),
                        )
                      }
                      min={2}
                      max={5}
                      className={inputCls}
                    />
                  </Field>
                  <Field label="Durée min (jours)">
                    <input
                      type="number"
                      value={config.ab_test_min_days}
                      onChange={(e) =>
                        setVal("ab_test_min_days", Number(e.target.value))
                      }
                      min={3}
                      max={30}
                      className={inputCls}
                    />
                  </Field>
                  <Field label="Métrique de succès">
                    <select
                      value={config.ab_test_metric}
                      onChange={(e) =>
                        setVal(
                          "ab_test_metric",
                          e.target.value as AdvancedConfig["ab_test_metric"],
                        )
                      }
                      className={inputCls}
                    >
                      <option value="ctr">CTR</option>
                      <option value="cpa">CPA</option>
                      <option value="roas">ROAS</option>
                      <option value="engagement">Engagement</option>
                    </select>
                  </Field>
                </div>
              </div>
            )}
          </Subsection>

          {/* Tracking */}
          <Subsection title="Tracking" icon={Code2}>
            <Field label="DIVARC Pixel">
              {pixels.length === 0 ? (
                <p className="text-[12px] text-night-muted">
                  Aucun pixel installé.{" "}
                  <a
                    href="../pixels"
                    className="text-gold-deep underline"
                  >
                    Crée un pixel
                  </a>{" "}
                  pour mesurer les conversions sur ton site.
                </p>
              ) : (
                <select
                  value={config.pixel_id}
                  onChange={(e) => setVal("pixel_id", e.target.value)}
                  className={inputCls}
                >
                  <option value="">Aucun</option>
                  {pixels.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                    </option>
                  ))}
                </select>
              )}
            </Field>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <Field label="UTM source">
                <input
                  type="text"
                  value={config.utm_source}
                  onChange={(e) => setVal("utm_source", e.target.value)}
                  className={inputCls}
                  placeholder="divarc"
                />
              </Field>
              <Field label="UTM medium">
                <input
                  type="text"
                  value={config.utm_medium}
                  onChange={(e) => setVal("utm_medium", e.target.value)}
                  className={inputCls}
                  placeholder="cpc"
                />
              </Field>
              <Field label="UTM campaign">
                <input
                  type="text"
                  value={config.utm_campaign}
                  onChange={(e) => setVal("utm_campaign", e.target.value)}
                  className={inputCls}
                  placeholder="(auto-rempli avec nom de campagne)"
                />
              </Field>
            </div>
            <p className="text-[10.5px] text-night-muted">
              Les paramètres UTM seront ajoutés automatiquement aux URLs
              de destination de tes ads pour tracker la source côté analytics.
            </p>
          </Subsection>
        </div>
      ) : null}
    </section>
  );
}

function Subsection({
  title,
  icon: Icon,
  children,
}: {
  title: string;
  icon: typeof Calendar;
  children: React.ReactNode;
}) {
  return (
    <section className="space-y-3">
      <h4 className="text-[11px] uppercase tracking-wider font-bold text-night-muted flex items-center gap-1.5">
        <Icon className="w-3 h-3 text-gold-deep" aria-hidden />
        {title}
      </h4>
      {children}
    </section>
  );
}

function Field({
  label,
  helper,
  children,
}: {
  label: string;
  helper?: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="block text-[11px] font-bold uppercase tracking-wider text-muted mb-1.5">
        {label}
      </span>
      {children}
      {helper ? (
        <p className="text-[10.5px] text-night-muted mt-1 leading-snug">
          {helper}
        </p>
      ) : null}
    </label>
  );
}

const inputCls =
  "w-full px-3 py-2 rounded-xl border border-line bg-white text-[13px] text-night focus:outline-none focus:border-night";
