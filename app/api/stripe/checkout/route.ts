import { type NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { getStripe } from "@/lib/stripe/client";
import {
  applicationFeeCents,
  toCents,
  toStripeCurrency,
} from "@/lib/stripe/config";

/* Chantier 5 — Crée une Checkout Session Stripe pour acheter un listing.
 *
 * Flux :
 *  1. Buyer clique "Acheter" sur le listing → POST ici avec listing_id
 *  2. On vérifie : listing actif, pas le sien, vendeur a Stripe Connect "enabled"
 *  3. Crée la row `orders` en pending_payment
 *  4. Crée la Checkout Session avec destination charge :
 *     - line_items : prix du listing en devise EUR
 *     - payment_intent_data.application_fee_amount = commission DIVARC (5%)
 *     - payment_intent_data.transfer_data.destination = compte Connect vendeur
 *  5. Renvoie l'URL Stripe Checkout (hostée) — le client redirige
 *  6. Webhook met à jour l'order quand checkout.session.completed
 *
 * Escrow : pour V1 on laisse Stripe gérer le delay payout par défaut de
 * la plateforme (config Connect = 7 jours après réception fonds). Si besoin
 * de capture manuelle, ajouter `capture_method: "manual"` dans payment_intent_data
 * et capturer via une route séparée quand l'order passe à "delivered". */

const bodySchema = z.object({
  listing_id: z.string().uuid(),
});

export async function POST(req: NextRequest) {
  try {
    const json = await req.json();
    const parsed = bodySchema.safeParse(json);
    if (!parsed.success) {
      return NextResponse.json(
        { ok: false, error: "Payload invalide" },
        { status: 400 },
      );
    }

    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json(
        { ok: false, error: "Non authentifié" },
        { status: 401 },
      );
    }

    /* Charge le listing + le compte Connect du vendeur en une seule requête. */
    const { data: listing } = await supabase
      .from("listings")
      .select(
        "id, seller_id, title, description, price_amount, price_currency, status, category, condition",
      )
      .eq("id", parsed.data.listing_id)
      .maybeSingle();

    if (!listing) {
      return NextResponse.json(
        { ok: false, error: "Annonce introuvable" },
        { status: 404 },
      );
    }
    if (listing.seller_id === user.id) {
      return NextResponse.json(
        { ok: false, error: "Tu ne peux pas acheter ta propre annonce" },
        { status: 400 },
      );
    }
    if (listing.status !== "active") {
      return NextResponse.json(
        { ok: false, error: "Annonce non disponible" },
        { status: 400 },
      );
    }

    const { data: sellerProfile } = await supabase
      .from("profiles")
      .select("stripe_connect_account_id, stripe_connect_status")
      .eq("id", listing.seller_id)
      .maybeSingle();

    if (
      !sellerProfile?.stripe_connect_account_id ||
      sellerProfile.stripe_connect_status !== "enabled"
    ) {
      return NextResponse.json(
        {
          ok: false,
          error:
            "Le vendeur n'a pas encore activé les paiements DIVARC. Contacte-le pour finaliser la transaction.",
        },
        { status: 400 },
      );
    }

    const currency = toStripeCurrency(listing.price_currency);
    if (!currency) {
      return NextResponse.json(
        {
          ok: false,
          error: `Devise ${listing.price_currency} non supportée pour le paiement en ligne.`,
        },
        { status: 400 },
      );
    }

    const itemCents = toCents(Number(listing.price_amount));
    if (itemCents <= 0) {
      return NextResponse.json(
        {
          ok: false,
          error: "Cet article n'est pas disponible à l'achat en ligne.",
        },
        { status: 400 },
      );
    }
    const feeCents = applicationFeeCents(itemCents);

    /* Crée la row orders avant la session Stripe pour avoir un id stable.
     * Snapshot complet du listing pour preuve juridique. */
    const { data: order, error: orderError } = await supabase
      .from("orders")
      .insert({
        buyer_id: user.id,
        seller_id: listing.seller_id,
        listing_id: listing.id,
        listing_snapshot: {
          title: listing.title,
          description: listing.description,
          price_amount: listing.price_amount,
          price_currency: listing.price_currency,
          category: listing.category,
          condition: listing.condition,
        },
        item_price: Number(listing.price_amount),
        total_amount: Number(listing.price_amount),
        seller_amount: Number(listing.price_amount) - feeCents / 100,
        divarc_commission: feeCents / 100,
        currency: listing.price_currency,
        status: "pending_payment",
        funds_held_in_escrow: true,
      })
      .select("id, order_number")
      .single();

    if (orderError || !order) {
      return NextResponse.json(
        { ok: false, error: "Création de la commande impossible." },
        { status: 500 },
      );
    }

    const stripe = getStripe();
    const siteUrl =
      process.env.NEXT_PUBLIC_SITE_URL ?? "https://divarc.com";

    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      payment_method_types: ["card"],
      line_items: [
        {
          price_data: {
            currency,
            product_data: {
              name: listing.title,
              metadata: { listing_id: listing.id },
            },
            unit_amount: itemCents,
          },
          quantity: 1,
        },
      ],
      payment_intent_data: {
        application_fee_amount: feeCents,
        transfer_data: {
          destination: sellerProfile.stripe_connect_account_id,
        },
        metadata: {
          order_id: order.id,
          order_number: order.order_number,
          buyer_id: user.id,
          seller_id: listing.seller_id,
          listing_id: listing.id,
        },
      },
      metadata: {
        order_id: order.id,
        order_number: order.order_number,
      },
      success_url: `${siteUrl}/marketplace/orders/${order.id}?paid=1`,
      cancel_url: `${siteUrl}/marketplace/${listing.id}?cancelled=1`,
      customer_email: user.email ?? undefined,
    });

    /* Stocke la session id pour reconnaissance webhook. */
    await supabase
      .from("orders")
      .update({
        payment_intent_id: session.payment_intent
          ? String(session.payment_intent)
          : null,
      })
      .eq("id", order.id);

    return NextResponse.json({
      ok: true,
      url: session.url,
      orderId: order.id,
    });
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Erreur Stripe inconnue";
    return NextResponse.json(
      { ok: false, error: message },
      { status: 500 },
    );
  }
}
