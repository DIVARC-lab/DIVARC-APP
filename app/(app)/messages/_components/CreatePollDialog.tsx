"use client";

/* Modal de création d'un sondage à envoyer dans la conversation. */

import { Loader2, Plus, Vote, X } from "lucide-react";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import { createMessagePoll } from "../poll-actions";

type Props = {
  conversationId: string;
  open: boolean;
  onClose: () => void;
};

export function CreatePollDialog({ conversationId, open, onClose }: Props) {
  const [question, setQuestion] = useState("");
  const [options, setOptions] = useState<string[]>(["", ""]);
  const [isMultiple, setIsMultiple] = useState(false);
  const [isAnonymous, setIsAnonymous] = useState(false);
  const [isPending, startTransition] = useTransition();

  function reset() {
    setQuestion("");
    setOptions(["", ""]);
    setIsMultiple(false);
    setIsAnonymous(false);
  }

  function handleAddOption() {
    if (options.length >= 10) return;
    setOptions([...options, ""]);
  }

  function handleRemoveOption(idx: number) {
    if (options.length <= 2) return;
    setOptions(options.filter((_, i) => i !== idx));
  }

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const cleanOpts = options.map((o) => o.trim()).filter((o) => o.length > 0);
    if (question.trim().length < 3) {
      toast.error("Question trop courte (3 caractères min).");
      return;
    }
    if (cleanOpts.length < 2) {
      toast.error("Au moins 2 options requises.");
      return;
    }
    startTransition(async () => {
      const res = await createMessagePoll({
        conversationId,
        question: question.trim(),
        options: cleanOpts,
        isMultipleChoice: isMultiple,
        isAnonymous,
      });
      if (!res.ok) {
        toast.error(res.error);
        return;
      }
      toast.success("Sondage envoyé !");
      reset();
      onClose();
    });
  }

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-night/50 backdrop-blur-sm p-4"
      onClick={onClose}
    >
      <form
        onSubmit={handleSubmit}
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-md rounded-3xl bg-white text-night p-5 shadow-2xl"
      >
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Vote
              className="w-4 h-4 text-gold-deep"
              aria-hidden
              strokeWidth={2.4}
            />
            <p className="text-[10px] font-extrabold uppercase tracking-[0.16em] text-gold-deep">
              Sondage
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Fermer"
            className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-bg-soft hover:bg-night/10 text-night"
          >
            <X className="w-4 h-4" aria-hidden />
          </button>
        </div>

        {/* Question */}
        <label className="block mb-3">
          <span className="block text-[10px] font-bold uppercase tracking-wider text-night-dim mb-1.5">
            Question
          </span>
          <input
            type="text"
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            placeholder="Quelle est ta question ?"
            maxLength={280}
            required
            className="w-full h-11 px-3 rounded-xl bg-bg-soft border border-line text-night text-[14px] focus:outline-none focus:border-gold-deep"
          />
        </label>

        {/* Options */}
        <fieldset className="mb-4">
          <legend className="block text-[10px] font-bold uppercase tracking-wider text-night-dim mb-1.5">
            Options ({options.length}/10)
          </legend>
          <div className="space-y-2">
            {options.map((opt, idx) => (
              <div key={idx} className="flex items-center gap-2">
                <input
                  type="text"
                  value={opt}
                  onChange={(e) =>
                    setOptions((prev) =>
                      prev.map((p, i) => (i === idx ? e.target.value : p)),
                    )
                  }
                  placeholder={`Option ${idx + 1}`}
                  maxLength={80}
                  className="flex-1 h-10 px-3 rounded-xl bg-bg-soft border border-line text-night text-[13px] focus:outline-none focus:border-gold-deep"
                />
                {options.length > 2 ? (
                  <button
                    type="button"
                    onClick={() => handleRemoveOption(idx)}
                    aria-label="Supprimer"
                    className="inline-flex items-center justify-center w-9 h-9 rounded-full bg-bg-soft hover:bg-rose-100 text-night-dim hover:text-rose-700"
                  >
                    <X className="w-3.5 h-3.5" aria-hidden />
                  </button>
                ) : null}
              </div>
            ))}
          </div>
          {options.length < 10 ? (
            <button
              type="button"
              onClick={handleAddOption}
              className="mt-2 inline-flex items-center gap-1 h-8 px-3 rounded-full bg-bg-soft hover:bg-gold/15 text-night text-[11px] font-bold transition-colors"
            >
              <Plus className="w-3 h-3" aria-hidden />
              Ajouter une option
            </button>
          ) : null}
        </fieldset>

        {/* Toggles */}
        <div className="space-y-2 mb-4">
          <ToggleRow
            label="Choix multiples"
            description="Permettre de cocher plusieurs réponses"
            checked={isMultiple}
            onChange={setIsMultiple}
          />
          <ToggleRow
            label="Vote anonyme"
            description="Ne pas montrer qui a voté quoi"
            checked={isAnonymous}
            onChange={setIsAnonymous}
          />
        </div>

        <div className="flex items-center justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            disabled={isPending}
            className="h-10 px-4 rounded-full text-[12px] font-bold text-night-dim hover:text-night"
          >
            Annuler
          </button>
          <button
            type="submit"
            disabled={isPending || question.trim().length < 3}
            className="inline-flex items-center gap-1.5 h-10 px-5 rounded-full bg-gold text-night text-[12px] font-extrabold hover:bg-gold-soft transition-colors disabled:opacity-60"
          >
            {isPending ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" aria-hidden />
            ) : (
              <Vote className="w-3.5 h-3.5" aria-hidden strokeWidth={2.6} />
            )}
            Envoyer le sondage
          </button>
        </div>
      </form>
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
  onChange: (v: boolean) => void;
}) {
  return (
    <button
      type="button"
      onClick={() => onChange(!checked)}
      className="w-full flex items-center gap-3 p-3 rounded-2xl bg-bg-soft border border-line hover:border-gold/30 text-left transition-colors"
      aria-pressed={checked}
    >
      <div className="flex-1 min-w-0">
        <p className="text-[12px] font-extrabold text-night">{label}</p>
        <p className="text-[11px] text-night-dim">{description}</p>
      </div>
      <span
        className={`inline-flex items-center w-10 h-6 rounded-full transition-colors shrink-0 ${
          checked ? "bg-gold" : "bg-night/15"
        }`}
      >
        <span
          className={`w-5 h-5 rounded-full bg-white transition-transform shadow ${
            checked ? "translate-x-4" : "translate-x-0.5"
          }`}
        />
      </span>
    </button>
  );
}
