"use client";

/* Étape 15 — Modal abonnement creator (3 tiers).
 *
 * 4.99€ / 9.99€ / 24.99€ par mois. Stripe Checkout mode=subscription
 * sur le compte connecté du creator. App fee 10% (cohérent tips).
 *
 * Visible côté viewer : bouton "S'abonner" dans LiveViewerClient.
 * Sert aussi de gate pour les lives visibility='subscribers_only'.
 */

import { Crown, Loader2, Sparkles, Star, X } from "lucide-react";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import { createCreatorSubscriptionCheckout } from "../creator-sub-actions";

type Tier = {
  id: 1 | 2 | 3;
  label: string;
  amountCents: number;
  description: string;
  bg: string;
  border: string;
  icon: typeof Star;
};

const TIERS: Tier[] = [
  {
    id: 1,
    label: "Soutien",
    amountCents: 499,
    description: "Tu encourages le créateur et accèdes aux lives abonnés.",
    bg: "bg-cream/5",
    border: "border-cream/20",
    icon: Star,
  },
  {
    id: 2,
    label: "Fan",
    amountCents: 999,
    description: "Badge Fan + accès lives abonnés + perks futurs.",
    bg: "bg-gold/10",
    border: "border-gold/40",
    icon: Sparkles,
  },
  {
    id: 3,
    label: "Super-fan",
    amountCents: 2499,
    description: "Badge Super-fan + accès prioritaire + visibilité max.",
    bg: "bg-fuchsia-500/10",
    border: "border-fuchsia-400/40",
    icon: Crown,
  },
];

type Props = {
  creatorId: string;
  creatorName: string;
  open: boolean;
  onClose: () => void;
};

export function SubscribeCreatorModal({
  creatorId,
  creatorName,
  open,
  onClose,
}: Props) {
  const [selectedTier, setSelectedTier] = useState<1 | 2 | 3>(1);
  const [isPending, startTransition] = useTransition();

  function handleClose() {
    if (isPending) return;
    setSelectedTier(1);
    onClose();
  }

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    startTransition(async () => {
      const res = await createCreatorSubscriptionCheckout({
        creatorId,
        tier: selectedTier,
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
          <div>
            <p className="text-[10px] font-extrabold uppercase tracking-[0.16em] text-gold">
              S&apos;abonner
            </p>
            <p className="text-[14px] font-bold text-cream mt-0.5">
              {creatorName}
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

        <fieldset className="space-y-2 mb-4">
          <legend className="block text-[10px] font-bold uppercase tracking-wider text-cream/60 mb-2">
            Choisis ton tier
          </legend>
          {TIERS.map((t) => {
            const active = selectedTier === t.id;
            const Icon = t.icon;
            return (
              <button
                key={t.id}
                type="button"
                onClick={() => setSelectedTier(t.id)}
                className={`w-full text-left rounded-2xl ${t.bg} border ${
                  active ? t.border : "border-transparent"
                } hover:border-cream/30 transition-colors p-3 flex items-start gap-3`}
                aria-pressed={active}
              >
                <span
                  className={`inline-flex items-center justify-center w-9 h-9 rounded-full ${
                    active ? "bg-cream/20" : "bg-cream/10"
                  } shrink-0`}
                >
                  <Icon className="w-4 h-4 text-cream" aria-hidden />
                </span>
                <span className="flex-1 min-w-0">
                  <span className="flex items-center justify-between">
                    <span className="text-[13px] font-bold text-cream">
                      {t.label}
                    </span>
                    <span className="text-[13px] font-extrabold text-cream tabular-nums">
                      {(t.amountCents / 100).toFixed(2)} €
                      <span className="text-[10px] font-bold text-cream/60 ml-0.5">
                        /mois
                      </span>
                    </span>
                  </span>
                  <span className="block text-[11.5px] text-cream/70 mt-0.5 leading-snug">
                    {t.description}
                  </span>
                </span>
                <span
                  aria-hidden
                  className={`mt-1 w-4 h-4 rounded-full border-2 shrink-0 ${
                    active
                      ? "bg-cream border-cream"
                      : "bg-transparent border-cream/40"
                  }`}
                />
              </button>
            );
          })}
        </fieldset>

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
            disabled={isPending}
            className="inline-flex items-center gap-1.5 h-10 px-5 rounded-full bg-gold text-night text-[12px] font-bold hover:bg-gold/90 transition-colors disabled:opacity-60"
          >
            {isPending ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" aria-hidden />
            ) : (
              <Sparkles className="w-3.5 h-3.5" aria-hidden />
            )}
            Continuer vers Stripe
          </button>
        </div>

        <p className="mt-3 text-[10px] text-cream/40 leading-relaxed text-center">
          Paiement récurrent mensuel sécurisé via Stripe. Tu peux annuler
          à tout moment depuis ton portail.
        </p>
      </form>
    </div>
  );
}
