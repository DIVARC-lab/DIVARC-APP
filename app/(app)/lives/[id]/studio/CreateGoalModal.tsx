"use client";

/* Étape 17 — Modal création goal live (host only).
 *
 * Form : type (revenue/viewers/gifts) + target + label.
 * Pour revenue, on saisit en euros (converti en cents) ; pour
 * viewers/gifts, en valeur brute. */

import { Coins, Gift, Loader2, Target, Users, X } from "lucide-react";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import { createLiveGoal } from "../../goal-actions";

type GoalType = "revenue" | "viewers" | "gifts";

const TYPES: Array<{
  id: GoalType;
  label: string;
  description: string;
  icon: typeof Coins;
  defaultLabel: string;
  defaultTarget: number;
  unit: string;
}> = [
  {
    id: "revenue",
    label: "Revenu",
    description: "Cumul des tips, cadeaux et super-chats payés.",
    icon: Coins,
    defaultLabel: "Objectif communauté",
    defaultTarget: 50,
    unit: "€",
  },
  {
    id: "viewers",
    label: "Spectateurs",
    description: "Nombre de spectateurs simultanés peak.",
    icon: Users,
    defaultLabel: "Cap spectateurs",
    defaultTarget: 100,
    unit: "personnes",
  },
  {
    id: "gifts",
    label: "Cadeaux",
    description: "Nombre de cadeaux virtuels reçus.",
    icon: Gift,
    defaultLabel: "Mes premiers cadeaux",
    defaultTarget: 20,
    unit: "cadeaux",
  },
];

type Props = {
  sessionId: string;
  open: boolean;
  onClose: () => void;
};

export function CreateGoalModal({ sessionId, open, onClose }: Props) {
  const [type, setType] = useState<GoalType>("revenue");
  const [target, setTarget] = useState<number>(50);
  const [label, setLabel] = useState("Objectif communauté");
  const [isPending, startTransition] = useTransition();

  function handleTypeChange(newType: GoalType) {
    setType(newType);
    const def = TYPES.find((t) => t.id === newType);
    if (def) {
      setLabel(def.defaultLabel);
      setTarget(def.defaultTarget);
    }
  }

  function reset() {
    setType("revenue");
    setTarget(50);
    setLabel("Objectif communauté");
  }

  function handleClose() {
    if (isPending) return;
    reset();
    onClose();
  }

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (label.trim().length === 0) {
      toast.error("Label requis.");
      return;
    }
    if (!Number.isFinite(target) || target <= 0) {
      toast.error("Objectif invalide.");
      return;
    }
    /* Conversion cents si revenue. */
    const targetValue =
      type === "revenue" ? Math.round(target * 100) : Math.round(target);

    startTransition(async () => {
      const res = await createLiveGoal({
        sessionId,
        goalType: type,
        targetValue,
        label: label.trim(),
      });
      if (!res.ok) {
        toast.error(res.error);
        return;
      }
      toast.success("Objectif lancé !");
      reset();
      onClose();
    });
  }

  if (!open) return null;

  const selected = TYPES.find((t) => t.id === type)!;

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-night/70 backdrop-blur-sm p-4"
      onClick={handleClose}
    >
      <form
        onSubmit={handleSubmit}
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-md rounded-3xl bg-cream/5 backdrop-blur-md border border-cream/20 text-cream p-5 shadow-2xl"
      >
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Target className="w-4 h-4 text-gold" aria-hidden />
            <p className="text-[10px] font-extrabold uppercase tracking-[0.16em] text-gold">
              Nouvel objectif
            </p>
          </div>
          <button
            type="button"
            onClick={handleClose}
            aria-label="Fermer"
            className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-cream/10 hover:bg-cream/20 text-cream transition-colors"
          >
            <X className="w-4 h-4" aria-hidden />
          </button>
        </div>

        {/* Type */}
        <fieldset className="mb-4">
          <legend className="block text-[10px] font-bold uppercase tracking-wider text-cream/60 mb-2">
            Type d&apos;objectif
          </legend>
          <div className="grid grid-cols-3 gap-2">
            {TYPES.map((t) => {
              const Icon = t.icon;
              const active = type === t.id;
              return (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => handleTypeChange(t.id)}
                  className={`flex flex-col items-center gap-1 p-2.5 rounded-2xl border transition-colors ${
                    active
                      ? "bg-gold/20 border-gold/50 text-cream"
                      : "bg-cream/5 border-cream/15 text-cream/70 hover:bg-cream/10"
                  }`}
                  aria-pressed={active}
                >
                  <Icon
                    className={`w-4 h-4 ${active ? "text-gold" : "text-cream/70"}`}
                    aria-hidden
                  />
                  <span className="text-[11px] font-bold">{t.label}</span>
                </button>
              );
            })}
          </div>
          <p className="mt-2 text-[10.5px] text-cream/50 leading-snug">
            {selected.description}
          </p>
        </fieldset>

        {/* Label */}
        <label className="block mb-3">
          <span className="block text-[10px] font-bold uppercase tracking-wider text-cream/60 mb-1.5">
            Libellé affiché
          </span>
          <input
            type="text"
            value={label}
            onChange={(e) => setLabel(e.target.value.slice(0, 80))}
            maxLength={80}
            required
            className="w-full h-11 px-3 rounded-xl bg-cream/10 text-cream text-[14px] focus:outline-none focus:bg-cream/15 border border-transparent focus:border-cream/30"
          />
        </label>

        {/* Target */}
        <label className="block mb-5">
          <span className="block text-[10px] font-bold uppercase tracking-wider text-cream/60 mb-1.5">
            Cible ({selected.unit})
          </span>
          <div className="relative">
            <input
              type="number"
              inputMode="decimal"
              value={target}
              onChange={(e) =>
                setTarget(Math.max(0, Number.parseFloat(e.target.value) || 0))
              }
              min={1}
              step={type === "revenue" ? "0.01" : "1"}
              required
              className="w-full h-11 pl-3 pr-12 rounded-xl bg-cream/10 text-cream text-[14px] focus:outline-none focus:bg-cream/15 border border-transparent focus:border-cream/30 tabular-nums"
            />
            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-cream/60 text-[11px] font-bold">
              {type === "revenue" ? "€" : selected.unit}
            </span>
          </div>
        </label>

        <div className="flex items-center justify-end gap-2">
          <button
            type="button"
            onClick={handleClose}
            disabled={isPending}
            className="h-10 px-4 rounded-full text-[12px] font-bold text-cream/60 hover:text-cream"
          >
            Annuler
          </button>
          <button
            type="submit"
            disabled={isPending || label.trim().length === 0 || target <= 0}
            className="inline-flex items-center gap-1.5 h-10 px-5 rounded-full bg-gold text-night text-[12px] font-bold hover:bg-gold/90 transition-colors disabled:opacity-60"
          >
            {isPending ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <Target className="w-3.5 h-3.5" aria-hidden />
            )}
            Lancer l&apos;objectif
          </button>
        </div>

        <p className="mt-3 text-[10px] text-cream/40 leading-relaxed text-center">
          Tu peux lancer un nouvel objectif à tout moment — il remplace
          le précédent.
        </p>
      </form>
    </div>
  );
}
