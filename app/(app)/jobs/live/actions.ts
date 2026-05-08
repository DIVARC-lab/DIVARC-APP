"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";

const createSchema = z.object({
  title: z.string().trim().min(5).max(160),
  description: z
    .string()
    .trim()
    .max(4000)
    .nullable()
    .optional()
    .transform((v) => (v && v.length > 0 ? v : null)),
  scheduled_at: z.string().refine((v) => !Number.isNaN(Date.parse(v)), {
    message: "Date invalide.",
  }),
  duration_min: z.coerce.number().int().min(10).max(480),
  job_id: z
    .string()
    .uuid()
    .nullable()
    .optional()
    .or(z.literal("").transform(() => null)),
});

export type ActionResult =
  | { ok: true }
  | { ok: false; error: string };

export async function createLiveSession(
  formData: FormData,
): Promise<ActionResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Connexion requise." };

  const parsed = createSchema.safeParse({
    title: formData.get("title"),
    description: (formData.get("description") as string) || null,
    scheduled_at: formData.get("scheduled_at"),
    duration_min: formData.get("duration_min") ?? 60,
    job_id: (formData.get("job_id") as string) || null,
  });
  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.issues[0]?.message ?? "Données invalides.",
    };
  }

  const { data, error } = await supabase
    .from("live_sessions")
    .insert({
      host_id: user.id,
      title: parsed.data.title,
      description: parsed.data.description,
      scheduled_at: new Date(parsed.data.scheduled_at).toISOString(),
      duration_min: parsed.data.duration_min,
      job_id: parsed.data.job_id ?? null,
    })
    .select("id")
    .single();
  if (error || !data) return { ok: false, error: "Création impossible." };

  revalidatePath("/jobs/live");
  redirect(`/jobs/live/${data.id}`);
}

export async function joinLiveSession(
  sessionId: string,
): Promise<ActionResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Connexion requise." };

  const { error } = await supabase
    .from("live_session_attendees")
    .insert({ session_id: sessionId, user_id: user.id });
  if (error && !/duplicate|unique/i.test(error.message)) {
    return { ok: false, error: "Inscription impossible." };
  }
  revalidatePath(`/jobs/live/${sessionId}`);
  return { ok: true };
}

export async function leaveLiveSession(
  sessionId: string,
): Promise<ActionResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Connexion requise." };

  const { error } = await supabase
    .from("live_session_attendees")
    .delete()
    .eq("session_id", sessionId)
    .eq("user_id", user.id);
  if (error) return { ok: false, error: "Désinscription impossible." };
  revalidatePath(`/jobs/live/${sessionId}`);
  return { ok: true };
}

export async function startLiveSession(
  sessionId: string,
): Promise<ActionResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Connexion requise." };

  const { error } = await supabase
    .from("live_sessions")
    .update({ status: "live", started_at: new Date().toISOString() })
    .eq("id", sessionId)
    .eq("host_id", user.id);
  if (error) return { ok: false, error: "Lancement impossible." };
  revalidatePath(`/jobs/live/${sessionId}`);
  return { ok: true };
}

export async function endLiveSession(
  sessionId: string,
): Promise<ActionResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Connexion requise." };

  const { error } = await supabase
    .from("live_sessions")
    .update({ status: "ended", ended_at: new Date().toISOString() })
    .eq("id", sessionId)
    .eq("host_id", user.id);
  if (error) return { ok: false, error: "Fin impossible." };
  revalidatePath(`/jobs/live/${sessionId}`);
  return { ok: true };
}
