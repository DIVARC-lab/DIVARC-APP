"use client";

import {
  AlertTriangle,
  BarChart3,
  CheckCircle2,
  Clock,
  Coins,
  Edit3,
  Eye,
  FileText,
  Flag,
  Globe,
  Image as ImageIcon,
  Layers3,
  LayoutGrid,
  LineChart,
  Pencil,
  Shield,
  ShieldCheck,
  Sparkles,
  Target,
  TrendingUp,
  Users,
  Wallet,
} from "lucide-react";
import { useMemo } from "react";
import type { AdvancedConfig } from "./AdvancedConfigSection";
import type { ObjectiveDef } from "./objectives";
import type { CampaignFormState, WizardStepId } from "./types";

/* ReviewBuilder — vérification finale rich avec :
 *  - Score de conformité visuel
 *  - 6 cards section avec edit-jump button
 *  - Pre-flight checks (errors bloquants + warnings + recommendations)
 *  - Estimated metrics (reach, daily impressions, runway)
 *  - Visuel preview compact
 *  - CTA final avec preview état post-soumission
 */

type Props = {
  form: CampaignFormState;
  advancedConfig: AdvancedConfig;
  currency: string;
  objectiveDef: ObjectiveDef | undefined;
  estimatedAudience: number | null;
  validationErrors: string[];
  validationWarnings: string[];
  onJumpToStep: (step: WizardStepId) => void;
};

export function ReviewBuilder({
  form,
  advancedConfig,
  currency,
  objectiveDef,
  estimatedAudience,
  validationErrors,
  validationWarnings,
  onJumpToStep,
}: Props) {
  /* Pre-flight checks. */
  const checks = useMemo(
    () => buildPreflightChecks(form, advancedConfig, validationErrors),
    [form, advancedConfig, validationErrors],
  );
  const errorCount = checks.filter((c) => c.severity === "error").length;
  const warningCount = checks.filter((c) => c.severity === "warning").length;
  const okCount = checks.filter((c) => c.severity === "ok").length;
  const score = computeComplianceScore(errorCount, warningCount, okCount);

  /* Estimated metrics. */
  const dailyBudget =
    form.budget_type === "daily"
      ? Number(form.daily_budget) || 0
      : Number(form.lifetime_budget) / 30 || 0;
  const estImpressions = estimatedAudience
    ? Math.round(estimatedAudience * 0.5)
    : 0;
  const estReach = estimatedAudience
    ? Math.round(estimatedAudience * 0.35)
    : 0;
  const estCpc = 0.45; // moyenne plateforme
  const estClicks = dailyBudget > 0 ? Math.round(dailyBudget / estCpc) : 0;
  const lifetimeRunway =
    form.budget_type === "lifetime" && Number(form.lifetime_budget) > 0
      ? Math.round(Number(form.lifetime_budget) / Math.max(1, dailyBudget))
      : null;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="font-display text-[28px] sm:text-[32px] leading-tight tracking-[-0.02em] text-night">
          Vérification{" "}
          <em className="italic text-gold-deep">finale</em>
        </h2>
        <p className="mt-2 text-[14px] text-night-soft leading-relaxed max-w-2xl">
          Dernière relecture. Tu peux éditer chaque section ou lancer
          directement — la campagne passera en review conformité (DSA +
          RGPD + brand safety) avant diffusion.
        </p>
      </div>

      {/* === Score de conformité === */}
      <ComplianceScoreCard
        score={score}
        errorCount={errorCount}
        warningCount={warningCount}
        okCount={okCount}
        checks={checks}
      />

      {/* === Métriques estimées === */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
        <MetricCard
          icon={Users}
          label="Reach estimé"
          value={
            estReach
              ? `~${formatCompact(estReach)}`
              : estimatedAudience !== null
                ? "Faible"
                : "—"
          }
          tone="default"
        />
        <MetricCard
          icon={Eye}
          label="Impressions/j"
          value={estImpressions ? `~${formatCompact(estImpressions)}` : "—"}
          tone="default"
        />
        <MetricCard
          icon={TrendingUp}
          label="Clics/j estimés"
          value={estClicks > 0 ? `~${estClicks}` : "—"}
          tone="default"
        />
        <MetricCard
          icon={Clock}
          label={lifetimeRunway ? "Runway" : "Pacing"}
          value={
            lifetimeRunway !== null
              ? `${lifetimeRunway}j`
              : advancedConfig.delivery_type === "accelerated"
                ? "Accéléré"
                : "Standard"
          }
          tone="default"
        />
      </div>

      {/* === Cards par section === */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
        <SectionCard
          icon={Target}
          title="Objectif"
          stepId="objective"
          onEdit={onJumpToStep}
        >
          <Row label="Type" value={objectiveDef?.label ?? form.objective} />
          {form.ad_category_hint ? (
            <Row label="Catégorie" value={form.ad_category_hint} />
          ) : null}
          {form.special_ad_category ? (
            <Row
              label="Catégorie spéciale"
              value={labelSpecialCategory(form.special_ad_category)}
              accent
            />
          ) : null}
        </SectionCard>

        <SectionCard
          icon={Users}
          title="Audience"
          stepId="audience"
          onEdit={onJumpToStep}
        >
          <Row label="Nom" value={form.name || "—"} />
          <Row
            label="Démographie"
            value={`${form.age_min}–${form.age_max} ans · ${labelGender(form.genders)}`}
          />
          <Row
            label="Géo"
            value={`${form.countries.length} pays${form.cities.length > 0 ? ` · ${form.cities.length} ville(s)` : ""}${form.custom_locations.length > 0 ? ` · ${form.custom_locations.length} radius` : ""}`}
          />
          {form.languages.length > 0 ? (
            <Row
              label="Langues"
              value={form.languages.join(", ").toUpperCase()}
            />
          ) : null}
          {form.interests.trim() ? (
            <Row
              label="Intérêts"
              value={`${form.interests.split(",").filter((s) => s.trim()).length} (${form.interests_logic === "and" ? "ET" : "OU"})`}
            />
          ) : null}
          {form.behaviors.length > 0 ? (
            <Row
              label="Comportements"
              value={`${form.behaviors.length} segment(s)`}
            />
          ) : null}
          {form.custom_audience_ids.length > 0 ? (
            <Row
              label="Custom audiences"
              value={`${form.custom_audience_ids.length} incluse(s)`}
            />
          ) : null}
          {form.lookalike_audience_ids.length > 0 ? (
            <Row
              label="Lookalikes"
              value={String(form.lookalike_audience_ids.length)}
            />
          ) : null}
        </SectionCard>

        <SectionCard
          icon={LayoutGrid}
          title="Placements & Brand Safety"
          stepId="budget"
          onEdit={onJumpToStep}
        >
          <Row
            label="Placements"
            value={form.placements
              .map((p) =>
                ({
                  feed_home: "Feed",
                  marketplace_feed: "Marketplace",
                  marketplace_listing_boost: "Boost",
                  jobs_feed: "Jobs",
                  stories: "Stories",
                })[p] ?? p,
              )
              .join(", ")}
          />
          {form.audience_network_enabled ? (
            <Row label="Audience Network" value="Activé" accent />
          ) : null}
          <Row
            label="Brand safety"
            value={
              {
                limited: "Limité",
                standard: "Standard",
                expanded: "Étendu",
              }[form.brand_safety_filter]
            }
          />
          {form.excluded_topics.length > 0 ? (
            <Row
              label="Catégories exclues"
              value={`${form.excluded_topics.length}`}
            />
          ) : null}
          {form.excluded_keywords.length > 0 ? (
            <Row
              label="Mots-clés exclus"
              value={`${form.excluded_keywords.length}`}
            />
          ) : null}
        </SectionCard>

        <SectionCard
          icon={Wallet}
          title="Budget & Optimisation"
          stepId="budget"
          onEdit={onJumpToStep}
        >
          <Row
            label="Budget"
            value={
              form.budget_type === "daily"
                ? `${form.daily_budget} ${currency} / jour`
                : `${form.lifetime_budget} ${currency} total`
            }
          />
          <Row
            label="Mode budget"
            value={
              form.budget_optimization_mode === "cbo"
                ? "CBO (auto)"
                : "ABO (manuel)"
            }
          />
          <Row label="Stratégie" value={labelBidStrategy(form.bid_strategy)} />
          <Row label="Optimisation" value={form.optimization_goal} />
          <Row label="Facturation" value={form.billing_event} />
          <Row
            label="Attribution"
            value={`${labelAttribution(form.attribution_setting)} · ${form.attribution_window_click_days}j clic / ${form.attribution_window_view_days}j vue`}
          />
          <Row
            label="Frequency cap"
            value={`${form.frequency_max} / ${form.frequency_period_days}j`}
          />
          <Row
            label="Pacing"
            value={
              advancedConfig.delivery_type === "accelerated"
                ? "Accéléré"
                : "Standard"
            }
          />
          {advancedConfig.dayparting ? (
            <Row label="Dayparting" value="Configuré" accent />
          ) : null}
          {advancedConfig.ab_test_enabled ? (
            <Row label="A/B test" value={advancedConfig.ab_test_variable} accent />
          ) : null}
        </SectionCard>

        <SectionCard
          icon={ImageIcon}
          title="Creative"
          stepId="creative"
          onEdit={onJumpToStep}
        >
          <Row
            label="Format"
            value={
              {
                single_image: "Image",
                single_video: "Vidéo",
                carousel: "Carrousel",
              }[form.creative_type] ?? form.creative_type
            }
          />
          <Row label="Titre" value={form.headline || "—"} />
          <Row
            label="Texte principal"
            value={
              form.primary_text.length > 60
                ? `${form.primary_text.slice(0, 60)}…`
                : form.primary_text || "—"
            }
          />
          <Row label="CTA" value={labelCTA(form.call_to_action)} />
          <Row
            label="Visuel"
            value={
              form.media_url
                ? form.media_url.startsWith("data:")
                  ? "[image recadrée]"
                  : "URL fournie"
                : "Aucun"
            }
          />
          {form.dynamic_creative_enabled ? (
            <Row
              label="Dynamic Creative"
              value={`${form.dynamic_variants.length} variantes`}
              accent
            />
          ) : null}
          {form.lead_form ? (
            <Row
              label="Lead form"
              value={`${form.lead_form.fields.length} champ(s)`}
              accent
            />
          ) : null}
        </SectionCard>

        <SectionCard
          icon={LineChart}
          title="Tracking & UTM"
          stepId="budget"
          onEdit={onJumpToStep}
        >
          <Row
            label="Pixel ID"
            value={advancedConfig.pixel_id ? "Configuré" : "Aucun"}
          />
          <Row
            label="UTM source"
            value={advancedConfig.utm_source || "—"}
          />
          <Row
            label="UTM medium"
            value={advancedConfig.utm_medium || "—"}
          />
          <Row
            label="UTM campaign"
            value={advancedConfig.utm_campaign || "—"}
          />
        </SectionCard>
      </div>

      {/* === Visuel preview compact === */}
      {form.media_url ? (
        <div className="rounded-2xl bg-white border border-line p-4">
          <div className="flex items-baseline justify-between mb-2">
            <p className="text-[11.5px] font-bold uppercase tracking-wider text-night-muted">
              Aperçu visuel
            </p>
          </div>
          <div className="flex items-start gap-3">
            <div className="w-32 shrink-0">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={form.media_url}
                alt="Aperçu"
                className="w-full rounded-lg border border-line object-cover aspect-square"
              />
            </div>
            <div className="min-w-0 flex-1 text-[12px] text-night-soft">
              <p className="text-[13px] font-bold text-night truncate">
                {form.headline}
              </p>
              <p className="mt-1 leading-snug">{form.primary_text}</p>
              {form.description ? (
                <p className="text-[11px] text-night-muted mt-1">
                  {form.description}
                </p>
              ) : null}
            </div>
          </div>
        </div>
      ) : null}

      {/* === Conformité automatique === */}
      <div className="rounded-2xl bg-bg-soft border border-line p-4 text-[12.5px] text-night-soft leading-relaxed">
        <p className="font-semibold text-night mb-1.5 flex items-center gap-2">
          <ShieldCheck
            className="w-3.5 h-3.5 text-emerald-700"
            aria-hidden
          />
          Conformité automatique appliquée
        </p>
        <ul className="list-disc pl-4 space-y-0.5">
          <li>DSA art. 28 : ciblage 18+ enforced.</li>
          <li>RGPD art. 9 : aucune catégorie sensible.</li>
          <li>
            Brand safety : modération texte + image{" "}
            {form.brand_safety_filter === "limited"
              ? "(strict)"
              : form.brand_safety_filter === "expanded"
                ? "(souple)"
                : "(standard)"}
            .
          </li>
          <li>Disclaimers légaux ajoutés selon la catégorie.</li>
          <li>
            Ajout à la{" "}
            <a
              href="/legal/ads-library"
              target="_blank"
              className="underline"
            >
              bibliothèque publique d&apos;annonces
            </a>{" "}
            (DSA art. 39).
          </li>
        </ul>
      </div>

      {validationWarnings.length > 0 ? (
        <div className="rounded-2xl bg-amber-50 border border-amber-200 p-4 text-[12.5px] text-amber-900">
          <p className="font-bold mb-1.5 flex items-center gap-2">
            <AlertTriangle className="w-3.5 h-3.5" aria-hidden />
            Avertissements
          </p>
          <ul className="list-disc pl-4 space-y-0.5">
            {validationWarnings.map((w) => (
              <li key={w}>{w}</li>
            ))}
          </ul>
        </div>
      ) : null}
    </div>
  );
}

/* ============================================================
 * Compliance score card
 * ============================================================ */

function ComplianceScoreCard({
  score,
  errorCount,
  warningCount,
  okCount,
  checks,
}: {
  score: number;
  errorCount: number;
  warningCount: number;
  okCount: number;
  checks: PreflightCheck[];
}) {
  const tone =
    score >= 90
      ? "emerald"
      : score >= 70
        ? "amber"
        : "red";
  const ringColor =
    tone === "emerald"
      ? "stroke-emerald-500"
      : tone === "amber"
        ? "stroke-amber-500"
        : "stroke-red-500";
  const trackColor =
    tone === "emerald"
      ? "stroke-emerald-100"
      : tone === "amber"
        ? "stroke-amber-100"
        : "stroke-red-100";
  const labelColor =
    tone === "emerald"
      ? "text-emerald-700"
      : tone === "amber"
        ? "text-amber-800"
        : "text-red-700";

  const circumference = 2 * Math.PI * 36;
  const dash = (score / 100) * circumference;

  return (
    <div className="rounded-2xl bg-white border border-line p-4 flex items-start gap-4">
      <div className="relative shrink-0">
        <svg width={88} height={88}>
          <circle
            cx={44}
            cy={44}
            r={36}
            fill="none"
            strokeWidth={6}
            className={trackColor}
          />
          <circle
            cx={44}
            cy={44}
            r={36}
            fill="none"
            strokeWidth={6}
            strokeLinecap="round"
            className={ringColor}
            strokeDasharray={`${dash} ${circumference}`}
            transform="rotate(-90 44 44)"
          />
        </svg>
        <div className="absolute inset-0 flex items-center justify-center flex-col">
          <span className={`text-[20px] font-bold ${labelColor}`}>
            {score}
          </span>
          <span className="text-[9.5px] uppercase tracking-wider font-bold text-night-muted">
            / 100
          </span>
        </div>
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-baseline justify-between gap-2 mb-1">
          <p className="text-[14px] font-bold text-night">
            Score de conformité
          </p>
          <span className={`text-[11.5px] font-bold ${labelColor}`}>
            {score >= 90
              ? "Excellent"
              : score >= 70
                ? "Bon"
                : "À améliorer"}
          </span>
        </div>
        <div className="flex items-center gap-3 text-[11.5px] mb-2">
          <span className="inline-flex items-center gap-1 text-emerald-700">
            <CheckCircle2 className="w-[12px] h-[12px]" aria-hidden />
            {okCount} OK
          </span>
          {warningCount > 0 ? (
            <span className="inline-flex items-center gap-1 text-amber-700">
              <AlertTriangle className="w-[12px] h-[12px]" aria-hidden />
              {warningCount} avert.
            </span>
          ) : null}
          {errorCount > 0 ? (
            <span className="inline-flex items-center gap-1 text-red-700">
              <Flag className="w-[12px] h-[12px]" aria-hidden />
              {errorCount} bloquant
              {errorCount > 1 ? "s" : ""}
            </span>
          ) : null}
        </div>
        <ul className="space-y-0.5">
          {checks
            .filter((c) => c.severity !== "ok")
            .slice(0, 5)
            .map((c, idx) => (
              <li
                key={idx}
                className={`text-[11.5px] flex items-start gap-1.5 ${
                  c.severity === "error"
                    ? "text-red-700"
                    : "text-amber-800"
                }`}
              >
                <span aria-hidden className="mt-0.5 shrink-0">
                  {c.severity === "error" ? "✕" : "⚠"}
                </span>
                <span>{c.message}</span>
              </li>
            ))}
        </ul>
      </div>
    </div>
  );
}

/* ============================================================
 * Sub-components
 * ============================================================ */

function SectionCard({
  icon: Icon,
  title,
  stepId,
  onEdit,
  children,
}: {
  icon: typeof Target;
  title: string;
  stepId: WizardStepId;
  onEdit: (step: WizardStepId) => void;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-2xl bg-white border border-line p-4">
      <div className="flex items-baseline justify-between mb-2">
        <div className="flex items-center gap-1.5">
          <Icon className="w-[14px] h-[14px] text-gold-deep" aria-hidden />
          <p className="text-[13px] font-bold text-night">{title}</p>
        </div>
        <button
          type="button"
          onClick={() => onEdit(stepId)}
          className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10.5px] font-bold text-night-muted hover:text-night hover:bg-bg-soft"
        >
          <Pencil className="w-[10px] h-[10px]" aria-hidden />
          Éditer
        </button>
      </div>
      <div className="space-y-1">{children}</div>
    </div>
  );
}

function MetricCard({
  icon: Icon,
  label,
  value,
  tone,
}: {
  icon: typeof BarChart3;
  label: string;
  value: string;
  tone: "default";
}) {
  return (
    <div className="rounded-2xl bg-white border border-line p-3 flex items-start gap-2.5">
      <span
        aria-hidden
        className="w-8 h-8 rounded-lg bg-gold/15 text-gold-deep flex items-center justify-center shrink-0"
      >
        <Icon className="w-[14px] h-[14px]" aria-hidden />
      </span>
      <div className="min-w-0">
        <p className="text-[10px] uppercase tracking-wider font-bold text-night-muted">
          {label}
        </p>
        <p className="text-[15px] font-bold text-night truncate">{value}</p>
      </div>
    </div>
  );
}

function Row({
  label,
  value,
  accent,
}: {
  label: string;
  value: string;
  accent?: boolean;
}) {
  return (
    <div className="flex items-baseline justify-between gap-2">
      <span className="text-[11px] text-night-muted shrink-0">{label}</span>
      <span
        className={`text-[11.5px] font-semibold text-right truncate min-w-0 ${
          accent ? "text-gold-deep" : "text-night"
        }`}
      >
        {value}
      </span>
    </div>
  );
}

/* ============================================================
 * Pre-flight checks logic
 * ============================================================ */

type PreflightCheck = {
  severity: "ok" | "warning" | "error";
  message: string;
};

function buildPreflightChecks(
  form: CampaignFormState,
  advancedConfig: AdvancedConfig,
  validationErrors: string[],
): PreflightCheck[] {
  const out: PreflightCheck[] = [];

  /* Errors hard from validateTargetingSpec. */
  for (const e of validationErrors) {
    out.push({ severity: "error", message: e });
  }

  /* Required fields. */
  if (form.name.trim().length < 2) {
    out.push({ severity: "error", message: "Nom de campagne manquant." });
  } else {
    out.push({ severity: "ok", message: "Nom valide" });
  }
  if (
    form.budget_type === "daily" &&
    (!form.daily_budget || Number(form.daily_budget) <= 0)
  ) {
    out.push({ severity: "error", message: "Budget quotidien invalide." });
  } else if (
    form.budget_type === "lifetime" &&
    (!form.lifetime_budget || Number(form.lifetime_budget) <= 0)
  ) {
    out.push({ severity: "error", message: "Budget total invalide." });
  } else {
    out.push({ severity: "ok", message: "Budget défini" });
  }
  if (form.placements.length === 0) {
    out.push({ severity: "error", message: "Aucun placement sélectionné." });
  } else {
    out.push({ severity: "ok", message: "Placements OK" });
  }
  if (form.primary_text.trim().length === 0 || form.headline.trim().length === 0) {
    out.push({
      severity: "error",
      message: "Texte principal et titre requis.",
    });
  } else {
    out.push({ severity: "ok", message: "Texte créatif OK" });
  }
  if (!form.media_url) {
    out.push({
      severity: "warning",
      message: "Aucun visuel — l'ad sera moins performante.",
    });
  } else {
    out.push({ severity: "ok", message: "Visuel ajouté" });
  }
  if (!form.destination_url) {
    out.push({
      severity: "warning",
      message: "URL de destination manquante (sauf objectif lead_gen).",
    });
  } else {
    out.push({ severity: "ok", message: "URL destination OK" });
  }
  if (!form.advertiser_entity_id) {
    out.push({
      severity: "error",
      message: "Page représentée requise (DSA art. 26).",
    });
  } else {
    out.push({ severity: "ok", message: "Page représentée OK" });
  }

  /* Recommendations. */
  if (form.objective === "lead_generation" && !form.lead_form) {
    out.push({
      severity: "warning",
      message: "Lead Form recommandé pour cet objectif.",
    });
  }
  if (
    form.special_ad_category &&
    form.brand_safety_filter !== "limited"
  ) {
    out.push({
      severity: "warning",
      message: "Catégorie spéciale → brand safety « Limité » recommandé.",
    });
  }
  if (
    form.attribution_setting === "data_driven" &&
    !advancedConfig.pixel_id
  ) {
    out.push({
      severity: "warning",
      message:
        "Data-driven sans Pixel : fallback last-click 7j auto.",
    });
  }
  if (form.dynamic_creative_enabled && form.dynamic_variants.length === 0) {
    out.push({
      severity: "warning",
      message: "Dynamic Creative activé mais 0 variant — désactive ou ajoute.",
    });
  }
  if (
    advancedConfig.ab_test_enabled &&
    advancedConfig.ab_test_variants_count < 2
  ) {
    out.push({
      severity: "warning",
      message: "A/B test < 2 variants : aucun bench possible.",
    });
  }

  return out;
}

function computeComplianceScore(
  errors: number,
  warnings: number,
  ok: number,
): number {
  const total = errors + warnings + ok;
  if (total === 0) return 0;
  /* Base : ratio OK pondéré, errors -25, warnings -8. */
  const base = (ok / total) * 100;
  const penalty = errors * 25 + warnings * 8;
  return Math.max(0, Math.min(100, Math.round(base - penalty)));
}

/* ============================================================
 * Helpers
 * ============================================================ */

function labelGender(genders: string[]): string {
  if (genders.includes("all")) return "Tous";
  return genders
    .map(
      (g) =>
        ({ male: "H", female: "F", non_binary: "NB" })[g] ?? g,
    )
    .join("+");
}

function labelSpecialCategory(c: string): string {
  return (
    {
      housing: "Logement",
      employment: "Emploi",
      credit: "Crédit",
      social: "Social/politique",
    }[c] ?? c
  );
}

function labelBidStrategy(s: string): string {
  return (
    {
      lowest_cost: "Coût le plus bas",
      cost_cap: "Cost cap",
      bid_cap: "Bid cap",
      target_cost: "Target cost",
      target_roas: "Target ROAS",
      minimum_roas: "Minimum ROAS",
    }[s] ?? s
  );
}

function labelAttribution(s: string): string {
  return (
    {
      last_click_7d: "Last-click 7j",
      last_click_1d: "Last-click 1j",
      linear_7d: "Linéaire 7j",
      linear_28d: "Linéaire 28j",
      position_based_7d: "Position-based",
      time_decay_7d: "Time decay",
      data_driven: "Data-driven",
      view_through_1d: "View-through",
    }[s] ?? s
  );
}

function labelCTA(s: string): string {
  return (
    {
      learn_more: "En savoir plus",
      shop_now: "Acheter",
      sign_up: "S'inscrire",
      subscribe: "S'abonner",
      download: "Télécharger",
      contact_us: "Nous contacter",
      book_now: "Réserver",
      apply_now: "Postuler",
      get_quote: "Devis",
      get_offer: "Voir l'offre",
      send_message: "Message",
    }[s] ?? s
  );
}

function formatCompact(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}k`;
  return String(n);
}
