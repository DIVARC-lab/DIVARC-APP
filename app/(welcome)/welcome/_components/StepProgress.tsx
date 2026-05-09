import { cn } from "@/lib/utils/cn";

type StepProgressProps = {
  steps: ReadonlyArray<{ id: string; label: string }>;
  currentStep: number;
  /* "light" pour fond clair (default), "dark" pour fond navy (intro). */
  tone?: "light" | "dark";
};

/* Refonte audit S9 (handoff feed-onboarding L19-44) — ProgressDots morphing :
   - dot actif : w-[22px] h-[6px] r-3 bg-gold
   - dots passés : w-[6px] h-[6px] r-3 bg-gold (light) ou cream/25 (dark)
     ne rentrent pas dans cette logique du proto qui marque past + current
     comme actifs (i <= step → gold)
   - dots futurs : w-[6px] h-[6px] r-3 bg-night/10 (light) ou cream/25 (dark)
   - transition all 200ms

   Trois infos visibles au-dessus :
   - kicker "· Étape N · TOTAL" gold-deep
   - label de l'étape courante en Instrument Serif italic */
export function StepProgress({
  steps,
  currentStep,
  tone = "light",
}: StepProgressProps) {
  const total = steps.length;
  const safeIndex = Math.min(Math.max(currentStep, 0), total - 1);
  const current = steps[safeIndex] ?? steps[0]!;
  const isDark = tone === "dark";

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-baseline justify-between gap-3">
        <span
          className={cn(
            "text-[11px] font-extrabold uppercase tracking-[0.18em]",
            isDark ? "text-gold" : "text-gold-deep",
          )}
        >
          · Étape {safeIndex + 1} · {total}
        </span>
        <span
          className={cn(
            "font-display italic text-[15px] leading-none truncate",
            isDark ? "text-cream" : "text-night",
          )}
        >
          {current.label}
        </span>
      </div>

      <ol
        aria-label="Progression onboarding"
        className="flex items-center gap-[5px]"
      >
        {steps.map((step, idx) => {
          const isPastOrCurrent = idx <= safeIndex;
          const isCurrent = idx === safeIndex;
          return (
            <li
              key={step.id}
              aria-current={isCurrent ? "step" : undefined}
            >
              <span
                className={cn(
                  "block h-[6px] rounded-[3px] transition-all duration-200",
                  isCurrent ? "w-[22px]" : "w-[6px]",
                  isPastOrCurrent
                    ? "bg-gold"
                    : isDark
                      ? "bg-cream/25"
                      : "bg-night/10",
                )}
              />
              <span className="sr-only">
                {step.label}
                {isCurrent
                  ? " (en cours)"
                  : isPastOrCurrent
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
