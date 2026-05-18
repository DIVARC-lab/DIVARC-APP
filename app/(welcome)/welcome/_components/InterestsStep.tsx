"use client";

import { ArrowLeft, ArrowRight, Check } from "lucide-react";
import { useState } from "react";
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
    <div className="space-y-8">
      <header>
        <span className="text-[11px] font-extrabold uppercase tracking-[0.18em] text-[#b88a2a]">
          · Tes centres d&apos;intérêt
        </span>
        <h2 className="mt-3 font-display italic text-[36px] sm:text-[44px] text-[#0a1f44] text-balance leading-[1.05] tracking-[-0.02em]">
          Tu aimes{" "}
          <em className="italic bg-gradient-to-br from-[#f4b942] to-[#b88a2a] bg-clip-text text-transparent">
            quoi
          </em>
          , toi ?
        </h2>
        <p className="mt-3 text-[15px] text-[#4b5b87] leading-relaxed max-w-md">
          Choisis-en au moins {MIN_RECOMMENDED}. On t&apos;aidera à trouver les
          bonnes personnes et les bons cercles.
        </p>
      </header>

      <div className="flex items-baseline gap-2">
        <span className="font-display italic text-[40px] text-[#b88a2a] leading-none">
          {count}
        </span>
        <span className="text-sm text-[#4b5b87]">
          sur {INTEREST_OPTIONS.length} sélectionné{count > 1 ? "s" : ""}
          {remaining > 0 ? (
            <>
              {" · "}
              <span className="text-[#b88a2a] font-semibold">
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
                    ? "bg-[#0a1f44] text-[#fff8e8] shadow-[0_6px_16px_rgba(10,31,68,0.2)]"
                    : "bg-[#ffffff] border border-[#e6e9f0] text-[#4b5b87] hover:border-[#f4b942]/40",
                )}
              >
                <span aria-hidden className="text-base">
                  {opt.emoji}
                </span>
                {opt.label}
                {on ? (
                  <Check className="w-3.5 h-3.5 text-[#f4b942]" aria-hidden />
                ) : null}
              </button>
            );
          })}
        </div>

        {state.status === "error" && state.message ? (
          <p className="text-sm text-red-600">{state.message}</p>
        ) : null}

        <div className="flex flex-col-reverse sm:flex-row sm:items-center sm:justify-between gap-3 pt-4">
          <button
            type="button"
            onClick={onBack}
            className="inline-flex items-center justify-center gap-1.5 h-11 px-4 rounded-full text-sm font-semibold text-[#4b5b87] hover:text-[#0a1f44] hover:bg-[#0a1f44]/5 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" aria-hidden />
            Retour
          </button>
          <button
            type="submit"
            disabled={pending}
            className="inline-flex items-center justify-center gap-2 h-14 px-8 rounded-full bg-[#f4b942] text-[#0a1f44] font-extrabold text-[15px] hover:bg-[#fbd987] transition-colors shadow-[0_12px_28px_-10px_rgba(244,185,66,0.55)] disabled:opacity-60"
          >
            {pending ? "..." : "Continuer"}
            {!pending ? <ArrowRight className="w-4 h-4" aria-hidden /> : null}
          </button>
        </div>
      </form>
    </div>
  );
}
