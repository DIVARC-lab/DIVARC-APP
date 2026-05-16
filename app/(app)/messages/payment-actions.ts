"use server";

/* Server Actions paiements in-chat via Stripe Checkout.
 *
 *   - createMessagePayment : sender envoie un paiement → message type=payment
 *     + Checkout Stripe (recipient peut accept/decline)
 *   - declineMessagePayment : recipient refuse (status=declined)
 *
 * Le webhook Stripe (déjà en place) marque status=paid au paiement
 * effectif. Pour V1, on utilise Stripe Checkout standard (pas Connect)
 * — sender paie via DIVARC, recipient reçoit le crédit dans son wallet
 * DIVARC. Pour V2 : Stripe Connect direct transfer.
 */

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getStripe, isStripeConfigured } from "@/lib/stripe/client";

/* eslint-disable @typescript-eslint/no-explicit-any */
type SupabaseAny = any;

const createSchema = z.object({
  conversationId: z.string().uuid(),
  recipientId: z.string().uuid(),
  amountCents: z.number().int().min(100).max(100_000),
  description: z.string().trim().max(200).optional(),
});

export async function createMessagePayment(
  args: z.infer<typeof createSchema>,
) {
  if (!isStripeConfigured()) {
    return { ok: false as const, error: "Paiements non configurés." };
  }
  const parsed = createSchema.safeParse(args);
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

  if (parsed.data.recipientId === user.id) {
    return {
      ok: false as const,
      error: "Tu ne peux pas t'envoyer un paiement à toi-même.",
    };
  }

  /* Compte Stripe Connect du recipient. */
  const { data: recipientProfile } = await supabase
    .from("profiles")
    .select(
      "stripe_connect_account_id, stripe_charges_enabled, full_name, username",
    )
    .eq("id", parsed.data.recipientId)
    .maybeSingle();
  const rp = recipientProfile as {
    stripe_connect_account_id: string | null;
    stripe_charges_enabled: boolean | null;
    full_name: string | null;
    username: string | null;
  } | null;
  if (!rp?.stripe_connect_account_id || !rp.stripe_charges_enabled) {
    return {
      ok: false as const,
      error: "Le destinataire n'a pas connecté son compte Stripe.",
    };
  }

  /* INSERT message type=payment + body = description (preview). */
  const previewText = `💰 ${(parsed.data.amountCents / 100).toFixed(2)} €${
    parsed.data.description ? ` — ${parsed.data.description}` : ""
  }`;
  const { data: msg, error: msgErr } = await (supabase as SupabaseAny)
    .from("messages")
    .insert({
      conversation_id: parsed.data.conversationId,
      sender_id: user.id,
      type: "payment",
      body: previewText,
    })
    .select("id")
    .maybeSingle();
  if (msgErr || !msg) {
    return {
      ok: false as const,
      error: `Création message échouée : ${msgErr?.message ?? "inconnue"}`,
    };
  }

  /* Stripe Checkout Session sur compte Connect du recipient. */
  const stripe = getStripe();
  const baseUrl =
    process.env.NEXT_PUBLIC_APP_URL ??
    (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : null) ??
    "http://localhost:3000";
  const fullBase = baseUrl.startsWith("http")
    ? baseUrl
    : `https://${baseUrl}`;
  const successUrl = `${fullBase}/messages/${parsed.data.conversationId}?payment=success`;
  const cancelUrl = `${fullBase}/messages/${parsed.data.conversationId}?payment=cancelled`;

  const APP_FEE_BPS = 250; // 2.5% pour les paiements P2P (vs 10% pour gifts/tips)
  const appFee = Math.round((parsed.data.amountCents * APP_FEE_BPS) / 10_000);

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
              name: `Paiement à ${rp.full_name ?? rp.username ?? "un utilisateur"}`,
              description: parsed.data.description ?? undefined,
            },
          },
        },
      ],
      payment_intent_data: {
        application_fee_amount: appFee,
        metadata: {
          divarc_kind: "message_payment",
          divarc_message_id: (msg as { id: string }).id,
          divarc_sender_id: user.id,
          divarc_recipient_id: parsed.data.recipientId,
        },
      },
      metadata: {
        divarc_kind: "message_payment",
        divarc_message_id: (msg as { id: string }).id,
        divarc_sender_id: user.id,
        divarc_recipient_id: parsed.data.recipientId,
      },
      success_url: successUrl,
      cancel_url: cancelUrl,
    },
    { stripeAccount: rp.stripe_connect_account_id },
  );

  /* INSERT message_payments pending. */
  await (supabase as SupabaseAny).from("message_payments").insert({
    message_id: (msg as { id: string }).id,
    sender_id: user.id,
    recipient_id: parsed.data.recipientId,
    amount_cents: parsed.data.amountCents,
    currency: "EUR",
    description: parsed.data.description ?? null,
    stripe_checkout_session_id: session.id,
    status: "pending",
  });

  revalidatePath(`/messages/${parsed.data.conversationId}`);
  return {
    ok: true as const,
    messageId: (msg as { id: string }).id,
    checkoutUrl: session.url,
  };
}

const declineSchema = z.object({ paymentId: z.string().uuid() });

export async function declineMessagePayment(
  args: z.infer<typeof declineSchema>,
) {
  const parsed = declineSchema.safeParse(args);
  if (!parsed.success) return { ok: false as const, error: "Invalide" };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false as const, error: "Non authentifié." };

  /* Lit le paiement pour vérifier que l'user est bien le recipient. */
  const { data: pay } = await (supabase as SupabaseAny)
    .from("message_payments")
    .select("id, recipient_id, status")
    .eq("id", parsed.data.paymentId)
    .maybeSingle();
  if (!pay) return { ok: false as const, error: "Paiement introuvable." };
  if ((pay as { recipient_id: string }).recipient_id !== user.id) {
    return { ok: false as const, error: "Seul le destinataire peut refuser." };
  }
  if ((pay as { status: string }).status !== "pending") {
    return { ok: false as const, error: "Paiement déjà résolu." };
  }

  const { error } = await (supabase as SupabaseAny)
    .from("message_payments")
    .update({
      status: "declined",
      declined_at: new Date().toISOString(),
    })
    .eq("id", parsed.data.paymentId);

  if (error) return { ok: false as const, error: error.message };
  return { ok: true as const };
}
