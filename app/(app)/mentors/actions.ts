"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";

const offerSchema = z.object({
  bio: z.string().trim().min(10).max(4000),
  topics: z
    .string()
    .trim()
    .max(400)
    .transform((v) =>
      v
        .split(",")
        .map((t) => t.trim().toLowerCase())
        .filter((t) => t.length > 0 && t.length <= 40)
        .slice(0, 12),
    ),
  hourly_rate: z.coerce.number().min(0).optional().nullable(),
  rate_currency: z
    .enum(["EUR", "XAF", "XOF", "MAD", "TND", "DZD", "CAD", "CHF"])
    .nullable()
    .optional()
    .or(z.literal("").transform(() => null)),
  languages: z
    .string()
    .trim()
    .transform((v) =>
      v
        .split(",")
        .map((t) => t.trim().toLowerCase())
        .filter((t) => t.length > 0)
        .slice(0, 6),
    )
    .pipe(z.array(z.string()).min(1).max(6)),
  is_available: z.boolean(),
});

export type ActionResult =
  | { ok: true }
  | { ok: false; error: string };

export async function upsertMentorOffer(
  formData: FormData,
): Promise<ActionResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Connexion requise." };

  const parsed = offerSchema.safeParse({
    bio: formData.get("bio"),
    topics: formData.get("topics") ?? "",
    hourly_rate: formData.get("hourly_rate") || null,
    rate_currency: formData.get("rate_currency") || "",
    languages: formData.get("languages") ?? "fr",
    is_available: formData.get("is_available") === "on",
  });

  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.issues[0]?.message ?? "Données invalides.",
    };
  }

  const { error } = await supabase.from("mentor_offers").upsert(
    {
      user_id: user.id,
      bio: parsed.data.bio,
      topics: parsed.data.topics,
      hourly_rate: parsed.data.hourly_rate ?? null,
      rate_currency: parsed.data.rate_currency ?? null,
      languages: parsed.data.languages,
      is_available: parsed.data.is_available,
    },
    { onConflict: "user_id" },
  );

  if (error) return { ok: false, error: "Enregistrement impossible." };
  revalidatePath("/mentors");
  return { ok: true };
}

const bookingSchema = z.object({
  mentor_id: z.string().uuid(),
  topic: z.string().trim().min(1).max(200),
  message: z.string().trim().max(2000).nullable().optional(),
  scheduled_at: z.string().nullable().optional(),
  duration_min: z.coerce.number().int().min(15).max(240),
});

export async function bookMentorSession(
  formData: FormData,
): Promise<ActionResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Connexion requise." };

  const parsed = bookingSchema.safeParse({
    mentor_id: formData.get("mentor_id"),
    topic: formData.get("topic"),
    message: (formData.get("message") as string) || null,
    scheduled_at: (formData.get("scheduled_at") as string) || null,
    duration_min: formData.get("duration_min") || 30,
  });

  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.issues[0]?.message ?? "Données invalides.",
    };
  }

  const { error } = await supabase.from("mentor_sessions").insert({
    mentor_id: parsed.data.mentor_id,
    mentee_id: user.id,
    topic: parsed.data.topic,
    message: parsed.data.message ?? null,
    scheduled_at: parsed.data.scheduled_at ?? null,
    duration_min: parsed.data.duration_min,
  });

  if (error) return { ok: false, error: "Réservation impossible." };
  revalidatePath("/mentors");
  return { ok: true };
}

export async function respondMentorSession(
  sessionId: string,
  status: "confirmed" | "declined" | "completed" | "cancelled",
): Promise<ActionResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Connexion requise." };

  const { error } = await supabase
    .from("mentor_sessions")
    .update({ status, responded_at: new Date().toISOString() })
    .eq("id", sessionId)
    .or(`mentor_id.eq.${user.id},mentee_id.eq.${user.id}`);
  if (error) return { ok: false, error: "Mise à jour impossible." };

  revalidatePath("/mentors");
  return { ok: true };
}
