"use client";

import {
  AlertTriangle,
  Briefcase,
  CheckCircle2,
  ExternalLink,
  Eye,
  Filter,
  Globe,
  Image as ImageIcon,
  LayoutGrid,
  Plus,
  Shield,
  ShieldCheck,
  Smartphone,
  Sparkles,
  Store,
  Tag,
  X,
} from "lucide-react";
import { useState } from "react";

/* PlacementsBuilder — placements détaillés + DIVARC Audience Network +
 * Brand Safety Suite, inspiré Meta Ads Manager + Google Display Network.
 *
 * Trois sections :
 *   A. Placements DIVARC : 5 placements natifs avec format/CTR/CPM
 *   B. Audience Network : opt-in réseau partenaires extra-DIVARC
 *   C. Brand Safety : 3 niveaux + topic/keyword exclusions
 */

export type PlacementId =
  | "feed_home"
  | "marketplace_feed"
  | "marketplace_listing_boost"
  | "jobs_feed"
  | "stories";

type PlacementInfo = {
  id: PlacementId;
  label: string;
  format: string;
  ratio: string;
  /* Stats moyennes plateforme V1 — V2 : real-time. */
  avg_ctr: number;
  avg_cpm: number;
  density: string;
  recommended_for: string[]; // objectives
  icon: typeof Briefcase;
};

const PLACEMENT_CATALOG: PlacementInfo[] = [
  {
    id: "feed_home",
    label: "Feed Home",
    format: "Image / vidéo · 1 ad / 5-7 posts",
    ratio: "1:1 ou 4:5",
    avg_ctr: 1.8,
    avg_cpm: 4.2,
    density: "Forte exposition",
    recommended_for: [
      "brand_awareness",
      "reach",
      "traffic",
      "engagement",
      "video_views",
      "conversions",
      "circle_growth",
    ],
    icon: LayoutGrid,
  },
  {
    id: "marketplace_feed",
    label: "Marketplace Feed",
    format: "Carrousel · 1 / 12 listings",
    ratio: "1:1",
    avg_ctr: 2.4,
    avg_cpm: 5.1,
    density: "Intent élevé",
    recommended_for: [
      "traffic",
      "conversions",
      "marketplace_listing_boost",
      "lead_generation",
    ],
    icon: Store,
  },
  {
    id: "marketplace_listing_boost",
    label: "Boost annonce",
    format: "Mise en avant ciblée",
    ratio: "1:1 / 16:9",
    avg_ctr: 3.1,
    avg_cpm: 6.8,
    density: "Très qualifié",
    recommended_for: ["marketplace_listing_boost", "conversions", "traffic"],
    icon: Sparkles,
  },
  {
    id: "jobs_feed",
    label: "Jobs Feed",
    format: "Image · 1 / 15 jobs",
    ratio: "16:9",
    avg_ctr: 1.5,
    avg_cpm: 3.4,
    density: "Audience pro",
    recommended_for: ["job_applications", "lead_generation", "traffic"],
    icon: Briefcase,
  },
  {
    id: "stories",
    label: "Stories",
    format: "Vidéo plein écran 15s",
    ratio: "9:16",
    avg_ctr: 0.9,
    avg_cpm: 2.7,
    density: "Brand-friendly",
    recommended_for: [
      "brand_awareness",
      "reach",
      "video_views",
      "engagement",
    ],
    icon: Smartphone,
  },
];

const BRAND_SAFETY_OPTIONS = [
  {
    id: "limited" as const,
    label: "Limité",
    icon: ShieldCheck,
    description:
      "Uniquement contenus premium vérifiés. Recommandé pour familles, kids, alimentation.",
    cpm_factor: 1.25,
    reach_factor: 0.6,
  },
  {
    id: "standard" as const,
    label: "Standard (recommandé)",
    icon: Shield,
    description:
      "Contenus modérés conformes à nos politiques. Bon équilibre qualité / portée.",
    cpm_factor: 1.0,
    reach_factor: 1.0,
  },
  {
    id: "expanded" as const,
    label: "Étendu",
    icon: Eye,
    description:
      "Audience maximale. Inclut contenus borderline non-modérés. Mature only.",
    cpm_factor: 0.85,
    reach_factor: 1.3,
  },
];

type Props = {
  objective: string;
  placements: string[];
  onPlacementsChange: (next: string[]) => void;
  audienceNetworkEnabled: boolean;
  onAudienceNetworkChange: (next: boolean) => void;
  brandSafetyFilter: "standard" | "limited" | "expanded";
  onBrandSafetyChange: (next: "standard" | "limited" | "expanded") => void;
  excludedTopics: string[];
  onExcludedTopicsChange: (next: string[]) => void;
  excludedKeywords: string[];
  onExcludedKeywordsChange: (next: string[]) => void;
};

export function PlacementsBuilder({
  objective,
  placements,
  onPlacementsChange,
  audienceNetworkEnabled,
  onAudienceNetworkChange,
  brandSafetyFilter,
  onBrandSafetyChange,
  excludedTopics,
  onExcludedTopicsChange,
  excludedKeywords,
  onExcludedKeywordsChange,
}: Props) {
  const [keywordInput, setKeywordInput] = useState("");

  const togglePlacement = (id: PlacementId) => {
    if (placements.includes(id)) {
      if (placements.length === 1) return; // au moins 1 placement requis
      onPlacementsChange(placements.filter((p) => p !== id));
    } else {
      onPlacementsChange([...placements, id]);
    }
  };

  const enableAll = () =>
    onPlacementsChange(PLACEMENT_CATALOG.map((p) => p.id));
  const recommendedOnly = () => {
    const rec = PLACEMENT_CATALOG.filter((p) =>
      p.recommended_for.includes(objective),
    ).map((p) => p.id);
    onPlacementsChange(rec.length > 0 ? rec : ["feed_home"]);
  };

  const addKeyword = () => {
    const k = keywordInput.trim().toLowerCase();
    if (!k || excludedKeywords.includes(k) || excludedKeywords.length >= 50)
      return;
    onExcludedKeywordsChange([...excludedKeywords, k]);
    setKeywordInput("");
  };

  return (
    <div className="space-y-5">
      {/* === Section A : Placements natifs === */}
      <div>
        <div className="flex items-baseline justify-between gap-2 mb-2">
          <h3 className="text-[14px] font-bold text-night">
            Placements DIVARC
          </h3>
          <div className="flex items-center gap-1 text-[10.5px]">
            <button
              type="button"
              onClick={recommendedOnly}
              className="px-2 py-0.5 rounded-full text-night-muted hover:text-night-soft border border-line hover:bg-bg-soft"
            >
              Recommandés
            </button>
            <button
              type="button"
              onClick={enableAll}
              className="px-2 py-0.5 rounded-full text-night-muted hover:text-night-soft border border-line hover:bg-bg-soft"
            >
              Tout activer
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
          {PLACEMENT_CATALOG.map((p) => {
            const active = placements.includes(p.id);
            const recommended = p.recommended_for.includes(objective);
            const Icon = p.icon;
            return (
              <button
                key={p.id}
                type="button"
                onClick={() => togglePlacement(p.id)}
                className={`relative text-left p-3 rounded-xl border transition-colors ${
                  active
                    ? "border-night bg-night/[0.03]"
                    : "border-line bg-white hover:border-night/30"
                }`}
                aria-pressed={active}
              >
                {recommended ? (
                  <span className="absolute top-2 right-2 inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full bg-gold/15 text-gold-deep text-[9.5px] font-bold uppercase tracking-wider">
                    <Sparkles className="w-[10px] h-[10px]" aria-hidden />
                    Reco
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
                    <Icon className="w-[16px] h-[16px]" aria-hidden />
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-baseline gap-1.5">
                      <span className="text-[13px] font-bold text-night">
                        {p.label}
                      </span>
                      {active ? (
                        <CheckCircle2
                          className="w-[12px] h-[12px] text-emerald-600 shrink-0"
                          aria-hidden
                        />
                      ) : null}
                    </div>
                    <p className="text-[11px] text-night-muted">{p.format}</p>
                    <p className="text-[10.5px] text-night-muted">
                      Ratio {p.ratio} · {p.density}
                    </p>
                    <div className="mt-1.5 flex items-center gap-2 text-[10px]">
                      <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded bg-bg-soft font-bold text-night-muted">
                        CTR ~{p.avg_ctr.toFixed(1)} %
                      </span>
                      <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded bg-bg-soft font-bold text-night-muted">
                        CPM ~{p.avg_cpm.toFixed(1)} €
                      </span>
                    </div>
                  </div>
                </div>
              </button>
            );
          })}
        </div>
        <p className="mt-2 text-[10.5px] text-night-muted">
          CTR / CPM moyens 30j dernière période, V2 : real-time par audience.
        </p>
      </div>

      {/* === Section B : DIVARC Audience Network === */}
      <div className="rounded-2xl bg-white border border-line overflow-hidden">
        <div className="px-4 py-3 flex items-start gap-3">
          <span
            aria-hidden
            className="w-9 h-9 rounded-lg bg-gold/15 text-gold-deep flex items-center justify-center shrink-0"
          >
            <Globe className="w-[16px] h-[16px]" aria-hidden />
          </span>
          <div className="min-w-0 flex-1">
            <div className="flex items-baseline gap-2 flex-wrap">
              <span className="text-[13.5px] font-bold text-night">
                DIVARC Audience Network
              </span>
              <span className="text-[10px] uppercase tracking-wider font-bold text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded">
                Bêta
              </span>
            </div>
            <p className="text-[11.5px] text-night-muted leading-snug mt-0.5">
              Étend ta diffusion à 1 200+ sites &amp; apps partenaires
              vérifiés. CPM moyen ~25 % moins cher, brand safety auto.
            </p>
          </div>
          <Toggle
            checked={audienceNetworkEnabled}
            onChange={onAudienceNetworkChange}
            label="Activer Audience Network"
          />
        </div>
        {audienceNetworkEnabled ? (
          <div className="px-4 pb-3 pt-1 border-t border-line text-[11.5px] text-night-soft leading-snug">
            <p className="font-semibold text-night mb-1">
              Catégories de sites partenaires :
            </p>
            <div className="flex flex-wrap gap-1">
              {[
                "Actualités",
                "Lifestyle",
                "Sport",
                "Tech",
                "Culture",
                "Voyage",
                "Cuisine",
                "Mode",
              ].map((c) => (
                <span
                  key={c}
                  className="inline-block px-2 py-0.5 rounded-full bg-bg-soft text-[11px] text-night-muted"
                >
                  {c}
                </span>
              ))}
            </div>
            <p className="text-[10.5px] text-night-muted mt-2 inline-flex items-center gap-1">
              <ExternalLink className="w-[10px] h-[10px]" aria-hidden />
              Liste publique des publishers · brand safety MRC certifié
            </p>
          </div>
        ) : null}
      </div>

      {/* === Section C : Brand Safety Suite === */}
      <div className="rounded-2xl bg-white border border-line overflow-hidden">
        <div className="px-4 py-3 flex items-start gap-3">
          <span
            aria-hidden
            className="w-9 h-9 rounded-lg bg-gold/15 text-gold-deep flex items-center justify-center shrink-0"
          >
            <Shield className="w-[16px] h-[16px]" aria-hidden />
          </span>
          <div className="min-w-0 flex-1">
            <span className="text-[13.5px] font-bold text-night">
              Brand Safety Suite
            </span>
            <p className="text-[11.5px] text-night-muted leading-snug">
              Contrôle l&apos;environnement éditorial autour de tes ads.
            </p>
          </div>
        </div>

        <div className="px-4 pb-4 pt-1 border-t border-line space-y-4">
          {/* Filter tier. */}
          <div>
            <label className="block text-[10.5px] font-bold uppercase tracking-wider text-night-muted mb-2">
              Niveau de filtrage
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              {BRAND_SAFETY_OPTIONS.map((bs) => {
                const active = brandSafetyFilter === bs.id;
                const Icon = bs.icon;
                return (
                  <button
                    key={bs.id}
                    type="button"
                    onClick={() => onBrandSafetyChange(bs.id)}
                    className={`text-left p-3 rounded-xl border transition-colors ${
                      active
                        ? "border-night bg-night/[0.03]"
                        : "border-line bg-white hover:border-night/30"
                    }`}
                    aria-pressed={active}
                  >
                    <div className="flex items-center gap-2 mb-1">
                      <Icon
                        className={`w-[14px] h-[14px] ${
                          active ? "text-night" : "text-night-muted"
                        }`}
                        aria-hidden
                      />
                      <span className="text-[12.5px] font-bold text-night">
                        {bs.label}
                      </span>
                      {active ? (
                        <CheckCircle2
                          className="w-[12px] h-[12px] text-emerald-600 ml-auto"
                          aria-hidden
                        />
                      ) : null}
                    </div>
                    <p className="text-[10.5px] text-night-muted leading-snug">
                      {bs.description}
                    </p>
                    <div className="mt-1.5 flex gap-2 text-[10px] text-night-muted">
                      <span>
                        CPM ×{bs.cpm_factor.toFixed(2)}
                      </span>
                      <span>·</span>
                      <span>Reach ×{bs.reach_factor.toFixed(1)}</span>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Topic exclusions. */}
          <div>
            <label className="block text-[10.5px] font-bold uppercase tracking-wider text-night-muted mb-2">
              <Filter className="inline w-[10px] h-[10px] mr-1" aria-hidden />
              Catégories à exclure ({excludedTopics.length}/15)
            </label>
            <div className="flex flex-wrap gap-1.5">
              {[
                "tragedy",
                "violence",
                "weapons",
                "alcohol",
                "tobacco",
                "gambling",
                "controversial_news",
                "politics",
                "religion",
                "death",
                "crime",
                "celeb_scandal",
                "negative_reviews",
                "adult_humor",
                "explicit_lyrics",
              ].map((t) => {
                const excluded = excludedTopics.includes(t);
                return (
                  <button
                    key={t}
                    type="button"
                    onClick={() => {
                      if (excluded) {
                        onExcludedTopicsChange(
                          excludedTopics.filter((x) => x !== t),
                        );
                      } else if (excludedTopics.length < 15) {
                        onExcludedTopicsChange([...excludedTopics, t]);
                      }
                    }}
                    className={`px-2.5 py-1 rounded-full text-[11px] border transition-colors ${
                      excluded
                        ? "bg-red-600 text-white border-red-700"
                        : "bg-white text-night-muted border-line hover:bg-bg-soft"
                    }`}
                  >
                    {labelTopic(t)}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Keyword exclusions. */}
          <div>
            <label className="block text-[10.5px] font-bold uppercase tracking-wider text-night-muted mb-2">
              <Tag className="inline w-[10px] h-[10px] mr-1" aria-hidden />
              Mots-clés à exclure ({excludedKeywords.length}/50)
            </label>
            <div className="flex gap-2 mb-2">
              <input
                type="text"
                value={keywordInput}
                onChange={(e) => setKeywordInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    addKeyword();
                  }
                }}
                placeholder="ex: scandale, polémique, accident…"
                maxLength={40}
                className="flex-1 px-3 py-2 rounded-lg border border-line bg-white text-[12.5px]"
              />
              <button
                type="button"
                onClick={addKeyword}
                disabled={!keywordInput.trim() || excludedKeywords.length >= 50}
                className="px-3 py-2 rounded-lg bg-night text-cream text-[12px] font-semibold disabled:opacity-40"
              >
                <Plus className="w-[14px] h-[14px]" aria-hidden />
              </button>
            </div>
            {excludedKeywords.length > 0 ? (
              <div className="flex flex-wrap gap-1.5">
                {excludedKeywords.map((k) => (
                  <span
                    key={k}
                    className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-red-50 text-red-800 text-[11px] border border-red-200"
                  >
                    {k}
                    <button
                      type="button"
                      onClick={() =>
                        onExcludedKeywordsChange(
                          excludedKeywords.filter((x) => x !== k),
                        )
                      }
                      className="hover:text-red-900"
                      aria-label={`Retirer ${k}`}
                    >
                      <X className="w-[11px] h-[11px]" aria-hidden />
                    </button>
                  </span>
                ))}
              </div>
            ) : null}
            <p className="text-[10px] text-night-muted mt-1.5 leading-snug">
              Tes ads ne s&apos;afficheront pas dans des contenus mentionnant
              ces termes (titre + body).
            </p>
          </div>

          {brandSafetyFilter === "expanded" ? (
            <div className="rounded-lg bg-amber-50 border border-amber-200 p-2.5 text-[11.5px] text-amber-900">
              <AlertTriangle
                className="inline w-[12px] h-[12px] mr-1"
                aria-hidden
              />
              Niveau étendu : audience large mais environnement moins
              contrôlé. Vérifie l&apos;adéquation avec tes valeurs de marque.
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}

function Toggle({
  checked,
  onChange,
  label,
}: {
  checked: boolean;
  onChange: (next: boolean) => void;
  label: string;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      onClick={() => onChange(!checked)}
      className={`relative w-10 h-6 rounded-full transition-colors shrink-0 ${
        checked ? "bg-night" : "bg-line"
      }`}
    >
      <span
        className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-cream transition-transform ${
          checked ? "translate-x-4" : ""
        }`}
        aria-hidden
      />
    </button>
  );
}

function labelTopic(t: string): string {
  return (
    {
      tragedy: "Tragédies",
      violence: "Violence",
      weapons: "Armes",
      alcohol: "Alcool",
      tobacco: "Tabac",
      gambling: "Jeux d'argent",
      controversial_news: "Actu polémique",
      politics: "Politique",
      religion: "Religion",
      death: "Décès",
      crime: "Crime",
      celeb_scandal: "Scandales celebs",
      negative_reviews: "Avis négatifs",
      adult_humor: "Humour adulte",
      explicit_lyrics: "Paroles explicites",
    }[t] ?? t
  );
}
