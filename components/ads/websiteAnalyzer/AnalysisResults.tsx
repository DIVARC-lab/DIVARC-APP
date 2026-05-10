"use client";

import {
  AlertTriangle,
  Check,
  CheckCircle2,
  Image as ImageIcon,
  Plus,
  Sparkles,
  Target,
  Users,
  X,
} from "lucide-react";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import type { WebsiteAnalysisResult } from "@/lib/database.types";

/* État 3 — affichage des résultats avec édition inline + 2 CTAs finaux.
 *
 * Cards :
 *   1. Business Identity (nom + catégorie + description, éditable)
 *   2. Audiences suggérées (3 personas, sélectionnables)
 *   3. Mots-clés (tags toggle, ajout manuel)
 *   4. Visuels (grid avec checkboxes pour pré-sélectionner)
 *   5. Ad copies (5 propositions, éditables)
 *   6. Budget recommandé (slider avec marqueurs)
 *
 * État sauvegardé en localStorage par analysis_id pour reprendre
 * si refresh ou navigation. */

export function AnalysisResults({
  analysisId,
  accountId,
  result: initialResult,
}: {
  analysisId: string;
  accountId: string;
  result: WebsiteAnalysisResult;
}) {
  const router = useRouter();
  /* On copie le result dans un state éditable. */
  const [businessName, setBusinessName] = useState(initialResult.business_name);
  const [businessDesc, setBusinessDesc] = useState(
    initialResult.business_description,
  );
  const [businessCategory, setBusinessCategory] = useState(
    initialResult.business_category.join(", "),
  );

  /* Audiences sélectionnées (default toutes). */
  const [audiencesSelected, setAudiencesSelected] = useState<Set<number>>(
    new Set(initialResult.audiences_recommended.map((_, i) => i)),
  );

  /* Keywords sélectionnés (default top 15 primary). */
  const [keywordsSelected, setKeywordsSelected] = useState<Set<string>>(
    new Set(
      initialResult.keywords_primary
        .slice(0, 15)
        .map((k) => k.keyword),
    ),
  );
  const [customKeyword, setCustomKeyword] = useState("");

  /* Images sélectionnées (default toutes les non-logos). */
  const [imagesSelected, setImagesSelected] = useState<Set<string>>(
    new Set(
      initialResult.images_extracted
        .filter((img) => !img.is_logo)
        .slice(0, 6)
        .map((img) => img.url),
    ),
  );

  /* Ad copies — l'utilisateur peut éditer chaque texte. */
  const [headlines, setHeadlines] = useState(
    initialResult.headlines_suggested.slice(0, 5),
  );
  const [descriptions, setDescriptions] = useState(
    initialResult.descriptions_suggested.slice(0, 5),
  );

  /* Budget. */
  const [budget, setBudget] = useState(initialResult.budget_recommended_optimal);

  /* CTAs finaux. */
  function launchSmartCampaign() {
    /* On stocke le snapshot édité dans sessionStorage pour pré-remplir
       le wizard Smart Campaign (étape 4). */
    try {
      sessionStorage.setItem(
        `divarc-analysis-${analysisId}`,
        JSON.stringify({
          businessName,
          businessDesc,
          businessCategory,
          audiences: initialResult.audiences_recommended.filter((_, i) =>
            audiencesSelected.has(i),
          ),
          keywords: Array.from(keywordsSelected),
          images: Array.from(imagesSelected),
          headlines,
          descriptions,
          budget,
          objective: initialResult.objective_recommended,
          compliance_warnings: initialResult.compliance_warnings,
          forbidden_categories_detected:
            initialResult.forbidden_categories_detected,
        }),
      );
    } catch {
      /* Quota exceeded ou storage indispo — on continue sans persister. */
    }
    toast.success("Lancement Smart Campaign…");
    router.push(
      `/ads-manager/${accountId}/campaigns/new?mode=smart&analysis=${analysisId}`,
    );
  }
  function launchExpertMode() {
    try {
      sessionStorage.setItem(
        `divarc-analysis-${analysisId}`,
        JSON.stringify({
          businessName,
          businessDesc,
          audiences: initialResult.audiences_recommended.filter((_, i) =>
            audiencesSelected.has(i),
          ),
          keywords: Array.from(keywordsSelected),
          images: Array.from(imagesSelected),
          headlines,
          descriptions,
          budget,
          objective: initialResult.objective_recommended,
        }),
      );
    } catch {
      /* Quota exceeded ou storage indispo — pas critique. */
    }
    router.push(
      `/ads-manager/${accountId}/campaigns/new?mode=expert&analysis=${analysisId}`,
    );
  }

  /* Forbidden categories : on bloque la création si détecté. */
  if (initialResult.forbidden_categories_detected.length > 0) {
    return (
      <div className="max-w-xl mx-auto">
        <div className="rounded-2xl bg-red-50 border-2 border-red-300 p-6 text-center">
          <AlertTriangle
            className="w-10 h-10 text-red-600 mx-auto mb-3"
            aria-hidden
          />
          <h2 className="text-[20px] font-semibold text-red-900 mb-2">
            Catégorie interdite détectée
          </h2>
          <p className="text-[13.5px] text-red-800 leading-relaxed">
            DIVARC a détecté un secteur interdit à la publicité :{" "}
            <strong>
              {initialResult.forbidden_categories_detected.join(", ")}
            </strong>
            . Conformément à la loi française et au règlement DIVARC, nous
            ne pouvons pas accepter de campagne pour ce secteur.
          </p>
          <p className="mt-3 text-[12px] text-red-700">
            Si tu penses qu&apos;il y a erreur, contacte{" "}
            <a href="mailto:ads@divarc.app" className="underline font-semibold">
              ads@divarc.app
            </a>
            .
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto space-y-5">
      <header className="text-center mb-2">
        <span
          aria-hidden
          className="inline-flex w-14 h-14 rounded-2xl bg-emerald-50 text-emerald-600 items-center justify-center mb-3"
        >
          <CheckCircle2 className="w-7 h-7" aria-hidden strokeWidth={2.2} />
        </span>
        <h2 className="font-display text-[28px] sm:text-[36px] leading-[1.05] tracking-[-0.02em] text-night">
          Analyse{" "}
          <em className="italic text-gold-deep">terminée</em>
        </h2>
        <p className="mt-2 text-[13px] text-night-muted">
          Vérifie et ajuste avant de lancer ta campagne.
        </p>
      </header>

      {/* Compliance warnings */}
      {initialResult.compliance_warnings.length > 0 ? (
        <div className="rounded-2xl bg-amber-50 border border-amber-200 p-4">
          <p className="font-semibold text-amber-900 text-[13px] mb-1.5 flex items-center gap-2">
            <AlertTriangle className="w-3.5 h-3.5" aria-hidden />
            Conformité
          </p>
          <ul className="list-disc pl-5 space-y-0.5 text-[12.5px] text-amber-800">
            {initialResult.compliance_warnings.map((w, i) => (
              <li key={i}>{w}</li>
            ))}
          </ul>
        </div>
      ) : null}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* 1. Business Identity */}
        <Card title="Voici ce que nous avons compris" icon="🏢" fullWidth>
          <Field label="Nom de l'entreprise">
            <input
              type="text"
              value={businessName}
              onChange={(e) => setBusinessName(e.target.value)}
              className={inputCls}
            />
          </Field>
          <Field label="Catégories">
            <input
              type="text"
              value={businessCategory}
              onChange={(e) => setBusinessCategory(e.target.value)}
              className={inputCls}
              placeholder="ex: e-commerce, mode, lingerie"
            />
          </Field>
          <Field label="Description">
            <textarea
              rows={3}
              value={businessDesc}
              onChange={(e) => setBusinessDesc(e.target.value)}
              className={inputCls}
            />
          </Field>
          <p className="text-[11px] text-night-muted">
            Objectif recommandé :{" "}
            <strong className="text-night">
              {initialResult.objective_recommended}
            </strong>
          </p>
        </Card>

        {/* 2. Audiences suggérées */}
        <Card
          title="Audiences suggérées"
          icon="👥"
          subtitle={`${audiencesSelected.size} sélectionnée${audiencesSelected.size > 1 ? "s" : ""}`}
        >
          <ul className="space-y-2">
            {initialResult.audiences_recommended.map((audience, i) => {
              const selected = audiencesSelected.has(i);
              return (
                <li key={i}>
                  <button
                    type="button"
                    onClick={() => {
                      const next = new Set(audiencesSelected);
                      if (selected) next.delete(i);
                      else next.add(i);
                      setAudiencesSelected(next);
                    }}
                    className={`w-full text-left p-3 rounded-xl border-2 transition-all ${
                      selected
                        ? "border-night bg-night/[0.03]"
                        : "border-line bg-white hover:border-night/30"
                    }`}
                  >
                    <div className="flex items-start gap-2.5">
                      <span
                        aria-hidden
                        className={`mt-0.5 w-4 h-4 rounded border-2 flex items-center justify-center shrink-0 ${
                          selected
                            ? "border-night bg-night"
                            : "border-line bg-white"
                        }`}
                      >
                        {selected ? (
                          <Check
                            className="w-2.5 h-2.5 text-cream"
                            aria-hidden
                            strokeWidth={3}
                          />
                        ) : null}
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="text-[13.5px] font-semibold text-night">
                          {audience.persona_name}
                        </p>
                        <p className="text-[11.5px] text-night-soft mt-0.5 leading-snug">
                          {audience.description}
                        </p>
                        {audience.estimated_size ? (
                          <p className="text-[10.5px] text-night-muted mt-1 flex items-center gap-1">
                            <Users className="w-3 h-3" aria-hidden />~
                            {formatN(audience.estimated_size)} personnes
                          </p>
                        ) : null}
                      </div>
                    </div>
                  </button>
                </li>
              );
            })}
          </ul>
        </Card>

        {/* 3. Mots-clés */}
        <Card
          title="Mots-clés et centres d'intérêt"
          icon="🏷️"
          subtitle={`${keywordsSelected.size} sélectionné${keywordsSelected.size > 1 ? "s" : ""}`}
        >
          <div className="flex flex-wrap gap-1.5 max-h-72 overflow-y-auto pr-1">
            {initialResult.keywords_primary.map((kw) => {
              const selected = keywordsSelected.has(kw.keyword);
              return (
                <button
                  key={kw.keyword}
                  type="button"
                  onClick={() => {
                    const next = new Set(keywordsSelected);
                    if (selected) next.delete(kw.keyword);
                    else next.add(kw.keyword);
                    setKeywordsSelected(next);
                  }}
                  className={`px-3 py-1.5 rounded-full text-[11.5px] font-semibold border transition-colors ${
                    selected
                      ? "border-night bg-night text-cream"
                      : "border-line bg-white text-night-muted hover:bg-bg-soft"
                  }`}
                  title={`Pertinence ${(kw.relevance_score * 100).toFixed(0)}%`}
                >
                  {selected ? (
                    <X className="inline w-3 h-3 mr-0.5" aria-hidden />
                  ) : (
                    <Plus className="inline w-3 h-3 mr-0.5" aria-hidden />
                  )}
                  {kw.keyword}
                </button>
              );
            })}
          </div>
          <div className="mt-2 flex items-center gap-1.5">
            <input
              type="text"
              value={customKeyword}
              onChange={(e) => setCustomKeyword(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  if (customKeyword.trim().length > 0) {
                    setKeywordsSelected(
                      new Set([...keywordsSelected, customKeyword.trim()]),
                    );
                    setCustomKeyword("");
                  }
                }
              }}
              placeholder="Ajouter un mot-clé custom + Entrée"
              className={`${inputCls} flex-1`}
            />
          </div>
        </Card>

        {/* 4. Visuels */}
        <Card
          title="Visuels disponibles"
          icon="🎨"
          subtitle={`${imagesSelected.size}/${initialResult.images_extracted.length} sélectionné${imagesSelected.size > 1 ? "s" : ""}`}
        >
          {initialResult.images_extracted.length === 0 ? (
            <div className="rounded-xl bg-bg-soft border border-line p-6 text-center">
              <ImageIcon
                className="w-7 h-7 text-night-muted mx-auto mb-2"
                aria-hidden
              />
              <p className="text-[12.5px] text-night-muted">
                Aucun visuel extrait depuis ton site. Tu pourras uploader
                des médias dans le wizard.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-3 gap-2 max-h-72 overflow-y-auto pr-1">
              {initialResult.images_extracted.slice(0, 12).map((img) => {
                const selected = imagesSelected.has(img.url);
                return (
                  <button
                    key={img.url}
                    type="button"
                    onClick={() => {
                      const next = new Set(imagesSelected);
                      if (selected) next.delete(img.url);
                      else next.add(img.url);
                      setImagesSelected(next);
                    }}
                    className={`relative aspect-square rounded-xl overflow-hidden border-2 ${
                      selected
                        ? "border-night ring-2 ring-night/20"
                        : "border-line opacity-60 hover:opacity-100"
                    }`}
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={img.url}
                      alt={img.alt_text ?? ""}
                      className="w-full h-full object-cover"
                    />
                    {img.is_logo ? (
                      <span className="absolute top-1 left-1 text-[8px] uppercase tracking-wider font-extrabold bg-gold/90 text-night px-1.5 py-0.5 rounded">
                        Logo
                      </span>
                    ) : null}
                    {selected ? (
                      <span
                        aria-hidden
                        className="absolute top-1 right-1 w-5 h-5 rounded-full bg-night text-cream flex items-center justify-center"
                      >
                        <Check className="w-3 h-3" strokeWidth={3} aria-hidden />
                      </span>
                    ) : null}
                  </button>
                );
              })}
            </div>
          )}
        </Card>

        {/* 5. Ad copies */}
        <Card title="Propositions d'annonces générées" icon="✨" fullWidth>
          <p className="text-[11.5px] text-night-muted mb-3">
            5 variations de headlines et descriptions générées par
            l&apos;IA. Édite directement pour ajuster le ton.
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {[0, 1, 2, 3, 4].map((i) => (
              <div
                key={i}
                className="rounded-xl bg-bg-soft border border-line p-3"
              >
                <p className="text-[10px] uppercase tracking-wider text-night-muted font-bold mb-1.5">
                  Variation {i + 1}
                </p>
                <input
                  type="text"
                  value={headlines[i] ?? ""}
                  onChange={(e) => {
                    const next = [...headlines];
                    next[i] = e.target.value;
                    setHeadlines(next);
                  }}
                  maxLength={40}
                  placeholder="Headline (max 40)"
                  className="w-full px-2.5 py-1.5 rounded-lg bg-white border border-line text-[13px] font-semibold text-night focus:outline-none focus:border-night"
                />
                <input
                  type="text"
                  value={descriptions[i] ?? ""}
                  onChange={(e) => {
                    const next = [...descriptions];
                    next[i] = e.target.value;
                    setDescriptions(next);
                  }}
                  maxLength={30}
                  placeholder="Description (max 30)"
                  className="w-full mt-1.5 px-2.5 py-1.5 rounded-lg bg-white border border-line text-[12px] text-night-soft focus:outline-none focus:border-night"
                />
              </div>
            ))}
          </div>
        </Card>

        {/* 6. Budget */}
        <Card title="Budget recommandé" icon="💰" fullWidth>
          <div className="space-y-2">
            <div className="flex items-baseline gap-2">
              <span className="text-[40px] font-bold text-night leading-none">
                {budget}
              </span>
              <span className="text-[16px] text-night-muted">€ / jour</span>
            </div>
            <input
              type="range"
              min={5}
              max={200}
              step={5}
              value={budget}
              onChange={(e) => setBudget(Number(e.target.value))}
              className="w-full accent-night"
            />
            <div className="grid grid-cols-4 text-[10.5px] text-night-muted">
              <span>5€<br/>Test</span>
              <span className="text-center">15€<br/>Lancement</span>
              <span className="text-center">50€<br/>Croissance</span>
              <span className="text-right">200€<br/>Scale</span>
            </div>
            <p className="text-[11.5px] text-night-muted mt-2">
              Min recommandé pour résultats significatifs :{" "}
              <strong className="text-night">
                {initialResult.budget_recommended_min}€/jour
              </strong>{" "}
              · CPC estimé :{" "}
              <strong className="text-night">
                {initialResult.estimated_cpc_range
                  ? `${initialResult.estimated_cpc_range[0]}-${initialResult.estimated_cpc_range[1]}€`
                  : "—"}
              </strong>
            </p>
          </div>
        </Card>
      </div>

      {/* CTAs finaux */}
      <div className="rounded-2xl bg-white border-2 border-line p-6 text-center sticky bottom-3 shadow-soft">
        <p className="text-[12.5px] text-night-muted mb-3">
          Tout est prêt. Comment veux-tu lancer ta campagne ?
        </p>
        <div className="flex flex-col sm:flex-row gap-2 justify-center">
          <button
            type="button"
            onClick={launchSmartCampaign}
            className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-full bg-night text-cream text-[14px] font-semibold hover:bg-night/90 shadow-soft"
          >
            <Sparkles className="w-4 h-4" aria-hidden />
            Lancer Smart Campaign
          </button>
          <button
            type="button"
            onClick={launchExpertMode}
            className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-full bg-white border-2 border-line text-[14px] font-semibold text-night hover:bg-bg-soft"
          >
            <Target className="w-4 h-4" aria-hidden />
            Personnaliser en mode Expert
          </button>
        </div>
        <p className="mt-3 text-[10.5px] text-night-muted">
          Smart Campaign = IA gère tout • Expert = contrôle total
        </p>
      </div>
    </div>
  );
}

function Card({
  title,
  subtitle,
  icon,
  fullWidth,
  children,
}: {
  title: string;
  subtitle?: string;
  icon: string;
  fullWidth?: boolean;
  children: React.ReactNode;
}) {
  return (
    <section
      className={`rounded-2xl bg-white border border-line p-5 ${
        fullWidth ? "lg:col-span-2" : ""
      }`}
    >
      <header className="flex items-baseline justify-between gap-3 flex-wrap mb-3">
        <h3 className="text-[14px] font-semibold text-night flex items-center gap-2">
          <span className="text-[18px]" aria-hidden>
            {icon}
          </span>
          {title}
        </h3>
        {subtitle ? (
          <span className="text-[11px] text-night-muted">{subtitle}</span>
        ) : null}
      </header>
      <div className="space-y-3">{children}</div>
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
      <span className="block text-[10.5px] uppercase tracking-wider text-muted font-bold mb-1">
        {label}
      </span>
      {children}
    </label>
  );
}

const inputCls =
  "w-full px-3 py-2 rounded-xl border border-line bg-white text-[13px] text-night focus:outline-none focus:border-night transition-colors";

function formatN(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1000).toFixed(0)}k`;
  return n.toString();
}
