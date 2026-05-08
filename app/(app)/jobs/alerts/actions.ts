"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";

const savedSearchSchema = z.object({
  label: z.string().trim().min(1).max(80),
  query: z.string().trim().max(120).optional().transform(emptyToNull),
  category: z.string().trim().max(60).optional().transform(emptyToNull),
  job_type: z.string().trim().max(60).optional().transform(emptyToNull),
  work_mode: z.string().trim().max(60).optional().transform(emptyToNull),
  experience_level: z.string().trim().max(60).optional().transform(emptyToNull),
  location: z.string().trim().max(120).optional().transform(emptyToNull),
});

function emptyToNull(v: string | undefined) {
  if (!v || v.length === 0) return null;
  return v;
}

export type ActionResult =
  | { ok: true }
  | { ok: false; error: string };

export async function createSavedSearch(formData: FormData): Promise<ActionResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Connexion requise." };

  const parsed = savedSearchSchema.safeParse({
    label: formData.get("label"),
    query: formData.get("query") ?? "",
    category: formData.get("category") ?? "",
    job_type: formData.get("job_type") ?? "",
    work_mode: formData.get("work_mode") ?? "",
    experience_level: formData.get("experience_level") ?? "",
    location: formData.get("location") ?? "",
  });

  if (!parsed.success) {
    return { ok: false, error: "Donne un nom à ton alerte (1–80 caractères)." };
  }

  const { error } = await supabase.from("job_saved_searches").insert({
    user_id: user.id,
    label: parsed.data.label,
    query: parsed.data.query ?? null,
    category: parsed.data.category ?? null,
    job_type: parsed.data.job_type ?? null,
    work_mode: parsed.data.work_mode ?? null,
    experience_level: parsed.data.experience_level ?? null,
    location: parsed.data.location ?? null,
  });

  if (error) return { ok: false, error: "Création impossible." };

  revalidatePath("/jobs/alerts");
  return { ok: true };
}

export async function toggleSearchAlerts(
  searchId: string,
  enabled: boolean,
): Promise<ActionResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Connexion requise." };

  const { error } = await supabase
    .from("job_saved_searches")
    .update({ alerts_enabled: enabled })
    .eq("id", searchId)
    .eq("user_id", user.id);

  if (error) return { ok: false, error: "Mise à jour impossible." };
  revalidatePath("/jobs/alerts");
  return { ok: true };
}

export async function deleteSavedSearch(searchId: string): Promise<ActionResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Connexion requise." };

  const { error } = await supabase
    .from("job_saved_searches")
    .delete()
    .eq("id", searchId)
    .eq("user_id", user.id);

  if (error) return { ok: false, error: "Suppression impossible." };
  revalidatePath("/jobs/alerts");
  return { ok: true };
}
