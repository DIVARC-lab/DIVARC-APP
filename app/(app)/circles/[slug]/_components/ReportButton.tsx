"use client";

/* Sprint J — Bouton "Signaler" disponible sur tout contenu cercle.
 * Popover natif minimal : sélection raison + note optionnelle + envoi. */

import { Flag, X } from "lucide-react";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import { reportCircleContent } from "../reports-actions";

const REASONS = [
  { value: "spam", label: "Spam" },
  { value: "harassment", label: "Harcèlement" },
  { value: "hate_speech", label: "Discours haineux" },
  { value: "nsfw", label: "Contenu sensible (NSFW)" },
  { value: "misinfo", label: "Désinformation" },
  { value: "self_harm", label: "Automutilation / suicide" },
  { value: "other", label: "Autre" },
] as const;

type Props = {
  circleId: string;
  circleSlug: string;
  targetKind: "post" | "comment" | "chat_message" | "member";
  targetId: string;
};

export function ReportButton({
  circleId,
  circleSlug,
  targetKind,
  targetId,
}: Props) {
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState<string>("spam");
  const [note, setNote] = useState("");
  const [isPending, startTransition] = useTransition();

  function submit() {
    startTransition(async () => {
      const res = await reportCircleContent({
        circleId,
        circleSlug,
        targetKind,
        targetId,
        reason: reason as (typeof REASONS)[number]["value"],
        note: note.length > 0 ? note : "",
      });
      if (!res.ok) {
        toast.error(res.error);
        return;
      }
      toast.success("Signalement envoyé. Les modérateurs vont vérifier.");
      setOpen(false);
      setNote("");
      setReason("spam");
    });
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-1 h-6 px-2 rounded-full text-[10.5px] font-bold text-night-dim hover:bg-bg-soft hover:text-rose-600 transition-colors"
        title="Signaler"
      >
        <Flag className="w-3 h-3" aria-hidden />
        Signaler
      </button>

      {open ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-night/60 backdrop-blur-sm px-5"
          onClick={() => setOpen(false)}
        >
          <div
            className="w-full max-w-md rounded-3xl bg-white shadow-2xl p-5"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-[14px] font-bold text-night">
                Signaler ce contenu
              </h2>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="inline-flex items-center justify-center w-7 h-7 rounded-full text-night-dim hover:bg-bg-soft"
              >
                <X className="w-3.5 h-3.5" aria-hidden />
              </button>
            </div>

            <p className="text-[11.5px] text-night-dim mb-3 leading-relaxed">
              Choisis la raison la plus appropriée. Un modérateur du cercle
              examinera ce signalement.
            </p>

            <fieldset className="space-y-1.5 mb-3">
              {REASONS.map((r) => (
                <label
                  key={r.value}
                  className="flex items-center gap-2 cursor-pointer px-2.5 py-1.5 rounded-lg hover:bg-bg-soft"
                >
                  <input
                    type="radio"
                    name="reason"
                    value={r.value}
                    checked={reason === r.value}
                    onChange={() => setReason(r.value)}
                  />
                  <span className="text-[12.5px] text-night">{r.label}</span>
                </label>
              ))}
            </fieldset>

            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Précisions (optionnel)"
              maxLength={1000}
              rows={2}
              className="w-full px-3 py-2 rounded-xl border border-line text-[12.5px] resize-none focus:outline-none focus:border-night/30"
            />

            <div className="mt-4 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setOpen(false)}
                disabled={isPending}
                className="h-9 px-4 rounded-full text-[12px] font-bold text-night-dim hover:text-night"
              >
                Annuler
              </button>
              <button
                type="button"
                onClick={submit}
                disabled={isPending}
                className="inline-flex items-center h-9 px-4 rounded-full bg-rose-600 text-white text-[12px] font-bold hover:bg-rose-700 transition-colors disabled:opacity-60"
              >
                {isPending ? "Envoi..." : "Envoyer le signalement"}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
