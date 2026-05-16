"use client";

/* Sprint C — Paywall affiché aux non-abonnés d'un cercle payant.
 *
 * CTA principal = lancer Checkout Session Stripe. Le user est redirigé
 * vers Stripe (hosted checkout), puis revient sur /circles/[slug]?subscribed=1
 * après paiement. Le webhook customer.subscription.created met à jour
 * circle_subscriptions, la prochaine page load reflète l'accès. */

import { Loader2, ShieldCheck, Sparkles } from "lucide-react";
import { useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/Button";
import { startCircleSubscriptionCheckout } from "../monetization-actions";

type Props = {
  circleId: string;
  circleSlug: string;
  circleName: string;
  priceCents: number;
  trialDays: number;
};

export function CirclePaywall({
  circleId,
  circleSlug,
  circleName,
  priceCents,
  trialDays,
}: Props) {
  const [isPending, startTransition] = useTransition();
  const priceLabel = (priceCents / 100).toFixed(2).replace(".", ",");

  function handleSubscribe() {
    startTransition(async () => {
      const res = await startCircleSubscriptionCheckout({
        circleId,
        circleSlug,
        successPath: "/success",
        cancelPath: "",
      });
      if (!res.ok) {
        toast.error(res.error);
        return;
      }
      if (res.url) {
        window.location.href = res.url;
      }
    });
  }

  return (
    <div className="px-5 sm:px-8 py-10">
      <div className="max-w-md mx-auto rounded-3xl bg-gradient-to-br from-cream via-white to-cream-deep border border-gold/30 shadow-soft p-6 sm:p-8 text-center">
        <div className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-gold/15 mb-4 mx-auto">
          <Sparkles className="w-6 h-6 text-gold-deep" aria-hidden />
        </div>
        <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-gold-deep mb-1">
          Cercle premium
        </p>
        <h2 className="font-display text-[24px] sm:text-[28px] font-bold text-night leading-tight">
          {circleName}
        </h2>
        <p className="mt-3 text-[13px] text-night-dim leading-relaxed">
          Rejoins cette communauté premium pour accéder à tous les posts,
          channels, événements et discussions réservés aux membres abonnés.
        </p>

        <div className="mt-6 mb-2">
          <p className="text-[42px] font-bold text-night leading-none">
            {priceLabel}&nbsp;€
            <span className="text-[14px] font-normal text-night-dim ml-1">
              / mois
            </span>
          </p>
          {trialDays > 0 ? (
            <p className="mt-2 text-[12px] font-bold text-emerald-700">
              ✨ {trialDays} jour{trialDays > 1 ? "s" : ""} d&apos;essai gratuit
            </p>
          ) : null}
        </div>

        <Button
          type="button"
          onClick={handleSubscribe}
          loading={isPending}
          className="mt-4 w-full"
        >
          {isPending ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : null}
          {trialDays > 0 ? "Démarrer l'essai gratuit" : "S'abonner"}
        </Button>

        <p className="mt-4 text-[10px] text-night-dim leading-relaxed flex items-center justify-center gap-1.5">
          <ShieldCheck className="w-3 h-3" aria-hidden />
          Paiement sécurisé via Stripe — annulation à tout moment.
        </p>
      </div>
    </div>
  );
}
