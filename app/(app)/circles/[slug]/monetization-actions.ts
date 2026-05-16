"use server";

/* Sprint C — Server Actions pour la monétisation des cercles.
 *
 *  - enableCircleMonetization : owner active le paid mode (crée product+price
 *    Stripe sur son compte connecté, persiste sur circles).
 *  - updateCirclePrice : change le prix (crée un nouveau price, archive l'ancien).
 *  - disableCircleMonetization : repasse en gratuit (archive le price, garde
 *    le product en historique).
 *  - startCircleSubscriptionCheckout : user demande à souscrire → renvoie
 *    une URL de Checkout Session Stripe.
 *  - cancelMySubscription : user annule sa propre souscription
 *    (cancel_at_period_end=true).
 */

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { isStripeConfigured } from "@/lib/stripe/client";
import {
  archiveCircleStripePrice,
  cancelSubscription,
  createCircleStripePrice,
  createCircleStripeProduct,
  createCircleSubscriptionCheckout,
} from "@/lib/stripe/subscriptions";

const enableSchema = z.object({
  circleId: z.string().uuid(),
  circleSlug: z.string().min(1),
  /* Prix en cents (min 100 = 1€, max 100000 = 1000€). */
  priceCents: z.number().int().min(100).max(100000),
  trialDays: z.number().int().min(0).max(30).default(0),
});

const updatePriceSchema = z.object({
  circleId: z.string().uuid(),
  circleSlug: z.string().min(1),
  priceCents: z.number().int().min(100).max(100000),
});

const disableSchema = z.object({
  circleId: z.string().uuid(),
  circleSlug: z.string().min(1),
});

const checkoutSchema = z.object({
  circleId: z.string().uuid(),
  circleSlug: z.string().min(1),
  successPath: z.string().default("/success"),
  cancelPath: z.string().default(""),
});

const cancelSchema = z.object({
  circleId: z.string().uuid(),
  circleSlug: z.string().min(1),
  /* true = à la fin de la période courante. false = immédiat (rare). */
  atPeriodEnd: z.boolean().default(true),
});

/* ============================================================
 * Helpers internes
 * ============================================================ */

type SupabaseAny = ReturnType<
  typeof Object.assign
>; /* eslint-disable-line @typescript-eslint/no-explicit-any */

async function assertCircleOwner(
  supabase: ReturnType<typeof createClient> extends Promise<infer T> ? T : never,
  circleId: string,
  userId: string,
): Promise<
  | { ok: true; circle: { id: string; slug: string; name: string; description: string | null; stripe_product_id: string | null; stripe_price_id: string | null; is_paid: boolean; price_cents: number | null; owner_id: string } }
  | { ok: false; error: string }
> {
  const { data: circle } = await (
    supabase as unknown as { from: (t: string) => SupabaseAny }
  )
    .from("circles")
    .select(
      "id, slug, name, description, stripe_product_id, stripe_price_id, is_paid, price_cents, owner_id",
    )
    .eq("id", circleId)
    .maybeSingle();
  if (!circle) return { ok: false, error: "Cercle introuvable." };
  if ((circle as { owner_id: string }).owner_id !== userId) {
    return { ok: false, error: "Réservé au propriétaire du cercle." };
  }
  return { ok: true, circle: circle as never };
}

async function getOwnerStripeAccount(
  supabase: ReturnType<typeof createClient> extends Promise<infer T> ? T : never,
  ownerId: string,
): Promise<{ account: string; enabled: boolean } | null> {
  const { data: profile } = await supabase
    .from("profiles")
    .select("stripe_connect_account_id, stripe_charges_enabled")
    .eq("id", ownerId)
    .maybeSingle();
  const account =
    (profile as { stripe_connect_account_id?: string | null } | null)
      ?.stripe_connect_account_id ?? null;
  const enabled =
    (profile as { stripe_charges_enabled?: boolean } | null)
      ?.stripe_charges_enabled ?? false;
  if (!account) return null;
  return { account, enabled };
}

/* ============================================================
 * enableCircleMonetization
 * ============================================================ */

export async function enableCircleMonetization(
  args: z.infer<typeof enableSchema>,
) {
  if (!isStripeConfigured()) {
    return { ok: false as const, error: "Stripe non configuré côté serveur." };
  }
  const parsed = enableSchema.safeParse(args);
  if (!parsed.success) {
    return { ok: false as const, error: parsed.error.issues[0]?.message ?? "Invalide" };
  }
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false as const, error: "Non authentifié." };

  const owner = await assertCircleOwner(supabase, parsed.data.circleId, user.id);
  if (!owner.ok) return { ok: false as const, error: owner.error };

  const stripeAcc = await getOwnerStripeAccount(supabase, user.id);
  if (!stripeAcc) {
    return {
      ok: false as const,
      error: "Connecte d'abord ton compte Stripe (Wallet → Vendeur).",
    };
  }
  if (!stripeAcc.enabled) {
    return {
      ok: false as const,
      error: "Ton compte Stripe Connect doit être actif (charges_enabled).",
    };
  }

  /* Création du Product Stripe (si absent) sur le compte connecté. */
  let productId = owner.circle.stripe_product_id;
  if (!productId) {
    const product = await createCircleStripeProduct({
      circleId: owner.circle.id,
      name: owner.circle.name,
      slug: owner.circle.slug,
      description: owner.circle.description,
      stripeAccount: stripeAcc.account,
    });
    productId = product.id;
  }

  /* Création du Price recurring monthly. */
  const price = await createCircleStripePrice({
    productId,
    unitAmountCents: parsed.data.priceCents,
    currency: "eur",
    stripeAccount: stripeAcc.account,
  });

  /* Persistence DIVARC. */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (supabase as any)
    .from("circles")
    .update({
      is_paid: true,
      price_cents: parsed.data.priceCents,
      currency: "EUR",
      billing_period: "monthly",
      stripe_product_id: productId,
      stripe_price_id: price.id,
      trial_days: parsed.data.trialDays,
    })
    .eq("id", parsed.data.circleId);
  if (error) return { ok: false as const, error: error.message };

  revalidatePath(`/circles/${parsed.data.circleSlug}`);
  revalidatePath(`/circles/${parsed.data.circleSlug}/settings`);
  return { ok: true as const, priceId: price.id };
}

/* ============================================================
 * updateCirclePrice — change le prix (nouveau Stripe price)
 * ============================================================ */

export async function updateCirclePrice(
  args: z.infer<typeof updatePriceSchema>,
) {
  if (!isStripeConfigured()) {
    return { ok: false as const, error: "Stripe non configuré." };
  }
  const parsed = updatePriceSchema.safeParse(args);
  if (!parsed.success) {
    return { ok: false as const, error: "Invalide" };
  }
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false as const, error: "Non authentifié." };

  const owner = await assertCircleOwner(supabase, parsed.data.circleId, user.id);
  if (!owner.ok) return { ok: false as const, error: owner.error };
  if (!owner.circle.is_paid || !owner.circle.stripe_product_id) {
    return { ok: false as const, error: "Active d'abord la monétisation." };
  }

  const stripeAcc = await getOwnerStripeAccount(supabase, user.id);
  if (!stripeAcc) {
    return { ok: false as const, error: "Compte Stripe absent." };
  }

  const newPrice = await createCircleStripePrice({
    productId: owner.circle.stripe_product_id,
    unitAmountCents: parsed.data.priceCents,
    currency: "eur",
    stripeAccount: stripeAcc.account,
  });

  /* Archive l'ancien price (les subs existantes le gardent en snapshot
     Stripe — pas de changement pour elles). */
  if (owner.circle.stripe_price_id) {
    try {
      await archiveCircleStripePrice(
        owner.circle.stripe_price_id,
        stripeAcc.account,
      );
    } catch {
      /* Best-effort : si l'archive échoue, on garde quand même le nouveau. */
    }
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (supabase as any)
    .from("circles")
    .update({
      price_cents: parsed.data.priceCents,
      stripe_price_id: newPrice.id,
    })
    .eq("id", parsed.data.circleId);
  if (error) return { ok: false as const, error: error.message };

  revalidatePath(`/circles/${parsed.data.circleSlug}`);
  revalidatePath(`/circles/${parsed.data.circleSlug}/settings`);
  return { ok: true as const, priceId: newPrice.id };
}

/* ============================================================
 * disableCircleMonetization
 * ============================================================ */

export async function disableCircleMonetization(
  args: z.infer<typeof disableSchema>,
) {
  const parsed = disableSchema.safeParse(args);
  if (!parsed.success) return { ok: false as const, error: "Invalide" };
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false as const, error: "Non authentifié." };

  const owner = await assertCircleOwner(supabase, parsed.data.circleId, user.id);
  if (!owner.ok) return { ok: false as const, error: owner.error };

  const stripeAcc = await getOwnerStripeAccount(supabase, user.id);
  if (stripeAcc?.account && owner.circle.stripe_price_id) {
    try {
      await archiveCircleStripePrice(
        owner.circle.stripe_price_id,
        stripeAcc.account,
      );
    } catch {
      /* Best-effort. */
    }
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (supabase as any)
    .from("circles")
    .update({
      is_paid: false,
      stripe_price_id: null,
    })
    .eq("id", parsed.data.circleId);
  if (error) return { ok: false as const, error: error.message };

  revalidatePath(`/circles/${parsed.data.circleSlug}`);
  revalidatePath(`/circles/${parsed.data.circleSlug}/settings`);
  return { ok: true as const };
}

/* ============================================================
 * startCircleSubscriptionCheckout
 * ============================================================ */

export async function startCircleSubscriptionCheckout(
  args: z.infer<typeof checkoutSchema>,
) {
  if (!isStripeConfigured()) {
    return { ok: false as const, error: "Stripe non configuré." };
  }
  const parsed = checkoutSchema.safeParse(args);
  if (!parsed.success) return { ok: false as const, error: "Invalide" };
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false as const, error: "Non authentifié." };

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: circle } = await (supabase as any)
    .from("circles")
    .select(
      "id, slug, name, owner_id, is_paid, price_cents, stripe_price_id, trial_days",
    )
    .eq("id", parsed.data.circleId)
    .maybeSingle();
  if (!circle) return { ok: false as const, error: "Cercle introuvable." };
  const c = circle as {
    id: string;
    slug: string;
    name: string;
    owner_id: string;
    is_paid: boolean;
    price_cents: number | null;
    stripe_price_id: string | null;
    trial_days: number;
  };
  if (!c.is_paid || !c.stripe_price_id) {
    return { ok: false as const, error: "Ce cercle n'est pas en mode payant." };
  }
  if (c.owner_id === user.id) {
    return {
      ok: false as const,
      error: "Tu es le propriétaire, l'abonnement n'est pas nécessaire.",
    };
  }

  const ownerStripe = await getOwnerStripeAccount(supabase, c.owner_id);
  if (!ownerStripe?.account) {
    return {
      ok: false as const,
      error: "Le propriétaire n'a pas connecté Stripe.",
    };
  }

  /* URL absolue pour Stripe — utiliser la host configurée si dispo. */
  const baseUrl =
    process.env.NEXT_PUBLIC_APP_URL ??
    process.env.VERCEL_URL ??
    "http://localhost:3000";
  const fullBase = baseUrl.startsWith("http") ? baseUrl : `https://${baseUrl}`;
  const successUrl = `${fullBase}/circles/${c.slug}?subscribed=1`;
  const cancelUrl = `${fullBase}/circles/${c.slug}?subscribe_cancelled=1`;

  const session = await createCircleSubscriptionCheckout({
    circleId: c.id,
    circleSlug: c.slug,
    circleName: c.name,
    priceId: c.stripe_price_id,
    trialDays: c.trial_days,
    ownerStripeAccount: ownerStripe.account,
    userId: user.id,
    userEmail: user.email ?? null,
    successUrl,
    cancelUrl,
  });

  return { ok: true as const, url: session.url };
}

/* ============================================================
 * cancelMySubscription
 * ============================================================ */

export async function cancelMyCircleSubscription(
  args: z.infer<typeof cancelSchema>,
) {
  if (!isStripeConfigured()) {
    return { ok: false as const, error: "Stripe non configuré." };
  }
  const parsed = cancelSchema.safeParse(args);
  if (!parsed.success) return { ok: false as const, error: "Invalide" };
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false as const, error: "Non authentifié." };

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: sub } = await (supabase as any)
    .from("circle_subscriptions")
    .select("stripe_subscription_id, circle_id")
    .eq("circle_id", parsed.data.circleId)
    .eq("user_id", user.id)
    .in("status", ["trialing", "active", "past_due"])
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (!sub) {
    return { ok: false as const, error: "Aucune souscription active." };
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: circle } = await (supabase as any)
    .from("circles")
    .select("owner_id")
    .eq("id", parsed.data.circleId)
    .maybeSingle();
  const ownerId = (circle as { owner_id?: string } | null)?.owner_id;
  if (!ownerId) return { ok: false as const, error: "Cercle introuvable." };

  const stripeAcc = await getOwnerStripeAccount(supabase, ownerId);
  if (!stripeAcc?.account) {
    return { ok: false as const, error: "Compte Stripe propriétaire absent." };
  }

  await cancelSubscription(
    (sub as { stripe_subscription_id: string }).stripe_subscription_id,
    stripeAcc.account,
    parsed.data.atPeriodEnd,
  );

  /* Le webhook va réécrire les status. On revalide la page. */
  revalidatePath(`/circles/${parsed.data.circleSlug}`);
  return { ok: true as const };
}
