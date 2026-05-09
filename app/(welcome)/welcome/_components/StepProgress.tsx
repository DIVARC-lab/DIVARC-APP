import { cn } from "@/lib/utils/cn";

type StepProgressProps = {
  steps: ReadonlyArray<{ id: string; label: string }>;
  currentStep: number;
};

/* Brief Session 7 — refonte Bold : segmented bar gold (couleur de marque),
   plus de cercles emerald off-brand. Trois infos visibles :
   - "Étape N · X" en kicker gold-deep
   - le label de l'étape courante en Instrument Serif italic
   - une barre segmentée : segments dorés pour le passé, pleins gold pour
     l'actuel, neutres pour le futur. */
export function StepProgress({ steps, currentStep }: StepProgressProps) {
  const total = steps.length;
  const safeIndex = Math.min(Math.max(currentStep, 0), total - 1);
  const current = steps[safeIndex] ?? steps[0]!;

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-baseline justify-between gap-3">
        <span className="text-[11px] font-extrabold uppercase tracking-[0.18em] text-gold-deep">
          · Étape {safeIndex + 1} · {total}
        </span>
        <span className="font-display italic text-[15px] text-night leading-none truncate">
          {current.label}
        </span>
      </div>

      <ol
        aria-label="Progression onboarding"
        className="flex items-center gap-1.5"
      >
        {steps.map((step, idx) => {
          const isPast = idx < safeIndex;
          const isCurrent = idx === safeIndex;
          return (
            <li
              key={step.id}
              aria-current={isCurrent ? "step" : undefined}
              className="flex-1"
            >
              <span
                className={cn(
                  "block h-1.5 rounded-full transition-colors",
                  isPast
                    ? "bg-gold"
                    : isCurrent
                      ? "bg-gold shadow-[0_0_0_3px_rgba(244,185,66,0.18)]"
                      : "bg-night/10",
                )}
              />
              <span className="sr-only">
                {step.label}
                {isCurrent
                  ? " (en cours)"
                  : isPast
                    ? " (terminée)"
                    : " (à venir)"}
              </span>
            </li>
          );
        })}
      </ol>
    </div>
  );
}
