"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export type FollowCompanyResult =
  | { ok: true; following: boolean }
  | { ok: false; error: string };

export async function toggleFollowCompany(
  companyId: string,
): Promise<FollowCompanyResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { ok: false, error: "Tu dois être connecté." };
  }

  /* Toggle : delete si déjà follow, sinon insert. */
  const { data: existing } = await supabase
    .from("company_followers")
    .select("user_id")
    .eq("company_id", companyId)
    .eq("user_id", user.id)
    .maybeSingle();

  if (existing) {
    const { error } = await supabase
      .from("company_followers")
      .delete()
      .eq("company_id", companyId)
      .eq("user_id", user.id);
    if (error) return { ok: false, error: "Désabonnement échoué." };
    revalidatePath(`/c/[slug]`, "page");
    return { ok: true, following: false };
  }

  const { error } = await supabase
    .from("company_followers")
    .insert({ company_id: companyId, user_id: user.id });
  if (error) return { ok: false, error: "Abonnement échoué." };
  revalidatePath(`/c/[slug]`, "page");
  return { ok: true, following: true };
}
