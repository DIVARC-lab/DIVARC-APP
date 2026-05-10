"use client";

import {
  AlertTriangle,
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  Sparkles,
} from "lucide-react";
import { useEffect, useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { AdPreview } from "@/components/ads/AdPreview";
import { AudienceBuilder } from "@/components/ads/builder/AudienceBuilder";
import {
  AdvancedConfigSection,
  DEFAULT_ADVANCED_CONFIG,
  type AdvancedConfig,
} from "@/components/ads/builder/AdvancedConfigSection";
import { createFullCampaign } from "@/app/(app)/ads-manager/[accountId]/campaigns/new/actions";
import {
  ALWAYS_FORBIDDEN_AD_CATEGORIES,
  AGE_GATED_18PLUS_CATEGORIES,
  CATEGORY_DISCLAIMERS,
  REQUIRES_CERTIFICATION_CATEGORIES,
  validateTargetingSpec,
  type TargetingSpec,
} from "@/lib/ads/types";
import { AudienceMeter } from "./AudienceMeter";
import { BudgetEstimator } from "./BudgetEstimator";
import {
  OBJECTIVE_BY_ID,
  OBJECTIVE_CATALOG,
  type ObjectiveDef,
} from "./objectives";
import { DEFAULT_FORM, type CampaignFormState, type Entity, type WizardStepId } from "./types";
import { WizardProgress, WIZARD_STEPS } from "./WizardProgress";

/* CampaignBuilderPro — wizard 5 étapes inspiré Meta Ads Manager
 * + Google Ads + LinkedIn Campaign Manager.
 *
 * Layout :
 *   - Header : progress bar 5 étapes (cliquables si déjà visitées)
 *   - Body desktop : split view
 *       Colonne main (flex-1) : formulaire de l'étape courante
 *       Colonne preview (380px sticky) : AdPreview live + estimations
 *   - Footer : navigation Back/Next + Submit final
 *
 * Storage : auto-save dans localStorage à chaque change pour ne pas
 * perdre la progression sur reload accidentel. La key inclut l'accountId.
 */

type Props = {
  accountId: string;
  currency: string;
  entities: Entity[];
};

export function CampaignBuilderPro({ accountId, currency, entities }: Props) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [step, setStep] = useState<WizardStepId>("objective");
  const [completed, setCompleted] = useState<WizardStepId[]>([]);
  const [form, setForm] = useState<CampaignFormState>(() => ({
    ...DEFAULT_FORM,
    advertiser_entity_id: entities[0]?.id ?? "",
    name: defaultCampaignName(),
  }));
  /* Audience estimation cache pour éviter de spammer l'API. */
  const [audienceEstimate, setAudienceEstimate] = useState<number | null>(null);
  const [estimating, setEstimating] = useState(false);

  /* Configuration avancée (Mode Expert pro). Default = OFF, l'user
     déplie la section et ajuste si besoin. */
  const [advancedConfig, setAdvancedConfig] = useState<AdvancedConfig>(
    DEFAULT_ADVANCED_CONFIG,
  );

  /* === Auto-save localStorage === */
  const storageKey = `divarc-campaign-draft-${accountId}`;
  useEffect(() => {
    try {
      const saved = localStorage.getItem(storageKey);
      if (saved) {
        const parsed = JSON.parse(saved);
        setForm((f) => ({
          ...f,
          ...parsed,
          /* Force entity valide. */
          advertiser_entity_id:
            entities.find((e) => e.id === parsed.advertiser_entity_id)?.id ??
            entities[0]?.id ??
            "",
        }));
      }
    } catch {
      /* Ignore JSON parse errors on stale data. */
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  useEffect(() => {
    try {
      localStorage.setItem(storageKey, JSON.stringify(form));
    } catch {
      /* QuotaExceeded silencieux — V2 : compresser. */
    }
  }, [form, storageKey]);

  /* === Build TargetingSpec depuis form (helper partagé estim + submit). === */
  const targetingSpec: TargetingSpec = useMemo(
    () => buildTargetingSpec(form),
    [form],
  );

  /* === Estimation audience live (debounce 500ms) === */
  useEffect(() => {
    const timer = setTimeout(() => {
      void estimateAudience();
    }, 500);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    form.age_min,
    form.age_max,
    form.genders,
    form.countries,
    form.cities,
    form.postal_codes,
    form.custom_locations,
    form.interests,
    form.interests_logic,
    form.behaviors,
    form.languages,
    form.custom_audience_ids,
    form.lookalike_audience_ids,
    accountId,
  ]);

  async function estimateAudience() {
    setEstimating(true);
    try {
      const res = await fetch("/api/ads/audiences/estimate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ad_account_id: accountId,
          targeting: targetingSpec,
        }),
      });
      if (res.ok) {
        const data = await res.json();
        if (data.too_specific) {
          setAudienceEstimate(0);
        } else {
          /* Parser size_range "10K-50K" → midpoint. */
          const size = parseSizeRange(data.size_range);
          setAudienceEstimate(size);
        }
      } else {
        setAudienceEstimate(null);
      }
    } catch {
      setAudienceEstimate(null);
    } finally {
      setEstimating(false);
    }
  }

  /* === Validation par étape === */
  const objectiveDef = OBJECTIVE_BY_ID[form.objective];
  const isForbidden = (
    ALWAYS_FORBIDDEN_AD_CATEGORIES as readonly string[]
  ).includes(form.ad_category_hint);
  const isAgeGated = (AGE_GATED_18PLUS_CATEGORIES as readonly string[]).includes(
    form.ad_category_hint,
  );
  const requiresCert = (
    REQUIRES_CERTIFICATION_CATEGORIES as readonly string[]
  ).includes(form.ad_category_hint);

  const targetingValidation = useMemo(
    () =>
      validateTargetingSpec(
        targetingSpec,
        (form.special_ad_category || null) as
          | "housing"
          | "employment"
          | "credit"
          | "social"
          | null,
      ),
    [targetingSpec, form.special_ad_category],
  );

  function isStepValid(s: WizardStepId): boolean {
    switch (s) {
      case "objective":
        return form.objective.length > 0 && !isForbidden;
      case "audience":
        return (
          form.name.length >= 2 &&
          targetingValidation.valid &&
          form.countries.length > 0
        );
      case "budget":
        return (
          Number(form.daily_budget) > 0 &&
          form.placements.length > 0 &&
          form.optimization_goal.length > 0
        );
      case "creative":
        return (
          form.primary_text.length > 0 &&
          form.headline.length > 0 &&
          form.advertiser_entity_id.length > 0
        );
      case "review":
        return true;
    }
  }

  function next() {
    if (!isStepValid(step)) {
      toast.error("Complète cette étape avant de continuer.");
      return;
    }
    if (!completed.includes(step)) {
      setCompleted((c) => [...c, step]);
    }
    const idx = WIZARD_STEPS.findIndex((s) => s.id === step);
    if (idx < WIZARD_STEPS.length - 1) {
      setStep(WIZARD_STEPS[idx + 1]!.id);
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  }
  function back() {
    const idx = WIZARD_STEPS.findIndex((s) => s.id === step);
    if (idx > 0) {
      setStep(WIZARD_STEPS[idx - 1]!.id);
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  }

  function setFormVal<K extends keyof CampaignFormState>(
    key: K,
    val: CampaignFormState[K],
  ) {
    setForm((f) => ({ ...f, [key]: val }));
  }

  /* Quand on choisit un objectif → présélectionne l'opti goal + billing event. */
  function selectObjective(obj: ObjectiveDef) {
    setForm((f) => ({
      ...f,
      objective: obj.id,
      optimization_goal: obj.defaultOptimizationGoal,
      billing_event: obj.defaultBillingEvent,
    }));
  }

  /* === Submit final === */
  function submit() {
    if (!targetingValidation.valid) {
      toast.error(targetingValidation.errors[0] ?? "Ciblage non conforme.");
      return;
    }
    if (isForbidden) {
      toast.error(`Catégorie "${form.ad_category_hint}" interdite à la publicité.`);
      return;
    }

    startTransition(async () => {
      /* Override schedule via advancedConfig.start_datetime/end_datetime
         si renseigné — datetime-local format → ISO. */
      const startISO = advancedConfig.start_datetime
        ? new Date(advancedConfig.start_datetime).toISOString()
        : form.start_date
          ? new Date(form.start_date).toISOString()
          : undefined;
      const endISO = advancedConfig.end_datetime
        ? new Date(advancedConfig.end_datetime).toISOString()
        : form.end_date
          ? new Date(form.end_date).toISOString()
          : undefined;

      const advBidStrategy = advancedConfig.bid_strategy || form.bid_strategy;

      const result = await createFullCampaign({
        ad_account_id: accountId,
        objective: form.objective as Parameters<typeof createFullCampaign>[0]["objective"],
        name: form.name,
        daily_budget:
          form.budget_type === "daily" ? Number(form.daily_budget) : undefined,
        lifetime_budget:
          form.budget_type === "lifetime"
            ? Number(form.lifetime_budget)
            : undefined,
        special_ad_category: form.special_ad_category
          ? (form.special_ad_category as
              | "housing"
              | "employment"
              | "credit"
              | "social")
          : undefined,
        start_time: startISO,
        end_time: endISO,
        targeting: targetingSpec,
        placements: form.placements as Parameters<
          typeof createFullCampaign
        >[0]["placements"],
        bid_strategy: advBidStrategy as Parameters<
          typeof createFullCampaign
        >[0]["bid_strategy"],
        bid_amount: advancedConfig.bid_amount
          ? Number(advancedConfig.bid_amount)
          : undefined,
        target_roas: advancedConfig.target_roas
          ? Number(advancedConfig.target_roas)
          : undefined,
        minimum_roas: advancedConfig.minimum_roas
          ? Number(advancedConfig.minimum_roas)
          : undefined,
        cost_cap: advancedConfig.cost_cap
          ? Number(advancedConfig.cost_cap)
          : undefined,
        bid_cap: advancedConfig.bid_cap
          ? Number(advancedConfig.bid_cap)
          : undefined,
        spend_cap_lifetime: advancedConfig.spend_cap_lifetime
          ? Number(advancedConfig.spend_cap_lifetime)
          : undefined,
        delivery_type: advancedConfig.delivery_type,
        dayparting: advancedConfig.dayparting ?? undefined,
        ab_test_enabled: advancedConfig.ab_test_enabled,
        ab_test_variable: advancedConfig.ab_test_enabled
          ? advancedConfig.ab_test_variable
          : undefined,
        ab_test_variants_count: advancedConfig.ab_test_enabled
          ? advancedConfig.ab_test_variants_count
          : undefined,
        ab_test_min_days: advancedConfig.ab_test_enabled
          ? advancedConfig.ab_test_min_days
          : undefined,
        ab_test_metric: advancedConfig.ab_test_enabled
          ? advancedConfig.ab_test_metric
          : undefined,
        pixel_id: advancedConfig.pixel_id || undefined,
        utm_source: advancedConfig.utm_source || undefined,
        utm_medium: advancedConfig.utm_medium || undefined,
        utm_campaign: advancedConfig.utm_campaign || undefined,
        optimization_goal: form.optimization_goal as Parameters<
          typeof createFullCampaign
        >[0]["optimization_goal"],
        billing_event: form.billing_event as Parameters<
          typeof createFullCampaign
        >[0]["billing_event"],
        frequency_max: form.frequency_max ? Number(form.frequency_max) : undefined,
        frequency_period_days: form.frequency_period_days
          ? Number(form.frequency_period_days)
          : undefined,
        creative_type: form.creative_type as Parameters<
          typeof createFullCampaign
        >[0]["creative_type"],
        primary_text: form.primary_text,
        headline: form.headline,
        description: form.description || undefined,
        media_url: form.media_url || undefined,
        destination_url: form.destination_url || undefined,
        call_to_action: form.call_to_action,
        advertiser_entity_id: form.advertiser_entity_id,
        ad_category_hint: form.ad_category_hint || undefined,
      });
      if (!result.ok) {
        toast.error(
          result.error +
            (result.validation_errors?.length
              ? ` — ${result.validation_errors[0]}`
              : ""),
        );
        return;
      }
      try {
        localStorage.removeItem(storageKey);
      } catch {
        /* Ignore quota errors silently. */
      }
      toast.success("Campagne créée. En attente de revue conformité.");
      router.push(`/ads-manager/${accountId}`);
    });
  }

  /* === Layout === */
  return (
    <div className="space-y-6">
      {/* Progress bar sticky en haut */}
      <div className="sticky top-0 z-20 -mx-5 sm:mx-0 px-5 sm:px-0 py-4 bg-bg-soft/95 backdrop-blur-sm border-b border-line">
        <WizardProgress
          current={step}
          completed={completed}
          onJump={(id) => setStep(id)}
        />
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-[1fr_380px] gap-6">
        {/* Main form column */}
        <div className="min-w-0">
          {step === "objective" ? (
            <ObjectiveStep
              form={form}
              setFormVal={setFormVal}
              selectObjective={selectObjective}
              isForbidden={isForbidden}
              isAgeGated={isAgeGated}
              requiresCert={requiresCert}
            />
          ) : null}

          {step === "audience" ? (
            <AudienceStep
              form={form}
              setFormVal={setFormVal}
              setForm={setForm}
              targetingValidation={targetingValidation}
              accountId={accountId}
              audienceEstimate={audienceEstimate}
              estimating={estimating}
            />
          ) : null}

          {step === "budget" ? (
            <BudgetStep
              form={form}
              setFormVal={setFormVal}
              currency={currency}
              objectiveDef={objectiveDef}
              advancedConfig={advancedConfig}
              onAdvancedChange={setAdvancedConfig}
            />
          ) : null}

          {step === "creative" ? (
            <CreativeStep
              form={form}
              setFormVal={setFormVal}
              entities={entities}
            />
          ) : null}

          {step === "review" ? (
            <ReviewStep
              form={form}
              currency={currency}
              objectiveDef={objectiveDef}
              estimatedAudience={audienceEstimate}
            />
          ) : null}

          {/* Nav footer */}
          <div className="mt-8 flex items-center justify-between gap-3">
            <button
              type="button"
              onClick={back}
              disabled={step === "objective" || pending}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full text-night-muted hover:text-night text-[13px] font-semibold disabled:opacity-30"
            >
              <ArrowLeft className="w-4 h-4" aria-hidden />
              Retour
            </button>
            {step === "review" ? (
              <button
                type="button"
                onClick={submit}
                disabled={pending || isForbidden || !targetingValidation.valid}
                className="inline-flex items-center gap-2 px-6 py-3 rounded-full bg-night text-cream text-[14px] font-semibold disabled:opacity-50 hover:bg-night/90 shadow-soft"
              >
                {pending ? "Création…" : "Créer la campagne"}
                <Sparkles className="w-4 h-4" aria-hidden />
              </button>
            ) : (
              <button
                type="button"
                onClick={next}
                disabled={!isStepValid(step) || pending}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-night text-cream text-[13px] font-semibold disabled:opacity-50 hover:bg-night/90"
              >
                Continuer
                <ArrowRight className="w-4 h-4" aria-hidden />
              </button>
            )}
          </div>
        </div>

        {/* Sticky sidebar — preview + estimations */}
        <aside className="xl:sticky xl:top-32 xl:max-h-[calc(100vh-180px)] xl:overflow-y-auto space-y-4">
          {step === "audience" || step === "budget" || step === "review" ? (
            <>
              <AudienceMeter estimatedSize={audienceEstimate} />
              {form.daily_budget && audienceEstimate ? (
                <BudgetEstimator
                  dailyBudget={Number(form.daily_budget)}
                  audienceSize={audienceEstimate}
                  optimizationGoal={form.optimization_goal}
                />
              ) : null}
            </>
          ) : null}

          {step === "creative" || step === "review" ? (
            <div className="rounded-xl bg-white border border-line p-3">
              <p className="text-[10.5px] uppercase tracking-wider font-bold text-night-muted mb-3">
                Aperçu live
              </p>
              <AdPreview
                primaryText={form.primary_text}
                headline={form.headline}
                description={form.description}
                mediaUrl={form.media_url}
                callToAction={form.call_to_action}
                advertiserName={
                  entities.find((e) => e.id === form.advertiser_entity_id)
                    ?.name ?? "Annonceur"
                }
                autoDisclaimer={
                  form.ad_category_hint
                    ? CATEGORY_DISCLAIMERS[form.ad_category_hint] ?? null
                    : null
                }
                selectedPlacements={form.placements.slice(0, 1)}
              />
            </div>
          ) : null}

          {estimating ? (
            <p className="text-[11px] text-night-muted italic flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-gold-deep animate-pulse" />
              Recalcul en cours…
            </p>
          ) : null}
        </aside>
      </div>
    </div>
  );
}

/* ============================================================
 * Step components
 * ============================================================ */

function ObjectiveStep({
  form,
  setFormVal,
  selectObjective,
  isForbidden,
  isAgeGated,
  requiresCert,
}: {
  form: CampaignFormState;
  setFormVal: <K extends keyof CampaignFormState>(
    key: K,
    val: CampaignFormState[K],
  ) => void;
  selectObjective: (obj: ObjectiveDef) => void;
  isForbidden: boolean;
  isAgeGated: boolean;
  requiresCert: boolean;
}) {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="font-display text-[28px] sm:text-[32px] leading-tight tracking-[-0.02em] text-night">
          Quel est ton{" "}
          <em className="italic text-gold-deep">objectif</em> ?
        </h2>
        <p className="mt-2 text-[14px] text-night-soft leading-relaxed max-w-2xl">
          Choisis ce que tu veux obtenir avec cette campagne. L&apos;algorithme
          DIVARC va optimiser la diffusion en fonction de ton choix.
        </p>
      </div>

      <div className="space-y-5">
        {OBJECTIVE_CATALOG.map((cat) => (
          <section key={cat.id}>
            <div className="mb-2.5">
              <h3 className="text-[11px] font-extrabold uppercase tracking-[0.16em] text-gold-deep">
                · {cat.label}
              </h3>
              <p className="text-[12.5px] text-night-muted">{cat.description}</p>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {cat.items.map((obj) => {
                const Icon = obj.icon;
                const active = form.objective === obj.id;
                return (
                  <button
                    key={obj.id}
                    type="button"
                    onClick={() => selectObjective(obj)}
                    className={`text-left p-4 rounded-2xl border-2 transition-all ${
                      active
                        ? "border-night bg-night/[0.03] shadow-soft"
                        : "border-line bg-white hover:border-night/30 hover:-translate-y-0.5"
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <span
                        aria-hidden
                        className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${obj.color}`}
                      >
                        <Icon className="w-5 h-5" aria-hidden />
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="text-[14px] font-semibold text-night">
                          {obj.label}
                        </p>
                        <p className="text-[12.5px] text-night-soft mt-1 leading-snug">
                          {obj.description}
                        </p>
                        <p className="text-[11px] text-night-muted mt-2 italic leading-snug">
                          {obj.example}
                        </p>
                      </div>
                      {active ? (
                        <CheckCircle2
                          className="w-4 h-4 text-night shrink-0"
                          aria-hidden
                          strokeWidth={2.5}
                        />
                      ) : null}
                    </div>
                  </button>
                );
              })}
            </div>
          </section>
        ))}
      </div>

      <section className="pt-4 border-t border-line">
        <Field
          label="Catégorie produit / service (pour conformité)"
          helper="Si tu fais de la pub pour un secteur réglementé (alcool, finance, immobilier, etc.), sélectionne-le pour qu'on ajoute automatiquement les disclaimers légaux."
        >
          <input
            type="text"
            value={form.ad_category_hint}
            onChange={(e) => setFormVal("ad_category_hint", e.target.value)}
            className={inputCls}
            placeholder="ex: alcool, finance_credit, immobilier (laisse vide si non concerné)"
          />
        </Field>
        {isForbidden ? (
          <Banner tone="error" className="mt-3">
            <strong>Catégorie interdite.</strong> La publicité pour&nbsp;
            <code>{form.ad_category_hint}</code> n&apos;est pas autorisée
            sur DIVARC. Modifie ce champ pour pouvoir continuer.
          </Banner>
        ) : null}
        {isAgeGated ? (
          <Banner tone="warn" className="mt-3">
            Catégorie 18+ : un disclaimer légal sera ajouté automatiquement.
          </Banner>
        ) : null}
        {requiresCert ? (
          <Banner tone="warn" className="mt-3">
            Catégorie réglementée : un justificatif professionnel sera demandé
            avant validation (ORIAS, ACPR, carte T, barreau…).
          </Banner>
        ) : null}
      </section>
    </div>
  );
}

function AudienceStep({
  form,
  setFormVal,
  setForm,
  targetingValidation,
  accountId,
  audienceEstimate,
  estimating,
}: {
  form: CampaignFormState;
  setFormVal: <K extends keyof CampaignFormState>(
    key: K,
    val: CampaignFormState[K],
  ) => void;
  setForm: (f: CampaignFormState) => void;
  targetingValidation: ReturnType<typeof validateTargetingSpec>;
  accountId: string;
  audienceEstimate: number | null;
  estimating: boolean;
}) {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="font-display text-[28px] sm:text-[32px] leading-tight tracking-[-0.02em] text-night">
          Définis ton{" "}
          <em className="italic text-gold-deep">audience</em>
        </h2>
        <p className="mt-2 text-[14px] text-night-soft leading-relaxed max-w-2xl">
          7 panneaux pour cibler comme un pro : géo radius, démographie,
          intérêts, comportements, connections, custom audiences, lookalikes.
          La jauge à droite t&apos;indique si ton audience est bien
          dimensionnée — k-anonymity ≥ 100 garantie.
        </p>
      </div>

      <Section title="Identité de la campagne">
        <Field label="Nom de la campagne *" helper="Visible uniquement par toi.">
          <input
            type="text"
            value={form.name}
            onChange={(e) => setFormVal("name", e.target.value)}
            maxLength={100}
            className={inputCls}
            placeholder="ex: Lancement printemps 2026"
          />
        </Field>
      </Section>

      <AudienceBuilder
        accountId={accountId}
        form={form}
        setForm={setForm}
        audienceEstimate={audienceEstimate}
        estimating={estimating}
        validationErrors={targetingValidation.errors}
        validationWarnings={targetingValidation.warnings}
      />
    </div>
  );
}

function BudgetStep({
  form,
  setFormVal,
  currency,
  objectiveDef,
  advancedConfig,
  onAdvancedChange,
}: {
  form: CampaignFormState;
  setFormVal: <K extends keyof CampaignFormState>(
    key: K,
    val: CampaignFormState[K],
  ) => void;
  currency: string;
  objectiveDef: ObjectiveDef | undefined;
  advancedConfig: AdvancedConfig;
  onAdvancedChange: (next: AdvancedConfig) => void;
}) {
  const PLACEMENTS = [
    { id: "feed_home", label: "Feed Home", note: "1 ad / 5-7 posts", recommended: true },
    { id: "marketplace_feed", label: "Marketplace", note: "1 / 12 listings", recommended: true },
    { id: "marketplace_listing_boost", label: "Boost annonce", note: "Mise en avant ciblée" },
    { id: "jobs_feed", label: "Jobs", note: "1 / 15 jobs" },
    { id: "stories", label: "Stories", note: "Plein écran 9:16" },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h2 className="font-display text-[28px] sm:text-[32px] leading-tight tracking-[-0.02em] text-night">
          Combien et{" "}
          <em className="italic text-gold-deep">où</em> diffuser ?
        </h2>
        <p className="mt-2 text-[14px] text-night-soft leading-relaxed max-w-2xl">
          Définis ton budget, choisis tes placements et configure
          l&apos;optimisation. Les estimations à droite te montrent
          l&apos;impact attendu.
        </p>
      </div>

      <Section title="Budget">
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setFormVal("budget_type", "daily")}
              className={`px-4 py-2 rounded-full text-[12.5px] font-semibold border transition-colors ${
                form.budget_type === "daily"
                  ? "border-night bg-night text-cream"
                  : "border-line text-night-muted hover:bg-bg-soft"
              }`}
            >
              Quotidien
            </button>
            <button
              type="button"
              onClick={() => setFormVal("budget_type", "lifetime")}
              className={`px-4 py-2 rounded-full text-[12.5px] font-semibold border transition-colors ${
                form.budget_type === "lifetime"
                  ? "border-night bg-night text-cream"
                  : "border-line text-night-muted hover:bg-bg-soft"
              }`}
            >
              Total campagne
            </button>
          </div>

          {form.budget_type === "daily" ? (
            <div>
              <div className="flex items-baseline gap-2 mb-2">
                <span className="text-[36px] font-bold text-night leading-none">
                  {Number(form.daily_budget).toFixed(0)}
                </span>
                <span className="text-[16px] text-night-muted">
                  {currency} / jour
                </span>
              </div>
              <input
                type="range"
                min={5}
                max={500}
                step={5}
                value={form.daily_budget}
                onChange={(e) => setFormVal("daily_budget", e.target.value)}
                className="w-full accent-night"
              />
              <div className="flex items-center justify-between text-[10.5px] text-night-muted mt-1">
                <span>5 {currency}</span>
                <span>500 {currency}</span>
              </div>
              <input
                type="number"
                value={form.daily_budget}
                onChange={(e) => setFormVal("daily_budget", e.target.value)}
                min={1}
                step={1}
                className={`${inputCls} mt-2`}
              />
            </div>
          ) : (
            <div>
              <div className="flex items-baseline gap-2 mb-2">
                <span className="text-[36px] font-bold text-night leading-none">
                  {Number(form.lifetime_budget).toFixed(0)}
                </span>
                <span className="text-[16px] text-night-muted">
                  {currency} total
                </span>
              </div>
              <input
                type="range"
                min={50}
                max={10_000}
                step={50}
                value={form.lifetime_budget}
                onChange={(e) =>
                  setFormVal("lifetime_budget", e.target.value)
                }
                className="w-full accent-night"
              />
              <div className="flex items-center justify-between text-[10.5px] text-night-muted mt-1">
                <span>50 {currency}</span>
                <span>10 000 {currency}</span>
              </div>
            </div>
          )}
        </div>
      </Section>

      <Section title="Calendrier">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Field label="Date de début (optionnel)">
            <input
              type="date"
              value={form.start_date}
              onChange={(e) => setFormVal("start_date", e.target.value)}
              className={inputCls}
            />
          </Field>
          <Field label="Date de fin (optionnel)">
            <input
              type="date"
              value={form.end_date}
              onChange={(e) => setFormVal("end_date", e.target.value)}
              className={inputCls}
            />
          </Field>
        </div>
      </Section>

      <Section
        title="Placements"
        helper="Où ton ad apparaîtra. Le Feed Home + Marketplace sont recommandés pour la plupart des objectifs."
      >
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
          {PLACEMENTS.map((p) => {
            const active = form.placements.includes(p.id);
            return (
              <label
                key={p.id}
                className={`flex items-start gap-3 p-3 rounded-xl border cursor-pointer transition-colors ${
                  active
                    ? "border-night bg-night/[0.03]"
                    : "border-line bg-white hover:border-night/30"
                }`}
              >
                <input
                  type="checkbox"
                  checked={active}
                  onChange={(e) => {
                    if (e.target.checked) {
                      setFormVal("placements", [...form.placements, p.id]);
                    } else {
                      setFormVal(
                        "placements",
                        form.placements.filter((x) => x !== p.id),
                      );
                    }
                  }}
                  className="mt-0.5 accent-night"
                />
                <div className="min-w-0 flex-1">
                  <div className="flex items-baseline gap-2 flex-wrap">
                    <span className="text-[13px] font-semibold text-night">
                      {p.label}
                    </span>
                    {p.recommended ? (
                      <span className="text-[9px] uppercase tracking-wider font-bold text-gold-deep">
                        · Recommandé
                      </span>
                    ) : null}
                  </div>
                  <p className="text-[11.5px] text-night-muted">{p.note}</p>
                </div>
              </label>
            );
          })}
        </div>
      </Section>

      <Section title="Optimisation">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Field label="Stratégie d'enchère">
            <select
              value={form.bid_strategy}
              onChange={(e) => setFormVal("bid_strategy", e.target.value)}
              className={inputCls}
            >
              <option value="lowest_cost">Coût le plus bas (auto)</option>
              <option value="cost_cap">Cap coût moyen</option>
              <option value="bid_cap">Cap enchère</option>
              <option value="target_cost">Coût cible</option>
            </select>
          </Field>
          <Field label="Objectif d'optimisation">
            <select
              value={form.optimization_goal}
              onChange={(e) =>
                setFormVal("optimization_goal", e.target.value)
              }
              className={inputCls}
            >
              <option value="impressions">Impressions</option>
              <option value="reach">Reach unique</option>
              <option value="link_clicks">Clics liens</option>
              <option value="landing_page_views">Vues landing</option>
              <option value="post_engagement">Engagement</option>
              <option value="video_views_3s">Vues 3s</option>
              <option value="thruplay">ThruPlay</option>
              <option value="lead_generation">Leads</option>
              <option value="conversions">Conversions</option>
            </select>
          </Field>
          <Field label="Modèle facturation">
            <select
              value={form.billing_event}
              onChange={(e) => setFormVal("billing_event", e.target.value)}
              className={inputCls}
            >
              <option value="impressions">CPM (impressions)</option>
              <option value="clicks">CPC (clics)</option>
              <option value="video_views">CPV (vues)</option>
              <option value="conversions">CPA (conversions)</option>
            </select>
          </Field>
        </div>
        {objectiveDef ? (
          <p className="text-[11.5px] text-night-muted italic mt-3">
            💡 Recommandé pour&nbsp;{objectiveDef.label} :{" "}
            {objectiveDef.defaultOptimizationGoal} avec{" "}
            {objectiveDef.defaultBillingEvent}.
          </p>
        ) : null}
      </Section>

      <Section
        title="Plafond de fréquence"
        helper="Évite la fatigue publicitaire en limitant le nombre de fois qu'un même utilisateur voit ton ad."
      >
        <div className="flex items-center gap-3 flex-wrap">
          <span className="text-[13px] text-night">Maximum</span>
          <input
            type="number"
            value={form.frequency_max}
            onChange={(e) => setFormVal("frequency_max", e.target.value)}
            min={1}
            max={50}
            className="w-20 px-3 py-2 rounded-xl border border-line bg-white text-[13px] text-night focus:outline-none focus:border-night"
          />
          <span className="text-[13px] text-night">impressions par user, sur</span>
          <input
            type="number"
            value={form.frequency_period_days}
            onChange={(e) =>
              setFormVal("frequency_period_days", e.target.value)
            }
            min={1}
            max={30}
            className="w-20 px-3 py-2 rounded-xl border border-line bg-white text-[13px] text-night focus:outline-none focus:border-night"
          />
          <span className="text-[13px] text-night">jours</span>
        </div>
      </Section>

      {/* Configuration avancée — collapsible, défaut fermé. */}
      <AdvancedConfigSection
        config={advancedConfig}
        onChange={onAdvancedChange}
        pixels={[]}
      />
    </div>
  );
}

function CreativeStep({
  form,
  setFormVal,
  entities,
}: {
  form: CampaignFormState;
  setFormVal: <K extends keyof CampaignFormState>(
    key: K,
    val: CampaignFormState[K],
  ) => void;
  entities: Entity[];
}) {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="font-display text-[28px] sm:text-[32px] leading-tight tracking-[-0.02em] text-night">
          Le{" "}
          <em className="italic text-gold-deep">visuel</em>
        </h2>
        <p className="mt-2 text-[14px] text-night-soft leading-relaxed max-w-2xl">
          Compose ton message. L&apos;aperçu live à droite te montre comment
          ton ad apparaîtra sur les placements sélectionnés.
        </p>
      </div>

      <Section title="Page représentée *">
        <Field
          label=""
          helper="Toute pub doit être rattachée à une entité représentée (transparence DSA art. 26 + DSA art. 39)."
        >
          <select
            value={form.advertiser_entity_id}
            onChange={(e) =>
              setFormVal("advertiser_entity_id", e.target.value)
            }
            className={inputCls}
          >
            {entities.map((e) => (
              <option key={e.id} value={e.id}>
                {e.name} ({e.type})
              </option>
            ))}
          </select>
        </Field>
      </Section>

      <Section title="Format">
        <div className="grid grid-cols-3 gap-2.5">
          {[
            { id: "single_image", label: "Image" },
            { id: "single_video", label: "Vidéo" },
            { id: "carousel", label: "Carrousel" },
          ].map((f) => (
            <button
              key={f.id}
              type="button"
              onClick={() => setFormVal("creative_type", f.id)}
              className={`p-3 rounded-xl border-2 text-[13px] font-semibold ${
                form.creative_type === f.id
                  ? "border-night bg-night/[0.03] text-night"
                  : "border-line bg-white text-night-muted hover:border-night/30"
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
      </Section>

      <Section title="Message">
        <Field
          label="Texte principal *"
          helper="Le texte au-dessus de l'ad. Va à l'essentiel — les utilisateurs scannent."
        >
          <textarea
            rows={3}
            value={form.primary_text}
            onChange={(e) => setFormVal("primary_text", e.target.value)}
            maxLength={125}
            className={inputCls}
            placeholder="ex: Découvre notre nouvelle collection — livraison offerte ce week-end."
          />
          <p className="text-[10.5px] text-night-muted text-right mt-1">
            {form.primary_text.length} / 125
          </p>
        </Field>
        <Field
          label="Titre (en gras sous l'image) *"
          helper="Ce qui doit accrocher l'œil. Court et impactant."
        >
          <input
            type="text"
            value={form.headline}
            onChange={(e) => setFormVal("headline", e.target.value)}
            maxLength={40}
            className={inputCls}
            placeholder="ex: Collection printemps — -30%"
          />
          <p className="text-[10.5px] text-night-muted text-right mt-1">
            {form.headline.length} / 40
          </p>
        </Field>
        <Field label="Description (sous le titre)">
          <input
            type="text"
            value={form.description}
            onChange={(e) => setFormVal("description", e.target.value)}
            maxLength={30}
            className={inputCls}
            placeholder="ex: Livraison gratuite"
          />
        </Field>
      </Section>

      <Section title="Visuel + lien">
        <Field label="URL du média (image ou vidéo)" helper="Pour V1, fournis une URL hébergée. V2 : upload direct via Supabase Storage.">
          <input
            type="url"
            value={form.media_url}
            onChange={(e) => setFormVal("media_url", e.target.value)}
            className={inputCls}
            placeholder="https://…"
          />
        </Field>
        <Field label="URL de destination (où l'ad envoie en cas de clic)">
          <input
            type="url"
            value={form.destination_url}
            onChange={(e) => setFormVal("destination_url", e.target.value)}
            className={inputCls}
            placeholder="https://monsite.com/produit"
          />
        </Field>
        <Field label="Bouton d'action (CTA)">
          <select
            value={form.call_to_action}
            onChange={(e) => setFormVal("call_to_action", e.target.value)}
            className={inputCls}
          >
            <option value="learn_more">En savoir plus</option>
            <option value="shop_now">Acheter</option>
            <option value="sign_up">S&apos;inscrire</option>
            <option value="subscribe">S&apos;abonner</option>
            <option value="download">Télécharger</option>
            <option value="contact_us">Nous contacter</option>
            <option value="book_now">Réserver</option>
            <option value="apply_now">Postuler</option>
            <option value="get_quote">Obtenir un devis</option>
            <option value="get_offer">Voir l&apos;offre</option>
            <option value="send_message">Envoyer un message</option>
          </select>
        </Field>
      </Section>
    </div>
  );
}

function ReviewStep({
  form,
  currency,
  objectiveDef,
  estimatedAudience,
}: {
  form: CampaignFormState;
  currency: string;
  objectiveDef: ObjectiveDef | undefined;
  estimatedAudience: number | null;
}) {
  return (
    <div className="space-y-5">
      <div>
        <h2 className="font-display text-[28px] sm:text-[32px] leading-tight tracking-[-0.02em] text-night">
          Vérification{" "}
          <em className="italic text-gold-deep">finale</em>
        </h2>
        <p className="mt-2 text-[14px] text-night-soft leading-relaxed max-w-2xl">
          Tout est en ordre ? Ta campagne sera vérifiée automatiquement
          (conformité DSA + RGPD + brand safety) avant diffusion.
        </p>
      </div>

      <div className="rounded-2xl bg-white border border-line divide-y divide-line">
        <SummaryRow
          label="Objectif"
          value={objectiveDef?.label ?? form.objective}
        />
        <SummaryRow label="Nom de la campagne" value={form.name} />
        <SummaryRow
          label="Audience"
          value={`${form.age_min}-${form.age_max} ans · ${form.genders[0]} · ${form.countries.join(", ")}`}
        />
        <SummaryRow
          label="Reach estimé"
          value={
            estimatedAudience
              ? `~${formatN(estimatedAudience)} utilisateurs`
              : "Calcul en cours…"
          }
        />
        <SummaryRow
          label="Budget"
          value={
            form.budget_type === "daily"
              ? `${form.daily_budget} ${currency}/jour`
              : `${form.lifetime_budget} ${currency} total`
          }
        />
        <SummaryRow label="Placements" value={form.placements.join(", ")} />
        <SummaryRow
          label="Optimisation"
          value={`${form.optimization_goal} · ${form.billing_event}`}
        />
        {form.special_ad_category ? (
          <SummaryRow
            label="Catégorie spéciale"
            value={form.special_ad_category}
          />
        ) : null}
      </div>

      <div className="rounded-2xl bg-bg-soft border border-line p-4 text-[12.5px] text-night-soft leading-relaxed">
        <p className="font-semibold text-night mb-1.5 flex items-center gap-2">
          <AlertTriangle
            className="w-3.5 h-3.5 text-amber-700"
            aria-hidden
          />
          Conformité automatique
        </p>
        <ul className="list-disc pl-4 space-y-0.5">
          <li>DSA art. 28 : ciblage 18+ enforced.</li>
          <li>RGPD art. 9 : pas de catégories sensibles.</li>
          <li>Brand safety : modération texte + image avant diffusion.</li>
          <li>Disclaimers légaux ajoutés selon la catégorie.</li>
          <li>
            La campagne sera ajoutée à la{" "}
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
    </div>
  );
}

/* ============================================================
 * UI Primitives
 * ============================================================ */

const inputCls =
  "w-full px-3 py-2 rounded-xl border border-line bg-white text-[13.5px] text-night focus:outline-none focus:border-night transition-colors";

function Section({
  title,
  helper,
  children,
}: {
  title: string;
  helper?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-2xl bg-white border border-line p-5 space-y-4">
      <div>
        <h3 className="text-[15px] font-semibold text-night">{title}</h3>
        {helper ? (
          <p className="text-[12px] text-night-muted mt-0.5 leading-snug">
            {helper}
          </p>
        ) : null}
      </div>
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
      {label ? (
        <span className="block text-[11.5px] font-bold uppercase tracking-wider text-muted mb-1.5">
          {label}
        </span>
      ) : null}
      {children}
      {helper ? (
        <p className="text-[11px] text-night-muted mt-1 leading-snug">
          {helper}
        </p>
      ) : null}
    </label>
  );
}

function Banner({
  tone,
  children,
  className,
}: {
  tone: "warn" | "error";
  children: React.ReactNode;
  className?: string;
}) {
  const cls =
    tone === "error"
      ? "bg-red-50 border-red-200 text-red-900"
      : "bg-amber-50 border-amber-200 text-amber-900";
  return (
    <div className={`rounded-xl border px-3 py-2.5 text-[12.5px] ${cls} ${className ?? ""}`}>
      {children}
    </div>
  );
}

function SummaryRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-baseline justify-between gap-3 px-4 py-3">
      <span className="text-[11px] uppercase tracking-wider font-bold text-night-muted shrink-0">
        {label}
      </span>
      <span className="text-[13px] font-semibold text-night text-right truncate">
        {value}
      </span>
    </div>
  );
}

/* Helpers. */
function defaultCampaignName(): string {
  const date = new Date().toLocaleDateString("fr-FR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
  return `Campagne du ${date}`;
}

function parseSizeRange(range: string): number {
  if (!range || range === "—") return 0;
  if (range === "100-1K") return 500;
  /* "10K-50K" → 30k, "100K-200K" → 150k, etc. */
  const m = range.match(/(\d+(?:\.\d+)?)\s*([kKmM])?\s*-\s*(\d+(?:\.\d+)?)\s*([kKmM])?/);
  if (m) {
    const n1 = parseFloat(m[1]!) * suffixMul(m[2]);
    const n2 = parseFloat(m[3]!) * suffixMul(m[4]);
    return Math.round((n1 + n2) / 2);
  }
  /* "1.5M+" or "5K". */
  const m2 = range.match(/(\d+(?:\.\d+)?)\s*([kKmM])?/);
  if (m2) return Math.round(parseFloat(m2[1]!) * suffixMul(m2[2]));
  return 0;
}
function suffixMul(s?: string): number {
  if (!s) return 1;
  if (s === "k" || s === "K") return 1000;
  if (s === "m" || s === "M") return 1_000_000;
  return 1;
}
function formatN(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1000).toFixed(1)}k`;
  return n.toString();
}

/* Construit la TargetingSpec complète depuis le form. */
function buildTargetingSpec(form: CampaignFormState): TargetingSpec {
  const spec: TargetingSpec = {
    geo: {
      countries: form.countries,
      ...(form.cities.length > 0 ? { cities: form.cities } : {}),
      ...(form.postal_codes.length > 0
        ? { postal_codes: form.postal_codes }
        : {}),
      ...(form.custom_locations.length > 0
        ? { custom_locations: form.custom_locations }
        : {}),
      ...(form.location_types.length > 0
        ? { location_types: form.location_types }
        : {}),
      ...(form.excluded_locations.length > 0
        ? { excluded_locations: form.excluded_locations }
        : {}),
    },
    age_min: form.age_min,
    age_max: form.age_max,
    genders: form.genders as TargetingSpec["genders"],
    ...(form.languages.length > 0 ? { languages: form.languages } : {}),
    interests: form.interests
      .split(",")
      .map((i) => i.trim())
      .filter(Boolean)
      .map((topic_id) => ({ topic_id })),
    ...(form.interests_logic
      ? { interests_logic: form.interests_logic }
      : {}),
    ...(form.behaviors.length > 0 ? { behaviors: form.behaviors } : {}),
    ...(form.connections.friends_of_engagers || form.connections.exclude_fans
      ? { connections: form.connections }
      : {}),
    ...(form.custom_audience_ids.length > 0
      ? { custom_audience_ids: form.custom_audience_ids }
      : {}),
    ...(form.excluded_custom_audience_ids.length > 0
      ? { excluded_custom_audience_ids: form.excluded_custom_audience_ids }
      : {}),
    ...(form.lookalike_audience_ids.length > 0
      ? { lookalike_audience_ids: form.lookalike_audience_ids }
      : {}),
  };
  return spec;
}
