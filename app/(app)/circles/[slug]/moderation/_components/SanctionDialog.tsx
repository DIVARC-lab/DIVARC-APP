"use client";

import { AlertTriangle, Gavel, Loader2, X } from "lucide-react";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import { issueCircleSanction } from "@/app/(app)/circles/actions";
import { cn } from "@/lib/utils/cn";

type SanctionAction =
  | "warning"
  | "mute_1h"
  | "mute_24h"
  | "mute_7d"
  | "temp_ban_30d"
  | "permanent_ban";

const SANCTIONS: {
  value: SanctionAction;
  level: number;
  label: string;
  desc: string;
}[] = [
  { value: "warning", level: 1, label: "Avertissement", desc: "Aucun blocage, juste un compteur" },
  { value: "mute_1h", level: 2, label: "Mute 1h", desc: "Ne peut plus poster/commenter pendant 1h" },
  { value: "mute_24h", level: 3, label: "Mute 24h", desc: "Mute pendant 24h" },
  { value: "mute_7d", level: 4, label: "Mute 7 jours", desc: "Mute pendant 7 jours" },
  { value: "temp_ban_30d", level: 5, label: "Ban temporaire (30j)", desc: "Banni du cercle pendant 30 jours" },
  { value: "permanent_ban", level: 6, label: "Ban définitif", desc: "Banni définitivement (réversible par modo)" },
];

type Props = {
  circleId: string;
  targetUserId: string;
  targetName: string;
  onClose: () => void;
};

export function SanctionDialog({
  circleId,
  targetUserId,
  targetName,
  onClose,
}: Props) {
  const [action, setAction] = useState<SanctionAction>("warning");
  const [reason, setReason] = useState("");
  const [pending, startTransition] = useTransition();

  function submit() {
    if (reason.trim().length < 5) {
      toast.error("Précise la raison (5 caractères min).");
      return;
    }
    startTransition(async () => {
      const result = await issueCircleSanction(
        circleId,
        targetUserId,
        action,
        reason,
      );
      if (!result.ok) {
        toast.error(result.error ?? "Sanction impossible.");
        return;
      }
      toast.success(`Sanction appliquée à ${targetName}.`);
      onClose();
    });
  }

  const selected = SANCTIONS.find((s) => s.value === action)!;
  const isCritical = selected.level >= 5;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Appliquer une sanction"
      className="fixed inset-0 z-[70] flex items-end sm:items-center justify-center bg-night/55 backdrop-blur-sm sm:p-4 overflow-y-auto"
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full sm:max-w-md bg-white border-t sm:border border-line rounded-t-3xl sm:rounded-3xl shadow-[0_40px_100px_-30px_rgba(10,31,68,0.55)] max-h-[92dvh] overflow-y-auto"
      >
        <header className="flex items-start justify-between gap-3 px-5 pt-5 pb-3 border-b border-line">
          <div className="min-w-0">
            <p className="text-[11px] font-extrabold uppercase tracking-[0.16em] text-red-700 inline-flex items-center gap-1">
              <Gavel className="w-3 h-3" aria-hidden />
              · Sanction
            </p>
            <h2 className="mt-1 font-display italic text-[22px] text-night leading-tight">
              Sanctionner {targetName}
            </h2>
            <p className="mt-1 text-[12px] text-night-soft">
              Les sanctions ne touchent que ce cercle, pas le compte global
              DIVARC.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Fermer"
            className="w-9 h-9 rounded-full hover:bg-night/5 inline-flex items-center justify-center shrink-0"
          >
            <X className="w-4 h-4 text-night-dim" aria-hidden />
          </button>
        </header>

        <div className="px-5 py-4 space-y-3">
          <fieldset>
            <legend className="text-[11px] font-extrabold uppercase tracking-wider text-night-dim mb-1.5">
              Niveau
            </legend>
            <div className="space-y-1.5">
              {SANCTIONS.map((s) => {
                const active = action === s.value;
                return (
                  <label
                    key={s.value}
                    className={cn(
                      "flex items-start gap-2.5 p-2.5 rounded-xl border cursor-pointer transition-colors",
                      active
                        ? s.level >= 5
                          ? "bg-red-50 border-red-300"
                          : "bg-gold/5 border-gold/30"
                        : "bg-white border-line hover:border-night/30",
                    )}
                  >
                    <input
                      type="radio"
                      name="sanction"
                      value={s.value}
                      checked={active}
                      onChange={() => setAction(s.value)}
                      className="mt-0.5 accent-red-600"
                    />
                    <div className="min-w-0 flex-1">
                      <p className="text-[12.5px] font-bold text-night">
                        <span className="text-night-dim mr-1 tabular-nums">
                          {s.level}.
                        </span>
                        {s.label}
                      </p>
                      <p className="text-[11px] text-night-dim">{s.desc}</p>
                    </div>
                  </label>
                );
              })}
            </div>
          </fieldset>

          {isCritical ? (
            <div className="flex items-start gap-2 p-2.5 rounded-xl bg-red-50 border border-red-200">
              <AlertTriangle
                className="w-3.5 h-3.5 text-red-700 mt-0.5 shrink-0"
                aria-hidden
              />
              <p className="text-[11px] text-red-700 leading-snug">
                Action lourde. L&apos;utilisateur perd l&apos;accès au
                cercle. Réversible par un modo.
              </p>
            </div>
          ) : null}

          <div>
            <label
              htmlFor="sanction-reason"
              className="block text-[11px] font-extrabold uppercase tracking-wider text-night-dim mb-1"
            >
              Raison (visible dans l&apos;historique)
            </label>
            <textarea
              id="sanction-reason"
              rows={3}
              maxLength={1000}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Pourquoi cette sanction ?"
              className="w-full rounded-xl border border-line bg-white px-3 py-2 text-[13px] focus:outline-none focus:border-night/40 resize-y"
            />
          </div>
        </div>

        <footer className="px-5 pb-5 pt-2 border-t border-line flex items-center justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            disabled={pending}
            className="h-10 px-3 rounded-full text-[12px] font-bold text-night-dim hover:text-night transition-colors"
          >
            Annuler
          </button>
          <button
            type="button"
            onClick={submit}
            disabled={pending || reason.trim().length < 5}
            className={cn(
              "inline-flex items-center gap-1.5 h-10 px-4 rounded-full text-[12px] font-extrabold transition-colors disabled:opacity-50",
              isCritical
                ? "bg-red-600 text-white hover:bg-red-700"
                : "bg-night text-cream hover:bg-night-soft",
            )}
          >
            {pending ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" aria-hidden />
            ) : (
              <Gavel className="w-3.5 h-3.5" aria-hidden />
            )}
            Appliquer
          </button>
        </footer>
      </div>
    </div>
  );
}
