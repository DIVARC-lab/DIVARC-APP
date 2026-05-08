"use client";

import { ArrowLeft, ArrowRight, Check } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { cn } from "@/lib/utils/cn";
import {
  INTEREST_SLUGS,
  type InterestsStepState,
} from "../actions";

const INTEREST_OPTIONS: { slug: (typeof INTEREST_SLUGS)[number]; label: string; emoji: string }[] = [
  { slug: "bons-plans", label: "Bons plans", emoji: "💡" },
  { slug: "jardinage", label: "Jardinage", emoji: "🌱" },
  { slug: "velo", label: "Vélo", emoji: "🚲" },
  { slug: "cuisine", label: "Cuisine", emoji: "🍳" },
  { slug: "tech", label: "Tech", emoji: "💻" },
  { slug: "musique", label: "Musique", emoji: "🎸" },
  { slug: "sport", label: "Sport", emoji: "⚽" },
  { slug: "art", label: "Art", emoji: "🎨" },
  { slug: "famille", label: "Famille", emoji: "👨‍👩‍👧" },
  { slug: "animaux", label: "Animaux", emoji: "🐕" },
  { slug: "lecture", label: "Lecture", emoji: "📚" },
  { slug: "cinema", label: "Cinéma", emoji: "🎬" },
  { slug: "voyage", label: "Voyage", emoji: "✈️" },
  { slug: "mode", label: "Mode", emoji: "👗" },
  { slug: "photo", label: "Photo", emoji: "📷" },
  { slug: "ecolo", label: "Écolo", emoji: "♻️" },
];

const MIN_RECOMMENDED = 3;

type InterestsStepProps = {
  initial: string[];
  state: InterestsStepState;
  action: (formData: FormData) => void;
  pending: boolean;
  onBack: () => void;
};

/** Multi-select chips emoji. Pas de min/max bloquant — la règle "min 3"
 *  reste un nudge UX (compteur en gold avec chip "Encore X"). */
export function InterestsStep({
  initial,
  state,
  action,
  pending,
  onBack,
}: InterestsStepProps) {
  const [selected, setSelected] = useState<Set<string>>(
    () => new Set(initial.filter((s) => INTEREST_SLUGS.includes(s as never))),
  );

  function toggle(slug: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(slug)) next.delete(slug);
      else next.add(slug);
      return next;
    });
  }

  const count = selected.size;
  const remaining = Math.max(0, MIN_RECOMMENDED - count);

  return (
    <div className="space-y-7">
      <div>
        <span className="text-[11px] font-extrabold uppercase tracking-[0.18em] text-gold-deep">
          · Tes centres d&apos;intérêt
        </span>
        <h2 className="mt-3 font-display italic text-[34px] sm:text-[42px] text-night text-balance leading-[1.05] tracking-[-0.02em]">
          Tu aimes <span className="text-gold-deep">quoi</span>, toi ?
        </h2>
        <p className="mt-3 text-night-muted leading-relaxed">
          Choisis-en au moins {MIN_RECOMMENDED}. On t&apos;aidera à trouver les
          bonnes personnes et les bons cercles.
        </p>
      </div>

      <div className="flex items-center gap-2">
        <span className="font-display italic text-3xl text-gold-deep leading-none">
          {count}
        </span>
        <span className="text-sm text-night-muted">
          sur {INTEREST_OPTIONS.length} sélectionné{count > 1 ? "s" : ""}
          {remaining > 0 ? (
            <>
              {" · "}
              <span className="text-gold-deep font-semibold">
                encore {remaining}
              </span>
            </>
          ) : null}
        </span>
      </div>

      <form action={action} className="space-y-6" noValidate>
        {Array.from(selected).map((slug) => (
          <input key={slug} type="hidden" name="interests" value={slug} />
        ))}

        <div className="flex flex-wrap gap-2">
          {INTEREST_OPTIONS.map((opt) => {
            const on = selected.has(opt.slug);
            return (
              <button
                key={opt.slug}
                type="button"
                onClick={() => toggle(opt.slug)}
                aria-pressed={on}
                className={cn(
                  "px-3.5 h-10 rounded-full text-sm font-semibold inline-flex items-center gap-2 transition-all",
                  on
                    ? "bg-night text-cream shadow-[0_6px_16px_rgba(10,31,68,0.2)]"
                    : "bg-white border border-line text-night-muted hover:border-gold/40",
                )}
              >
                <span aria-hidden className="text-base">
                  {opt.emoji}
                </span>
                {opt.label}
                {on ? (
                  <Check className="w-3.5 h-3.5 text-gold" aria-hidden />
                ) : null}
              </button>
            );
          })}
        </div>

        {state.status === "error" && state.message ? (
          <p className="text-sm text-red-600">{state.message}</p>
        ) : null}

        <div className="flex items-center justify-between pt-2">
          <Button type="button" variant="ghost" onClick={onBack}>
            <ArrowLeft className="w-4 h-4" aria-hidden />
            Retour
          </Button>
          <Button type="submit" loading={pending} size="lg">
            {!pending ? <ArrowRight className="w-4 h-4" aria-hidden /> : null}
            Continuer
          </Button>
        </div>
      </form>
    </div>
  );
}
