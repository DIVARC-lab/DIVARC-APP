"use client";

import { BarChart3, Plus, Trash2, X } from "lucide-react";
import { useState } from "react";
import { cn } from "@/lib/utils/cn";

/* PollCreator — modal de création de sondage attaché au post.
 *
 * Style Facebook/Instagram :
 *   - Question (1-200 chars)
 *   - 2 à 6 options (1-80 chars chacune)
 *   - Durée (1h, 6h, 24h, 3j, 7j, illimité)
 *   - Toggle "Plusieurs choix possibles"
 *   - Toggle "Vote anonyme" (Premium V1.5)
 *
 * Output : PollDraft ou null. */

export type PollDraft = {
  question: string;
  options: string[]; // 2-6, chacune trim non-vide
  duration: PollDuration;
  multiChoice: boolean;
  isAnonymous: boolean;
};

export type PollDuration = "1h" | "6h" | "24h" | "3d" | "7d" | "unlimited";

const DURATION_OPTIONS: Array<{ id: PollDuration; label: string }> = [
  { id: "1h", label: "1 heure" },
  { id: "6h", label: "6 heures" },
  { id: "24h", label: "1 jour" },
  { id: "3d", label: "3 jours" },
  { id: "7d", label: "1 semaine" },
  { id: "unlimited", label: "Illimité" },
];

export function durationToEndsAt(duration: PollDuration): string | null {
  const ms: Record<PollDuration, number | null> = {
    "1h": 60 * 60 * 1000,
    "6h": 6 * 60 * 60 * 1000,
    "24h": 24 * 60 * 60 * 1000,
    "3d": 3 * 24 * 60 * 60 * 1000,
    "7d": 7 * 24 * 60 * 60 * 1000,
    unlimited: null,
  };
  const value = ms[duration];
  if (value === null) return null;
  return new Date(Date.now() + value).toISOString();
}

type Props = {
  initialDraft: PollDraft | null;
  onApply: (draft: PollDraft | null) => void;
  onClose: () => void;
};

export function PollCreator({ initialDraft, onApply, onClose }: Props) {
  const [question, setQuestion] = useState(initialDraft?.question ?? "");
  const [options, setOptions] = useState<string[]>(
    initialDraft?.options ?? ["", ""],
  );
  const [duration, setDuration] = useState<PollDuration>(
    initialDraft?.duration ?? "24h",
  );
  const [multiChoice, setMultiChoice] = useState(
    initialDraft?.multiChoice ?? false,
  );
  const [isAnonymous, setIsAnonymous] = useState(
    initialDraft?.isAnonymous ?? false,
  );

  const updateOption = (idx: number, value: string) =>
    setOptions((prev) => prev.map((v, i) => (i === idx ? value : v)));

  const addOption = () => {
    if (options.length >= 6) return;
    setOptions((prev) => [...prev, ""]);
  };

  const removeOption = (idx: number) => {
    if (options.length <= 2) return;
    setOptions((prev) => prev.filter((_, i) => i !== idx));
  };

  const trimmedOptions = options
    .map((o) => o.trim())
    .filter((o) => o.length > 0);
  const hasUniqueOptions = new Set(trimmedOptions).size === trimmedOptions.length;
  const isValid =
    question.trim().length >= 1 &&
    question.trim().length <= 200 &&
    trimmedOptions.length >= 2 &&
    trimmedOptions.every((o) => o.length <= 80) &&
    hasUniqueOptions;

  const apply = () => {
    if (!isValid) return;
    onApply({
      question: question.trim(),
      options: trimmedOptions,
      duration,
      multiChoice,
      isAnonymous,
    });
    onClose();
  };

  return (
    <div className="flex flex-col h-full bg-white rounded-2xl overflow-hidden">
      <header className="flex items-center justify-between px-4 py-3 border-b border-line">
        <p className="font-display italic text-[18px] text-night flex items-center gap-2">
          <BarChart3 className="w-4 h-4 text-gold-deep" aria-hidden />
          Créer un sondage
        </p>
        <button
          type="button"
          onClick={onClose}
          className="text-night-muted hover:text-night"
          aria-label="Fermer"
        >
          <X className="w-5 h-5" aria-hidden />
        </button>
      </header>

      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4 min-h-0">
        {/* Question. */}
        <div>
          <label className="block text-[10.5px] font-bold uppercase tracking-wider text-night-muted mb-1.5">
            Question
          </label>
          <input
            type="text"
            value={question}
            onChange={(e) => setQuestion(e.target.value.slice(0, 200))}
            placeholder="ex: Quel est le meilleur cadre éditorial DIVARC ?"
            maxLength={200}
            autoFocus
            className="w-full px-3 py-2.5 rounded-xl border border-line bg-white text-[13.5px]"
          />
          <p className="mt-1 text-[10.5px] text-night-muted text-right tabular-nums">
            {question.length}/200
          </p>
        </div>

        {/* Options. */}
        <div>
          <label className="block text-[10.5px] font-bold uppercase tracking-wider text-night-muted mb-1.5">
            Options ({options.length}/6)
          </label>
          <ul className="space-y-2">
            {options.map((option, idx) => (
              <li key={idx} className="flex items-center gap-2">
                <span
                  aria-hidden
                  className="w-7 h-7 rounded-full bg-gold/15 text-gold-deep flex items-center justify-center text-[11px] font-bold shrink-0"
                >
                  {idx + 1}
                </span>
                <input
                  type="text"
                  value={option}
                  onChange={(e) =>
                    updateOption(idx, e.target.value.slice(0, 80))
                  }
                  placeholder={`Option ${idx + 1}`}
                  maxLength={80}
                  className="flex-1 px-3 py-2 rounded-lg border border-line bg-white text-[13px]"
                />
                {options.length > 2 ? (
                  <button
                    type="button"
                    onClick={() => removeOption(idx)}
                    className="text-night-muted hover:text-red-600 shrink-0"
                    aria-label={`Retirer option ${idx + 1}`}
                  >
                    <Trash2 className="w-4 h-4" aria-hidden />
                  </button>
                ) : null}
              </li>
            ))}
          </ul>
          {options.length < 6 ? (
            <button
              type="button"
              onClick={addOption}
              className="mt-2 inline-flex items-center gap-1 text-[12px] font-bold text-gold-deep hover:underline"
            >
              <Plus className="w-3.5 h-3.5" aria-hidden />
              Ajouter une option
            </button>
          ) : null}
          {!hasUniqueOptions ? (
            <p className="mt-1 text-[11px] text-red-600">
              Les options doivent être uniques.
            </p>
          ) : null}
        </div>

        {/* Durée. */}
        <div>
          <label className="block text-[10.5px] font-bold uppercase tracking-wider text-night-muted mb-1.5">
            Durée du sondage
          </label>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5">
            {DURATION_OPTIONS.map((d) => (
              <button
                key={d.id}
                type="button"
                onClick={() => setDuration(d.id)}
                className={cn(
                  "px-3 py-2 rounded-lg text-[12px] font-semibold border transition-colors",
                  duration === d.id
                    ? "bg-night text-cream border-night"
                    : "bg-white text-night-muted border-line hover:bg-bg-soft",
                )}
              >
                {d.label}
              </button>
            ))}
          </div>
        </div>

        {/* Toggles. */}
        <div className="space-y-2">
          <ToggleRow
            label="Plusieurs choix possibles"
            description="Les votants peuvent sélectionner plusieurs options."
            checked={multiChoice}
            onChange={setMultiChoice}
          />
          <ToggleRow
            label="Vote anonyme"
            description="Les choix individuels ne sont pas visibles. (Premium DIVARC V1.5)"
            checked={isAnonymous}
            onChange={setIsAnonymous}
          />
        </div>
      </div>

      <footer className="flex items-center justify-between gap-2 px-4 py-3 border-t border-line bg-bg-soft">
        {initialDraft ? (
          <button
            type="button"
            onClick={() => {
              onApply(null);
              onClose();
            }}
            className="text-[12.5px] text-night-muted hover:text-red-600 font-semibold"
          >
            Retirer
          </button>
        ) : (
          <span />
        )}
        <button
          type="button"
          onClick={apply}
          disabled={!isValid}
          className="inline-flex items-center gap-1.5 px-5 py-2 rounded-full bg-night text-cream text-[13px] font-bold disabled:opacity-40"
        >
          Valider le sondage
        </button>
      </footer>
    </div>
  );
}

function ToggleRow({
  label,
  description,
  checked,
  onChange,
}: {
  label: string;
  description: string;
  checked: boolean;
  onChange: (value: boolean) => void;
}) {
  return (
    <div className="flex items-start gap-3 px-3 py-2.5 rounded-xl bg-bg-soft border border-line">
      <div className="min-w-0 flex-1">
        <p className="text-[12.5px] font-bold text-night">{label}</p>
        <p className="text-[11px] text-night-muted leading-snug">{description}</p>
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        aria-label={label}
        onClick={() => onChange(!checked)}
        className={cn(
          "relative w-10 h-6 rounded-full transition-colors shrink-0 mt-0.5",
          checked ? "bg-night" : "bg-line",
        )}
      >
        <span
          className={cn(
            "absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-cream transition-transform",
            checked && "translate-x-4",
          )}
          aria-hidden
        />
      </button>
    </div>
  );
}
