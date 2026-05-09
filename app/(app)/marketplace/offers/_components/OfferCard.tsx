"use client";

import {
  Check,
  Clock,
  Handshake,
  Loader2,
  Reply,
  X,
} from "lucide-react";
import Link from "next/link";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Avatar } from "@/components/ui/Avatar";
import { runAction } from "@/lib/utils/clientAction";
import { cn } from "@/lib/utils/cn";
import { formatPrice } from "@/lib/utils/currency";
import { formatRelative } from "@/lib/utils/relativeTime";
import type { ListingOfferWithCounterparty } from "@/lib/database.types";
import { respondToOffer } from "../actions";

type OfferCardProps = {
  offer: ListingOfferWithCounterparty;
  currentUserId: string;
  direction: "received" | "sent";
};

const STATUS_TONE: Record<string, string> = {
  pending: "bg-gold/15 text-gold-deep",
  accepted: "bg-emerald-50 text-emerald-700",
  declined: "bg-red-50 text-red-600",
  countered: "bg-night/5 text-night-muted",
  withdrawn: "bg-night/5 text-night-muted",
  expired: "bg-night/5 text-night-muted",
};

const STATUS_LABEL: Record<string, string> = {
  pending: "En attente",
  accepted: "Acceptée",
  declined: "Refusée",
  countered: "Contre-offre",
  withdrawn: "Retirée",
  expired: "Expirée",
};

export function OfferCard({
  offer,
  currentUserId,
  direction,
}: OfferCardProps) {
  const [counterMode, setCounterMode] = useState(false);
  const [counterAmount, setCounterAmount] = useState("");
  const [counterMessage, setCounterMessage] = useState("");
  const [pending, startTransition] = useTransition();

  const isReceived = direction === "received";
  const canRespond = offer.status === "pending" && isReceived;
  const canWithdraw =
    offer.status === "pending" && offer.from_user === currentUserId;

  function dispatch(decision: "accept" | "decline" | "counter" | "withdraw") {
    if (decision === "counter" && !counterMode) {
      setCounterAmount(String(offer.amount + Math.round(offer.amount * 0.1)));
      setCounterMode(true);
      return;
    }
    if (decision === "counter") {
      const amount = Number(counterAmount);
      if (!Number.isFinite(amount) || amount < 1) {
        toast.error("Saisis un montant valide.");
        return;
      }
    }

    startTransition(async () => {
      const formData = new FormData();
      formData.set("offer_id", offer.id);
      formData.set("decision", decision);
      if (decision === "counter") {
        formData.set("counter_amount", counterAmount);
        formData.set("counter_message", counterMessage);
      }
      const result = await runAction(() => respondToOffer(formData), {
        successMessage:
          decision === "accept"
            ? "Offre acceptée. Annonce marquée vendue."
            : decision === "decline"
              ? "Offre refusée."
              : decision === "counter"
                ? "Contre-offre envoyée."
                : "Offre retirée.",
      });
      if (result?.ok) setCounterMode(false);
    });
  }

  const counterpartyName =
    offer.counterparty?.full_name ?? offer.counterparty?.username ?? "Membre";
  const listingTitle = offer.listing?.title ?? "Annonce";
  const askingAmount = offer.listing?.price_amount ?? offer.amount;
  const isCheaperThanAsking = offer.amount < askingAmount;
  const diffPct = Math.round(((askingAmount - offer.amount) / askingAmount) * 100);

  return (
    <article className="rounded-2xl bg-white border border-line p-4 sm:p-5">
      <header className="flex items-start gap-3">
        <Avatar
          src={offer.counterparty?.avatar_url ?? null}
          fullName={counterpartyName}
          size="md"
        />
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-night truncate">
            {isReceived ? counterpartyName : `Pour ${counterpartyName}`}
          </p>
          <Link
            href={`/marketplace/${offer.listing_id}`}
            className="text-xs text-night-muted hover:text-night truncate block"
          >
            {listingTitle}
          </Link>
          <p className="mt-1 text-[10px] text-muted">
            {formatRelative(offer.created_at)}
          </p>
        </div>
        <span
          className={cn(
            "inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-extrabold uppercase tracking-wide shrink-0",
            STATUS_TONE[offer.status] ?? "bg-night/5 text-night-muted",
          )}
        >
          {offer.status === "pending" ? (
            <Clock className="w-3 h-3" aria-hidden />
          ) : null}
          {STATUS_LABEL[offer.status] ?? offer.status}
        </span>
      </header>

      <div className="mt-4 flex items-baseline justify-between gap-3">
        <div>
          <p className="text-[10px] font-extrabold uppercase tracking-[0.12em] text-night-dim">
            {isReceived ? "Offert" : "Tu proposes"}
          </p>
          <p className="font-display italic text-2xl text-night leading-none mt-0.5">
            {formatPrice(offer.amount, offer.currency)}
          </p>
        </div>
        <div className="text-right">
          <p className="text-[10px] font-extrabold uppercase tracking-[0.12em] text-night-dim">
            Demandé
          </p>
          <p className="text-sm text-night-muted mt-1">
            {formatPrice(askingAmount, offer.currency)}
          </p>
          {isCheaperThanAsking && diffPct > 0 ? (
            <p className="text-[10px] text-red-600 font-bold mt-0.5">
              -{diffPct}%
            </p>
          ) : null}
        </div>
      </div>

      {offer.message ? (
        <p className="mt-3 p-3 rounded-xl bg-bg-soft border border-line text-xs text-night-soft italic">
          « {offer.message} »
        </p>
      ) : null}

      {/* Counter-offer form expansé */}
      {counterMode ? (
        <div className="mt-4 pt-4 border-t border-line space-y-3">
          <label className="block">
            <span className="text-[10px] font-extrabold uppercase tracking-[0.12em] text-night-muted">
              Contre-proposition
            </span>
            <div className="relative mt-1.5">
              <input
                type="number"
                value={counterAmount}
                onChange={(e) => setCounterAmount(e.currentTarget.value)}
                min={1}
                inputMode="numeric"
                className="w-full h-11 rounded-xl border border-line bg-white pl-4 pr-14 text-sm font-display italic text-night focus:outline-none focus:border-night focus:ring-2 focus:ring-night/15"
                autoFocus
              />
              <span className="absolute right-4 top-1/2 -translate-y-1/2 text-xs font-bold text-night-muted">
                {offer.currency}
              </span>
            </div>
          </label>
          <textarea
            value={counterMessage}
            onChange={(e) => setCounterMessage(e.currentTarget.value)}
            rows={2}
            maxLength={500}
            placeholder="Message (facultatif)..."
            className="w-full rounded-xl border border-line bg-white px-3 py-2 text-xs focus:outline-none focus:border-night focus:ring-2 focus:ring-night/15 resize-none"
          />
          <div className="flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={() => setCounterMode(false)}
              disabled={pending}
              className="h-11 px-4 text-xs font-bold text-night-muted hover:text-night"
            >
              Annuler
            </button>
            <button
              type="button"
              onClick={() => dispatch("counter")}
              disabled={pending}
              className="h-11 px-4 rounded-full bg-night text-cream text-xs font-bold inline-flex items-center gap-1.5"
            >
              {pending ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" aria-hidden />
              ) : (
                <Reply className="w-3.5 h-3.5" aria-hidden />
              )}
              Envoyer
            </button>
          </div>
        </div>
      ) : (
        <div className="mt-4 flex items-center justify-end gap-2 flex-wrap">
          {canRespond ? (
            <>
              <button
                type="button"
                onClick={() => dispatch("decline")}
                disabled={pending}
                className="h-11 px-4 rounded-full text-xs font-bold text-red-600 hover:bg-red-50 inline-flex items-center gap-1.5"
              >
                <X className="w-3.5 h-3.5" aria-hidden />
                Refuser
              </button>
              <button
                type="button"
                onClick={() => dispatch("counter")}
                disabled={pending}
                className="h-11 px-4 rounded-full bg-white border border-line text-night text-xs font-bold inline-flex items-center gap-1.5 hover:border-night/30"
              >
                <Reply className="w-3.5 h-3.5" aria-hidden />
                Contre-offrir
              </button>
              <button
                type="button"
                onClick={() => dispatch("accept")}
                disabled={pending}
                className="h-11 px-4 rounded-full bg-night text-cream text-xs font-bold inline-flex items-center gap-1.5 hover:bg-night-soft"
              >
                {pending ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" aria-hidden />
                ) : (
                  <Check className="w-3.5 h-3.5" aria-hidden />
                )}
                Accepter
              </button>
            </>
          ) : canWithdraw ? (
            <button
              type="button"
              onClick={() => dispatch("withdraw")}
              disabled={pending}
              className="h-11 px-4 rounded-full text-xs font-bold text-night-muted hover:text-red-600 inline-flex items-center gap-1.5"
            >
              {pending ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" aria-hidden />
              ) : (
                <X className="w-3.5 h-3.5" aria-hidden />
              )}
              Retirer
            </button>
          ) : (
            <span className="inline-flex items-center gap-1.5 text-xs text-muted">
              <Handshake className="w-3.5 h-3.5" aria-hidden />
              Plus d&apos;action possible
            </span>
          )}
        </div>
      )}
    </article>
  );
}
