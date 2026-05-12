"use client";

import { Handshake, Loader2, X } from "lucide-react";
import { useEffect, useState, useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/Button";
import { runAction } from "@/lib/utils/clientAction";
import { cn } from "@/lib/utils/cn";
import { formatPrice } from "@/lib/utils/currency";
import { sendOffer } from "../../offers/actions";
import type { Currency } from "@/lib/database.types";

type MakeOfferDialogProps = {
  listingId: string;
  listingTitle: string;
  askingAmount: number;
  currency: Currency;
};

const QUICK_PCT = [0.7, 0.85, 0.95] as const;

/* Modal "Faire une offre" : montant libre + 3 raccourcis (-30%, -15%, -5%)
 * + champ message optionnel. Validation côté server via Zod. */
export function MakeOfferDialog({
  listingId,
  listingTitle,
  askingAmount,
  currency,
}: MakeOfferDialogProps) {
  const [open, setOpen] = useState(false);
  const [amount, setAmount] = useState("");
  const [message, setMessage] = useState("");
  const [pending, startTransition] = useTransition();

  /* Reset à chaque ouverture pour éviter un montant stale d'une session précédente. */
  useEffect(() => {
    if (open) {
      setAmount(String(Math.round(askingAmount * 0.85)));
      setMessage("");
    }
  }, [open, askingAmount]);

  function handleQuickPct(pct: number) {
    setAmount(String(Math.round(askingAmount * pct)));
  }

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const amountInt = Number(amount);
    if (!Number.isFinite(amountInt) || amountInt < 1) {
      toast.error("Saisis un montant valide.");
      return;
    }

    startTransition(async () => {
      const formData = new FormData();
      formData.set("listing_id", listingId);
      formData.set("amount", String(amountInt));
      formData.set("message", message);
      const result = await runAction(() => sendOffer(formData), {
        successMessage:
          "Offre envoyée. Le vendeur peut accepter, refuser ou contre-offrir.",
      });
      if (result?.ok) setOpen(false);
    });
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label="Faire une offre"
        className="flex h-12 w-12 items-center justify-center rounded-full bg-white border border-line text-night hover:border-gold/40 transition-colors shrink-0"
      >
        <Handshake className="w-[18px] h-[18px]" aria-hidden />
      </button>

      {open ? (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Faire une offre"
          className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center bg-night/50 backdrop-blur-sm sm:p-4 overflow-y-auto"
          onClick={() => setOpen(false)}
        >
          <form
            onSubmit={handleSubmit}
            onClick={(e) => e.stopPropagation()}
            className="w-full sm:max-w-lg bg-white border-t sm:border border-line rounded-t-3xl sm:rounded-3xl shadow-[0_40px_100px_-30px_rgba(10,31,68,0.55)] sm:my-auto max-h-[92dvh] overflow-y-auto"
          >
            <header className="flex items-start justify-between gap-3 px-5 pt-5 pb-3 border-b border-line">
              <div className="min-w-0 flex-1">
                <p className="text-[11px] font-extrabold uppercase tracking-[0.16em] text-gold-deep">
                  · Négociation
                </p>
                <h2 className="mt-1 font-display italic text-xl text-night truncate">
                  Ton offre pour{" "}
                  <span className="not-italic font-bold">{listingTitle}</span>
                </h2>
                <p className="mt-1 text-xs text-muted">
                  Prix demandé :{" "}
                  <strong className="text-night">
                    {formatPrice(askingAmount, currency)}
                  </strong>
                </p>
              </div>
              <button
                type="button"
                onClick={() => setOpen(false)}
                aria-label="Fermer"
                className="w-11 h-11 rounded-full hover:bg-night/5 text-night-muted hover:text-night flex items-center justify-center shrink-0"
              >
                <X className="w-4 h-4" aria-hidden />
              </button>
            </header>

            <div className="p-5 space-y-4">
              {/* Quick percent shortcuts */}
              <div className="flex gap-2">
                {QUICK_PCT.map((pct) => (
                  <button
                    key={pct}
                    type="button"
                    onClick={() => handleQuickPct(pct)}
                    className={cn(
                      "flex-1 h-11 rounded-xl border text-xs font-bold transition-colors",
                      Number(amount) === Math.round(askingAmount * pct)
                        ? "border-gold bg-gold/10 text-night"
                        : "border-line bg-white text-night-muted hover:border-night/30",
                    )}
                  >
                    -{Math.round((1 - pct) * 100)}%
                    <span className="block text-[10px] text-muted font-semibold mt-0.5">
                      {formatPrice(Math.round(askingAmount * pct), currency)}
                    </span>
                  </button>
                ))}
              </div>

              <label className="block">
                <span className="text-xs font-extrabold uppercase tracking-[0.12em] text-night-muted">
                  Montant
                </span>
                <div className="relative mt-1.5">
                  <input
                    type="number"
                    value={amount}
                    onChange={(e) => setAmount(e.currentTarget.value)}
                    min={1}
                    max={10_000_000}
                    inputMode="numeric"
                    className="w-full h-12 rounded-xl border border-line bg-white pl-4 pr-14 text-base font-display italic text-night focus:outline-none focus:border-night focus:ring-2 focus:ring-night/15"
                    autoFocus
                  />
                  <span className="absolute right-4 top-1/2 -translate-y-1/2 text-sm font-bold text-night-muted">
                    {currency}
                  </span>
                </div>
              </label>

              <label className="block">
                <span className="text-xs font-extrabold uppercase tracking-[0.12em] text-night-muted">
                  Message (facultatif)
                </span>
                <textarea
                  value={message}
                  onChange={(e) => setMessage(e.currentTarget.value)}
                  rows={3}
                  maxLength={500}
                  placeholder="Explique ton offre, propose un échange, etc."
                  className="mt-1.5 w-full rounded-xl border border-line bg-white px-4 py-2.5 text-sm focus:outline-none focus:border-night focus:ring-2 focus:ring-night/15 resize-none"
                />
                <span className="mt-1 block text-[10px] text-muted">
                  {message.length}/500 — l&apos;offre expire dans 48 h sans réponse.
                </span>
              </label>
            </div>

            <footer className="flex items-center justify-end gap-2 px-5 pb-5">
              <Button
                type="button"
                variant="ghost"
                onClick={() => setOpen(false)}
                disabled={pending}
              >
                Annuler
              </Button>
              <Button type="submit" loading={pending}>
                {pending ? (
                  <Loader2 className="w-4 h-4 animate-spin" aria-hidden />
                ) : (
                  <Handshake className="w-4 h-4" aria-hidden />
                )}
                Envoyer l&apos;offre
              </Button>
            </footer>
          </form>
        </div>
      ) : null}
    </>
  );
}
