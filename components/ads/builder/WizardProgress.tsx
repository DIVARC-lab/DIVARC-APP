"use client";

import { Check } from "lucide-react";
import type { WizardStepId } from "./types";

/* Progress bar du wizard — style Linear / Stripe Dashboard. */

const STEPS: ReadonlyArray<{
  id: WizardStepId;
  index: number;
  label: string;
  helper: string;
}> = [
  {
    id: "objective",
    index: 1,
    label: "Objectif",
    helper: "Pourquoi cette pub ?",
  },
  {
    id: "audience",
    index: 2,
    label: "Audience",
    helper: "Qui doit la voir ?",
  },
  {
    id: "budget",
    index: 3,
    label: "Budget",
    helper: "Combien et où ?",
  },
  {
    id: "creative",
    index: 4,
    label: "Visuel",
    helper: "Le contenu de la pub.",
  },
  {
    id: "review",
    index: 5,
    label: "Vérification",
    helper: "Avant de lancer.",
  },
];

export function WizardProgress({
  current,
  completed,
  onJump,
}: {
  current: WizardStepId;
  completed: WizardStepId[];
  onJump: (id: WizardStepId) => void;
}) {
  const currentIdx = STEPS.findIndex((s) => s.id === current);

  return (
    <ol className="flex items-stretch gap-0">
      {STEPS.map((step, idx) => {
        const isDone = completed.includes(step.id);
        const isCurrent = step.id === current;
        const isAccessible = isDone || idx <= currentIdx;
        return (
          <li key={step.id} className="flex-1 relative">
            <button
              type="button"
              onClick={() => isAccessible && onJump(step.id)}
              disabled={!isAccessible}
              aria-current={isCurrent ? "step" : undefined}
              className={`group w-full text-left disabled:cursor-not-allowed`}
            >
              {/* Track + dot */}
              <div className="flex items-center gap-0">
                <div
                  className={`flex items-center justify-center w-7 h-7 rounded-full shrink-0 text-[12px] font-bold transition-colors ${
                    isCurrent
                      ? "bg-night text-cream"
                      : isDone
                        ? "bg-gold-deep text-cream"
                        : "bg-bg-soft border-2 border-line text-night-muted"
                  }`}
                >
                  {isDone && !isCurrent ? (
                    <Check className="w-3.5 h-3.5" aria-hidden strokeWidth={3} />
                  ) : (
                    step.index
                  )}
                </div>
                {idx < STEPS.length - 1 ? (
                  <div
                    className={`flex-1 h-0.5 ${
                      idx < currentIdx ? "bg-gold-deep" : "bg-line"
                    }`}
                    aria-hidden
                  />
                ) : null}
              </div>
              {/* Label sous le dot */}
              <div className="mt-1.5 pr-2">
                <p
                  className={`text-[11.5px] font-bold uppercase tracking-wider truncate ${
                    isCurrent
                      ? "text-night"
                      : isDone
                        ? "text-gold-deep"
                        : "text-night-muted"
                  }`}
                >
                  {step.label}
                </p>
                <p className="text-[10px] text-night-muted truncate">
                  {step.helper}
                </p>
              </div>
            </button>
          </li>
        );
      })}
    </ol>
  );
}

export const WIZARD_STEPS = STEPS;
