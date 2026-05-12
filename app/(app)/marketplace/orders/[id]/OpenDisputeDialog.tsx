"use client";

import { AlertTriangle } from "lucide-react";
import { useActionState, useEffect, useState } from "react";
import { toast } from "sonner";
import type { DisputeReason } from "@/lib/database.types";
import {
  openDisputeAction,
  type DisputeActionState,
} from "../actions";

type Props = {
  orderId: string;
  role: "buyer" | "seller";
};

const BUYER_REASONS: { value: DisputeReason; label: string }[] = [
  { value: "item_not_received", label: "Article jamais reçu" },
  { value: "item_not_as_described", label: "Article non conforme à l'annonce" },
  { value: "item_damaged", label: "Article endommagé en transit" },
  { value: "counterfeit", label: "Contrefaçon suspectée" },
  { value: "other", label: "Autre" },
];

const SELLER_REASONS: { value: DisputeReason; label: string }[] = [
  { value: "buyer_no_payment", label: "Acheteur n'a pas payé" },
  { value: "buyer_abusive", label: "Comportement abusif de l'acheteur" },
  { value: "other", label: "Autre" },
];

const INITIAL: DisputeActionState = { ok: false };

export function OpenDisputeDialog({ orderId, role }: Props) {
  const [open, setOpen] = useState(false);
  const reasons = role === "buyer" ? BUYER_REASONS : SELLER_REASONS;
  const [reason, setReason] = useState<DisputeReason>(reasons[0]!.value);
  const [body, setBody] = useState("");
  const [state, action, pending] = useActionState<
    DisputeActionState,
    FormData
  >(openDisputeAction, INITIAL);

  useEffect(() => {
    if (state.ok) {
      toast.success("Litige ouvert. L'équipe DIVARC te contacte sous 72h.");
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
        className="inline-flex items-center justify-center gap-2 h-11 px-4 rounded-full bg-white border border-red-200 text-red-700 text-[13px] font-bold hover:bg-red-50 transition-colors"
      >
        <AlertTriangle className="w-4 h-4" aria-hidden />
        Signaler un problème
      </button>
    );
  }

  return (
    <form
      action={action}
      className="rounded-2xl bg-white border border-red-200 p-4 space-y-3"
    >
      <input type="hidden" name="orderId" value={orderId} />
      <input type="hidden" name="reason" value={reason} />

      <p className="text-[11px] font-extrabold uppercase tracking-[0.14em] text-red-700">
        · Ouvrir un litige
      </p>
      <p className="text-[12px] text-night-dim">
        L'équipe DIVARC examinera ton signalement sous 72h. Sois précis(e),
        joins idéalement des photos via la messagerie après ouverture.
      </p>

      <div>
        <label
          htmlFor="dispute-reason"
          className="block text-[11px] font-bold text-night mb-1"
        >
          Motif
        </label>
        <select
          id="dispute-reason"
          value={reason}
          onChange={(e) => setReason(e.target.value as DisputeReason)}
          className="h-10 w-full rounded-xl border border-line bg-bg-soft px-3 text-[13px] text-night focus:outline-none focus:border-night/40"
        >
          {reasons.map((r) => (
            <option key={r.value} value={r.value}>
              {r.label}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label
          htmlFor="dispute-body"
          className="block text-[11px] font-bold text-night mb-1"
        >
          Décris ce qui s'est passé
        </label>
        <textarea
          id="dispute-body"
          name="body"
          rows={5}
          minLength={10}
          maxLength={4000}
          required
          value={body}
          onChange={(e) => setBody(e.target.value)}
          placeholder="Date de réception, état du colis, échange avec la partie adverse…"
          className="w-full rounded-xl border border-line bg-bg-soft px-3 py-2 text-[13px] text-night placeholder:text-night-dim focus:outline-none focus:border-night/40 resize-y"
        />
      </div>

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
          disabled={pending || body.length < 10}
          className="h-9 px-4 rounded-full bg-red-600 text-white text-[12px] font-extrabold hover:bg-red-700 transition-colors disabled:opacity-50"
        >
          {pending ? "Ouverture…" : "Ouvrir le litige"}
        </button>
      </div>
    </form>
  );
}
