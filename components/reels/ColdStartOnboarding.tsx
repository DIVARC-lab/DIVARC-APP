"use client";

/* ColdStartOnboarding — Chantier Reels Recsys étape 18.
 *
 * Modale affichée au premier accès Reels (si user_interest_profiles
 * .cold_start_completed_at IS NULL). Propose 12 topics, l'user en
 * sélectionne 5 minimum, on sauve dans cold_start_topics et on marque
 * cold_start_completed_at.
 *
 * Le ranker utilisera cold_start_topics au démarrage : il boost les
 * reels avec hashtags matching avant qu'il y ait assez d'events réels
 * pour calculer un interest_vector.
 *
 * Pattern TikTok : « choisis 5 sujets qui t'intéressent » dès l'install.
 */

import { Check, Compass, Loader2, Sparkles } from "lucide-react";
import { useState, useTransition } from "react";
import { cn } from "@/lib/utils/cn";

const TOPICS: Array<{ id: string; emoji: string; label: string }> = [
  { id: "tech", emoji: "💻", label: "Tech / IA" },
  { id: "art", emoji: "🎨", label: "Art / Design" },
  { id: "music", emoji: "🎵", label: "Musique" },
  { id: "food", emoji: "🍳", label: "Cuisine" },
  { id: "travel", emoji: "✈️", label: "Voyage" },
  { id: "sport", emoji: "⚽", label: "Sport" },
  { id: "gaming", emoji: "🎮", label: "Gaming" },
  { id: "fashion", emoji: "👗", label: "Mode" },
  { id: "books", emoji: "📚", label: "Livres" },
  { id: "humor", emoji: "😂", label: "Humour" },
  { id: "wellness", emoji: "🧘", label: "Bien-être" },
  { id: "business", emoji: "💼", label: "Business" },
];

type Props = {
  open: boolean;
  onComplete: (topics: string[]) => Promise<void>;
};

export function ColdStartOnboarding({ open, onComplete }: Props) {
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [pending, startTransition] = useTransition();

  if (!open) return null;

  function toggle(id: string) {
    const next = new Set(selected);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelected(next);
  }

  function submit() {
    if (selected.size < 5) return;
    const arr = Array.from(selected);
    startTransition(async () => {
      await onComplete(arr);
    });
  }

  const canSubmit = selected.size >= 5 && !pending;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Personnaliser ton feed Reels"
      className="fixed inset-0 z-50 flex items-center justify-center bg-night/80 backdrop-blur-md p-4"
    >
      <div className="w-full max-w-md bg-white rounded-3xl shadow-2xl overflow-hidden">
        <div className="bg-gradient-to-br from-cream via-bg-soft to-gold/20 p-6 text-center">
          <Compass
            className="w-8 h-8 mx-auto text-gold-deep"
            aria-hidden
          />
          <p className="mt-3 text-[10px] font-extrabold uppercase tracking-[0.18em] text-gold-deep">
            · Personnalisation Reels
          </p>
          <h2 className="mt-2 font-display text-[26px] sm:text-[30px] leading-[1.1] text-night text-balance">
            Choisis <em className="italic text-gold-deep">5 sujets</em>
            <br />
            qui t&apos;intéressent.
          </h2>
          <p className="mt-2 text-[12px] text-night-soft px-4">
            Ça nous évite de te montrer des reels au hasard pour démarrer.
            Tu pourras affiner après quelques vidéos regardées.
          </p>
        </div>

        <div className="p-5">
          <div className="grid grid-cols-3 gap-2">
            {TOPICS.map((t) => {
              const active = selected.has(t.id);
              return (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => toggle(t.id)}
                  aria-pressed={active}
                  className={cn(
                    "relative flex flex-col items-center gap-1 p-3 rounded-2xl border-2 transition-all",
                    active
                      ? "border-gold-deep bg-gold/10"
                      : "border-line bg-white hover:border-night-dim/30",
                  )}
                >
                  <span className="text-[22px]" aria-hidden>
                    {t.emoji}
                  </span>
                  <span className="text-[11px] font-extrabold text-night">
                    {t.label}
                  </span>
                  {active ? (
                    <span
                      aria-hidden
                      className="absolute top-1 right-1 inline-flex w-4 h-4 rounded-full bg-gold-deep text-white items-center justify-center"
                    >
                      <Check className="w-2.5 h-2.5" strokeWidth={3} aria-hidden />
                    </span>
                  ) : null}
                </button>
              );
            })}
          </div>

          <p
            className={cn(
              "mt-4 text-center text-[11px] font-extrabold",
              selected.size >= 5
                ? "text-emerald-700"
                : "text-night-dim",
            )}
            aria-live="polite"
          >
            {selected.size} / 5 minimum
          </p>

          <button
            type="button"
            onClick={submit}
            disabled={!canSubmit}
            className={cn(
              "mt-3 w-full inline-flex items-center justify-center gap-2 h-11 rounded-full text-[13px] font-extrabold transition-colors",
              canSubmit
                ? "bg-night text-cream hover:bg-night-soft"
                : "bg-bg-soft text-night-dim cursor-not-allowed",
            )}
          >
            {pending ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" aria-hidden />
            ) : (
              <Sparkles className="w-3.5 h-3.5" aria-hidden />
            )}
            Démarrer
          </button>
        </div>
      </div>
    </div>
  );
}
