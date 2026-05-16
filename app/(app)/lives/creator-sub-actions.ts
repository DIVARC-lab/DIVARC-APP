"use server";

/* Étape 15 — Server Actions Subscriptions Creator.
 *
 * Abonnement mensuel récurrent subscriber → creator via Stripe Connect
 * direct charge (compte connecté du creator, app fee 10%).
 *
 * 3 tiers fixes : 4.99 / 9.99 / 24.99 €/mois.
 *
 * createCreatorSubscriptionCheckout(creatorId, tier) → Stripe Checkout
 * mode=subscription. INSERT creator_subscriptions status='incomplete' ;
 * le webhook customer.subscription.* synchronise status réels. */

import { z } from "zod";
import { createAdminClient, createClient } from "@/lib/supabase/server";
import { getStripe, isStripeConfigured } from "@/lib/stripe/client";

/* eslint-disable @typescript-eslint/no-explicit-any */
type SupabaseAny = any;

const TIERS: Record<1 | 2 | 3, { label: string; amountCents: number }> = {
  1: { label: "Soutien", amountCents: 499 },
  2: { label: "Fan", amountCents: 999 },
  3: { label: "Super-fan", amountCents: 2499 },
};

const schema = z.object({
  creatorId: z.string().uuid(),
  tier: z.union([z.literal(1), z.literal(2), z.literal(3)]),
});

export async function createCreatorSubscriptionCheckout(
  args: z.infer<typeof schema>,
) {
  if (!isStripeConfigured()) {
    return { ok: false as const, error: "Paiements non configurés." };
  }
  const parsed = schema.safeParse(args);
  if (!parsed.success) {
    return {
      ok: false as const,
      error: parsed.error.issues[0]?.message ?? "Invalide",
    };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false as const, error: "Non authentifié." };

  if (user.id === parsed.data.creatorId) {
    return {
      ok: false as const,
      error: "Tu ne peux pas t'abonner à toi-même.",
    };
  }

  const tierInfo = TIERS[parsed.data.tier];

  /* Récupère le compte connecté Stripe du creator. */
  const { data: creatorProfile } = await supabase
    .from("profiles")
    .select(
      "id, username, full_name, stripe_connect_account_id, stripe_charges_enabled",
    )
    .eq("id", parsed.data.creatorId)
    .maybeSingle();
  const c =
    (creatorProfile as {
      id: string;
      username: string | null;
      full_name: string | null;
      stripe_connect_account_id: string | null;
      stripe_charges_enabled: boolean | null;
    } | null) ?? null;
  if (!c) {
    return { ok: false as const, error: "Créateur introuvable." };
  }
  if (!c.stripe_connect_account_id) {
    return {
      ok: false as const,
      error: "Ce créateur n'a pas connecté son compte Stripe.",
    };
  }
  if (!c.stripe_charges_enabled) {
    return {
      ok: false as const,
      error: "Le compte Stripe du créateur n'est pas encore actif.",
    };
  }

  /* Si subscription active existe déjà → refuse côté server.
     L'UI pourra plus tard proposer "Gérer mon abonnement". */
  const { data: existing } = await (supabase as SupabaseAny)
    .from("creator_subscriptions")
    .select("id, status, tier")
    .eq("subscriber_id", user.id)
    .eq("creator_id", parsed.data.creatorId)
    .maybeSingle();
  if (existing) {
    const e = existing as { id: string; status: string; tier: number };
    if (["active", "trialing", "past_due"].includes(e.status)) {
      return {
        ok: false as const,
        error: `Tu es déjà abonné Tier ${e.tier} à ce créateur.`,
      };
    }
  }

  const baseUrl =
    process.env.NEXT_PUBLIC_APP_URL ??
    (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : null) ??
    "http://localhost:3000";
  const fullBase = baseUrl.startsWith("http")
    ? baseUrl
    : `https://${baseUrl}`;
  const creatorHandle = c.username
    ? `/u/${c.username}`
    : `/u/${parsed.data.creatorId}`;
  const successUrl = `${fullBase}${creatorHandle}?sub=success`;
  const cancelUrl = `${fullBase}${creatorHandle}?sub=cancelled`;

  const stripe = getStripe();

  const checkoutSession = await stripe.checkout.sessions.create(
    {
      mode: "subscription",
      payment_method_types: ["card"],
      line_items: [
        {
          quantity: 1,
          price_data: {
            currency: "eur",
            unit_amount: tierInfo.amountCents,
            recurring: { interval: "month" },
            product_data: {
              name: `Abonnement ${tierInfo.label} — ${
                c.full_name ?? c.username ?? "Créateur"
              }`,
            },
          },
        },
      ],
      subscription_data: {
        application_fee_percent: 10,
        metadata: {
          divarc_kind: "creator_subscription",
          divarc_creator_id: c.id,
          divarc_subscriber_id: user.id,
          divarc_tier: String(parsed.data.tier),
        },
      },
      metadata: {
        divarc_kind: "creator_subscription",
        divarc_creator_id: c.id,
        divarc_subscriber_id: user.id,
        divarc_tier: String(parsed.data.tier),
      },
      success_url: successUrl,
      cancel_url: cancelUrl,
    },
    { stripeAccount: c.stripe_connect_account_id },
  );

  /* Pré-INSERT creator_subscriptions status='incomplete'. Le webhook
     customer.subscription.* (event.account = compte du creator) mettra
     ensuite à jour avec les vrais ids Stripe + status réel.

     Le webhook devra matcher via subscriber_id+creator_id (ON CONFLICT
     subscriber_id,creator_id). On utilise admin client : RLS bloque les
     INSERT côté client (creator_subs_no_insert policy). */
  let admin;
  try {
    admin = createAdminClient();
  } catch {
    admin = supabase;
  }

  await (admin as SupabaseAny)
    .from("creator_subscriptions")
    .upsert(
      {
        subscriber_id: user.id,
        creator_id: c.id,
        tier: parsed.data.tier,
        amount_cents: tierInfo.amountCents,
        currency: "EUR",
        status: "incomplete",
      },
      { onConflict: "subscriber_id,creator_id" },
    );

  return { ok: true as const, url: checkoutSession.url };
}
