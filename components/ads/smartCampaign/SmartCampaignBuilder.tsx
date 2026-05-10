"use client";

import {
  ArrowLeft,
  ArrowRight,
  Briefcase,
  CheckCircle2,
  Megaphone,
  RefreshCw,
  Settings,
  ShoppingBag,
  Smartphone,
  Sparkles,
  Store,
  Users,
} from "lucide-react";
import { useEffect, useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { AdPreview } from "@/components/ads/AdPreview";
import { createFullCampaign } from "@/app/(app)/ads-manager/[accountId]/campaigns/new/actions";
import {
  CATEGORY_DISCLAIMERS,
  type TargetingSpec,
} from "@/lib/ads/types";

/* SmartCampaignBuilder — wizard ultra-simplifié 4 étapes IA-first.
 *
 * Cible : annonceurs débutants. Inspirée Performance Max (Google) +
 * Advantage+ Shopping (Meta).
 *
 * Pré-remplissage automatique depuis sessionStorage[divarc-analysis-{id}]
 * si query param ?analysis= présent.
 *
 * Si l'utilisateur veut plus de contrôle, toggle "Passer en mode Expert"
 * disponible en cours de création.
 */

type Props = {
  accountId: string;
  currency: string;
  entities: Array<{ id: string; name: string; type: string }>;
  analysisId?: string;
};

type SmartObjective = {
  id: string;
  label: string;
  description: string;
  icon: typeof Megaphone;
  color: string;
  /* Mapping vers enum DB. */
  expert_objective: string;
  default_optimization_goal: string;
  default_billing_event: string;
};

const SMART_OBJECTIVES: readonly SmartObjective[] = [
  {
    id: "brand_awareness",
    label: "Faire connaître ma marque",
    description: "Maximiser la portée et la notoriété auprès des bons profils.",
    icon: Megaphone,
    color: "text-violet-600 bg-violet-50",
    expert_objective: "brand_awareness",
    default_optimization_goal: "reach",
    default_billing_event: "impressions",
  },
  {
    id: "leads",
    label: "Obtenir plus de clients potentiels",
    description: "Collecter des coordonnées qualifiées (leads) pour ton business.",
    icon: Users,
    color: "text-amber-600 bg-amber-50",
    expert_objective: "lead_generation",
    default_optimization_goal: "lead_generation",
    default_billing_event: "impressions",
  },
  {
    id: "sales",
    label: "Vendre plus de produits ou services",
    description: "Maximiser les ventes en ligne (e-commerce, abonnements, etc.).",
    icon: ShoppingBag,
    color: "text-emerald-600 bg-emerald-50",
    expert_objective: "conversions",
    default_optimization_goal: "conversions",
    default_billing_event: "conversions",
  },
  {
    id: "app",
    label: "Faire installer mon application",
    description: "Générer des installs sur ton app mobile (iOS / Android).",
    icon: Smartphone,
    color: "text-blue-600 bg-blue-50",
    expert_objective: "app_installs",
    default_optimization_goal: "app_installs",
    default_billing_event: "impressions",
  },
  {
    id: "store",
    label: "Faire venir des clients en boutique",
    description: "Pousser les utilisateurs proches à se déplacer chez toi.",
    icon: Store,
    color: "text-fuchsia-600 bg-fuchsia-50",
    expert_objective: "store_traffic",
    default_optimization_goal: "reach",
    default_billing_event: "impressions",
  },
  {
    id: "recruit",
    label: "Recruter des collaborateurs",
    description: "Atteindre les bons profils pour tes offres d'emploi.",
    icon: Briefcase,
    color: "text-sky-600 bg-sky-50",
    expert_objective: "job_applications",
    default_optimization_goal: "lead_generation",
    default_billing_event: "clicks",
  },
] as const;

type Persona = {
  persona_name: string;
  description: string;
  targeting_spec: Record<string, unknown>;
  estimated_size?: number;
};

type AdVariant = {
  headline: string;
  description: string;
  primary_text: string;
  cta: string;
  media_url: string;
};

type AnalysisSnapshot = {
  businessName?: string;
  businessDesc?: string;
  audiences?: Persona[];
  keywords?: string[];
  images?: string[];
  headlines?: string[];
  descriptions?: string[];
  budget?: number;
  objective?: string;
  compliance_warnings?: string[];
};

const BUDGET_MARKERS = [
  { value: 5, label: "Test" },
  { value: 15, label: "Lancement" },
  { value: 50, label: "Croissance" },
  { value: 200, label: "Scale" },
];

export function SmartCampaignBuilder({
  accountId,
  currency,
  entities,
  analysisId,
}: Props) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  /* Charge le snapshot Website Analyzer si présent. */
  const snapshot = useAnalysisSnapshot(analysisId);

  /* State machine — 4 étapes. */
  const [step, setStep] = useState(1);

  /* Sélections wizard. */
  const [objective, setObjective] = useState(() =>
    snapshot?.objective
      ? mapExpertToSmart(snapshot.objective)
      : "sales",
  );
  const [campaignName, setCampaignName] = useState(() =>
    snapshot?.businessName
      ? `${snapshot.businessName} — ${new Date().toLocaleDateString("fr-FR", { day: "2-digit", month: "short" })}`
      : `Campagne ${new Date().toLocaleDateString("fr-FR")}`,
  );

  /* Audiences : sélectionne toutes par défaut. */
  const audiences: Persona[] = snapshot?.audiences ?? [];
  const [audiencesSelected, setAudiencesSelected] = useState<Set<number>>(
    new Set(audiences.map((_, i) => i)),
  );
  const [audienceMode, setAudienceMode] = useState<"suggested" | "auto">(
    audiences.length > 0 ? "suggested" : "auto",
  );

  /* Annonces : 3 variantes pré-construites depuis snapshot. */
  const initialVariants = useMemo(() => buildVariants(snapshot), [snapshot]);
  const [variants, setVariants] = useState<AdVariant[]>(initialVariants);
  const [selectedVariant, setSelectedVariant] = useState(0);

  /* Budget. */
  const [budget, setBudget] = useState(() => snapshot?.budget ?? 15);
  const [endDate, setEndDate] = useState("");

  const objDef = SMART_OBJECTIVES.find((o) => o.id === objective);

  function next() {
    if (step === 1 && !objective) {
      toast.error("Choisis un objectif.");
      return;
    }
    if (step === 2) {
      if (audienceMode === "suggested" && audiencesSelected.size === 0) {
        toast.error("Sélectionne au moins une audience.");
        return;
      }
    }
    if (step === 3) {
      const v = variants[selectedVariant];
      if (!v?.headline || !v?.primary_text) {
        toast.error("Le texte de l'annonce est obligatoire.");
        return;
      }
    }
    setStep((s) => Math.min(4, s + 1));
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function back() {
    setStep((s) => Math.max(1, s - 1));
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function regenerateVariant(idx: number) {
    /* V1 : juste shuffle parmi les copies snapshot disponibles. */
    if (!snapshot?.headlines || !snapshot?.descriptions) {
      toast.info("Pas assez de variations. Édite directement le texte.");
      return;
    }
    const allHeadlines = snapshot.headlines;
    const allDescs = snapshot.descriptions;
    const next = [...variants];
    next[idx] = {
      ...next[idx]!,
      headline:
        allHeadlines[Math.floor(Math.random() * allHeadlines.length)] ??
        next[idx]!.headline,
      description:
        allDescs[Math.floor(Math.random() * allDescs.length)] ??
        next[idx]!.description,
    };
    setVariants(next);
    toast.success("Variante régénérée.");
  }

  function submit() {
    const v = variants[selectedVariant];
    if (!v) {
      toast.error("Sélectionne une variante.");
      return;
    }
    if (!entities[0]) {
      toast.error(
        "Aucune page représentée — crée-en une depuis ton compte entreprise.",
      );
      return;
    }
    if (!objDef) return;

    /* Construction du targeting depuis les audiences sélectionnées. */
    let targeting: TargetingSpec;
    if (audienceMode === "auto" || audiences.length === 0) {
      /* Advantage+ : ciblage très large, on laisse le ranker DIVARC choisir. */
      targeting = {
        geo: { countries: ["FR"] },
        age_min: 18,
        age_max: 65,
        genders: ["all"],
      };
    } else {
      const selectedPersonas = audiences.filter((_, i) =>
        audiencesSelected.has(i),
      );
      /* Merge des targeting_spec de toutes les audiences sélectionnées. */
      const allInterests = new Set<string>();
      let minAge = 99;
      let maxAge = 18;
      const allCountries = new Set<string>();
      const allGenders = new Set<string>();
      for (const p of selectedPersonas) {
        const ts = p.targeting_spec as TargetingSpec;
        if (ts.age_min < minAge) minAge = ts.age_min;
        if (ts.age_max > maxAge) maxAge = ts.age_max;
        for (const c of ts.geo?.countries ?? []) allCountries.add(c);
        for (const g of ts.genders ?? []) allGenders.add(g);
        for (const i of ts.interests ?? []) allInterests.add(i.topic_id);
      }
      targeting = {
        geo: { countries: Array.from(allCountries) },
        age_min: Math.max(18, minAge),
        age_max: Math.min(99, maxAge),
        genders: Array.from(allGenders) as TargetingSpec["genders"],
        interests: Array.from(allInterests).map((topic_id) => ({ topic_id })),
      };
    }

    startTransition(async () => {
      const result = await createFullCampaign({
        ad_account_id: accountId,
        objective: objDef.expert_objective as Parameters<
          typeof createFullCampaign
        >[0]["objective"],
        name: campaignName,
        daily_budget: budget,
        end_time: endDate ? new Date(endDate).toISOString() : undefined,
        targeting,
        placements: ["feed_home", "marketplace_feed"] as Parameters<
          typeof createFullCampaign
        >[0]["placements"],
        bid_strategy: "lowest_cost",
        optimization_goal:
          objDef.default_optimization_goal as Parameters<
            typeof createFullCampaign
          >[0]["optimization_goal"],
        billing_event:
          objDef.default_billing_event as Parameters<
            typeof createFullCampaign
          >[0]["billing_event"],
        creative_type: "single_image",
        primary_text: v.primary_text,
        headline: v.headline,
        description: v.description || undefined,
        media_url: v.media_url || undefined,
        call_to_action: v.cta,
        advertiser_entity_id: entities[0].id,
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

      /* Cleanup snapshot. */
      if (analysisId) {
        try {
          sessionStorage.removeItem(`divarc-analysis-${analysisId}`);
        } catch {
          /* ignore */
        }
      }
      toast.success("Campagne créée. En attente de revue conformité.");
      router.push(`/ads-manager/${accountId}`);
    });
  }

  return (
    <div className="max-w-3xl mx-auto">
      {/* Header avec toggle Expert */}
      <header className="mb-6 flex items-baseline justify-between gap-3 flex-wrap">
        <div>
          <p className="text-[10.5px] uppercase tracking-[0.18em] text-gold-deep font-extrabold">
            · Smart Campaign · IA-assisté
          </p>
          <h1 className="font-display text-[28px] sm:text-[36px] leading-[1.05] tracking-[-0.02em] text-night mt-1">
            Étape {step} sur 4
          </h1>
        </div>
        <button
          type="button"
          onClick={() =>
            router.push(
              `/ads-manager/${accountId}/campaigns/new?mode=expert${
                analysisId ? `&analysis=${analysisId}` : ""
              }`,
            )
          }
          className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-[12px] font-semibold text-night-muted hover:text-night border border-line hover:border-night/30 transition-colors"
        >
          <Settings className="w-3.5 h-3.5" aria-hidden />
          Mode Expert
        </button>
      </header>

      {/* Progress bar 4 étapes */}
      <div className="mb-7 flex gap-1">
        {[1, 2, 3, 4].map((s) => (
          <div
            key={s}
            className={`flex-1 h-1.5 rounded-full transition-colors ${
              s <= step ? "bg-gold-deep" : "bg-line"
            }`}
          />
        ))}
      </div>

      {/* Compliance warnings (depuis snapshot) */}
      {step === 1 && snapshot?.compliance_warnings && snapshot.compliance_warnings.length > 0 ? (
        <div className="mb-5 rounded-2xl bg-amber-50 border border-amber-200 p-3 text-[12px] text-amber-900">
          <p className="font-semibold mb-1">⚠️ Conformité</p>
          <ul className="list-disc pl-4 space-y-0.5">
            {snapshot.compliance_warnings.map((w, i) => (
              <li key={i}>{w}</li>
            ))}
          </ul>
        </div>
      ) : null}

      {/* Steps */}
      {step === 1 ? (
        <Step1Objective
          selected={objective}
          onSelect={setObjective}
          campaignName={campaignName}
          onNameChange={setCampaignName}
        />
      ) : null}

      {step === 2 ? (
        <Step2Audience
          audiences={audiences}
          selected={audiencesSelected}
          onSelect={setAudiencesSelected}
          mode={audienceMode}
          onModeChange={setAudienceMode}
        />
      ) : null}

      {step === 3 ? (
        <Step3Creatives
          variants={variants}
          selected={selectedVariant}
          onSelect={setSelectedVariant}
          onUpdateVariant={(idx, partial) => {
            const next = [...variants];
            next[idx] = { ...next[idx]!, ...partial };
            setVariants(next);
          }}
          onRegenerate={regenerateVariant}
          advertiserName={entities[0]?.name ?? "Ton entreprise"}
          autoDisclaimer={
            snapshot?.objective &&
            CATEGORY_DISCLAIMERS[snapshot.objective]
              ? CATEGORY_DISCLAIMERS[snapshot.objective]!
              : null
          }
        />
      ) : null}

      {step === 4 ? (
        <Step4Budget
          budget={budget}
          onBudgetChange={setBudget}
          currency={currency}
          endDate={endDate}
          onEndDateChange={setEndDate}
          objective={objDef}
          campaignName={campaignName}
          audiencesCount={audiencesSelected.size}
          audienceMode={audienceMode}
          variant={variants[selectedVariant] ?? variants[0]!}
        />
      ) : null}

      {/* Navigation footer */}
      <div className="mt-8 flex items-center justify-between gap-3">
        <button
          type="button"
          onClick={back}
          disabled={step === 1 || pending}
          className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full text-[13px] font-semibold text-night-muted hover:text-night disabled:opacity-30"
        >
          <ArrowLeft className="w-4 h-4" aria-hidden />
          Retour
        </button>
        {step < 4 ? (
          <button
            type="button"
            onClick={next}
            disabled={pending}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-night text-cream text-[13px] font-semibold disabled:opacity-50 hover:bg-night/90"
          >
            Continuer
            <ArrowRight className="w-4 h-4" aria-hidden />
          </button>
        ) : (
          <button
            type="button"
            onClick={submit}
            disabled={pending}
            className="inline-flex items-center gap-2 px-6 py-3 rounded-full bg-night text-cream text-[14px] font-semibold disabled:opacity-50 hover:bg-night/90 shadow-soft"
          >
            {pending ? "Lancement…" : "Lancer ma campagne"}
            <Sparkles className="w-4 h-4" aria-hidden />
          </button>
        )}
      </div>
    </div>
  );
}

/* ============================================================
 * Steps
 * ============================================================ */

function Step1Objective({
  selected,
  onSelect,
  campaignName,
  onNameChange,
}: {
  selected: string;
  onSelect: (id: string) => void;
  campaignName: string;
  onNameChange: (s: string) => void;
}) {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="font-display text-[22px] sm:text-[26px] leading-tight tracking-[-0.02em] text-night">
          Que veux-tu{" "}
          <em className="italic text-gold-deep">accomplir</em> ?
        </h2>
        <p className="mt-1 text-[13px] text-night-soft">
          Choisis un objectif business clair. L&apos;IA optimisera la
          diffusion en conséquence.
        </p>
      </div>

      <ul className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
        {SMART_OBJECTIVES.map((obj) => {
          const Icon = obj.icon;
          const active = selected === obj.id;
          return (
            <li key={obj.id}>
              <button
                type="button"
                onClick={() => onSelect(obj.id)}
                className={`w-full text-left p-4 rounded-2xl border-2 transition-all ${
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
                    <p className="text-[12px] text-night-soft mt-1 leading-snug">
                      {obj.description}
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
            </li>
          );
        })}
      </ul>

      <div className="rounded-2xl bg-white border border-line p-4">
        <label className="block">
          <span className="block text-[10.5px] uppercase tracking-wider text-muted font-bold mb-1.5">
            Nom de la campagne
          </span>
          <input
            type="text"
            value={campaignName}
            onChange={(e) => onNameChange(e.target.value)}
            maxLength={100}
            className="w-full px-3 py-2 rounded-xl border border-line bg-white text-[13px] text-night focus:outline-none focus:border-night"
          />
        </label>
      </div>
    </div>
  );
}

function Step2Audience({
  audiences,
  selected,
  onSelect,
  mode,
  onModeChange,
}: {
  audiences: Persona[];
  selected: Set<number>;
  onSelect: (s: Set<number>) => void;
  mode: "suggested" | "auto";
  onModeChange: (m: "suggested" | "auto") => void;
}) {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="font-display text-[22px] sm:text-[26px] leading-tight tracking-[-0.02em] text-night">
          Qui doit voir{" "}
          <em className="italic text-gold-deep">tes annonces</em> ?
        </h2>
        <p className="mt-1 text-[13px] text-night-soft">
          L&apos;IA a identifié{" "}
          {audiences.length > 0
            ? `${audiences.length} audiences pertinentes pour ton business.`
            : "ton audience à partir de ton site."}
        </p>
      </div>

      {/* Mode toggle */}
      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => onModeChange("suggested")}
          className={`flex-1 p-4 rounded-2xl border-2 text-left transition-colors ${
            mode === "suggested"
              ? "border-night bg-night/[0.03]"
              : "border-line bg-white hover:border-night/30"
          }`}
        >
          <p className="text-[13px] font-semibold text-night flex items-center gap-2">
            <Users className="w-3.5 h-3.5 text-gold-deep" aria-hidden />
            Audiences suggérées par l&apos;IA
          </p>
          <p className="text-[11px] text-night-muted mt-0.5">
            Tu choisis parmi {audiences.length || "les"} personas identifiés.
          </p>
        </button>
        <button
          type="button"
          onClick={() => onModeChange("auto")}
          className={`flex-1 p-4 rounded-2xl border-2 text-left transition-colors ${
            mode === "auto"
              ? "border-night bg-night/[0.03]"
              : "border-line bg-white hover:border-night/30"
          }`}
        >
          <p className="text-[13px] font-semibold text-night flex items-center gap-2">
            <Sparkles className="w-3.5 h-3.5 text-gold-deep" aria-hidden />
            Mode automatique (Advantage+)
          </p>
          <p className="text-[11px] text-night-muted mt-0.5">
            DIVARC choisit dynamiquement qui voit tes ads.
          </p>
        </button>
      </div>

      {mode === "suggested" && audiences.length > 0 ? (
        <ul className="space-y-2.5">
          {audiences.map((aud, i) => {
            const isSelected = selected.has(i);
            return (
              <li key={i}>
                <button
                  type="button"
                  onClick={() => {
                    const next = new Set(selected);
                    if (isSelected) next.delete(i);
                    else next.add(i);
                    onSelect(next);
                  }}
                  className={`w-full text-left p-4 rounded-2xl border-2 transition-all ${
                    isSelected
                      ? "border-night bg-night/[0.03]"
                      : "border-line bg-white hover:border-night/30"
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <span
                      aria-hidden
                      className={`mt-0.5 w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 ${
                        isSelected
                          ? "border-night bg-night"
                          : "border-line bg-white"
                      }`}
                    >
                      {isSelected ? (
                        <CheckCircle2
                          className="w-3 h-3 text-cream"
                          aria-hidden
                          strokeWidth={3}
                        />
                      ) : null}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="text-[14px] font-semibold text-night">
                        {aud.persona_name}
                      </p>
                      <p className="text-[12.5px] text-night-soft mt-0.5 leading-snug">
                        {aud.description}
                      </p>
                      {aud.estimated_size ? (
                        <p className="text-[11px] text-night-muted mt-1.5 flex items-center gap-1">
                          <Users className="w-3 h-3" aria-hidden />
                          ~{formatN(aud.estimated_size)} personnes
                        </p>
                      ) : null}
                    </div>
                  </div>
                </button>
              </li>
            );
          })}
        </ul>
      ) : null}

      {mode === "auto" ? (
        <div className="rounded-2xl bg-white border border-line p-5 text-center">
          <Sparkles
            className="w-8 h-8 text-gold-deep mx-auto mb-2"
            aria-hidden
          />
          <p className="text-[14px] font-semibold text-night">
            DIVARC trouvera automatiquement les bonnes personnes
          </p>
          <p className="text-[12.5px] text-night-soft mt-1.5 leading-relaxed">
            En s&apos;appuyant sur l&apos;analyse de ton site, l&apos;IA
            ajustera dynamiquement le ciblage selon ce qui performe le mieux.
            Recommandé pour démarrer rapidement.
          </p>
        </div>
      ) : null}

      {mode === "suggested" && audiences.length === 0 ? (
        <div className="rounded-2xl bg-amber-50 border border-amber-200 p-4 text-[12.5px] text-amber-900">
          Aucune audience pré-générée disponible. Bascule sur{" "}
          <strong>Mode automatique</strong> ou utilise le{" "}
          <strong>Mode Expert</strong> pour personnaliser ton ciblage.
        </div>
      ) : null}
    </div>
  );
}

function Step3Creatives({
  variants,
  selected,
  onSelect,
  onUpdateVariant,
  onRegenerate,
  advertiserName,
  autoDisclaimer,
}: {
  variants: AdVariant[];
  selected: number;
  onSelect: (i: number) => void;
  onUpdateVariant: (i: number, partial: Partial<AdVariant>) => void;
  onRegenerate: (i: number) => void;
  advertiserName: string;
  autoDisclaimer: string | null;
}) {
  const v = variants[selected];
  return (
    <div className="space-y-6">
      <div>
        <h2 className="font-display text-[22px] sm:text-[26px] leading-tight tracking-[-0.02em] text-night">
          Choisis ton{" "}
          <em className="italic text-gold-deep">annonce</em>
        </h2>
        <p className="mt-1 text-[13px] text-night-soft">
          3 variations générées par l&apos;IA. Édite directement le texte
          pour ajuster le ton.
        </p>
      </div>

      {/* Selector variantes */}
      <div className="flex gap-2 flex-wrap">
        {variants.map((_, i) => (
          <button
            key={i}
            type="button"
            onClick={() => onSelect(i)}
            className={`px-3 py-1.5 rounded-full text-[12px] font-semibold border ${
              selected === i
                ? "border-night bg-night text-cream"
                : "border-line bg-white text-night-muted hover:bg-bg-soft"
            }`}
          >
            Variante {i + 1}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-5">
        {/* Form */}
        <div className="space-y-3.5">
          <Field label="Titre principal (max 40 caractères) *">
            <input
              type="text"
              value={v?.headline ?? ""}
              onChange={(e) =>
                onUpdateVariant(selected, { headline: e.target.value })
              }
              maxLength={40}
              className="w-full px-3 py-2 rounded-xl border border-line bg-white text-[14px] font-semibold text-night focus:outline-none focus:border-night"
            />
          </Field>
          <Field label="Description (max 30 caractères)">
            <input
              type="text"
              value={v?.description ?? ""}
              onChange={(e) =>
                onUpdateVariant(selected, { description: e.target.value })
              }
              maxLength={30}
              className="w-full px-3 py-2 rounded-xl border border-line bg-white text-[13px] text-night focus:outline-none focus:border-night"
            />
          </Field>
          <Field label="Texte d'accroche (max 125 caractères) *">
            <textarea
              rows={2}
              value={v?.primary_text ?? ""}
              onChange={(e) =>
                onUpdateVariant(selected, { primary_text: e.target.value })
              }
              maxLength={125}
              className="w-full px-3 py-2 rounded-xl border border-line bg-white text-[13px] text-night focus:outline-none focus:border-night resize-none"
            />
          </Field>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Field label="Bouton (CTA)">
              <select
                value={v?.cta ?? "learn_more"}
                onChange={(e) =>
                  onUpdateVariant(selected, { cta: e.target.value })
                }
                className="w-full px-3 py-2 rounded-xl border border-line bg-white text-[13px] text-night focus:outline-none focus:border-night"
              >
                <option value="learn_more">En savoir plus</option>
                <option value="shop_now">Acheter</option>
                <option value="sign_up">S&apos;inscrire</option>
                <option value="subscribe">S&apos;abonner</option>
                <option value="download">Télécharger</option>
                <option value="contact_us">Nous contacter</option>
                <option value="book_now">Réserver</option>
                <option value="apply_now">Postuler</option>
              </select>
            </Field>
            <Field label="URL du visuel">
              <input
                type="url"
                value={v?.media_url ?? ""}
                onChange={(e) =>
                  onUpdateVariant(selected, { media_url: e.target.value })
                }
                className="w-full px-3 py-2 rounded-xl border border-line bg-white text-[13px] text-night focus:outline-none focus:border-night"
                placeholder="https://…"
              />
            </Field>
          </div>
          <button
            type="button"
            onClick={() => onRegenerate(selected)}
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-gold/15 border border-gold-deep text-gold-deep text-[12px] font-semibold hover:bg-gold/25"
          >
            <RefreshCw className="w-3 h-3" aria-hidden />
            Régénérer cette variante
          </button>
        </div>

        {/* Preview live */}
        <div className="rounded-2xl bg-bg-soft border border-line p-3">
          <p className="text-[10.5px] uppercase tracking-wider font-bold text-night-muted mb-2.5">
            Aperçu Feed
          </p>
          <AdPreview
            primaryText={v?.primary_text ?? ""}
            headline={v?.headline ?? ""}
            description={v?.description ?? ""}
            mediaUrl={v?.media_url ?? ""}
            callToAction={v?.cta ?? "learn_more"}
            advertiserName={advertiserName}
            autoDisclaimer={autoDisclaimer}
            selectedPlacements={["feed_home"]}
          />
        </div>
      </div>
    </div>
  );
}

function Step4Budget({
  budget,
  onBudgetChange,
  currency,
  endDate,
  onEndDateChange,
  objective,
  campaignName,
  audiencesCount,
  audienceMode,
  variant,
}: {
  budget: number;
  onBudgetChange: (n: number) => void;
  currency: string;
  endDate: string;
  onEndDateChange: (s: string) => void;
  objective: SmartObjective | undefined;
  campaignName: string;
  audiencesCount: number;
  audienceMode: "suggested" | "auto";
  variant: AdVariant;
}) {
  /* Estimation impact basique. */
  const dailyImpressions = Math.round((budget / 5) * 1000);
  const dailyClicks = Math.round(dailyImpressions * 0.015);
  const dailyConversions = Math.round(dailyClicks * 0.02);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="font-display text-[22px] sm:text-[26px] leading-tight tracking-[-0.02em] text-night">
          Combien et{" "}
          <em className="italic text-gold-deep">jusqu&apos;à quand</em> ?
        </h2>
        <p className="mt-1 text-[13px] text-night-soft">
          Définis ton budget et lance ta campagne. Tu peux modifier à tout
          moment.
        </p>
      </div>

      <div className="rounded-2xl bg-white border border-line p-5">
        <div className="flex items-baseline gap-2 mb-3">
          <span className="text-[44px] font-bold text-night leading-none">
            {budget}
          </span>
          <span className="text-[16px] text-night-muted">
            {currency} / jour
          </span>
        </div>
        <input
          type="range"
          min={5}
          max={200}
          step={5}
          value={budget}
          onChange={(e) => onBudgetChange(Number(e.target.value))}
          className="w-full accent-night"
        />
        <div className="grid grid-cols-4 mt-1 text-[10.5px] text-night-muted">
          {BUDGET_MARKERS.map((m) => (
            <div key={m.value} className="text-center first:text-left last:text-right">
              <div className="font-mono">{m.value}€</div>
              <div>{m.label}</div>
            </div>
          ))}
        </div>
        <div className="mt-4 pt-4 border-t border-line grid grid-cols-3 gap-2 text-center">
          <Stat
            label="Impressions/jour"
            value={`~${formatN(dailyImpressions)}`}
          />
          <Stat label="Clics/jour" value={`~${formatN(dailyClicks)}`} />
          <Stat
            label="Conversions/jour"
            value={`~${dailyConversions}`}
          />
        </div>
      </div>

      <Field label="Date de fin (optionnel)">
        <input
          type="date"
          value={endDate}
          onChange={(e) => onEndDateChange(e.target.value)}
          className="w-full px-3 py-2 rounded-xl border border-line bg-white text-[13px] text-night focus:outline-none focus:border-night"
        />
        <p className="text-[11px] text-night-muted mt-1">
          Laisse vide pour une diffusion continue (tu peux mettre en pause
          quand tu veux).
        </p>
      </Field>

      {/* Récap */}
      <div className="rounded-2xl bg-bg-soft border border-line p-4 space-y-1.5 text-[12.5px]">
        <p className="font-semibold text-night mb-2">📋 Récapitulatif</p>
        <p>
          <span className="text-night-muted">Campagne :</span>{" "}
          <strong>{campaignName}</strong>
        </p>
        <p>
          <span className="text-night-muted">Objectif :</span>{" "}
          <strong>{objective?.label ?? "—"}</strong>
        </p>
        <p>
          <span className="text-night-muted">Audience :</span>{" "}
          {audienceMode === "auto" ? (
            <strong>Mode automatique (Advantage+)</strong>
          ) : (
            <strong>
              {audiencesCount} audience{audiencesCount > 1 ? "s" : ""} sélectionnée{audiencesCount > 1 ? "s" : ""}
            </strong>
          )}
        </p>
        <p>
          <span className="text-night-muted">Annonce :</span>{" "}
          <strong>{variant.headline}</strong>
        </p>
        <p>
          <span className="text-night-muted">Budget :</span>{" "}
          <strong>
            {budget} {currency}/jour
          </strong>{" "}
          {endDate ? (
            <>
              jusqu&apos;au{" "}
              <strong>
                {new Date(endDate).toLocaleDateString("fr-FR")}
              </strong>
            </>
          ) : (
            "(diffusion continue)"
          )}
        </p>
      </div>

      <div className="rounded-2xl bg-bg-soft border border-line p-4 text-[12px] text-night-soft leading-relaxed">
        <p>
          ✅ <strong>Conformité auto :</strong> DSA + RGPD + restrictions
          sectorielles vérifiées.
        </p>
        <p>
          ⏱️ <strong>Examen :</strong> ta campagne sera vérifiée par notre
          équipe Trust & Safety (généralement &lt; 1 h).
        </p>
        <p>
          🎯 <strong>Optimisation continue :</strong> l&apos;IA ajuste la
          diffusion en temps réel selon les performances.
        </p>
      </div>
    </div>
  );
}

/* ============================================================
 * Helpers
 * ============================================================ */

function useAnalysisSnapshot(analysisId?: string): AnalysisSnapshot | null {
  const [snapshot, setSnapshot] = useState<AnalysisSnapshot | null>(null);
  useEffect(() => {
    if (!analysisId) return;
    try {
      const raw = sessionStorage.getItem(`divarc-analysis-${analysisId}`);
      if (raw) {
        const parsed = JSON.parse(raw);
        setSnapshot(parsed);
      }
    } catch {
      /* ignore */
    }
  }, [analysisId]);
  return snapshot;
}

function buildVariants(snapshot: AnalysisSnapshot | null): AdVariant[] {
  const headlines = snapshot?.headlines ?? [
    "Découvre notre offre",
    "Notre nouveauté du moment",
    "L'essentiel à ne pas manquer",
  ];
  const descriptions = snapshot?.descriptions ?? [
    "Livraison offerte",
    "Sans engagement",
    "Satisfait ou remboursé",
  ];
  const images = snapshot?.images ?? [];
  const primaryTexts = [
    snapshot?.businessDesc?.slice(0, 125) ??
      "Découvre notre offre exclusive cette semaine.",
    "Profite de notre offre limitée — disponible jusqu'à dimanche.",
    "Rejoins des milliers de clients satisfaits. Essai sans engagement.",
  ];
  const ctas = ["learn_more", "shop_now", "sign_up"];
  const variants: AdVariant[] = [];
  for (let i = 0; i < 3; i++) {
    variants.push({
      headline: headlines[i] ?? headlines[0]!,
      description: descriptions[i] ?? descriptions[0] ?? "",
      primary_text: primaryTexts[i] ?? primaryTexts[0]!,
      cta: ctas[i] ?? "learn_more",
      media_url: images[i] ?? images[0] ?? "",
    });
  }
  return variants;
}

function mapExpertToSmart(expertObj: string): string {
  const map: Record<string, string> = {
    brand_awareness: "brand_awareness",
    reach: "brand_awareness",
    lead_generation: "leads",
    conversions: "sales",
    catalog_sales: "sales",
    marketplace_listing_boost: "sales",
    app_installs: "app",
    store_traffic: "store",
    job_applications: "recruit",
    traffic: "sales",
    engagement: "brand_awareness",
    video_views: "brand_awareness",
    messages: "leads",
    circle_growth: "brand_awareness",
  };
  return map[expertObj] ?? "sales";
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="block text-[10.5px] uppercase tracking-wider text-muted font-bold mb-1.5">
        {label}
      </span>
      {children}
    </label>
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

function formatN(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1000).toFixed(1)}k`;
  return n.toString();
}
