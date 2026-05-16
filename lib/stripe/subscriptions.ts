import "server-only";

/* Sprint C — Helpers Stripe pour les abonnements cercles premium.
 *
 * Architecture :
 *  - 1 product Stripe par cercle (créé à l'activation paid mode), réutilisé
 *    pour toutes les souscriptions.
 *  - 1 price par cercle (recurring monthly EUR). Si le owner change le prix,
 *    on crée un NOUVEAU price et on archive l'ancien (les subs existantes
 *    gardent leur price snapshot Stripe).
 *  - Application fee 10 % via subscription_data.application_fee_percent en
 *    direct charge sur le compte connecté du owner.
 *
 * Le compte connecté = profiles.stripe_connect_account_id du owner. Le
 * paiement va directement à son compte ; DIVARC prélève l'app fee.
 *
 * Webhook : customer.subscription.created/updated/deleted réplique l'état
 * dans circle_subscriptions. */

import Stripe from "stripe";
import { getStripe } from "./client";
import { SUBSCRIPTION_APP_FEE_BPS } from "./config";

export type CreateProductForCircleArgs = {
  circleId: string;
  name: string;
  slug: string;
  description?: string | null;
  stripeAccount: string; // compte connecté du owner
};

/* Crée un Product Stripe sur le compte connecté du owner. */
export async function createCircleStripeProduct(
  args: CreateProductForCircleArgs,
): Promise<Stripe.Product> {
  const stripe = getStripe();
  return await stripe.products.create(
    {
      name: `Cercle ${args.name}`,
      description: args.description ?? undefined,
      metadata: {
        divarc_circle_id: args.circleId,
        divarc_circle_slug: args.slug,
      },
    },
    { stripeAccount: args.stripeAccount },
  );
}

export type CreatePriceForCircleArgs = {
  productId: string;
  unitAmountCents: number;
  currency: "eur";
  stripeAccount: string;
};

/* Crée un Price recurring monthly. */
export async function createCircleStripePrice(
  args: CreatePriceForCircleArgs,
): Promise<Stripe.Price> {
  const stripe = getStripe();
  return await stripe.prices.create(
    {
      product: args.productId,
      unit_amount: args.unitAmountCents,
      currency: args.currency,
      recurring: { interval: "month" },
    },
    { stripeAccount: args.stripeAccount },
  );
}

/* Archive un price (utilisé quand le owner change le prix). */
export async function archiveCircleStripePrice(
  priceId: string,
  stripeAccount: string,
): Promise<void> {
  const stripe = getStripe();
  await stripe.prices.update(
    priceId,
    { active: false },
    { stripeAccount },
  );
}

export type CreateSubscriptionCheckoutArgs = {
  /* Données cercle. */
  circleId: string;
  circleSlug: string;
  circleName: string;
  priceId: string;
  trialDays: number;
  /* Compte connecté Stripe du owner (où l'argent atterrit). */
  ownerStripeAccount: string;
  /* User (acheteur). */
  userId: string;
  userEmail: string | null;
  /* URLs Stripe rebondit après. */
  successUrl: string;
  cancelUrl: string;
};

/* Crée une Checkout Session Stripe pour souscrire un user à un cercle.
 * Mode = subscription, direct charge sur compte connecté.
 * Application fee 10 % retenu par DIVARC. */
export async function createCircleSubscriptionCheckout(
  args: CreateSubscriptionCheckoutArgs,
): Promise<Stripe.Checkout.Session> {
  const stripe = getStripe();
  return await stripe.checkout.sessions.create(
    {
      mode: "subscription",
      line_items: [{ price: args.priceId, quantity: 1 }],
      customer_email: args.userEmail ?? undefined,
      success_url: args.successUrl,
      cancel_url: args.cancelUrl,
      subscription_data: {
        application_fee_percent: SUBSCRIPTION_APP_FEE_BPS / 100,
        trial_period_days: args.trialDays > 0 ? args.trialDays : undefined,
        metadata: {
          divarc_circle_id: args.circleId,
          divarc_circle_slug: args.circleSlug,
          divarc_user_id: args.userId,
        },
      },
      metadata: {
        divarc_circle_id: args.circleId,
        divarc_circle_slug: args.circleSlug,
        divarc_user_id: args.userId,
        divarc_kind: "circle_subscription",
      },
    },
    { stripeAccount: args.ownerStripeAccount },
  );
}

/* Cancel immédiat (vs cancel_at_period_end via update). */
export async function cancelSubscription(
  subscriptionId: string,
  stripeAccount: string,
  atPeriodEnd: boolean = true,
): Promise<Stripe.Subscription> {
  const stripe = getStripe();
  if (atPeriodEnd) {
    return await stripe.subscriptions.update(
      subscriptionId,
      { cancel_at_period_end: true },
      { stripeAccount },
    );
  }
  return await stripe.subscriptions.cancel(
    subscriptionId,
    undefined,
    { stripeAccount },
  );
}
