import { type NextRequest, NextResponse } from "next/server";
import type Stripe from "stripe";
import { createAdminClient, createClient } from "@/lib/supabase/server";
import { getStripe } from "@/lib/stripe/client";

/* Chantier 5 + Sprint C — Webhook Stripe.
 *
 * Évènements traités :
 *   - checkout.session.completed     → order paid OU subscription created
 *   - payment_intent.succeeded       → backup pour checkout
 *   - payment_intent.payment_failed  → order pending_payment retour
 *   - charge.refunded                → order refunded
 *   - account.updated                → sync statut Connect du seller
 *   - customer.subscription.created  → sync circle_subscriptions (Sprint C)
 *   - customer.subscription.updated  → sync circle_subscriptions
 *   - customer.subscription.deleted  → mark canceled
 *
 * Important : configurer le webhook côté Stripe Dashboard avec le secret
 * STRIPE_WEBHOOK_SECRET (env var). Sans ça, on rejette tous les events.
 *
 * Sprint C : les subscriptions sont créées sur les comptes connectés des
 * owners de cercle. Le webhook reçoit les events avec event.account =
 * compte Stripe du owner. On utilise admin client pour bypasser RLS lors
 * de l'UPSERT (write cross-user). */

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

        /* Étape 13 — Live tip checkout. */
        if (session.metadata?.divarc_kind === "live_tip") {
          const tipSessionId = session.metadata?.divarc_session_id;
          if (!tipSessionId) break;

          let admin;
          try {
            admin = createAdminClient();
          } catch {
            admin = supabase;
          }

          /* eslint-disable-next-line @typescript-eslint/no-explicit-any */
          const { data: tip } = await (admin as any)
            .from("live_tips")
            .select("id, amount_cents, is_super_chat, tier")
            .eq("stripe_checkout_session_id", session.id)
            .maybeSingle();

          if (tip) {
            const t = tip as {
              id: string;
              amount_cents: number;
              is_super_chat: boolean;
              tier: number | null;
            };

            /* Étape 14 — Super-chat : calcule pinned_until_at depuis tier.
               Durées synchronisées avec migration 0158 (en secondes) :
               tier 7=3600, 6=1800, 5=600, 4=300, 3=120, 2=30, 1=0. */
            let pinnedUntilAt: string | null = null;
            if (t.is_super_chat && t.tier !== null) {
              const pinSecondsByTier: Record<number, number> = {
                7: 3600,
                6: 1800,
                5: 600,
                4: 300,
                3: 120,
                2: 30,
                1: 0,
              };
              const pinSec = pinSecondsByTier[t.tier] ?? 0;
              if (pinSec > 0) {
                pinnedUntilAt = new Date(Date.now() + pinSec * 1000).toISOString();
              }
            }

            /* eslint-disable-next-line @typescript-eslint/no-explicit-any */
            await (admin as any)
              .from("live_tips")
              .update({
                status: "paid",
                stripe_payment_intent_id: session.payment_intent
                  ? String(session.payment_intent)
                  : null,
                paid_at: new Date().toISOString(),
                pinned_until_at: pinnedUntilAt,
              })
              .eq("id", t.id);

            /* Incrémente revenue_total_cents sur la session. */
            /* eslint-disable-next-line @typescript-eslint/no-explicit-any */
            const { data: r } = await (admin as any)
              .from("circle_live_rooms")
              .select("revenue_total_cents")
              .eq("id", tipSessionId)
              .maybeSingle();
            const current =
              (r as { revenue_total_cents?: number } | null)
                ?.revenue_total_cents ?? 0;
            /* eslint-disable-next-line @typescript-eslint/no-explicit-any */
            await (admin as any)
              .from("circle_live_rooms")
              .update({ revenue_total_cents: current + t.amount_cents })
              .eq("id", tipSessionId);
          }
          break;
        }

        /* Existing : marketplace order checkout. */
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
      /* ============================================================
       * Sprint C — Subscription cercle (compte connecté)
       * Étape 15 — Subscription creator (compte connecté)
       * ============================================================ */
      case "customer.subscription.created":
      case "customer.subscription.updated":
      case "customer.subscription.deleted": {
        const sub = event.data.object as Stripe.Subscription;
        const kind = sub.metadata?.divarc_kind ?? null;
        const circleId = sub.metadata?.divarc_circle_id ?? null;
        const userId = sub.metadata?.divarc_user_id ?? null;
        const creatorId = sub.metadata?.divarc_creator_id ?? null;
        const subscriberId = sub.metadata?.divarc_subscriber_id ?? null;
        const tierStr = sub.metadata?.divarc_tier ?? null;

        const isCreatorSub =
          kind === "creator_subscription" || (creatorId && subscriberId);
        const isCircleSub = !isCreatorSub && circleId && userId;

        if (!isCreatorSub && !isCircleSub) {
          /* Pas une subscription DIVARC — ignore. */
          break;
        }

        /* Items[0] = la ligne principale, dont le price.id sert de ref.
           Depuis Stripe API 2025-09-30+, current_period_* est sur items. */
        const firstItem = sub.items?.data?.[0];
        const stripePriceId = firstItem?.price?.id ?? "";

        /* On utilise l'admin client pour bypasser RLS (insert
           cross-user nécessaire). */
        let admin;
        try {
          admin = createAdminClient();
        } catch {
          /* En l'absence de service role key, on tombe sur le client
             user → RLS bloque. Le webhook devra être re-essayé une fois
             la clé configurée. */
          admin = supabase;
        }

        /* eslint-disable-next-line @typescript-eslint/no-explicit-any */
        const itemPeriodStart = (firstItem as any)?.current_period_start as
          | number
          | undefined;
        /* eslint-disable-next-line @typescript-eslint/no-explicit-any */
        const itemPeriodEnd = (firstItem as any)?.current_period_end as
          | number
          | undefined;
        /* eslint-disable-next-line @typescript-eslint/no-explicit-any */
        const subPeriodStart = (sub as any).current_period_start as
          | number
          | undefined;
        /* eslint-disable-next-line @typescript-eslint/no-explicit-any */
        const subPeriodEnd = (sub as any).current_period_end as
          | number
          | undefined;
        const periodStartTs =
          itemPeriodStart ?? subPeriodStart ?? Math.floor(Date.now() / 1000);
        const periodEndTs =
          itemPeriodEnd ?? subPeriodEnd ?? Math.floor(Date.now() / 1000);

        const periodStart = new Date(periodStartTs * 1000).toISOString();
        const periodEnd = new Date(periodEndTs * 1000).toISOString();
        const trialEnd = sub.trial_end
          ? new Date(sub.trial_end * 1000).toISOString()
          : null;
        const canceledAt = sub.canceled_at
          ? new Date(sub.canceled_at * 1000).toISOString()
          : null;

        if (isCreatorSub) {
          /* Étape 15 — sync creator_subscriptions.
             Le pré-INSERT côté Server Action a créé une ligne
             (subscriber_id, creator_id) status='incomplete'. On UPSERT
             ON CONFLICT (subscriber_id, creator_id). */
          const tier = tierStr ? Number.parseInt(tierStr, 10) : null;
          const amountCents = firstItem?.price?.unit_amount ?? 0;
          /* eslint-disable-next-line @typescript-eslint/no-explicit-any */
          await (admin as any)
            .from("creator_subscriptions")
            .upsert(
              {
                subscriber_id: subscriberId,
                creator_id: creatorId,
                tier: tier && [1, 2, 3].includes(tier) ? tier : 1,
                stripe_subscription_id: sub.id,
                stripe_customer_id:
                  typeof sub.customer === "string"
                    ? sub.customer
                    : sub.customer?.id ?? "",
                stripe_price_id: stripePriceId,
                status: sub.status,
                amount_cents: amountCents,
                currency: "EUR",
                current_period_start: periodStart,
                current_period_end: periodEnd,
                cancel_at_period_end: sub.cancel_at_period_end ?? false,
                canceled_at: canceledAt,
              },
              { onConflict: "subscriber_id,creator_id" },
            );
          break;
        }

        /* eslint-disable-next-line @typescript-eslint/no-explicit-any */
        await (admin as any)
          .from("circle_subscriptions")
          .upsert(
            {
              circle_id: circleId,
              user_id: userId,
              stripe_subscription_id: sub.id,
              stripe_customer_id:
                typeof sub.customer === "string"
                  ? sub.customer
                  : sub.customer?.id ?? "",
              stripe_price_id: stripePriceId,
              status: sub.status,
              current_period_start: periodStart,
              current_period_end: periodEnd,
              cancel_at_period_end: sub.cancel_at_period_end ?? false,
              canceled_at: canceledAt,
              trial_ends_at: trialEnd,
            },
            { onConflict: "stripe_subscription_id" },
          );

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
