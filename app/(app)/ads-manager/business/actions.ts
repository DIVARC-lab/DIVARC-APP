"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";

/* Server actions pour la gestion business + ad_accounts.
 *
 * Pas de Stripe Connect en V1 — l'annonceur alimente son ad_account
 * via virement (admin DIVARC crédite manuellement le prepaid_balance
 * via topup ad_charges + wallet).
 */

const businessSchema = z
  .object({
    legal_name: z.string().min(2).max(200),
    legal_form: z.string().max(50).optional(),
    siret: z
      .string()
      .regex(/^\d{14}$/, "SIRET = 14 chiffres")
      .optional(),
    vat_number: z.string().max(20).optional(),
    primary_contact_email: z.string().email(),
    primary_contact_phone: z.string().max(30).optional(),
    industry: z.string().max(50).optional(),
    billing_address: z.object({
      street: z.string().min(1).max(200),
      postal_code: z.string().max(20),
      city: z.string().max(100),
      country: z.string().length(2), // ISO 3166-1 alpha-2
    }),
  })
  .strict();

export type ActionResult<T = void> =
  | { ok: true; data?: T }
  | { ok: false; error: string };

export async function createBusinessAccount(
  input: z.infer<typeof businessSchema>,
): Promise<ActionResult<{ id: string }>> {
  const parsed = businessSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: "Données invalides." };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Non authentifié." };

  /* Anti-doublon SIRET. */
  if (parsed.data.siret) {
    const { data: existing } = await supabase
      .from("ads_business_accounts")
      .select("id")
      .eq("siret", parsed.data.siret)
      .maybeSingle();
    if (existing) {
      return {
        ok: false,
        error:
          "Un compte business existe déjà pour ce SIRET. Demande l'invitation à l'admin.",
      };
    }
  }

  const { data, error } = await supabase
    .from("ads_business_accounts")
    .insert({
      legal_name: parsed.data.legal_name,
      legal_form: parsed.data.legal_form ?? null,
      siret: parsed.data.siret ?? null,
      vat_number: parsed.data.vat_number ?? null,
      billing_address: parsed.data.billing_address,
      primary_contact_user_id: user.id,
      primary_contact_email: parsed.data.primary_contact_email,
      primary_contact_phone: parsed.data.primary_contact_phone ?? null,
      industry: parsed.data.industry ?? null,
    })
    .select("id")
    .single();

  if (error || !data) {
    console.error("[ads:createBusinessAccount]", error);
    return {
      ok: false,
      error: "Création impossible. Réessaie dans quelques instants.",
    };
  }

  revalidatePath("/ads-manager");
  return { ok: true, data: { id: data.id } };
}

const adAccountSchema = z
  .object({
    business_account_id: z.string().uuid(),
    name: z.string().min(2).max(100),
    currency: z.enum(["EUR", "USD", "GBP", "CAD", "CHF"]).default("EUR"),
    industry: z.string().max(50).optional(),
    spend_limit_daily: z.number().positive().optional(),
  })
  .strict();

export async function createAdAccount(
  input: z.infer<typeof adAccountSchema>,
): Promise<ActionResult<{ id: string }>> {
  const parsed = adAccountSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: "Données invalides." };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Non authentifié." };

  /* Vérification : le user est primary_contact du business_account. */
  const { data: business } = await supabase
    .from("ads_business_accounts")
    .select("primary_contact_user_id")
    .eq("id", parsed.data.business_account_id)
    .maybeSingle();
  if (!business) return { ok: false, error: "Compte business introuvable." };
  if (business.primary_contact_user_id !== user.id) {
    return {
      ok: false,
      error:
        "Seul le contact principal de l'entreprise peut créer un compte publicitaire.",
    };
  }

  const { data, error } = await supabase
    .from("ad_accounts")
    .insert({
      business_account_id: parsed.data.business_account_id,
      name: parsed.data.name,
      currency: parsed.data.currency,
      industry: parsed.data.industry ?? null,
      spend_limit_daily: parsed.data.spend_limit_daily ?? null,
    })
    .select("id")
    .single();

  if (error || !data) {
    console.error("[ads:createAdAccount]", error);
    return { ok: false, error: "Création impossible." };
  }

  /* Auto-attribution du rôle admin au créateur. */
  await supabase.from("ad_account_users").insert({
    ad_account_id: data.id,
    user_id: user.id,
    role: "admin",
    granted_by: user.id,
  });

  revalidatePath("/ads-manager");
  return { ok: true, data: { id: data.id } };
}
