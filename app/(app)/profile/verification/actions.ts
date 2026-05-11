"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";

export type SubmitVerifResult =
  | { ok: true }
  | { ok: false; error: string };

const submitSchema = z.object({
  verification_type: z.enum([
    "identity",
    "press",
    "professional",
    "business",
  ]),
  document_id_url: z.string().url().nullable().optional(),
  document_selfie_url: z.string().url().nullable().optional(),
  applicant_notes: z.string().max(1000).nullable().optional(),
});

export async function submitVerification(
  input: z.infer<typeof submitSchema>,
): Promise<SubmitVerifResult> {
  const parsed = submitSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalide." };
  }
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Tu dois être connecté." };

  /* Check si une demande pending existe déjà. */
  const { data: existing } = await supabase
    .from("identity_verification_requests")
    .select("id, status")
    .eq("user_id", user.id)
    .in("status", ["pending", "reviewing"])
    .maybeSingle();

  if (existing) {
    return {
      ok: false,
      error: "Tu as déjà une demande en cours de traitement.",
    };
  }

  const { error } = await supabase
    .from("identity_verification_requests")
    .insert({
      user_id: user.id,
      verification_type: parsed.data.verification_type,
      document_id_url: parsed.data.document_id_url ?? null,
      document_selfie_url: parsed.data.document_selfie_url ?? null,
      applicant_notes: parsed.data.applicant_notes ?? null,
    });

  if (error) {
    console.error("[submitVerification]", error);
    return { ok: false, error: "Soumission échouée." };
  }

  revalidatePath("/profile/verification");
  return { ok: true };
}
