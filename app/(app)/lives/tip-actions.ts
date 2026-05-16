"use server";

/* Étape 13 — Server Action createLiveTipCheckout.
 *
 * Crée une Stripe Checkout Session (mode=payment) sur le compte connecté
 * du host. App fee 10% retenu par DIVARC, le reste va au host.
 *
 * INSERT live_tips status='pending'. Le webhook checkout.session.completed
 * confirme le paiement (status='paid') et incrémente revenue_total_cents.
 */

import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { getStripe, isStripeConfigured } from "@/lib/stripe/client";
import { SUBSCRIPTION_APP_FEE_BPS } from "@/lib/stripe/config";

/* eslint-disable @typescript-eslint/no-explicit-any */
type SupabaseAny = any;

const tipSchema = z.object({
  sessionId: z.string().uuid(),
  amountCents: z.number().int().min(100).max(50000),
  message: z.string().trim().max(200).optional(),
  isSuperChat: z.boolean().optional(),
});

/* Étape 14 — Tiers super-chat (synchro avec migration 0158). */
function computeSuperChatTier(amountCents: number): number {
  if (amountCents >= 10000) return 7;
  if (amountCents >= 5000) return 6;
  if (amountCents >= 2000) return 5;
  if (amountCents >= 1000) return 4;
  if (amountCents >= 500) return 3;
  if (amountCents >= 200) return 2;
  return 1;
}

export async function createLiveTipCheckout(
  args: z.infer<typeof tipSchema>,
) {
  if (!isStripeConfigured()) {
    return { ok: false as const, error: "Paiements non configurés." };
  }
  const parsed = tipSchema.safeParse(args);
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

  /* Lit la session pour vérifier tips activés + récupérer host. */
  const { data: room } = await (supabase as SupabaseAny)
    .from("circle_live_rooms")
    .select("id, host_id, title, is_tips_enabled, status, kind")
    .eq("id", parsed.data.sessionId)
    .maybeSingle();
  if (!room) return { ok: false as const, error: "Live introuvable." };

  const r = room as {
    id: string;
    host_id: string;
    title: string;
    is_tips_enabled: boolean;
    status: string;
  };

  if (!r.is_tips_enabled) {
    return {
      ok: false as const,
      error: "Le host a désactivé les pourboires pour ce live.",
    };
  }
  if (r.host_id === user.id) {
    return {
      ok: false as const,
      error: "Tu ne peux pas t'envoyer un pourboire à toi-même.",
    };
  }
  if (r.status !== "live") {
    return {
      ok: false as const,
      error: "Les pourboires sont disponibles uniquement sur un live actif.",
    };
  }

  /* Récupère le compte connecté Stripe du host. */
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

  /* Répartition 90/10 (app fee 10%). */
  const appFeeAmount = Math.round(
    (parsed.data.amountCents * SUBSCRIPTION_APP_FEE_BPS) / 10_000,
  );
  const hostAmount = parsed.data.amountCents - appFeeAmount;

  /* Étape 14 — Super-chat : message obligatoire si flag activé. */
  const isSuperChat = parsed.data.isSuperChat === true;
  if (isSuperChat && (!parsed.data.message || parsed.data.message.length === 0)) {
    return {
      ok: false as const,
      error: "Le message est obligatoire pour un super-chat.",
    };
  }
  const tier = isSuperChat ? computeSuperChatTier(parsed.data.amountCents) : null;

  /* URLs Stripe pour redirection. */
  const baseUrl =
    process.env.NEXT_PUBLIC_APP_URL ??
    (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : null) ??
    "http://localhost:3000";
  const fullBase = baseUrl.startsWith("http") ? baseUrl : `https://${baseUrl}`;
  const successUrl = `${fullBase}/lives/${r.id}?tip=success`;
  const cancelUrl = `${fullBase}/lives/${r.id}?tip=cancelled`;

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
            unit_amount: parsed.data.amountCents,
            product_data: {
              name: `Pourboire pour le live « ${r.title} »`,
              description: parsed.data.message ?? undefined,
            },
          },
        },
      ],
      payment_intent_data: {
        application_fee_amount: appFeeAmount,
        metadata: {
          divarc_kind: "live_tip",
          divarc_session_id: r.id,
          divarc_host_id: r.host_id,
          divarc_viewer_id: user.id,
          divarc_message: parsed.data.message ?? "",
          divarc_is_super_chat: isSuperChat ? "1" : "0",
        },
      },
      metadata: {
        divarc_kind: "live_tip",
        divarc_session_id: r.id,
        divarc_host_id: r.host_id,
        divarc_viewer_id: user.id,
        divarc_is_super_chat: isSuperChat ? "1" : "0",
      },
      success_url: successUrl,
      cancel_url: cancelUrl,
    },
    { stripeAccount: account },
  );

  /* INSERT live_tips pending. */
  /* eslint-disable-next-line @typescript-eslint/no-explicit-any */
  await (supabase as any).from("live_tips").insert({
    session_id: r.id,
    viewer_id: user.id,
    host_id: r.host_id,
    amount_cents: parsed.data.amountCents,
    currency: "EUR",
    stripe_checkout_session_id: session.id,
    host_amount_cents: hostAmount,
    platform_amount_cents: appFeeAmount,
    message: parsed.data.message ?? null,
    status: "pending",
    is_super_chat: isSuperChat,
    tier,
  });

  return { ok: true as const, url: session.url };
}
