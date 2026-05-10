"use client";

import { Check, Loader2 } from "lucide-react";
import { useEffect, useState } from "react";

/* État 2 — animation 7 étapes pendant l'analyse (~40s).
 *
 * L'API call est synchrone et prend 30-50s. On simule une progression
 * visuelle pour rendre l'attente engageante. Chaque étape a une durée
 * approximative ; si l'API répond avant la fin, on saute à completed.
 */

const STEPS = [
  { emoji: "🔍", label: "Visite de ton site web", duration: 6000 },
  { emoji: "🧠", label: "Compréhension de ton business", duration: 8000 },
  { emoji: "🎯", label: "Identification de ton audience", duration: 5000 },
  { emoji: "💡", label: "Génération de mots-clés pertinents", duration: 8000 },
  { emoji: "🎨", label: "Extraction de tes visuels", duration: 4000 },
  { emoji: "✨", label: "Création de propositions d'annonces", duration: 7000 },
  { emoji: "💰", label: "Calcul du budget optimal", duration: 2000 },
];

export function AnalysisProgress({ url }: { url: string }) {
  const [currentStep, setCurrentStep] = useState(0);

  useEffect(() => {
    let cancelled = false;
    let acc = 0;
    const timers: ReturnType<typeof setTimeout>[] = [];
    for (let i = 0; i < STEPS.length - 1; i++) {
      acc += STEPS[i]!.duration;
      const t = setTimeout(() => {
        if (!cancelled) setCurrentStep(i + 1);
      }, acc);
      timers.push(t);
    }
    return () => {
      cancelled = true;
      timers.forEach((t) => clearTimeout(t));
    };
  }, []);

  const totalDuration = STEPS.reduce((s, x) => s + x.duration, 0);
  const elapsedSimulated = STEPS.slice(0, currentStep).reduce(
    (s, x) => s + x.duration,
    0,
  );
  const progressPct = Math.min(
    95,
    (elapsedSimulated / totalDuration) * 100 + 5,
  );

  return (
    <div className="max-w-xl mx-auto">
      <div className="text-center mb-7">
        <Loader2
          className="w-10 h-10 text-gold-deep animate-spin mx-auto mb-4"
          aria-hidden
        />
        <h2 className="font-display text-[26px] sm:text-[32px] leading-[1.1] tracking-[-0.02em] text-night">
          Analyse en cours…
        </h2>
        <p className="mt-2 text-[13px] text-night-muted truncate">
          {url}
        </p>
      </div>

      {/* Barre de progression globale. */}
      <div className="mb-7 h-1 rounded-full bg-bg-soft overflow-hidden">
        <div
          className="h-full bg-gold-deep rounded-full transition-all duration-1000 ease-linear"
          style={{ width: `${progressPct}%` }}
        />
      </div>

      {/* Liste des étapes. */}
      <ul className="space-y-2">
        {STEPS.map((step, i) => {
          const isDone = i < currentStep;
          const isCurrent = i === currentStep;
          return (
            <li
              key={i}
              className={`flex items-center gap-3 px-3.5 py-3 rounded-xl transition-all ${
                isCurrent
                  ? "bg-night/[0.03] border border-night"
                  : isDone
                    ? "bg-emerald-50/40 border border-emerald-100"
                    : "bg-white border border-line opacity-50"
              }`}
            >
              <span
                aria-hidden
                className="text-[24px] shrink-0 leading-none"
              >
                {isDone ? (
                  <Check
                    className="w-5 h-5 text-emerald-600"
                    aria-hidden
                    strokeWidth={2.5}
                  />
                ) : isCurrent ? (
                  <Loader2
                    className="w-5 h-5 text-gold-deep animate-spin"
                    aria-hidden
                  />
                ) : (
                  step.emoji
                )}
              </span>
              <span
                className={`text-[13.5px] ${
                  isDone || isCurrent
                    ? "font-semibold text-night"
                    : "text-night-muted"
                }`}
              >
                {step.label}
                {isCurrent ? "…" : ""}
              </span>
            </li>
          );
        })}
      </ul>

      <p className="mt-6 text-center text-[11.5px] text-night-muted">
        Patience, l&apos;IA travaille pour toi. Cela prend généralement
        moins d&apos;une minute.
      </p>
    </div>
  );
}
