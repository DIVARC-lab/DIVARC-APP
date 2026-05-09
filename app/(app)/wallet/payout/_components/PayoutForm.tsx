"use client";

import { Banknote, Loader2 } from "lucide-react";
import { useState, useTransition } from "react";
import { Button } from "@/components/ui/Button";
import { runAction } from "@/lib/utils/clientAction";
import { formatPrice } from "@/lib/utils/currency";
import type { Currency } from "@/lib/database.types";
import { requestPayout } from "../actions";

type PayoutFormProps = {
  maxAmount: number;
  currency: Currency;
};

export function PayoutForm({ maxAmount, currency }: PayoutFormProps) {
  const [amount, setAmount] = useState("");
  const [iban, setIban] = useState("");
  const [bic, setBic] = useState("");
  const [holder, setHolder] = useState("");
  const [pending, startTransition] = useTransition();

  const amountNum = Number(amount);
  const tooHigh = Number.isFinite(amountNum) && amountNum > maxAmount;
  const canSubmit =
    !pending &&
    amountNum >= 100 &&
    !tooHigh &&
    iban.replace(/\s+/g, "").length >= 14 &&
    holder.trim().length >= 2;

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!canSubmit) return;

    startTransition(async () => {
      const formData = new FormData();
      formData.set("amount", String(amountNum));
      formData.set("currency", currency);
      formData.set("iban", iban);
      formData.set("bic", bic);
      formData.set("account_holder", holder);
      const result = await runAction(() => requestPayout(formData), {
        successMessage:
          "Demande enregistrée. L'équipe la traite sous 1 à 2 jours ouvrés.",
      });
      if (result?.ok) {
        setAmount("");
        setIban("");
        setBic("");
        setHolder("");
      }
    });
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="rounded-3xl bg-white border border-line p-5 sm:p-6 space-y-4"
    >
      <div className="flex items-center gap-3">
        <div
          aria-hidden
          className="w-10 h-10 rounded-xl bg-gold/15 flex items-center justify-center"
        >
          <Banknote className="w-5 h-5 text-gold-deep" aria-hidden />
        </div>
        <div>
          <p className="text-sm font-bold text-night">Nouvelle demande</p>
          <p className="text-xs text-night-muted">
            Maximum disponible :{" "}
            <strong>{formatPrice(maxAmount, currency)}</strong>
          </p>
        </div>
      </div>

      <label className="block">
        <span className="text-[10px] font-extrabold uppercase tracking-[0.12em] text-night-muted">
          Montant (centimes)
        </span>
        <div className="relative mt-1.5">
          <input
            type="number"
            value={amount}
            onChange={(e) => setAmount(e.currentTarget.value)}
            min={100}
            max={maxAmount}
            step={1}
            inputMode="numeric"
            placeholder="ex : 5000 = 50,00 €"
            className="w-full h-12 rounded-xl border border-line bg-white pl-4 pr-16 text-base font-display italic text-night focus:outline-none focus:border-night focus:ring-2 focus:ring-night/15"
            required
          />
          <span className="absolute right-4 top-1/2 -translate-y-1/2 text-sm font-bold text-night-muted">
            {currency}
          </span>
        </div>
        {tooHigh ? (
          <span className="mt-1 block text-[11px] text-red-600 font-semibold">
            Montant supérieur au solde disponible.
          </span>
        ) : (
          <span className="mt-1 block text-[10px] text-muted">
            Minimum 1,00 (100 centimes). Pas de frais.
          </span>
        )}
      </label>

      <label className="block">
        <span className="text-[10px] font-extrabold uppercase tracking-[0.12em] text-night-muted">
          Titulaire du compte
        </span>
        <input
          type="text"
          value={holder}
          onChange={(e) => setHolder(e.currentTarget.value)}
          placeholder="Prénom Nom"
          maxLength={100}
          className="mt-1.5 w-full h-11 rounded-xl border border-line bg-white px-4 text-sm focus:outline-none focus:border-night focus:ring-2 focus:ring-night/15"
          autoComplete="name"
          required
        />
      </label>

      <label className="block">
        <span className="text-[10px] font-extrabold uppercase tracking-[0.12em] text-night-muted">
          IBAN
        </span>
        <input
          type="text"
          value={iban}
          onChange={(e) => setIban(e.currentTarget.value.toUpperCase())}
          placeholder="FR76 1234 5678 9012 3456 789"
          maxLength={42}
          className="mt-1.5 w-full h-11 rounded-xl border border-line bg-white px-4 text-sm font-mono tracking-wide focus:outline-none focus:border-night focus:ring-2 focus:ring-night/15"
          autoComplete="off"
          required
        />
        <span className="mt-1 block text-[10px] text-muted">
          Format SEPA. Espaces autorisés (ignorés à la validation).
        </span>
      </label>

      <label className="block">
        <span className="text-[10px] font-extrabold uppercase tracking-[0.12em] text-night-muted">
          BIC / SWIFT (facultatif)
        </span>
        <input
          type="text"
          value={bic}
          onChange={(e) => setBic(e.currentTarget.value.toUpperCase())}
          placeholder="BNPAFRPPXXX"
          maxLength={11}
          className="mt-1.5 w-full h-11 rounded-xl border border-line bg-white px-4 text-sm font-mono tracking-wide focus:outline-none focus:border-night focus:ring-2 focus:ring-night/15"
        />
        <span className="mt-1 block text-[10px] text-muted">
          Auto-déduit pour la plupart des banques SEPA.
        </span>
      </label>

      <p className="text-[10px] text-muted leading-relaxed">
        En envoyant, tu autorises DIVARC à débiter ton solde. Tu peux annuler
        la demande tant qu&apos;elle est <em>en attente</em>.
      </p>

      <Button type="submit" disabled={!canSubmit} loading={pending}>
        {pending ? (
          <Loader2 className="w-4 h-4 animate-spin" aria-hidden />
        ) : (
          <Banknote className="w-4 h-4" aria-hidden />
        )}
        Demander l&apos;encaissement
      </Button>
    </form>
  );
}
