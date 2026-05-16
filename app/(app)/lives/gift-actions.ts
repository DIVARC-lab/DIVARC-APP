"use server";

/* Étape 16 — Server Action sendVirtualGift.
 *
 * Crée une Stripe Checkout Session (mode=payment) sur le compte connecté
 * du host. App fee 10% pour DIVARC, le reste va au host.
 *
 * INSERT live_gift_sends status='pending'. Le webhook
 * checkout.session.completed (divarc_kind='virtual_gift') confirme le
 * paiement et incrémente revenue_total_cents sur le live.
 */

import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { getStripe, isStripeConfigured } from "@/lib/stripe/client";
import { SUBSCRIPTION_APP_FEE_BPS } from "@/lib/stripe/config";

/* eslint-disable @typescript-eslint/no-explicit-any */
type SupabaseAny = any;

const schema = z.object({
  sessionId: z.string().uuid(),
  giftId: z.string().min(1).max(40),
});

export async function sendVirtualGift(args: z.infer<typeof schema>) {
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

  /* Lit le cadeau dans le catalogue. */
  const { data: gift } = await (supabase as SupabaseAny)
    .from("virtual_gifts")
    .select("id, label, amount_cents, is_active")
    .eq("id", parsed.data.giftId)
    .maybeSingle();
  if (!gift) {
    return { ok: false as const, error: "Cadeau introuvable." };
  }
  const g = gift as {
    id: string;
    label: string;
    amount_cents: number;
    is_active: boolean;
  };
  if (!g.is_active) {
    return { ok: false as const, error: "Ce cadeau n'est plus disponible." };
  }

  /* Lit le live + host. */
  const { data: room } = await (supabase as SupabaseAny)
    .from("circle_live_rooms")
    .select("id, host_id, title, status")
    .eq("id", parsed.data.sessionId)
    .maybeSingle();
  if (!room) return { ok: false as const, error: "Live introuvable." };
  const r = room as {
    id: string;
    host_id: string;
    title: string;
    status: string;
  };

  if (r.host_id === user.id) {
    return {
      ok: false as const,
      error: "Tu ne peux pas t'envoyer un cadeau à toi-même.",
    };
  }
  if (r.status !== "live") {
    return {
      ok: false as const,
      error: "Les cadeaux sont disponibles uniquement sur un live actif.",
    };
  }

  /* Compte connecté Stripe du host. */
  const { data: hostProfile } = await supabase
    .from("profiles")
    .select("stripe_connect_account_id, stripe_charges_enabled")
    .eq("id", r.host_id)
    .maybeSingle();
  const account =
    (hostProfile as { stripe_connect_account_id?: string | null } | null)
      ?.stripe_connect_account_id ?? null;
  const chargesEnabled =
    (hostProfile as { stripe_charges_enabled?: boolean } | null)
      ?.stripe_charges_enabled ?? false;
  if (!account) {
    return {
      ok: false as const,
      error: "Ce host n'a pas connecté son compte Stripe.",
    };
  }
  if (!chargesEnabled) {
    return {
      ok: false as const,
      error: "Le compte Stripe du host n'est pas encore actif.",
    };
  }

  /* Répartition 90/10. */
  const appFeeAmount = Math.round(
    (g.amount_cents * SUBSCRIPTION_APP_FEE_BPS) / 10_000,
  );
  const hostAmount = g.amount_cents - appFeeAmount;

  const baseUrl =
    process.env.NEXT_PUBLIC_APP_URL ??
    (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : null) ??
    "http://localhost:3000";
  const fullBase = baseUrl.startsWith("http")
    ? baseUrl
    : `https://${baseUrl}`;
  const successUrl = `${fullBase}/lives/${r.id}?gift=success`;
  const cancelUrl = `${fullBase}/lives/${r.id}?gift=cancelled`;

  const stripe = getStripe();

  const session = await stripe.checkout.sessions.create(
    {
      mode: "payment",
      payment_method_types: ["card"],
      line_items: [
        {
          quantity: 1,
          price_data: {
            currency: "eur",
            unit_amount: g.amount_cents,
            product_data: {
              name: `${g.label} — Live « ${r.title} »`,
            },
          },
        },
      ],
      payment_intent_data: {
        application_fee_amount: appFeeAmount,
        metadata: {
          divarc_kind: "virtual_gift",
          divarc_session_id: r.id,
          divarc_host_id: r.host_id,
          divarc_viewer_id: user.id,
          divarc_gift_id: g.id,
        },
      },
      metadata: {
        divarc_kind: "virtual_gift",
        divarc_session_id: r.id,
        divarc_host_id: r.host_id,
        divarc_viewer_id: user.id,
        divarc_gift_id: g.id,
      },
      success_url: successUrl,
      cancel_url: cancelUrl,
    },
    { stripeAccount: account },
  );

  /* INSERT live_gift_sends pending. */
  await (supabase as SupabaseAny).from("live_gift_sends").insert({
    session_id: r.id,
    viewer_id: user.id,
    host_id: r.host_id,
    gift_id: g.id,
    amount_cents: g.amount_cents,
    currency: "EUR",
    stripe_checkout_session_id: session.id,
    host_amount_cents: hostAmount,
    platform_amount_cents: appFeeAmount,
    status: "pending",
  });

  return { ok: true as const, url: session.url };
}
