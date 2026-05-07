import { Check } from "lucide-react";
import { cn } from "@/lib/utils/cn";

type StepProgressProps = {
  steps: ReadonlyArray<{ id: string; label: string }>;
  currentStep: number;
};

export function StepProgress({ steps, currentStep }: StepProgressProps) {
  return (
    <ol className="flex items-center gap-2 sm:gap-3">
      {steps.map((step, idx) => {
        const isPast = idx < currentStep;
        const isCurrent = idx === currentStep;
        return (
          <li
            key={step.id}
            className="flex items-center gap-2 sm:gap-3 flex-1"
          >
            <div
              className={cn(
                "flex items-center gap-2 sm:gap-3",
                idx < steps.length - 1 ? "flex-1" : "",
              )}
            >
              <span
                className={cn(
                  "w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold shrink-0 transition-all",
                  isPast
                    ? "bg-emerald-600 text-cream"
                    : isCurrent
                      ? "bg-night text-cream"
                      : "bg-night/10 text-night-muted",
                )}
              >
                {isPast ? (
                  <Check className="w-3.5 h-3.5" aria-hidden />
                ) : (
                  idx + 1
                )}
              </span>
              <span
                className={cn(
                  "text-xs font-semibold uppercase tracking-widest hidden sm:inline",
                  isPast || isCurrent
                    ? "text-night"
                    : "text-night-muted/60",
                )}
              >
                {step.label}
              </span>
              {idx < steps.length - 1 ? (
                <span
                  className={cn(
                    "h-px flex-1 transition-all",
                    isPast ? "bg-emerald-600" : "bg-night/10",
                  )}
                />
              ) : null}
            </div>
          </li>
        );
      })}
    </ol>
  );
}
