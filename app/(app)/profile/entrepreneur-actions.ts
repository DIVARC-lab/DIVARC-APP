"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";

/* Étape 3.4 — actions facette entrepreneur (V0070). */

export type ActionResult = { ok: true } | { ok: false; error: string };

async function requireUser() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("UNAUTHENTICATED");
  return { supabase, user };
}

const currencyEnum = z.enum([
  "EUR", "USD", "XAF", "XOF", "MAD", "TND", "DZD", "CAD", "CHF", "GBP",
]);

const founderStatusEnum = z.enum([
  "founder", "co_founder", "ceo", "cto", "cfo", "coo",
  "president", "managing_director", "board_member", "advisor", "other",
]);

const companyStageEnum = z.enum([
  "idea", "mvp", "seed", "series_a", "series_b", "series_c_plus",
  "profitable", "acquired", "shutdown", "ipo",
]);

const roundEnum = z.enum([
  "pre_seed", "seed", "series_a", "series_b", "series_c",
  "series_d_plus", "bridge", "crowdfunding", "angel", "other",
]);

// =====================================================
// ENTREPRENEUR COMPANIES
// =====================================================
const companySchema = z.object({
  company_id: z.string().uuid().nullable().optional(),
  company_name: z.string().min(1).max(120),
  company_logo_url: z.string().url().nullable().optional(),
  role: z.string().min(1).max(80),
  founder_status: founderStatusEnum,
  founded_year: z.number().int().min(1900).max(2100).nullable().optional(),
  exit_year: z.number().int().min(1900).max(2100).nullable().optional(),
  is_current: z.boolean().default(true),
  description: z.string().max(2000).nullable().optional(),
  industry: z.string().max(60).nullable().optional(),
  company_stage: companyStageEnum.nullable().optional(),
});

export async function createEntrepreneurCompany(
  input: z.infer<typeof companySchema>,
): Promise<ActionResult> {
  const parsed = companySchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalide." };
  }
  try {
    const { supabase, user } = await requireUser();
    const { error } = await supabase
      .from("entrepreneur_companies")
      .insert({ user_id: user.id, ...parsed.data });
    if (error) return { ok: false, error: "Création échouée." };
    revalidatePath("/profile");
    revalidatePath(`/u/${user.id}`);
    return { ok: true };
  } catch {
    return { ok: false, error: "Erreur serveur." };
  }
}

export async function deleteEntrepreneurCompany(
  id: string,
): Promise<ActionResult> {
  try {
    const { supabase, user } = await requireUser();
    const { error } = await supabase
      .from("entrepreneur_companies")
      .delete()
      .eq("id", id)
      .eq("user_id", user.id);
    if (error) return { ok: false, error: "Suppression échouée." };
    revalidatePath("/profile");
    revalidatePath(`/u/${user.id}`);
    return { ok: true };
  } catch {
    return { ok: false, error: "Erreur serveur." };
  }
}

// =====================================================
// ENTREPRENEUR INVESTMENTS
// =====================================================
const investmentSchema = z.object({
  invested_company_id: z.string().uuid().nullable().optional(),
  company_name: z.string().min(1).max(120),
  company_logo_url: z.string().url().nullable().optional(),
  round: roundEnum.nullable().optional(),
  amount: z.number().min(0).nullable().optional(),
  currency: currencyEnum.nullable().optional(),
  is_amount_public: z.boolean().default(false),
  invested_at: z.string().nullable().optional(),
  exit_at: z.string().nullable().optional(),
  description: z.string().max(1000).nullable().optional(),
});

export async function createInvestment(
  input: z.infer<typeof investmentSchema>,
): Promise<ActionResult> {
  const parsed = investmentSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalide." };
  }
  try {
    const { supabase, user } = await requireUser();
    const { error } = await supabase
      .from("entrepreneur_investments")
      .insert({ user_id: user.id, ...parsed.data });
    if (error) return { ok: false, error: "Création échouée." };
    revalidatePath("/profile");
    revalidatePath(`/u/${user.id}`);
    return { ok: true };
  } catch {
    return { ok: false, error: "Erreur serveur." };
  }
}

export async function deleteInvestment(id: string): Promise<ActionResult> {
  try {
    const { supabase, user } = await requireUser();
    const { error } = await supabase
      .from("entrepreneur_investments")
      .delete()
      .eq("id", id)
      .eq("user_id", user.id);
    if (error) return { ok: false, error: "Suppression échouée." };
    revalidatePath("/profile");
    revalidatePath(`/u/${user.id}`);
    return { ok: true };
  } catch {
    return { ok: false, error: "Erreur serveur." };
  }
}

// =====================================================
// ENTREPRENEUR FUNDRAISING STATUS (1 row par user)
// =====================================================
const fundraisingSchema = z
  .object({
    is_open: z.boolean().default(false),
    round_type: z
      .enum([
        "pre_seed", "seed", "series_a", "series_b", "series_c",
        "series_d_plus", "bridge", "crowdfunding", "other",
      ])
      .nullable()
      .optional(),
    target_amount: z.number().min(0).nullable().optional(),
    raised_amount: z.number().min(0).nullable().optional(),
    currency: currencyEnum.nullable().optional(),
    pitch_deck_url: z.string().url().nullable().optional(),
    contact_email: z.string().email().nullable().optional(),
    closing_date: z.string().nullable().optional(),
    notes: z.string().max(2000).nullable().optional(),
  })
  .refine(
    (d) =>
      d.target_amount == null ||
      d.raised_amount == null ||
      d.raised_amount <= d.target_amount,
    { message: "raised_amount ne peut pas dépasser target_amount." },
  );

export async function upsertFundraising(
  input: z.infer<typeof fundraisingSchema>,
): Promise<ActionResult> {
  const parsed = fundraisingSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalide." };
  }
  try {
    const { supabase, user } = await requireUser();
    const { error } = await supabase
      .from("entrepreneur_fundraising_status")
      .upsert(
        { user_id: user.id, ...parsed.data },
        { onConflict: "user_id" },
      );
    if (error) return { ok: false, error: "Sauvegarde échouée." };
    revalidatePath("/profile");
    revalidatePath(`/u/${user.id}`);
    return { ok: true };
  } catch {
    return { ok: false, error: "Erreur serveur." };
  }
}
