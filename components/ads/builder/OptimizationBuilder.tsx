"use client";

import {
  Activity,
  AlertTriangle,
  ArrowDownUp,
  Bell,
  Calculator,
  CheckCircle2,
  Clock4,
  GitBranch,
  Layers,
  LineChart,
  PieChart,
  Settings2,
  Sparkles,
  Timer,
  Wallet,
  Zap,
} from "lucide-react";

/* OptimizationBuilder — Attribution + CBO/ABO + Frequency cap templates,
 * inspiré Meta Ads Manager + Google Ads attribution.
 *
 * Sections :
 *   A. Attribution model (8 options) avec windows configurables
 *   B. Budget optimization mode (CBO vs ABO) avec explainer
 *   C. Frequency cap templates (4 presets + custom)
 */

type AttributionId =
  | "last_click_7d"
  | "last_click_1d"
  | "linear_7d"
  | "linear_28d"
  | "position_based_7d"
  | "time_decay_7d"
  | "data_driven"
  | "view_through_1d";

const ATTRIBUTION_MODELS: Array<{
  id: AttributionId;
  label: string;
  badge?: string;
  desc: string;
  icon: typeof LineChart;
  best_for: string;
}> = [
  {
    id: "last_click_7d",
    label: "Last-click 7j",
    badge: "Défaut",
    desc: "100 % au dernier clic dans les 7 jours.",
    icon: Activity,
    best_for: "Direct response, conversions",
  },
  {
    id: "last_click_1d",
    label: "Last-click 1j",
    desc: "100 % au dernier clic dans les 24h.",
    icon: Activity,
    best_for: "Achat impulsif, retargeting",
  },
  {
    id: "linear_7d",
    label: "Linéaire 7j",
    desc: "Crédit réparti à parts égales sur tous les clics.",
    icon: ArrowDownUp,
    best_for: "Funnel multi-touch court",
  },
  {
    id: "linear_28d",
    label: "Linéaire 28j",
    desc: "Crédit réparti sur fenêtre longue (B2B, considéré).",
    icon: ArrowDownUp,
    best_for: "B2B, achat long",
  },
  {
    id: "position_based_7d",
    label: "Position 40-40-20",
    desc: "40 % premier + 40 % dernier + 20 % milieu.",
    icon: PieChart,
    best_for: "Discovery + closing",
  },
  {
    id: "time_decay_7d",
    label: "Time decay 7j",
    desc: "Crédit ↑ vers le dernier touchpoint (demi-vie 7j).",
    icon: Timer,
    best_for: "Path récent prioritaire",
  },
  {
    id: "data_driven",
    label: "Data-driven",
    badge: "IA",
    desc: "Modèle ML calibré sur tes conversions historiques.",
    icon: Sparkles,
    best_for: "≥ 600 conversions / 30j",
  },
  {
    id: "view_through_1d",
    label: "View-through 1j",
    desc: "Crédit aux impressions vues, pas seulement clics.",
    icon: LineChart,
    best_for: "Brand awareness, video",
  },
];

const FREQUENCY_TEMPLATES: Array<{
  id: "awareness" | "standard" | "conversion" | "low_pressure" | "custom";
  label: string;
  max: number;
  period: number;
  desc: string;
  icon: typeof Bell;
}> = [
  {
    id: "low_pressure",
    label: "Faible pression",
    max: 1,
    period: 30,
    desc: "1 expo / 30j — idéal awareness premium, brand love.",
    icon: Bell,
  },
  {
    id: "awareness",
    label: "Awareness",
    max: 1,
    period: 1,
    desc: "1 expo / jour — couverture large sans saturer.",
    icon: Bell,
  },
  {
    id: "standard",
    label: "Standard",
    max: 3,
    period: 7,
    desc: "3 expo / 7j — équilibre rappel / fatigue.",
    icon: Bell,
  },
  {
    id: "conversion",
    label: "Conversion lourde",
    max: 5,
    period: 14,
    desc: "5 expo / 14j — push achat / inscription.",
    icon: Zap,
  },
];

type Props = {
  /* Attribution. */
  attributionSetting: AttributionId;
  onAttributionSettingChange: (next: AttributionId) => void;
  attributionWindowClickDays: 1 | 7 | 28;
  onAttributionWindowClickDaysChange: (next: 1 | 7 | 28) => void;
  attributionWindowViewDays: 1 | 7;
  onAttributionWindowViewDaysChange: (next: 1 | 7) => void;
  /* Budget mode. */
  budgetOptimizationMode: "cbo" | "abo";
  onBudgetOptimizationModeChange: (next: "cbo" | "abo") => void;
  /* Frequency. */
  frequencyCapTemplate:
    | "awareness"
    | "standard"
    | "conversion"
    | "low_pressure"
    | "custom";
  onFrequencyCapTemplateChange: (
    next: "awareness" | "standard" | "conversion" | "low_pressure" | "custom",
    presetMax?: string,
    presetPeriod?: string,
  ) => void;
  frequencyMax: string;
  onFrequencyMaxChange: (next: string) => void;
  frequencyPeriodDays: string;
  onFrequencyPeriodDaysChange: (next: string) => void;
  /* Pacing (delivery_type) en lecture/édition rapide. */
  deliveryType: "standard" | "accelerated";
  onDeliveryTypeChange: (next: "standard" | "accelerated") => void;
};

export function OptimizationBuilder(props: Props) {
  const {
    attributionSetting,
    onAttributionSettingChange,
    attributionWindowClickDays,
    onAttributionWindowClickDaysChange,
    attributionWindowViewDays,
    onAttributionWindowViewDaysChange,
    budgetOptimizationMode,
    onBudgetOptimizationModeChange,
    frequencyCapTemplate,
    onFrequencyCapTemplateChange,
    frequencyMax,
    onFrequencyMaxChange,
    frequencyPeriodDays,
    onFrequencyPeriodDaysChange,
    deliveryType,
    onDeliveryTypeChange,
  } = props;

  return (
    <div className="space-y-5">
      {/* === A. Attribution model === */}
      <div>
        <div className="flex items-baseline gap-2 mb-2">
          <h3 className="text-[14px] font-bold text-night flex items-center gap-1.5">
            <LineChart className="w-[14px] h-[14px] text-gold-deep" aria-hidden />
            Modèle d&apos;attribution
          </h3>
          <span className="text-[10.5px] text-night-muted">
            Comment crédit les conversions entre tes touchpoints
          </span>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {ATTRIBUTION_MODELS.map((m) => {
            const active = attributionSetting === m.id;
            const Icon = m.icon;
            return (
              <button
                key={m.id}
                type="button"
                onClick={() => onAttributionSettingChange(m.id)}
                className={`relative text-left p-3 rounded-xl border transition-colors ${
                  active
                    ? "border-night bg-night/[0.03]"
                    : "border-line bg-white hover:border-night/30"
                }`}
                aria-pressed={active}
              >
                {m.badge ? (
                  <span
                    className={`absolute top-2 right-2 text-[9.5px] uppercase tracking-wider font-bold px-1.5 py-0.5 rounded-full ${
                      m.badge === "IA"
                        ? "bg-gold/20 text-gold-deep"
                        : "bg-night/10 text-night-muted"
                    }`}
                  >
                    {m.badge}
                  </span>
                ) : null}
                <div className="flex items-start gap-2.5">
                  <span
                    aria-hidden
                    className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${
                      active
                        ? "bg-night text-cream"
                        : "bg-gold/15 text-gold-deep"
                    }`}
                  >
                    <Icon className="w-[15px] h-[15px]" aria-hidden />
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-baseline gap-1.5">
                      <span className="text-[12.5px] font-bold text-night">
                        {m.label}
                      </span>
                      {active ? (
                        <CheckCircle2
                          className="w-[12px] h-[12px] text-emerald-600 shrink-0"
                          aria-hidden
                        />
                      ) : null}
                    </div>
                    <p className="text-[10.5px] text-night-muted leading-snug">
                      {m.desc}
                    </p>
                    <p className="text-[10px] text-night-muted mt-1">
                      <span className="font-semibold">Idéal :</span> {m.best_for}
                    </p>
                  </div>
                </div>
              </button>
            );
          })}
        </div>
        {attributionSetting === "data_driven" ? (
          <div className="mt-2 rounded-lg bg-amber-50 border border-amber-200 p-2.5 text-[11.5px] text-amber-900">
            <AlertTriangle
              className="inline w-[12px] h-[12px] mr-1"
              aria-hidden
            />
            Data-driven nécessite ≥ 600 conversions / 30j sur le pixel.
            Sinon, fallback last-click 7j auto.
          </div>
        ) : null}

        {/* Attribution windows. */}
        <div className="mt-3 grid grid-cols-2 gap-2">
          <div className="rounded-xl bg-white border border-line p-3">
            <p className="text-[10.5px] font-bold uppercase tracking-wider text-night-muted mb-2">
              <Clock4 className="inline w-[10px] h-[10px] mr-1" aria-hidden />
              Fenêtre clic
            </p>
            <div className="inline-flex items-center gap-1 rounded-full border border-line bg-white p-0.5">
              {([1, 7, 28] as const).map((d) => (
                <button
                  key={d}
                  type="button"
                  onClick={() => onAttributionWindowClickDaysChange(d)}
                  className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold ${
                    attributionWindowClickDays === d
                      ? "bg-night text-cream"
                      : "text-night-muted hover:bg-bg-soft"
                  }`}
                >
                  {d}j
                </button>
              ))}
            </div>
          </div>
          <div className="rounded-xl bg-white border border-line p-3">
            <p className="text-[10.5px] font-bold uppercase tracking-wider text-night-muted mb-2">
              <Clock4 className="inline w-[10px] h-[10px] mr-1" aria-hidden />
              Fenêtre vue
            </p>
            <div className="inline-flex items-center gap-1 rounded-full border border-line bg-white p-0.5">
              {([1, 7] as const).map((d) => (
                <button
                  key={d}
                  type="button"
                  onClick={() => onAttributionWindowViewDaysChange(d)}
                  className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold ${
                    attributionWindowViewDays === d
                      ? "bg-night text-cream"
                      : "text-night-muted hover:bg-bg-soft"
                  }`}
                >
                  {d}j
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* === B. Budget Optimization Mode === */}
      <div>
        <div className="flex items-baseline gap-2 mb-2">
          <h3 className="text-[14px] font-bold text-night flex items-center gap-1.5">
            <Wallet className="w-[14px] h-[14px] text-gold-deep" aria-hidden />
            Mode d&apos;optimisation budget
          </h3>
          <span className="text-[10.5px] text-night-muted">
            CBO = auto · ABO = manuel
          </span>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          <button
            type="button"
            onClick={() => onBudgetOptimizationModeChange("cbo")}
            className={`text-left p-4 rounded-xl border transition-colors ${
              budgetOptimizationMode === "cbo"
                ? "border-night bg-night/[0.03]"
                : "border-line bg-white hover:border-night/30"
            }`}
            aria-pressed={budgetOptimizationMode === "cbo"}
          >
            <div className="flex items-baseline gap-2 mb-1">
              <Layers
                className={`w-[14px] h-[14px] ${
                  budgetOptimizationMode === "cbo"
                    ? "text-night"
                    : "text-night-muted"
                }`}
                aria-hidden
              />
              <span className="text-[13px] font-bold text-night">
                CBO — Campaign Budget Optimization
              </span>
              {budgetOptimizationMode === "cbo" ? (
                <CheckCircle2
                  className="w-[12px] h-[12px] text-emerald-600 ml-auto"
                  aria-hidden
                />
              ) : null}
            </div>
            <p className="text-[11.5px] text-night-muted leading-snug">
              Budget unique au niveau campagne, distribué automatiquement
              entre les ad sets selon les perfs en temps réel.
            </p>
            <ul className="mt-2 text-[10.5px] text-night-soft list-disc pl-4 space-y-0.5">
              <li>+ Auto-rebalancing</li>
              <li>+ Idéal multi-audiences / multi-créa</li>
              <li>− Moins de contrôle manuel</li>
            </ul>
          </button>

          <button
            type="button"
            onClick={() => onBudgetOptimizationModeChange("abo")}
            className={`text-left p-4 rounded-xl border transition-colors ${
              budgetOptimizationMode === "abo"
                ? "border-night bg-night/[0.03]"
                : "border-line bg-white hover:border-night/30"
            }`}
            aria-pressed={budgetOptimizationMode === "abo"}
          >
            <div className="flex items-baseline gap-2 mb-1">
              <GitBranch
                className={`w-[14px] h-[14px] ${
                  budgetOptimizationMode === "abo"
                    ? "text-night"
                    : "text-night-muted"
                }`}
                aria-hidden
              />
              <span className="text-[13px] font-bold text-night">
                ABO — Ad Set Budget Optimization
              </span>
              {budgetOptimizationMode === "abo" ? (
                <CheckCircle2
                  className="w-[12px] h-[12px] text-emerald-600 ml-auto"
                  aria-hidden
                />
              ) : null}
            </div>
            <p className="text-[11.5px] text-night-muted leading-snug">
              Budget fixé par ad set. Tu gardes le contrôle total sur
              l&apos;allocation par audience / placement.
            </p>
            <ul className="mt-2 text-[10.5px] text-night-soft list-disc pl-4 space-y-0.5">
              <li>+ Contrôle granulaire</li>
              <li>+ Bench A/B propre</li>
              <li>− Pas d&apos;auto-réallocation</li>
            </ul>
          </button>
        </div>
      </div>

      {/* === C. Pacing === */}
      <div>
        <div className="flex items-baseline gap-2 mb-2">
          <h3 className="text-[14px] font-bold text-night flex items-center gap-1.5">
            <ArrowDownUp
              className="w-[14px] h-[14px] text-gold-deep"
              aria-hidden
            />
            Rythme de diffusion (pacing)
          </h3>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          <button
            type="button"
            onClick={() => onDeliveryTypeChange("standard")}
            className={`text-left p-3 rounded-xl border ${
              deliveryType === "standard"
                ? "border-night bg-night/[0.03]"
                : "border-line bg-white hover:border-night/30"
            }`}
            aria-pressed={deliveryType === "standard"}
          >
            <div className="flex items-baseline gap-2">
              <Calculator className="w-[14px] h-[14px] text-night-muted" aria-hidden />
              <span className="text-[12.5px] font-bold text-night">
                Standard
              </span>
              {deliveryType === "standard" ? (
                <CheckCircle2
                  className="w-[12px] h-[12px] text-emerald-600 ml-auto"
                  aria-hidden
                />
              ) : null}
            </div>
            <p className="text-[10.5px] text-night-muted mt-1 leading-snug">
              Budget lissé sur la journée. Évite la fatigue, recommandé.
            </p>
          </button>
          <button
            type="button"
            onClick={() => onDeliveryTypeChange("accelerated")}
            className={`text-left p-3 rounded-xl border ${
              deliveryType === "accelerated"
                ? "border-night bg-night/[0.03]"
                : "border-line bg-white hover:border-night/30"
            }`}
            aria-pressed={deliveryType === "accelerated"}
          >
            <div className="flex items-baseline gap-2">
              <Zap className="w-[14px] h-[14px] text-night-muted" aria-hidden />
              <span className="text-[12.5px] font-bold text-night">
                Accéléré
              </span>
              {deliveryType === "accelerated" ? (
                <CheckCircle2
                  className="w-[12px] h-[12px] text-emerald-600 ml-auto"
                  aria-hidden
                />
              ) : null}
            </div>
            <p className="text-[10.5px] text-night-muted mt-1 leading-snug">
              Dépense max ASAP. Idéal events flash, ventes 24h.
            </p>
          </button>
        </div>
      </div>

      {/* === D. Frequency cap templates === */}
      <div>
        <div className="flex items-baseline gap-2 mb-2">
          <h3 className="text-[14px] font-bold text-night flex items-center gap-1.5">
            <Bell className="w-[14px] h-[14px] text-gold-deep" aria-hidden />
            Plafond de fréquence
          </h3>
          <span className="text-[10.5px] text-night-muted">
            Combien d&apos;expositions max par utilisateur
          </span>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-2">
          {FREQUENCY_TEMPLATES.map((t) => {
            const active = frequencyCapTemplate === t.id;
            const Icon = t.icon;
            return (
              <button
                key={t.id}
                type="button"
                onClick={() =>
                  onFrequencyCapTemplateChange(
                    t.id,
                    String(t.max),
                    String(t.period),
                  )
                }
                className={`text-left p-3 rounded-xl border transition-colors ${
                  active
                    ? "border-night bg-night/[0.03]"
                    : "border-line bg-white hover:border-night/30"
                }`}
                aria-pressed={active}
              >
                <div className="flex items-baseline gap-1.5 mb-1">
                  <Icon
                    className={`w-[12px] h-[12px] ${
                      active ? "text-night" : "text-night-muted"
                    }`}
                    aria-hidden
                  />
                  <span className="text-[12px] font-bold text-night">
                    {t.label}
                  </span>
                  {active ? (
                    <CheckCircle2
                      className="w-[11px] h-[11px] text-emerald-600 ml-auto"
                      aria-hidden
                    />
                  ) : null}
                </div>
                <p className="text-[10.5px] text-night-muted">
                  <span className="font-bold text-night">
                    {t.max}
                  </span>{" "}
                  / {t.period} {t.period === 1 ? "jour" : "jours"}
                </p>
                <p className="text-[10px] text-night-muted leading-snug mt-0.5">
                  {t.desc}
                </p>
              </button>
            );
          })}
        </div>

        {/* Custom override. */}
        <button
          type="button"
          onClick={() => onFrequencyCapTemplateChange("custom")}
          className={`w-full text-left p-3 rounded-xl border ${
            frequencyCapTemplate === "custom"
              ? "border-night bg-night/[0.03]"
              : "border-line bg-white hover:border-night/30"
          }`}
          aria-pressed={frequencyCapTemplate === "custom"}
        >
          <div className="flex items-baseline gap-2 mb-1">
            <Settings2
              className={`w-[12px] h-[12px] ${
                frequencyCapTemplate === "custom"
                  ? "text-night"
                  : "text-night-muted"
              }`}
              aria-hidden
            />
            <span className="text-[12px] font-bold text-night">
              Personnalisé
            </span>
          </div>
        </button>

        {frequencyCapTemplate === "custom" ? (
          <div className="grid grid-cols-2 gap-2 mt-2">
            <div>
              <label className="block text-[10.5px] font-bold uppercase tracking-wider text-night-muted mb-1">
                Max impressions
              </label>
              <input
                type="number"
                value={frequencyMax}
                onChange={(e) => onFrequencyMaxChange(e.target.value)}
                min={1}
                max={50}
                className="w-full px-3 py-2 rounded-lg border border-line bg-white text-[12.5px]"
              />
            </div>
            <div>
              <label className="block text-[10.5px] font-bold uppercase tracking-wider text-night-muted mb-1">
                Période (jours)
              </label>
              <input
                type="number"
                value={frequencyPeriodDays}
                onChange={(e) => onFrequencyPeriodDaysChange(e.target.value)}
                min={1}
                max={30}
                className="w-full px-3 py-2 rounded-lg border border-line bg-white text-[12.5px]"
              />
            </div>
          </div>
        ) : null}

        <p className="mt-2 text-[10.5px] text-night-muted leading-snug">
          Le plafond global compte sur la fenêtre indiquée. Au-delà,
          l&apos;ad ne sera plus servie à l&apos;utilisateur.
        </p>
      </div>
    </div>
  );
}
