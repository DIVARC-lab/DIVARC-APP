"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";

const referralSchema = z.object({
  job_id: z.string().uuid("Job invalide."),
  referred_id: z.string().uuid("Ami invalide."),
  message: z
    .string()
    .trim()
    .max(1000)
    .optional()
    .transform((v) => (v && v.length > 0 ? v : null)),
});

export type ReferralResult =
  | { ok: true }
  | { ok: false; error: string };

export async function referAFriend(formData: FormData): Promise<ReferralResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Connexion requise." };

  const parsed = referralSchema.safeParse({
    job_id: formData.get("job_id"),
    referred_id: formData.get("referred_id"),
    message: formData.get("message") ?? "",
  });

  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.issues[0]?.message ?? "Données invalides.",
    };
  }

  const { error } = await supabase.from("job_referrals").insert({
    job_id: parsed.data.job_id,
    referrer_id: user.id,
    referred_id: parsed.data.referred_id,
    message: parsed.data.message ?? null,
  });

  if (error) {
    if (/duplicate|unique/i.test(error.message)) {
      return { ok: false, error: "Tu as déjà coopté cette personne pour ce poste." };
    }
    if (/are_friends|policy/i.test(error.message)) {
      return {
        ok: false,
        error: "Tu dois être ami avec cette personne pour la coopter.",
      };
    }
    return { ok: false, error: "Cooptation impossible." };
  }

  revalidatePath(`/jobs/${parsed.data.job_id}`);
  return { ok: true };
}

export async function deleteReferral(
  referralId: string,
): Promise<ReferralResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Connexion requise." };

  const { error } = await supabase
    .from("job_referrals")
    .delete()
    .eq("id", referralId)
    .eq("referrer_id", user.id);

  if (error) return { ok: false, error: "Suppression impossible." };
  return { ok: true };
}
