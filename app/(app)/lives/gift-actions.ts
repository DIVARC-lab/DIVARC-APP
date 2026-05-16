"use server";

/* Étape 36/60 — Server Action sendVirtualGift étendu :
 *
 *   - recipientUserId : destinataire (host par défaut ou guest sur panel)
 *   - comboGiftId / comboCount : pour les envois successifs <5s
 *
 * Logique combo :
 *   1. Si le sender a déjà envoyé le même gift dans cette session dans
 *      les 5 dernières secondes → on récupère le combo_id existant.
 *   2. Sinon on génère un nouveau combo_id.
 *   3. combo_count = +1 par envoi.
 *
 * Le client peut détecter le combo localement et envoyer
 * recipientUserId + previousComboId pour cohérence.
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
  recipientUserId: z.string().uuid().optional(),
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

  if (r.status !== "live") {
    return {
      ok: false as const,
      error: "Les cadeaux sont disponibles uniquement sur un live actif.",
    };
  }

  /* Destinataire : guest sur panel ou host par défaut. */
  const recipientUserId = parsed.data.recipientUserId ?? r.host_id;

  /* On ne peut pas s'envoyer un cadeau. */
  if (recipientUserId === user.id) {
    return {
      ok: false as const,
      error: "Tu ne peux pas t'envoyer un cadeau à toi-même.",
    };
  }

  /* Vérifie que le recipient est bien host OU sur le panel. */
  if (recipientUserId !== r.host_id) {
    const { data: panelMember } = await (supabase as SupabaseAny)
      .from("live_panel_participants")
      .select("user_id")
      .eq("session_id", r.id)
      .eq("user_id", recipientUserId)
      .is("left_panel_at", null)
      .maybeSingle();
    if (!panelMember) {
      return {
        ok: false as const,
        error: "Le destinataire n'est pas sur le panel.",
      };
    }
  }

  /* Compte Stripe Connect du destinataire. */
  const { data: recipientProfile } = await supabase
    .from("profiles")
    .select("stripe_connect_account_id, stripe_charges_enabled")
    .eq("id", recipientUserId)
    .maybeSingle();
  const account =
    (recipientProfile as { stripe_connect_account_id?: string | null } | null)
      ?.stripe_connect_account_id ?? null;
  const chargesEnabled =
    (recipientProfile as { stripe_charges_enabled?: boolean } | null)
      ?.stripe_charges_enabled ?? false;
  if (!account || !chargesEnabled) {
    return {
      ok: false as const,
      error: "Le compte Stripe du destinataire n'est pas actif.",
    };
  }

  /* Combo detection : last gift_send même giftId par même user dans <5s. */
  const fiveSecAgo = new Date(Date.now() - 5_000).toISOString();
  const { data: lastSend } = await (supabase as SupabaseAny)
    .from("live_gift_sends")
    .select("combo_id, combo_count")
    .eq("session_id", r.id)
    .eq("viewer_id", user.id)
    .eq("gift_id", g.id)
    .gte("created_at", fiveSecAgo)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  let comboId: string | null = null;
  let comboCount = 1;
  if (lastSend) {
    const ls = lastSend as { combo_id: string | null; combo_count: number };
    comboId = ls.combo_id ?? crypto.randomUUID();
    comboCount = (ls.combo_count ?? 1) + 1;
  } else {
    comboId = crypto.randomUUID();
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
          divarc_recipient_id: recipientUserId,
          divarc_viewer_id: user.id,
          divarc_gift_id: g.id,
          divarc_combo_id: comboId,
          divarc_combo_count: String(comboCount),
        },
      },
      metadata: {
        divarc_kind: "virtual_gift",
        divarc_session_id: r.id,
        divarc_host_id: r.host_id,
        divarc_recipient_id: recipientUserId,
        divarc_viewer_id: user.id,
        divarc_gift_id: g.id,
        divarc_combo_id: comboId,
        divarc_combo_count: String(comboCount),
      },
      success_url: successUrl,
      cancel_url: cancelUrl,
    },
    { stripeAccount: account },
  );

  /* INSERT live_gift_sends pending avec combo. */
  await (supabase as SupabaseAny).from("live_gift_sends").insert({
    session_id: r.id,
    viewer_id: user.id,
    host_id: r.host_id,
    recipient_user_id: recipientUserId,
    gift_id: g.id,
    amount_cents: g.amount_cents,
    currency: "EUR",
    stripe_checkout_session_id: session.id,
    host_amount_cents: hostAmount,
    platform_amount_cents: appFeeAmount,
    status: "pending",
    combo_id: comboId,
    combo_count: comboCount,
  });

  return {
    ok: true as const,
    url: session.url,
    comboId,
    comboCount,
  };
}
