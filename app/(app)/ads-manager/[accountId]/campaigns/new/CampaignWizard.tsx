"use client";

import { AlertTriangle, ChevronRight } from "lucide-react";
import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { AdPreview } from "@/components/ads/AdPreview";
import {
  ALWAYS_FORBIDDEN_AD_CATEGORIES,
  AGE_GATED_18PLUS_CATEGORIES,
  CATEGORY_DISCLAIMERS,
  REQUIRES_CERTIFICATION_CATEGORIES,
  validateTargetingSpec,
  type TargetingSpec,
} from "@/lib/ads/types";
import { createFullCampaign } from "./actions";

type Entity = {
  id: string;
  name: string;
  type: string;
  url: string | null;
};

const OBJECTIVES = [
  {
    group: "Notoriété",
    items: [
      { id: "brand_awareness", label: "Notoriété de la marque" },
      { id: "reach", label: "Portée" },
    ],
  },
  {
    group: "Considération",
    items: [
      { id: "traffic", label: "Trafic site web" },
      { id: "engagement", label: "Engagement" },
      { id: "video_views", label: "Vues vidéo" },
      { id: "lead_generation", label: "Génération de leads" },
      { id: "messages", label: "Messages" },
    ],
  },
  {
    group: "Conversion",
    items: [
      { id: "conversions", label: "Conversions site" },
      { id: "marketplace_listing_boost", label: "Boost annonce Marketplace" },
      { id: "job_applications", label: "Candidatures" },
      { id: "circle_growth", label: "Croissance de cercle" },
    ],
  },
] as const;

const PLACEMENTS = [
  { id: "feed_home", label: "Feed Home", note: "1 ad / 5-7 posts" },
  { id: "marketplace_feed", label: "Marketplace", note: "1 / 12 listings" },
  {
    id: "marketplace_listing_boost",
    label: "Boost annonce",
    note: "Mise en avant d'une annonce existante",
  },
  { id: "jobs_feed", label: "Jobs", note: "1 / 15 jobs" },
  { id: "stories", label: "Stories", note: "1 / 6-10 stories" },
] as const;

const CTAS = [
  { id: "learn_more", label: "En savoir plus" },
  { id: "shop_now", label: "Acheter" },
  { id: "sign_up", label: "S'inscrire" },
  { id: "subscribe", label: "S'abonner" },
  { id: "download", label: "Télécharger" },
  { id: "contact_us", label: "Nous contacter" },
  { id: "book_now", label: "Réserver" },
  { id: "apply_now", label: "Postuler" },
];

export function CampaignWizard({
  accountId,
  currency,
  entities,
}: {
  accountId: string;
  currency: string;
  entities: Entity[];
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  /* Étape 1 — objective. */
  const [objective, setObjective] = useState<string>("traffic");

  /* Étape 2 — config. */
  const [name, setName] = useState("");
  const [dailyBudget, setDailyBudget] = useState("20");
  const [specialAdCategory, setSpecialAdCategory] = useState<string>("");
  const [adCategoryHint, setAdCategoryHint] = useState<string>("");

  /* Étape 3 — targeting. */
  const [ageMin, setAgeMin] = useState(18);
  const [ageMax, setAgeMax] = useState(65);
  const [genders, setGenders] = useState<string[]>(["all"]);
  const [countries, setCountries] = useState<string[]>(["FR"]);
  const [interests, setInterests] = useState<string>("");
  const [placements, setPlacements] = useState<string[]>([
    "feed_home",
    "marketplace_feed",
  ]);
  const [bidStrategy, setBidStrategy] = useState<string>("lowest_cost");
  const [optimizationGoal, setOptimizationGoal] =
    useState<string>("link_clicks");
  const [billingEvent, setBillingEvent] = useState<string>("clicks");
  const [frequencyMax, setFrequencyMax] = useState("3");
  const [frequencyPeriod, setFrequencyPeriod] = useState("7");

  /* Étape 4 — creative. */
  const [creativeType, setCreativeType] = useState<string>("single_image");
  const [primaryText, setPrimaryText] = useState("");
  const [headline, setHeadline] = useState("");
  const [description, setDescription] = useState("");
  const [mediaUrl, setMediaUrl] = useState("");
  const [destinationUrl, setDestinationUrl] = useState("");
  const [callToAction, setCallToAction] = useState<string>("learn_more");
  const [advertiserEntityId, setAdvertiserEntityId] = useState<string>(
    entities[0]?.id ?? "",
  );

  /* Validation conformité en temps réel. */
  const targetingValidation = useMemo(() => {
    const spec: TargetingSpec = {
      geo: { countries },
      age_min: ageMin,
      age_max: ageMax,
      genders: genders as TargetingSpec["genders"],
      interests: interests
        .split(",")
        .map((i) => i.trim())
        .filter(Boolean)
        .map((topic_id) => ({ topic_id })),
    };
    return validateTargetingSpec(
      spec,
      (specialAdCategory || null) as
        | "housing"
        | "employment"
        | "credit"
        | "social"
        | null,
    );
  }, [
    ageMin,
    ageMax,
    genders,
    countries,
    interests,
    specialAdCategory,
  ]);

  const isForbidden = (
    ALWAYS_FORBIDDEN_AD_CATEGORIES as readonly string[]
  ).includes(adCategoryHint);

  const isAgeGated = (AGE_GATED_18PLUS_CATEGORIES as readonly string[]).includes(
    adCategoryHint,
  );

  const requiresCert = (
    REQUIRES_CERTIFICATION_CATEGORIES as readonly string[]
  ).includes(adCategoryHint);

  function submit() {
    if (name.length < 2) {
      toast.error("Donne un nom à ta campagne.");
      return;
    }
    if (!targetingValidation.valid) {
      toast.error(targetingValidation.errors[0] ?? "Ciblage invalide.");
      return;
    }
    if (isForbidden) {
      toast.error(
        `Catégorie "${adCategoryHint}" interdite à la publicité sur DIVARC.`,
      );
      return;
    }
    if (placements.length === 0) {
      toast.error("Sélectionne au moins un placement.");
      return;
    }
    if (primaryText.length < 1 || headline.length < 1) {
      toast.error("Texte principal et titre obligatoires.");
      return;
    }
    if (!advertiserEntityId) {
      toast.error(
        "Tu dois lier la campagne à une page représentée. Crée-en une depuis ton compte entreprise.",
      );
      return;
    }

    startTransition(async () => {
      const result = await createFullCampaign({
        ad_account_id: accountId,
        objective: objective as Parameters<
          typeof createFullCampaign
        >[0]["objective"],
        name,
        daily_budget: dailyBudget ? Number(dailyBudget) : undefined,
        special_ad_category: specialAdCategory
          ? (specialAdCategory as "housing" | "employment" | "credit" | "social")
          : undefined,
        targeting: {
          geo: { countries },
          age_min: ageMin,
          age_max: ageMax,
          genders: genders as TargetingSpec["genders"],
          interests: interests
            .split(",")
            .map((i) => i.trim())
            .filter(Boolean)
            .map((topic_id) => ({ topic_id })),
        },
        placements: placements as Parameters<
          typeof createFullCampaign
        >[0]["placements"],
        bid_strategy: bidStrategy as Parameters<
          typeof createFullCampaign
        >[0]["bid_strategy"],
        optimization_goal: optimizationGoal as Parameters<
          typeof createFullCampaign
        >[0]["optimization_goal"],
        billing_event: billingEvent as Parameters<
          typeof createFullCampaign
        >[0]["billing_event"],
        frequency_max: frequencyMax ? Number(frequencyMax) : undefined,
        frequency_period_days: frequencyPeriod
          ? Number(frequencyPeriod)
          : undefined,
        creative_type: creativeType as Parameters<
          typeof createFullCampaign
        >[0]["creative_type"],
        primary_text: primaryText,
        headline,
        description: description || undefined,
        media_url: mediaUrl || undefined,
        destination_url: destinationUrl || undefined,
        call_to_action: callToAction,
        advertiser_entity_id: advertiserEntityId,
        ad_category_hint: adCategoryHint || undefined,
      });
      if (!result.ok) {
        toast.error(
          result.error +
            (result.validation_errors?.length
              ? ` (${result.validation_errors[0]})`
              : ""),
        );
        return;
      }
      toast.success("Campagne créée. En attente de revue conformité.");
      router.push(`/ads-manager/${accountId}`);
    });
  }

  return (
    <div className="space-y-6">
      {/* === Étape 1 — Objectif === */}
      <Section number={1} title="Objectif">
        <div className="space-y-3">
          {OBJECTIVES.map((g) => (
            <div key={g.group}>
              <p className="text-[10.5px] uppercase tracking-wider text-muted font-bold mb-1.5">
                {g.group}
              </p>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5">
                {g.items.map((o) => (
                  <button
                    key={o.id}
                    type="button"
                    onClick={() => setObjective(o.id)}
                    className={`px-3 py-2 rounded-xl border text-left text-[12.5px] ${
                      objective === o.id
                        ? "border-night bg-night/5 text-night font-semibold"
                        : "border-line bg-white hover:border-night/30"
                    }`}
                  >
                    {o.label}
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
      </Section>

      {/* === Étape 2 — Config === */}
      <Section number={2} title="Configuration">
        <Field label="Nom de la campagne *">
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            maxLength={100}
            className={inputCls}
            placeholder="ex: Lancement printemps 2026"
          />
        </Field>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Field label={`Budget quotidien (${currency})`}>
            <input
              type="number"
              value={dailyBudget}
              onChange={(e) => setDailyBudget(e.target.value)}
              min={1}
              step={5}
              className={inputCls}
            />
          </Field>
          <Field label="Catégorie spéciale (anti-discrimination)">
            <select
              value={specialAdCategory}
              onChange={(e) => setSpecialAdCategory(e.target.value)}
              className={inputCls}
            >
              <option value="">Aucune</option>
              <option value="housing">Logement</option>
              <option value="employment">Emploi</option>
              <option value="credit">Crédit / Finance</option>
              <option value="social">Sujet social / politique</option>
            </select>
          </Field>
        </div>
        {specialAdCategory ? (
          <Banner tone="warn">
            Cette catégorie ({specialAdCategory}) impose des restrictions de
            ciblage : pas de discrimination par âge / genre / code postal.
          </Banner>
        ) : null}

        <Field label="Catégorie de produit / service (pour conformité)">
          <input
            type="text"
            value={adCategoryHint}
            onChange={(e) => setAdCategoryHint(e.target.value)}
            className={inputCls}
            placeholder="ex: alcool, finance_credit, immobilier (laisse vide si générique)"
          />
        </Field>
        {isForbidden ? (
          <Banner tone="error">
            <strong>Catégorie interdite.</strong> La publicité pour&nbsp;
            <code>{adCategoryHint}</code> n&apos;est pas autorisée sur DIVARC
            (ARPP / Loi Évin / cadres réglementaires sectoriels).
          </Banner>
        ) : null}
        {isAgeGated ? (
          <Banner tone="warn">
            Catégorie 18+ : un disclaimer légal sera ajouté automatiquement et
            le ciblage minimum 18 ans est imposé.
          </Banner>
        ) : null}
        {requiresCert ? (
          <Banner tone="warn">
            Catégorie réglementée : tu devras fournir un justificatif
            professionnel (ORIAS / ACPR / carte T / barreau) avant validation
            de la campagne.
          </Banner>
        ) : null}
      </Section>

      {/* === Étape 3 — Audience + placements === */}
      <Section number={3} title="Audience, budget & placements">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <Field label="Âge min">
            <input
              type="number"
              value={ageMin}
              onChange={(e) => setAgeMin(Number(e.target.value))}
              min={18}
              max={99}
              className={inputCls}
            />
          </Field>
          <Field label="Âge max">
            <input
              type="number"
              value={ageMax}
              onChange={(e) => setAgeMax(Number(e.target.value))}
              min={18}
              max={99}
              className={inputCls}
            />
          </Field>
          <Field label="Genres">
            <select
              value={genders[0]}
              onChange={(e) => setGenders([e.target.value])}
              className={inputCls}
            >
              <option value="all">Tous</option>
              <option value="male">Hommes</option>
              <option value="female">Femmes</option>
              <option value="non_binary">Non-binaires</option>
            </select>
          </Field>
          <Field label="Pays">
            <select
              value={countries[0]}
              onChange={(e) => setCountries([e.target.value])}
              className={inputCls}
            >
              <option value="FR">France</option>
              <option value="BE">Belgique</option>
              <option value="CH">Suisse</option>
              <option value="LU">Luxembourg</option>
              <option value="CA">Canada</option>
            </select>
          </Field>
        </div>
        <Field label="Intérêts (slugs séparés par virgules)">
          <input
            type="text"
            value={interests}
            onChange={(e) => setInterests(e.target.value)}
            className={inputCls}
            placeholder="ex: tech.web_dev, lifestyle.cooking"
          />
          <p className="text-[10.5px] text-night-muted mt-1">
            Catégories sensibles (santé, religion, politique, sexualité,
            ethnicité, syndicats) interdites par RGPD art. 9.
          </p>
        </Field>

        {targetingValidation.errors.length > 0 ? (
          <Banner tone="error">
            <p className="font-semibold">Conformité ciblage :</p>
            <ul className="list-disc pl-4 mt-1">
              {targetingValidation.errors.map((e) => (
                <li key={e}>{e}</li>
              ))}
            </ul>
          </Banner>
        ) : null}

        <div>
          <p className="text-[11.5px] font-bold uppercase tracking-wider text-muted mb-1.5">
            Placements *
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
            {PLACEMENTS.map((p) => (
              <label
                key={p.id}
                className={`flex items-start gap-2 px-3 py-2 rounded-xl border cursor-pointer ${
                  placements.includes(p.id)
                    ? "border-night bg-night/5"
                    : "border-line hover:border-night/30"
                }`}
              >
                <input
                  type="checkbox"
                  checked={placements.includes(p.id)}
                  onChange={(e) => {
                    if (e.target.checked) {
                      setPlacements([...placements, p.id]);
                    } else {
                      setPlacements(placements.filter((x) => x !== p.id));
                    }
                  }}
                  className="mt-0.5 accent-night"
                />
                <span>
                  <span className="block text-[13px] font-semibold text-night">
                    {p.label}
                  </span>
                  <span className="block text-[11px] text-night-muted">
                    {p.note}
                  </span>
                </span>
              </label>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Field label="Stratégie d'enchère">
            <select
              value={bidStrategy}
              onChange={(e) => setBidStrategy(e.target.value)}
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
              value={optimizationGoal}
              onChange={(e) => setOptimizationGoal(e.target.value)}
              className={inputCls}
            >
              <option value="impressions">Impressions</option>
              <option value="reach">Reach</option>
              <option value="link_clicks">Clics liens</option>
              <option value="landing_page_views">Vues landing</option>
              <option value="post_engagement">Engagement</option>
              <option value="video_views_3s">Vues 3s</option>
              <option value="thruplay">ThruPlay</option>
              <option value="lead_generation">Leads</option>
              <option value="conversions">Conversions</option>
            </select>
          </Field>
          <Field label="Facturation">
            <select
              value={billingEvent}
              onChange={(e) => setBillingEvent(e.target.value)}
              className={inputCls}
            >
              <option value="impressions">CPM (impressions)</option>
              <option value="clicks">CPC (clics)</option>
              <option value="video_views">CPV (vues vidéo)</option>
              <option value="conversions">CPA (conversions)</option>
            </select>
          </Field>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <Field label="Fréquence max (impressions / user)">
            <input
              type="number"
              value={frequencyMax}
              onChange={(e) => setFrequencyMax(e.target.value)}
              min={1}
              max={50}
              className={inputCls}
            />
          </Field>
          <Field label="Sur (jours)">
            <input
              type="number"
              value={frequencyPeriod}
              onChange={(e) => setFrequencyPeriod(e.target.value)}
              min={1}
              max={30}
              className={inputCls}
            />
          </Field>
        </div>
      </Section>

      {/* === Étape 4 — Creative === */}
      <Section number={4} title="Creative">
        {entities.length === 0 ? (
          <Banner tone="error">
            Tu dois d&apos;abord créer une page représentée (advertiser_entity)
            avant de pouvoir lancer une ad. (V1 : créer manuellement via SQL ou
            API — UI à venir.)
          </Banner>
        ) : (
          <Field label="Page représentée *">
            <select
              value={advertiserEntityId}
              onChange={(e) => setAdvertiserEntityId(e.target.value)}
              className={inputCls}
            >
              {entities.map((e) => (
                <option key={e.id} value={e.id}>
                  {e.name} ({e.type})
                </option>
              ))}
            </select>
          </Field>
        )}
        <Field label="Format">
          <select
            value={creativeType}
            onChange={(e) => setCreativeType(e.target.value)}
            className={inputCls}
          >
            <option value="single_image">Image unique</option>
            <option value="single_video">Vidéo unique</option>
            <option value="carousel">Carrousel</option>
          </select>
        </Field>
        <Field label="Texte principal * (max 125 chars)">
          <textarea
            rows={2}
            value={primaryText}
            onChange={(e) => setPrimaryText(e.target.value)}
            maxLength={125}
            className={inputCls}
          />
        </Field>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Field label="Titre * (max 40 chars)">
            <input
              type="text"
              value={headline}
              onChange={(e) => setHeadline(e.target.value)}
              maxLength={40}
              className={inputCls}
            />
          </Field>
          <Field label="Description (max 30 chars)">
            <input
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              maxLength={30}
              className={inputCls}
            />
          </Field>
          <Field label="URL média (image/vidéo)">
            <input
              type="url"
              value={mediaUrl}
              onChange={(e) => setMediaUrl(e.target.value)}
              className={inputCls}
              placeholder="https://…"
            />
          </Field>
          <Field label="URL destination">
            <input
              type="url"
              value={destinationUrl}
              onChange={(e) => setDestinationUrl(e.target.value)}
              className={inputCls}
              placeholder="https://…"
            />
          </Field>
          <Field label="Call to action">
            <select
              value={callToAction}
              onChange={(e) => setCallToAction(e.target.value)}
              className={inputCls}
            >
              {CTAS.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.label}
                </option>
              ))}
            </select>
          </Field>
        </div>

        {/* Preview live multi-placement. */}
        <div className="pt-2 mt-4 border-t border-line">
          <AdPreview
            primaryText={primaryText}
            headline={headline}
            description={description}
            mediaUrl={mediaUrl}
            callToAction={callToAction}
            advertiserName={
              entities.find((e) => e.id === advertiserEntityId)?.name ??
              "Annonceur"
            }
            autoDisclaimer={
              adCategoryHint
                ? CATEGORY_DISCLAIMERS[adCategoryHint] ?? null
                : null
            }
            selectedPlacements={placements}
          />
        </div>
      </Section>

      {/* === Étape 5 — Review & lancement === */}
      <Section number={5} title="Review & lancement">
        <div className="rounded-2xl bg-bg-soft border border-line p-4 space-y-1.5 text-[12.5px] text-night-soft">
          <p>
            <strong>Objectif :</strong> {objective}
          </p>
          <p>
            <strong>Audience :</strong> {ageMin}-{ageMax} ans · {genders[0]} ·{" "}
            {countries.join(", ")}
          </p>
          <p>
            <strong>Placements :</strong> {placements.join(", ")}
          </p>
          <p>
            <strong>Budget :</strong> {dailyBudget} {currency}/jour
          </p>
          <p>
            <strong>Optimisation :</strong> {optimizationGoal} · {billingEvent}
          </p>
          {specialAdCategory ? (
            <p>
              <strong>Special Ad Category :</strong> {specialAdCategory}
            </p>
          ) : null}
        </div>

        <div className="rounded-2xl bg-bg-soft border border-line p-4 text-[12px] text-night-soft leading-relaxed">
          <p className="font-semibold text-night mb-1.5">
            <AlertTriangle
              className="inline w-3.5 h-3.5 -mt-0.5 mr-1 text-amber-700"
              aria-hidden
            />
            Conformité automatique
          </p>
          <ul className="list-disc pl-4 space-y-0.5">
            <li>DSA art. 28 : ciblage 18+ enforced.</li>
            <li>RGPD art. 9 : pas de catégories sensibles.</li>
            <li>
              Brand safety : modération texte + image (OpenAI Moderation +
              Vision) avant diffusion.
            </li>
            <li>
              Disclaimers légaux ajoutés automatiquement (Évin, ANJ, ACPR,
              Royer) selon catégorie détectée.
            </li>
            <li>
              La campagne sera ajoutée à la{" "}
              <a
                href="/legal/ads-library"
                target="_blank"
                className="underline"
              >
                bibliothèque publique d&apos;annonces
              </a>{" "}
              (DSA art. 39, conservation 1 an).
            </li>
          </ul>
        </div>

        <button
          type="button"
          onClick={submit}
          disabled={pending || isForbidden || !targetingValidation.valid}
          className="inline-flex items-center justify-center gap-1.5 px-5 py-3 rounded-full bg-night text-cream text-[14px] font-semibold disabled:opacity-50 hover:bg-night/90"
        >
          {pending ? "Création…" : "Créer la campagne"}
          <ChevronRight className="w-4 h-4" aria-hidden />
        </button>
      </Section>
    </div>
  );
}

const inputCls =
  "w-full px-3 py-2 rounded-xl border border-line bg-white text-[13px] text-night focus:outline-none focus:border-night";

function Section({
  number,
  title,
  children,
}: {
  number: number;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-2xl bg-white border border-line p-5 sm:p-6 space-y-4">
      <div className="flex items-center gap-2.5">
        <span
          aria-hidden
          className="w-7 h-7 rounded-full bg-gold/15 text-gold-deep flex items-center justify-center text-[12px] font-bold"
        >
          {number}
        </span>
        <h2 className="text-[15px] font-semibold text-night">{title}</h2>
      </div>
      {children}
    </section>
  );
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
      <span className="block text-[11.5px] font-bold uppercase tracking-wider text-muted mb-1.5">
        {label}
      </span>
      {children}
    </label>
  );
}

function Banner({
  tone,
  children,
}: {
  tone: "warn" | "error";
  children: React.ReactNode;
}) {
  const cls =
    tone === "error"
      ? "bg-red-50 border-red-200 text-red-900"
      : "bg-amber-50 border-amber-200 text-amber-900";
  return (
    <div className={`rounded-xl border px-3 py-2 text-[12.5px] ${cls}`}>
      {children}
    </div>
  );
}
