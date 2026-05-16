"use client";

/* Étape 13 — Modal Tips Stripe (pourboires rapides 1/2/5/10€).
 *
 * UI viewer : 4 montants rapides + montant libre + message optionnel
 * (max 200 chars). Submit → createLiveTipCheckout → redirect Stripe.
 *
 * Style dark cohérent avec studio (bg cream/5 backdrop-blur). 90/10
 * split (host 90% / DIVARC 10%) calculé côté server action. */

import { Heart, Loader2, X } from "lucide-react";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import { createLiveTipCheckout } from "../tip-actions";

const QUICK_AMOUNTS = [
  { label: "1 €", value: 100 },
  { label: "2 €", value: 200 },
  { label: "5 €", value: 500 },
  { label: "10 €", value: 1000 },
];

type Props = {
  sessionId: string;
  open: boolean;
  onClose: () => void;
};

export function LiveTipsModal({ sessionId, open, onClose }: Props) {
  const [amountCents, setAmountCents] = useState<number>(200);
  const [customMode, setCustomMode] = useState(false);
  const [customEuros, setCustomEuros] = useState("");
  const [message, setMessage] = useState("");
  const [isPending, startTransition] = useTransition();

  function reset() {
    setAmountCents(200);
    setCustomMode(false);
    setCustomEuros("");
    setMessage("");
  }

  function handleClose() {
    if (isPending) return;
    reset();
    onClose();
  }

  function handleQuickPick(cents: number) {
    setCustomMode(false);
    setCustomEuros("");
    setAmountCents(cents);
  }

  function handleCustomChange(value: string) {
    const cleaned = value.replace(/[^\d,.]/g, "").replace(",", ".");
    setCustomEuros(cleaned);
    const parsed = Number.parseFloat(cleaned);
    if (Number.isFinite(parsed) && parsed > 0) {
      setAmountCents(Math.round(parsed * 100));
    } else {
      setAmountCents(0);
    }
  }

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (amountCents < 100) {
      toast.error("Minimum 1 €.");
      return;
    }
    if (amountCents > 50000) {
      toast.error("Maximum 500 €.");
      return;
    }
    startTransition(async () => {
      const res = await createLiveTipCheckout({
        sessionId,
        amountCents,
        message: message.trim() || undefined,
      });
      if (!res.ok) {
        toast.error(res.error);
        return;
      }
      if (res.url) {
        window.location.href = res.url;
      } else {
        toast.error("URL Stripe manquante.");
      }
    });
  }

  if (!open) return null;

  const hostShareCents = Math.round((amountCents * 9000) / 10_000);
  const platformShareCents = amountCents - hostShareCents;

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
            <Heart className="w-4 h-4 text-rose-400" aria-hidden />
            <p className="text-[10px] font-extrabold uppercase tracking-[0.16em] text-rose-300">
              Soutenir le host
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

        {/* Quick amounts */}
        <fieldset className="mb-4">
          <span className="block text-[10px] font-bold uppercase tracking-wider text-cream/60 mb-2">
            Montant rapide
          </span>
          <div className="grid grid-cols-4 gap-2">
            {QUICK_AMOUNTS.map((a) => {
              const active = !customMode && amountCents === a.value;
              return (
                <button
                  key={a.value}
                  type="button"
                  onClick={() => handleQuickPick(a.value)}
                  className={`h-11 rounded-xl text-[13px] font-bold transition-colors ${
                    active
                      ? "bg-rose-500 text-cream"
                      : "bg-cream/10 text-cream hover:bg-cream/20"
                  }`}
                >
                  {a.label}
                </button>
              );
            })}
          </div>
        </fieldset>

        {/* Custom amount */}
        <fieldset className="mb-4">
          <button
            type="button"
            onClick={() => {
              setCustomMode((v) => !v);
              if (!customMode) setAmountCents(0);
              else setAmountCents(200);
            }}
            className="text-[11px] font-bold text-cream/70 hover:text-cream underline underline-offset-2"
          >
            {customMode ? "← Retour aux montants rapides" : "Saisir un montant libre"}
          </button>
          {customMode ? (
            <label className="block mt-2">
              <span className="block text-[10px] font-bold uppercase tracking-wider text-cream/60 mb-1.5">
                Montant en euros (1 € – 500 €)
              </span>
              <div className="relative">
                <input
                  type="text"
                  inputMode="decimal"
                  value={customEuros}
                  onChange={(e) => handleCustomChange(e.target.value)}
                  placeholder="0.00"
                  className="w-full h-11 pl-3 pr-9 rounded-xl bg-cream/10 text-cream text-[14px] placeholder:text-cream/40 focus:outline-none focus:bg-cream/15 border border-transparent focus:border-cream/30"
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-cream/60 text-[13px] font-bold">
                  €
                </span>
              </div>
            </label>
          ) : null}
        </fieldset>

        {/* Message optionnel */}
        <label className="block mb-4">
          <span className="block text-[10px] font-bold uppercase tracking-wider text-cream/60 mb-1.5">
            Message (optionnel)
          </span>
          <textarea
            value={message}
            onChange={(e) => setMessage(e.target.value.slice(0, 200))}
            placeholder="Un petit mot pour le host…"
            rows={2}
            maxLength={200}
            className="w-full px-3 py-2 rounded-xl bg-cream/10 text-cream text-[13px] placeholder:text-cream/40 focus:outline-none focus:bg-cream/15 border border-transparent focus:border-cream/30 resize-none"
          />
          <span className="block mt-1 text-[10px] text-cream/40 text-right tabular-nums">
            {message.length}/200
          </span>
        </label>

        {/* Récap split */}
        {amountCents >= 100 ? (
          <div className="mb-4 rounded-xl bg-cream/5 border border-cream/10 p-3">
            <p className="text-[10px] font-bold uppercase tracking-wider text-cream/60 mb-1.5">
              Répartition
            </p>
            <div className="flex items-center justify-between text-[12px]">
              <span className="text-cream/80">Pour le host</span>
              <span className="font-bold text-cream tabular-nums">
                {(hostShareCents / 100).toFixed(2)} €
              </span>
            </div>
            <div className="flex items-center justify-between text-[11px] mt-0.5">
              <span className="text-cream/50">
                Frais DIVARC (10 %)
              </span>
              <span className="text-cream/60 tabular-nums">
                {(platformShareCents / 100).toFixed(2)} €
              </span>
            </div>
          </div>
        ) : null}

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
            disabled={isPending || amountCents < 100 || amountCents > 50000}
            className="inline-flex items-center gap-1.5 h-10 px-5 rounded-full bg-rose-500 text-cream text-[12px] font-bold hover:bg-rose-600 transition-colors disabled:opacity-60"
          >
            {isPending ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" aria-hidden />
            ) : (
              <Heart className="w-3.5 h-3.5" aria-hidden />
            )}
            Envoyer {amountCents >= 100 ? `${(amountCents / 100).toFixed(2)} €` : ""}
          </button>
        </div>

        <p className="mt-3 text-[10px] text-cream/40 leading-relaxed text-center">
          Paiement sécurisé via Stripe. Les frais sont reversés au host
          après un délai de 7 jours (anti-fraude Stripe Connect).
        </p>
      </form>
    </div>
  );
}
