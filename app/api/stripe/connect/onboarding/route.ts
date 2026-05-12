import { type NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getStripe } from "@/lib/stripe/client";

/* Chantier 5 — Onboarding Stripe Connect Express.
 *
 * 1. Crée le compte Express si l'user n'en a pas déjà un (idempotent).
 * 2. Génère un Account Link (URL d'onboarding hébergée par Stripe).
 * 3. Renvoie l'URL à l'app pour redirection.
 *
 * Les liens Account Link expirent après ~5 min d'usage (single-use), donc
 * cette route est appelée à chaque fois que l'user clique "Continuer
 * l'onboarding" depuis l'app. */

export async function POST(req: NextRequest) {
  try {
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

    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("id, stripe_connect_account_id, stripe_connect_status, full_name, username")
      .eq("id", user.id)
      .maybeSingle();
    if (profileError || !profile) {
      return NextResponse.json(
        { ok: false, error: "Profil introuvable" },
        { status: 404 },
      );
    }

    const stripe = getStripe();

    /* 1. Récupère ou crée le compte Connect. */
    let accountId = profile.stripe_connect_account_id;
    if (!accountId) {
      const account = await stripe.accounts.create({
        type: "express",
        country: "FR",
        email: user.email ?? undefined,
        capabilities: {
          card_payments: { requested: true },
          transfers: { requested: true },
        },
        business_type: "individual",
        metadata: {
          divarc_user_id: user.id,
          divarc_username: profile.username ?? "",
        },
      });
      accountId = account.id;
      await supabase
        .from("profiles")
        .update({
          stripe_connect_account_id: accountId,
          stripe_connect_status: "onboarding",
          stripe_connect_updated_at: new Date().toISOString(),
        })
        .eq("id", user.id);
    }

    /* 2. Génère l'Account Link. */
    const siteUrl =
      process.env.NEXT_PUBLIC_SITE_URL ?? "https://divarc.com";
    const accountLink = await stripe.accountLinks.create({
      account: accountId,
      refresh_url: `${siteUrl}/wallet/seller?refresh=1`,
      return_url: `${siteUrl}/wallet/seller?onboarded=1`,
      type: "account_onboarding",
    });

    return NextResponse.json({ ok: true, url: accountLink.url });
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Erreur Stripe inconnue";
    return NextResponse.json(
      { ok: false, error: message },
      { status: 500 },
    );
  }
}

/* GET : retourne le statut courant + un dashboard link si le compte est
 * actif. Utile pour la page /wallet/seller. */
export async function GET() {
  try {
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

    const { data: profile } = await supabase
      .from("profiles")
      .select(
        "stripe_connect_account_id, stripe_connect_status, stripe_charges_enabled, stripe_payouts_enabled, stripe_details_submitted",
      )
      .eq("id", user.id)
      .maybeSingle();

    if (!profile?.stripe_connect_account_id) {
      return NextResponse.json({
        ok: true,
        status: "not_started",
        accountId: null,
        chargesEnabled: false,
        payoutsEnabled: false,
        detailsSubmitted: false,
        dashboardUrl: null,
      });
    }

    const stripe = getStripe();
    /* Sync inline du statut depuis Stripe (au cas où le webhook a manqué). */
    const account = await stripe.accounts.retrieve(
      profile.stripe_connect_account_id,
    );

    let dashboardUrl: string | null = null;
    if (account.charges_enabled && account.payouts_enabled) {
      const link = await stripe.accounts.createLoginLink(
        profile.stripe_connect_account_id,
      );
      dashboardUrl = link.url;
    }

    const nextStatus = computeStatus(account);
    if (nextStatus !== profile.stripe_connect_status) {
      await supabase
        .from("profiles")
        .update({
          stripe_connect_status: nextStatus,
          stripe_charges_enabled: account.charges_enabled,
          stripe_payouts_enabled: account.payouts_enabled,
          stripe_details_submitted: account.details_submitted,
          stripe_connect_updated_at: new Date().toISOString(),
        })
        .eq("id", user.id);
    }

    return NextResponse.json({
      ok: true,
      status: nextStatus,
      accountId: profile.stripe_connect_account_id,
      chargesEnabled: account.charges_enabled,
      payoutsEnabled: account.payouts_enabled,
      detailsSubmitted: account.details_submitted,
      dashboardUrl,
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

function computeStatus(account: {
  charges_enabled: boolean;
  payouts_enabled: boolean;
  details_submitted: boolean;
  requirements?: { disabled_reason?: string | null } | null;
}): "not_started" | "onboarding" | "restricted" | "enabled" | "disabled" {
  if (account.requirements?.disabled_reason) return "disabled";
  if (account.charges_enabled && account.payouts_enabled) return "enabled";
  if (account.details_submitted) return "restricted";
  return "onboarding";
}
