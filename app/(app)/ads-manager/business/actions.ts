"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createAdminClient, createClient } from "@/lib/supabase/server";

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

  /* Anti-doublon SIRET — lecture admin pour ne pas dépendre des RLS
     (la policy `ads_business_select` filtre normalement seulement à
     primary_contact_user_id, mais un autre user peut avoir le même
     SIRET et être invisible). */
  const admin = createAdminClient();
  if (parsed.data.siret) {
    const { data: existing } = await admin
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

  /* Insert via admin client : la policy `ads_business_insert` exige
     déjà que primary_contact_user_id = auth.uid(), mais elle peut
     échouer si current_user_is_admin RPC manque. Sécurité garantie
     par primary_contact_user_id explicite ci-dessous. */
  const { data, error } = await admin
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
      error: `Création impossible : ${error?.message ?? "erreur inconnue"}`,
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

  /* Vérification applicative : le user est primary_contact du
     business_account. On utilise admin client pour la lecture car
     les policies RLS pourraient bloquer (ex. si current_user_is_admin
     RPC manque). La sécurité est garantie par le check explicite ici. */
  const adminPre = createAdminClient();
  const { data: business, error: bizErr } = await adminPre
    .from("ads_business_accounts")
    .select("primary_contact_user_id")
    .eq("id", parsed.data.business_account_id)
    .maybeSingle();
  if (bizErr) {
    console.error("[ads:createAdAccount:bizLookup]", bizErr);
    return {
      ok: false,
      error:
        "Impossible de vérifier ton entreprise. Réessaie ou contacte le support.",
    };
  }
  if (!business) return { ok: false, error: "Compte business introuvable." };
  if (business.primary_contact_user_id !== user.id) {
    return {
      ok: false,
      error:
        "Seul le contact principal de l'entreprise peut créer un compte publicitaire.",
    };
  }

  /* Insert ad_account via service_role pour bypasser les RLS qui
     pourraient échouer (ex. si helper functions current_user_is_admin
     ou user_has_ad_account_role ne sont pas créées en prod). La
     sécurité est garantie par le check primary_contact_user_id juste
     au-dessus. */
  const adminWrite = createAdminClient();
  const { data, error } = await adminWrite
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
    return {
      ok: false,
      error: `Création impossible : ${error?.message ?? "erreur inconnue"}`,
    };
  }

  /* Auto-attribution du rôle admin au créateur + auto-création d'une
     advertiser_entity par défaut.

     Important : ces 2 inserts utilisent createAdminClient() pour
     bypasser les policies RLS. La policy ad_account_users_admin_write
     exige déjà d'être admin pour INSERT un admin (cercle vicieux pour
     le premier user d'un ad_account). De même, advertiser_entities
     exige role editor qui n'existe pas tant que l'ad_account_users
     row n'est pas créée. Le service_role résout ces 2 dead-locks. */
  const admin = createAdminClient();

  const { error: linkErr } = await admin.from("ad_account_users").insert({
    ad_account_id: data.id,
    user_id: user.id,
    role: "admin",
    granted_by: user.id,
  });
  if (linkErr) {
    console.error("[ads:createAdAccount:linkAdmin]", linkErr);
    /* Cleanup : supprime l'ad_account orphelin pour éviter les comptes
       fantômes sans aucun user assigné. */
    await admin.from("ad_accounts").delete().eq("id", data.id);
    return {
      ok: false,
      error:
        "Impossible d'attribuer le rôle admin. Le compte a été annulé pour éviter un état incohérent.",
    };
  }

  const { data: bizForEntity } = await admin
    .from("ads_business_accounts")
    .select("legal_name")
    .eq("id", parsed.data.business_account_id)
    .maybeSingle();
  const { error: entityErr } = await admin
    .from("advertiser_entities")
    .insert({
      ad_account_id: data.id,
      type: "external_site",
      name: bizForEntity?.legal_name ?? parsed.data.name,
      verified_owner: false,
    });
  if (entityErr) {
    /* Non-fatal — la page wizard recreée à la volée si manquant. */
    console.error("[ads:createAdAccount:entity]", entityErr);
  }

  revalidatePath("/ads-manager");
  return { ok: true, data: { id: data.id } };
}
