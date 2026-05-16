"use client";

/* Rendu inline d'un message type=payment.
 *
 * Affiche :
 *   - Montant gold géant
 *   - Description si présente
 *   - Status badge (pending/paid/declined/expired)
 *   - Boutons Accepter (→ Stripe Checkout) / Refuser pour le recipient */

import { CheckCircle2, Loader2, Wallet, X, XCircle } from "lucide-react";
import { useEffect, useState, useTransition } from "react";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";
import { declineMessagePayment } from "../payment-actions";

type Payment = {
  id: string;
  message_id: string;
  sender_id: string;
  recipient_id: string;
  amount_cents: number;
  currency: string;
  description: string | null;
  status: "pending" | "paid" | "declined" | "expired" | "refunded";
  paid_at: string | null;
  declined_at: string | null;
  expires_at: string;
};

type Props = {
  messageId: string;
  currentUserId: string;
  checkoutUrl?: string; // Stripe URL si l'utilisateur courant est sender et veut relancer
};

const STATUS_LABEL: Record<Payment["status"], string> = {
  pending: "En attente",
  paid: "Payé",
  declined: "Refusé",
  expired: "Expiré",
  refunded: "Remboursé",
};

const STATUS_STYLE: Record<Payment["status"], string> = {
  pending: "bg-amber-100 text-amber-900 border-amber-200",
  paid: "bg-emerald-100 text-emerald-900 border-emerald-200",
  declined: "bg-rose-100 text-rose-900 border-rose-200",
  expired: "bg-bg-soft text-night-dim border-line",
  refunded: "bg-cyan-100 text-cyan-900 border-cyan-200",
};

export function PaymentMessageInline({
  messageId,
  currentUserId,
}: Props) {
  const [payment, setPayment] = useState<Payment | null>(null);
  const [loading, setLoading] = useState(true);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    let alive = true;
    const supabase = createClient();

    async function fetchPayment() {
      /* eslint-disable-next-line @typescript-eslint/no-explicit-any */
      const { data } = await (supabase as any)
        .from("message_payments")
        .select("*")
        .eq("message_id", messageId)
        .maybeSingle();
      if (!alive) return;
      setPayment(data as Payment | null);
      setLoading(false);
    }

    void fetchPayment();

    /* Realtime sur message_payments. */
    const channel = supabase
      .channel(`payment-${messageId}`)
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "message_payments",
        },
        () => {
          void fetchPayment();
        },
      )
      .subscribe();

    return () => {
      alive = false;
      void supabase.removeChannel(channel);
    };
  }, [messageId]);

  if (loading) {
    return (
      <div className="flex items-center gap-2 py-3 text-night-dim">
        <Loader2 className="w-4 h-4 animate-spin" aria-hidden />
        <span className="text-[12px]">Chargement paiement…</span>
      </div>
    );
  }

  if (!payment) {
    return (
      <p className="text-[12px] text-night-dim italic">
        Paiement non trouvé.
      </p>
    );
  }

  const isRecipient = payment.recipient_id === currentUserId;
  const isSender = payment.sender_id === currentUserId;
  const isPaid = payment.status === "paid";
  const isDeclined = payment.status === "declined";
  const isExpired = payment.status === "expired";

  function handleDecline() {
    startTransition(async () => {
      const res = await declineMessagePayment({ paymentId: payment!.id });
      if (!res.ok) {
        toast.error(res.error);
        return;
      }
      toast("Paiement refusé.");
    });
  }

  return (
    <div className="space-y-3 my-1 min-w-[240px]">
      {/* Hero montant. */}
      <div className="text-center py-3 px-4 rounded-2xl bg-gradient-to-br from-gold/20 via-gold/10 to-transparent border border-gold/30">
        <div className="flex items-center justify-center gap-2 mb-1">
          {isPaid ? (
            <CheckCircle2
              className="w-4 h-4 text-emerald-700"
              aria-hidden
              strokeWidth={2.4}
            />
          ) : isDeclined || isExpired ? (
            <XCircle
              className="w-4 h-4 text-rose-700"
              aria-hidden
              strokeWidth={2.4}
            />
          ) : (
            <Wallet
              className="w-4 h-4 text-gold-deep"
              aria-hidden
              strokeWidth={2.4}
            />
          )}
          <p className="text-[10px] font-extrabold uppercase tracking-[0.18em] text-gold-deep">
            Paiement
          </p>
        </div>
        <p className="font-display italic text-[32px] text-gold-deep leading-none">
          {(payment.amount_cents / 100).toFixed(2)} €
        </p>
        {payment.description ? (
          <p className="mt-2 text-[11.5px] text-night-soft leading-snug">
            « {payment.description} »
          </p>
        ) : null}
      </div>

      {/* Status badge. */}
      <div className="flex items-center justify-center">
        <span
          className={`inline-flex items-center h-6 px-3 rounded-full border text-[10.5px] font-extrabold uppercase tracking-wider ${
            STATUS_STYLE[payment.status]
          }`}
        >
          {STATUS_LABEL[payment.status]}
        </span>
      </div>

      {/* Actions recipient (si pending). */}
      {isRecipient && payment.status === "pending" ? (
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleDecline}
            disabled={isPending}
            className="flex-1 inline-flex items-center justify-center gap-1.5 h-10 rounded-full bg-bg-soft hover:bg-rose-100 text-night-dim hover:text-rose-700 text-[12px] font-bold transition-colors disabled:opacity-60"
          >
            <X className="w-3.5 h-3.5" aria-hidden />
            Refuser
          </button>
          <a
            href={`/api/messages/payments/${payment.id}/checkout`}
            className="flex-1 inline-flex items-center justify-center gap-1.5 h-10 rounded-full bg-gold text-night text-[12px] font-extrabold hover:bg-gold-soft transition-colors"
          >
            <Wallet className="w-3.5 h-3.5" aria-hidden />
            Payer
          </a>
        </div>
      ) : null}

      {isSender && payment.status === "pending" ? (
        <p className="text-[10.5px] text-night-dim text-center italic">
          En attente d&apos;acceptation par le destinataire.
        </p>
      ) : null}
    </div>
  );
}
