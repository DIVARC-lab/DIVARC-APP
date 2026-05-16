"use client";

/* Étape 12 — Modal création de sondage live (host only).
 *
 * Form : question + options dynamiques (min 2, max 6) + durée 30s/60s/2min/5min.
 * Submit → createLivePoll → toast + close.
 */

import { Loader2, Plus, Vote, X } from "lucide-react";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import { createLivePoll } from "../../poll-actions";

const DURATIONS = [
  { label: "30s", value: 30 },
  { label: "1 min", value: 60 },
  { label: "2 min", value: 120 },
  { label: "5 min", value: 300 },
];

type Props = {
  sessionId: string;
  open: boolean;
  onClose: () => void;
};

export function CreatePollModal({ sessionId, open, onClose }: Props) {
  const [question, setQuestion] = useState("");
  const [options, setOptions] = useState<string[]>(["", ""]);
  const [duration, setDuration] = useState(60);
  const [isPending, startTransition] = useTransition();

  function updateOption(idx: number, value: string) {
    setOptions((prev) => prev.map((o, i) => (i === idx ? value : o)));
  }

  function addOption() {
    if (options.length >= 6) return;
    setOptions((prev) => [...prev, ""]);
  }

  function removeOption(idx: number) {
    if (options.length <= 2) return;
    setOptions((prev) => prev.filter((_, i) => i !== idx));
  }

  function reset() {
    setQuestion("");
    setOptions(["", ""]);
    setDuration(60);
  }

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const cleanOptions = options.map((o) => o.trim()).filter((o) => o.length > 0);
    if (cleanOptions.length < 2) {
      toast.error("Au moins 2 options requises.");
      return;
    }
    if (question.trim().length < 3) {
      toast.error("Question trop courte (3 caractères min).");
      return;
    }
    startTransition(async () => {
      const res = await createLivePoll({
        sessionId,
        question: question.trim(),
        options: cleanOptions,
        durationSeconds: duration,
      });
      if (!res.ok) {
        toast.error(res.error);
        return;
      }
      toast.success("Sondage lancé !");
      reset();
      onClose();
    });
  }

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-night/70 backdrop-blur-sm p-4"
      onClick={onClose}
    >
      <form
        onSubmit={handleSubmit}
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-md rounded-3xl bg-cream/5 backdrop-blur-md border border-cream/20 text-cream p-5 shadow-2xl"
      >
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Vote className="w-4 h-4 text-gold" aria-hidden />
            <p className="text-[10px] font-extrabold uppercase tracking-[0.16em] text-gold">
              Nouveau sondage
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Fermer"
            className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-cream/10 hover:bg-cream/20 text-cream transition-colors"
          >
            <X className="w-4 h-4" aria-hidden />
          </button>
        </div>

        {/* Question */}
        <label className="block mb-3">
          <span className="block text-[10px] font-bold uppercase tracking-wider text-cream/60 mb-1.5">
            Question
          </span>
          <input
            type="text"
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            placeholder="Quelle est ta question ?"
            maxLength={280}
            minLength={3}
            required
            className="w-full h-11 px-3 rounded-xl bg-cream/10 text-cream text-[14px] placeholder:text-cream/40 focus:outline-none focus:bg-cream/15 border border-transparent focus:border-cream/30"
          />
          <span className="block mt-1 text-[10px] text-cream/40 text-right tabular-nums">
            {question.length}/280
          </span>
        </label>

        {/* Options */}
        <fieldset className="mb-4">
          <span className="block text-[10px] font-bold uppercase tracking-wider text-cream/60 mb-1.5">
            Options ({options.length}/6)
          </span>
          <div className="space-y-2">
            {options.map((opt, idx) => (
              <div key={idx} className="flex items-center gap-2">
                <input
                  type="text"
                  value={opt}
                  onChange={(e) => updateOption(idx, e.target.value)}
                  placeholder={`Option ${idx + 1}`}
                  maxLength={80}
                  className="flex-1 h-10 px-3 rounded-xl bg-cream/10 text-cream text-[13px] placeholder:text-cream/40 focus:outline-none focus:bg-cream/15 border border-transparent focus:border-cream/30"
                />
                {options.length > 2 ? (
                  <button
                    type="button"
                    onClick={() => removeOption(idx)}
                    aria-label={`Supprimer option ${idx + 1}`}
                    className="inline-flex items-center justify-center w-9 h-9 rounded-full bg-cream/5 hover:bg-rose-500/20 text-cream/60 hover:text-rose-300 transition-colors shrink-0"
                  >
                    <X className="w-3.5 h-3.5" aria-hidden />
                  </button>
                ) : null}
              </div>
            ))}
          </div>
          {options.length < 6 ? (
            <button
              type="button"
              onClick={addOption}
              className="mt-2 inline-flex items-center gap-1.5 h-8 px-3 rounded-full bg-cream/10 hover:bg-cream/20 text-[11px] font-bold text-cream transition-colors"
            >
              <Plus className="w-3 h-3" aria-hidden />
              Ajouter une option
            </button>
          ) : null}
        </fieldset>

        {/* Duration */}
        <fieldset className="mb-5">
          <span className="block text-[10px] font-bold uppercase tracking-wider text-cream/60 mb-1.5">
            Durée
          </span>
          <div className="flex items-center gap-1.5 flex-wrap">
            {DURATIONS.map((d) => (
              <button
                key={d.value}
                type="button"
                onClick={() => setDuration(d.value)}
                className={`inline-flex items-center h-8 px-3 rounded-full text-[11px] font-bold transition-colors ${
                  duration === d.value
                    ? "bg-gold text-night"
                    : "bg-cream/10 text-cream hover:bg-cream/20"
                }`}
              >
                {d.label}
              </button>
            ))}
          </div>
        </fieldset>

        <div className="flex items-center justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            disabled={isPending}
            className="h-10 px-4 rounded-full text-[12px] font-bold text-cream/60 hover:text-cream"
          >
            Annuler
          </button>
          <button
            type="submit"
            disabled={
              isPending ||
              question.trim().length < 3 ||
              options.filter((o) => o.trim().length > 0).length < 2
            }
            className="inline-flex items-center gap-1.5 h-10 px-4 rounded-full bg-gold text-night text-[12px] font-bold hover:bg-gold/90 transition-colors disabled:opacity-60"
          >
            {isPending ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <Vote className="w-3.5 h-3.5" aria-hidden />
            )}
            Lancer le sondage
          </button>
        </div>
      </form>
    </div>
  );
}
