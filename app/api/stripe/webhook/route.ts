import { type NextRequest, NextResponse } from "next/server";
import type Stripe from "stripe";
import { createClient } from "@/lib/supabase/server";
import { getStripe } from "@/lib/stripe/client";

/* Chantier 5 — Webhook Stripe.
 *
 * Évènements traités V1 :
 *   - checkout.session.completed     → order paid
 *   - payment_intent.succeeded       → backup pour checkout
 *   - payment_intent.payment_failed  → order pending_payment retour
 *   - charge.refunded                → order refunded
 *   - account.updated                → sync statut Connect du seller
 *
 * Important : configurer le webhook côté Stripe Dashboard avec le secret
 * STRIPE_WEBHOOK_SECRET (env var). Sans ça, on rejette tous les events. */

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!secret) {
    return NextResponse.json(
      { ok: false, error: "Webhook non configuré" },
      { status: 503 },
    );
  }

  const sig = req.headers.get("stripe-signature");
  if (!sig) {
    return NextResponse.json(
      { ok: false, error: "Signature manquante" },
      { status: 400 },
    );
  }

  let event: Stripe.Event;
  try {
    const body = await req.text();
    const stripe = getStripe();
    event = stripe.webhooks.constructEvent(body, sig, secret);
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Vérification signature échouée";
    return NextResponse.json(
      { ok: false, error: message },
      { status: 400 },
    );
  }

  try {
    /* Tous les writes se font via service role / clé admin SUPABASE_SERVICE_ROLE_KEY.
     * Webhook ≠ requête user, donc RLS doit être bypassée pour update
     * un order qui appartient à un autre user. */
    const supabase = await createClient();

    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;
        const orderId = session.metadata?.order_id;
        if (!orderId) break;
        await supabase
          .from("orders")
          .update({
            status: "paid",
            payment_intent_id: session.payment_intent
              ? String(session.payment_intent)
              : null,
            payment_method_type: session.payment_method_types?.[0] ?? null,
            paid_at: new Date().toISOString(),
          })
          .eq("id", orderId);
        break;
      }
      case "payment_intent.succeeded": {
        const pi = event.data.object as Stripe.PaymentIntent;
        await supabase
          .from("orders")
          .update({
            status: "paid",
            payment_intent_id: pi.id,
            paid_at: new Date().toISOString(),
          })
          .eq("payment_intent_id", pi.id);
        break;
      }
      case "payment_intent.payment_failed": {
        const pi = event.data.object as Stripe.PaymentIntent;
        await supabase
          .from("orders")
          .update({ status: "pending_payment" })
          .eq("payment_intent_id", pi.id);
        break;
      }
      case "charge.refunded": {
        const charge = event.data.object as Stripe.Charge;
        if (!charge.payment_intent) break;
        const fullyRefunded = charge.amount_refunded === charge.amount;
        await supabase
          .from("orders")
          .update({
            status: fullyRefunded ? "refunded" : "partially_refunded",
            funds_held_in_escrow: false,
          })
          .eq("payment_intent_id", String(charge.payment_intent));
        break;
      }
      case "account.updated": {
        const account = event.data.object as Stripe.Account;
        const nextStatus =
          account.requirements?.disabled_reason
            ? "disabled"
            : account.charges_enabled && account.payouts_enabled
              ? "enabled"
              : account.details_submitted
                ? "restricted"
                : "onboarding";
        await supabase
          .from("profiles")
          .update({
            stripe_connect_status: nextStatus,
            stripe_charges_enabled: account.charges_enabled,
            stripe_payouts_enabled: account.payouts_enabled,
            stripe_details_submitted: account.details_submitted,
            stripe_connect_updated_at: new Date().toISOString(),
          })
          .eq("stripe_connect_account_id", account.id);
        break;
      }
      default:
        /* Évènements non traités : OK, on accuse réception 200. */
        break;
    }

    return NextResponse.json({ ok: true, received: event.type });
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Erreur traitement webhook";
    return NextResponse.json(
      { ok: false, error: message },
      { status: 500 },
    );
  }
}
