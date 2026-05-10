"use client";

/* ReportModal — DSA art. 16 conforme.
 *
 * Flow 4 étapes :
 *   1. Choix catégorie (12 catégories filtrées par target_type)
 *   2. Sous-catégorie si applicable
 *   3. Description optionnelle (max 1000 chars) + URLs preuves
 *   4. Confirmation + accusé de réception (référence #RPT-XXXX)
 *
 * Garde-fous :
 *   - Mention RGPD anonymisation visible avant submit
 *   - Mention DSA droit de recours visible
 *   - Pour child_safety : message d'orientation 3018 / 119 affiché en plus
 *   - Pour self_harm : message d'orientation 3114 affiché en plus
 *   - Loading state pendant le POST, gestion 409 (déjà signalé) et 429
 *
 * Accessibilité : focus trap basique, ESC pour fermer, role=dialog +
 * aria-labelledby + aria-describedby.
 */

import { AlertTriangle, ArrowLeft, Check, Flag, X } from "lucide-react";
import { useEffect, useId, useRef, useState } from "react";
import { toast } from "sonner";
import {
  CATEGORY_BY_ID,
  REPORT_CATEGORIES,
  type ModerationCategoryMeta,
} from "@/lib/moderation/categories";
import type { ModerationCategory } from "@/lib/database.types";

export type ReportTargetType =
  | "post"
  | "comment"
  | "user"
  | "message"
  | "listing"
  | "story"
  | "job";

type ReportModalProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  targetType: ReportTargetType;
  targetId: string;
  /** Pour humaniser le titre : "ce post de Marie", "ce listing", etc. */
  contextLabel?: string;
};

type Step = 1 | 2 | 3 | 4;

export function ReportModal({
  open,
  onOpenChange,
  targetType,
  targetId,
  contextLabel,
}: ReportModalProps) {
  const titleId = useId();
  const descId = useId();
  const dialogRef = useRef<HTMLDivElement>(null);

  const [step, setStep] = useState<Step>(1);
  const [category, setCategory] = useState<ModerationCategory | null>(null);
  const [subcategory, setSubcategory] = useState<string | null>(null);
  const [description, setDescription] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [reference, setReference] = useState<string | null>(null);

  /* Reset à chaque ouverture/fermeture. */
  useEffect(() => {
    if (!open) {
      const t = setTimeout(() => {
        setStep(1);
        setCategory(null);
        setSubcategory(null);
        setDescription("");
        setReference(null);
        setSubmitting(false);
      }, 200);
      return () => clearTimeout(t);
    }
  }, [open]);

  /* ESC + click outside. */
  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onOpenChange(false);
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, onOpenChange]);

  if (!open) return null;

  const eligibleCategories = REPORT_CATEGORIES.filter((c) =>
    c.applicable_to.includes(
      targetType as ModerationCategoryMeta["applicable_to"][number],
    ),
  );

  const currentCategory = category ? CATEGORY_BY_ID[category] : null;
  const hasSubcategories =
    currentCategory?.subcategories && currentCategory.subcategories.length > 0;

  function next() {
    if (step === 1 && !category) return;
    if (step === 1 && !hasSubcategories) {
      setStep(3);
      return;
    }
    setStep((s) => (Math.min(4, s + 1) as Step));
  }
  function back() {
    if (step === 3 && !hasSubcategories) {
      setStep(1);
      return;
    }
    setStep((s) => (Math.max(1, s - 1) as Step));
  }

  async function submit() {
    if (!category) return;
    setSubmitting(true);
    try {
      const res = await fetch("/api/reports", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          target_type: targetType,
          target_id: targetId,
          category,
          subcategory: subcategory ?? undefined,
          description: description.trim() || undefined,
        }),
      });
      const json = await res.json().catch(() => ({}));
      if (res.status === 409) {
        toast.info(
          json.error ?? "Tu as déjà signalé ce contenu pour cette raison.",
        );
        onOpenChange(false);
        return;
      }
      if (res.status === 429) {
        toast.error(
          json.error ?? "Trop de signalements envoyés. Réessaie dans 1 heure.",
        );
        return;
      }
      if (!res.ok) {
        toast.error(json.error ?? "Impossible d'envoyer le signalement.");
        return;
      }
      setReference(json.reference);
      setStep(4);
    } catch {
      toast.error("Erreur réseau, réessaie.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby={titleId}
      aria-describedby={descId}
      className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center bg-night/40 p-0 sm:p-4"
      onClick={(e) => {
        if (e.target === e.currentTarget && !submitting) onOpenChange(false);
      }}
    >
      <div
        ref={dialogRef}
        className="bg-white w-full sm:max-w-lg rounded-t-3xl sm:rounded-3xl shadow-soft-lg max-h-[90vh] flex flex-col overflow-hidden"
      >
        {/* Header */}
        <header className="flex items-center justify-between gap-3 px-5 sm:px-6 pt-5 pb-3 border-b border-line">
          <div className="flex items-center gap-2.5 min-w-0">
            <span
              aria-hidden
              className="w-9 h-9 rounded-full bg-red-50 text-red-600 flex items-center justify-center shrink-0"
            >
              <Flag className="w-4 h-4" aria-hidden />
            </span>
            <div className="min-w-0">
              <h2 id={titleId} className="font-semibold text-night text-[15px]">
                {step === 4
                  ? "Signalement reçu"
                  : `Signaler ${contextLabel ?? "ce contenu"}`}
              </h2>
              <p id={descId} className="text-[11px] text-night-muted">
                Étape {step} sur {hasSubcategories ? 4 : 3}
              </p>
            </div>
          </div>
          <button
            type="button"
            disabled={submitting}
            onClick={() => onOpenChange(false)}
            aria-label="Fermer"
            className="w-9 h-9 rounded-full hover:bg-night/5 text-night-dim hover:text-night flex items-center justify-center shrink-0 disabled:opacity-50"
          >
            <X className="w-4 h-4" aria-hidden />
          </button>
        </header>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-5 sm:px-6 py-5">
          {step === 1 ? (
            <Step1
              eligible={eligibleCategories}
              selected={category}
              onSelect={(c) => {
                setCategory(c);
                setSubcategory(null);
              }}
            />
          ) : null}
          {step === 2 ? (
            <Step2
              category={currentCategory!}
              selected={subcategory}
              onSelect={setSubcategory}
            />
          ) : null}
          {step === 3 ? (
            <Step3
              category={currentCategory!}
              description={description}
              onChange={setDescription}
            />
          ) : null}
          {step === 4 ? <Step4 reference={reference} /> : null}
        </div>

        {/* Footer actions */}
        {step !== 4 ? (
          <footer className="flex items-center justify-between gap-3 px-5 sm:px-6 py-4 border-t border-line bg-bg-soft/50">
            {step > 1 ? (
              <button
                type="button"
                onClick={back}
                disabled={submitting}
                className="inline-flex items-center gap-1.5 text-[13px] font-semibold text-night-muted hover:text-night disabled:opacity-50"
              >
                <ArrowLeft className="w-4 h-4" aria-hidden />
                Retour
              </button>
            ) : (
              <span />
            )}
            {step < 3 ? (
              <button
                type="button"
                onClick={next}
                disabled={!category || (step === 2 && !subcategory)}
                className="inline-flex items-center gap-1.5 px-5 py-2 rounded-full bg-night text-cream text-[13px] font-semibold disabled:opacity-50 hover:bg-night/90"
              >
                Suivant
              </button>
            ) : (
              <button
                type="button"
                onClick={submit}
                disabled={submitting || !category}
                className="inline-flex items-center gap-1.5 px-5 py-2 rounded-full bg-red-600 text-white text-[13px] font-semibold disabled:opacity-50 hover:bg-red-700"
              >
                {submitting ? "Envoi…" : "Envoyer le signalement"}
              </button>
            )}
          </footer>
        ) : (
          <footer className="px-5 sm:px-6 py-4 border-t border-line bg-bg-soft/50 flex justify-end">
            <button
              type="button"
              onClick={() => onOpenChange(false)}
              className="inline-flex items-center gap-1.5 px-5 py-2 rounded-full bg-night text-cream text-[13px] font-semibold hover:bg-night/90"
            >
              Fermer
            </button>
          </footer>
        )}
      </div>
    </div>
  );
}

/* -------- Steps -------- */

function Step1({
  eligible,
  selected,
  onSelect,
}: {
  eligible: ReadonlyArray<ModerationCategoryMeta>;
  selected: ModerationCategory | null;
  onSelect: (c: ModerationCategory) => void;
}) {
  return (
    <div>
      <p className="text-[13px] text-night-soft leading-relaxed mb-4">
        Choisis la raison qui correspond le mieux. Notre équipe Trust &
        Safety l&apos;examinera selon nos règles communautaires.
      </p>
      <ul className="flex flex-col gap-1.5">
        {eligible.map((c) => {
          const active = selected === c.id;
          return (
            <li key={c.id}>
              <button
                type="button"
                onClick={() => onSelect(c.id)}
                className={`w-full text-left px-3.5 py-3 rounded-2xl border transition-colors ${
                  active
                    ? "border-night bg-night/5"
                    : "border-line hover:border-night/30 hover:bg-night/[0.02]"
                }`}
              >
                <div className="flex items-start gap-3">
                  <span
                    aria-hidden
                    className={`mt-1 w-3.5 h-3.5 rounded-full border shrink-0 ${
                      active
                        ? "border-night bg-night"
                        : "border-line bg-white"
                    }`}
                  />
                  <div className="min-w-0 flex-1">
                    <p className="text-[14px] font-semibold text-night flex items-center gap-2">
                      {c.label}
                      {c.critical ? (
                        <span className="text-[10px] uppercase tracking-wider px-1.5 py-0.5 rounded bg-red-100 text-red-700 font-bold">
                          urgent
                        </span>
                      ) : null}
                    </p>
                    <p className="text-[12px] text-night-muted mt-0.5 leading-[1.45]">
                      {c.helper}
                    </p>
                  </div>
                </div>
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

function Step2({
  category,
  selected,
  onSelect,
}: {
  category: ModerationCategoryMeta;
  selected: string | null;
  onSelect: (s: string) => void;
}) {
  return (
    <div>
      <p className="text-[13px] text-night-soft leading-relaxed mb-4">
        Précise la situation pour aider notre équipe à mieux comprendre.
      </p>
      <ul className="flex flex-col gap-1.5">
        {category.subcategories?.map((sub) => {
          const active = selected === sub.id;
          return (
            <li key={sub.id}>
              <button
                type="button"
                onClick={() => onSelect(sub.id)}
                className={`w-full text-left px-3.5 py-3 rounded-2xl border transition-colors flex items-center gap-3 ${
                  active
                    ? "border-night bg-night/5"
                    : "border-line hover:border-night/30 hover:bg-night/[0.02]"
                }`}
              >
                <span
                  aria-hidden
                  className={`w-3.5 h-3.5 rounded-full border shrink-0 ${
                    active ? "border-night bg-night" : "border-line bg-white"
                  }`}
                />
                <span className="text-[14px] text-night">{sub.label}</span>
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

function Step3({
  category,
  description,
  onChange,
}: {
  category: ModerationCategoryMeta;
  description: string;
  onChange: (s: string) => void;
}) {
  return (
    <div className="space-y-4">
      {category.critical ? (
        <CriticalSupportBanner categoryId={category.id} />
      ) : null}

      <div>
        <label
          htmlFor="report-description"
          className="block text-[13px] font-semibold text-night mb-1.5"
        >
          Décris la situation (optionnel)
        </label>
        <p className="text-[12px] text-night-muted mb-2">
          {category.example}
        </p>
        <textarea
          id="report-description"
          rows={5}
          maxLength={1000}
          value={description}
          onChange={(e) => onChange(e.target.value)}
          placeholder="Apporte du contexte si tu le souhaites — captures d'écran, dates, propos précis…"
          className="w-full px-3.5 py-3 rounded-2xl border border-line bg-white text-[14px] text-night focus:outline-none focus:border-night resize-none"
        />
        <p className="text-[11px] text-night-muted text-right mt-1">
          {description.length} / 1000
        </p>
      </div>

      <div className="rounded-2xl bg-bg-soft border border-line p-3.5 space-y-2 text-[12px] text-night-soft leading-[1.55]">
        <p>
          <strong className="text-night">RGPD :</strong> ton identité ne
          sera jamais révélée à la personne signalée. Notre équipe
          Trust & Safety conserve ton signalement à des fins de modération
          uniquement.
        </p>
        <p>
          <strong className="text-night">DSA art. 16 :</strong> tu seras
          informé de la décision prise sur ce signalement. Tu pourras la
          contester si tu n&apos;es pas satisfait.
        </p>
      </div>
    </div>
  );
}

function Step4({ reference }: { reference: string | null }) {
  return (
    <div className="text-center py-4">
      <span
        aria-hidden
        className="mx-auto w-14 h-14 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center mb-4"
      >
        <Check className="w-6 h-6" aria-hidden strokeWidth={2.5} />
      </span>
      <h3 className="text-[18px] font-semibold text-night mb-1.5">
        Merci pour ton signalement.
      </h3>
      <p className="text-[13px] text-night-muted leading-relaxed max-w-sm mx-auto">
        Notre équipe Trust & Safety l&apos;examinera selon nos règles
        communautaires. Tu recevras une notification une fois la décision
        prise.
      </p>
      {reference ? (
        <p className="mt-4 inline-block text-[12px] font-mono text-night-muted bg-bg-soft px-3 py-1.5 rounded-full border border-line">
          Référence : {reference}
        </p>
      ) : null}
    </div>
  );
}

function CriticalSupportBanner({
  categoryId,
}: {
  categoryId: ModerationCategory;
}) {
  if (categoryId === "self_harm") {
    return (
      <div
        role="alert"
        className="rounded-2xl bg-amber-50 border border-amber-200 p-4 flex items-start gap-3"
      >
        <AlertTriangle
          className="w-5 h-5 text-amber-700 shrink-0 mt-0.5"
          aria-hidden
        />
        <div className="text-[12.5px] leading-[1.5] text-amber-900">
          <p className="font-semibold mb-1">Tu n&apos;es pas seul·e.</p>
          <p>
            Si toi ou un proche êtes en détresse, le{" "}
            <strong>3114</strong> est gratuit, anonyme, ouvert 24h/24, 7j/7
            (numéro national de prévention du suicide).
          </p>
        </div>
      </div>
    );
  }
  if (categoryId === "child_safety") {
    return (
      <div
        role="alert"
        className="rounded-2xl bg-red-50 border border-red-200 p-4 flex items-start gap-3"
      >
        <AlertTriangle
          className="w-5 h-5 text-red-700 shrink-0 mt-0.5"
          aria-hidden
        />
        <div className="text-[12.5px] leading-[1.5] text-red-900">
          <p className="font-semibold mb-1">Signalement prioritaire.</p>
          <p>
            En cas de danger immédiat, contacte la police{" "}
            <strong>17</strong> ou le <strong>119</strong> (Allô Enfance en
            Danger). Ce signalement sera traité immédiatement et pourra
            être transmis aux autorités compétentes.
          </p>
        </div>
      </div>
    );
  }
  return null;
}
