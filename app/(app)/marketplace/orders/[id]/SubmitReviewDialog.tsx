"use client";

import { Star } from "lucide-react";
import { useActionState, useEffect, useState } from "react";
import { toast } from "sonner";
import { submitReviewAction, type ReviewActionState } from "../actions";

type Props = {
  orderId: string;
  counterpartyName: string;
  role: "buyer" | "seller";
};

const INITIAL: ReviewActionState = { ok: false };

export function SubmitReviewDialog({
  orderId,
  counterpartyName,
  role,
}: Props) {
  const [open, setOpen] = useState(false);
  const [rating, setRating] = useState(5);
  const [body, setBody] = useState("");
  const [state, action, pending] = useActionState<
    ReviewActionState,
    FormData
  >(submitReviewAction, INITIAL);

  useEffect(() => {
    if (state.ok) {
      toast.success("Merci pour ton avis !");
      setOpen(false);
      setBody("");
    } else if (state.error) {
      toast.error(state.error);
    }
  }, [state]);

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex items-center justify-center gap-2 h-12 px-5 rounded-full bg-gradient-to-br from-gold to-gold-deep text-night font-extrabold text-[14px] shadow-[0_8px_22px_-8px_rgba(244,185,66,0.55)] hover:opacity-95 transition-opacity"
      >
        <Star className="w-4 h-4" aria-hidden />
        Laisser un avis sur {counterpartyName}
      </button>
    );
  }

  return (
    <form
      action={action}
      className="rounded-2xl bg-white border border-line p-4 space-y-3"
    >
      <input type="hidden" name="orderId" value={orderId} />
      <input type="hidden" name="rating" value={rating} />

      <p className="text-[11px] font-extrabold uppercase tracking-[0.14em] text-gold-deep">
        · Ton avis sur {counterpartyName}
      </p>

      <div className="flex items-center gap-1.5" role="radiogroup" aria-label="Note">
        {[1, 2, 3, 4, 5].map((n) => {
          const active = n <= rating;
          return (
            <button
              key={n}
              type="button"
              role="radio"
              aria-checked={n === rating}
              aria-label={`${n} étoile${n > 1 ? "s" : ""}`}
              onClick={() => setRating(n)}
              className="p-1"
            >
              <Star
                className={`w-7 h-7 transition-colors ${
                  active ? "fill-amber-400 text-amber-400" : "text-line"
                }`}
                aria-hidden
              />
            </button>
          );
        })}
      </div>

      <textarea
        name="body"
        rows={4}
        maxLength={2000}
        value={body}
        onChange={(e) => setBody(e.target.value)}
        placeholder={
          role === "buyer"
            ? "Comment s'est passée la transaction ? Conformité, état, communication…"
            : "L'acheteur a-t-il été correct ? Paiement rapide, communication…"
        }
        className="w-full rounded-xl border border-line bg-bg-soft px-3 py-2 text-[13px] text-night placeholder:text-night-dim focus:outline-none focus:border-night/40 resize-y"
      />

      <div className="flex items-center justify-end gap-2 pt-1">
        <button
          type="button"
          onClick={() => setOpen(false)}
          className="h-9 px-3 rounded-full text-[12px] font-bold text-night-dim hover:text-night transition-colors"
        >
          Annuler
        </button>
        <button
          type="submit"
          disabled={pending}
          className="h-9 px-4 rounded-full bg-night text-cream text-[12px] font-extrabold hover:bg-night-soft transition-colors disabled:opacity-50"
        >
          {pending ? "Envoi…" : "Publier l'avis"}
        </button>
      </div>
    </form>
  );
}
