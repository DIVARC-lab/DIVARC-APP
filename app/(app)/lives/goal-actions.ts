"use server";

/* Étape 17 — Server Actions Goals & Milestones.
 *
 * createLiveGoal : host définit un objectif (1 actif par session).
 *  - L'index unique partial garantit qu'il n'y a qu'un goal active à
 *    la fois ; on clôt l'éventuel précédent avant insert.
 *
 * endLiveGoal : host clôt manuellement (status='ended'). */

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

/* eslint-disable @typescript-eslint/no-explicit-any */
type SupabaseAny = any;

const createSchema = z.object({
  sessionId: z.string().uuid(),
  goalType: z.union([
    z.literal("revenue"),
    z.literal("viewers"),
    z.literal("gifts"),
  ]),
  targetValue: z.number().int().min(1).max(10_000_000),
  label: z.string().trim().min(1).max(80),
});

export async function createLiveGoal(args: z.infer<typeof createSchema>) {
  const parsed = createSchema.safeParse(args);
  if (!parsed.success) {
    return {
      ok: false as const,
      error: parsed.error.issues[0]?.message ?? "Invalide",
    };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false as const, error: "Non authentifié." };

  /* Vérifie que l'user est bien host de la session. */
  const { data: room } = await (supabase as SupabaseAny)
    .from("circle_live_rooms")
    .select("id, host_id, status")
    .eq("id", parsed.data.sessionId)
    .maybeSingle();
  if (!room) {
    return { ok: false as const, error: "Live introuvable." };
  }
  const r = room as { id: string; host_id: string; status: string };
  if (r.host_id !== user.id) {
    return {
      ok: false as const,
      error: "Seul le host peut définir un objectif.",
    };
  }

  /* Clôt le goal actif précédent (s'il existe). */
  await (supabase as SupabaseAny)
    .from("live_goals")
    .update({ status: "ended", ended_at: new Date().toISOString() })
    .eq("session_id", r.id)
    .eq("status", "active");

  const { data: created, error } = await (supabase as SupabaseAny)
    .from("live_goals")
    .insert({
      session_id: r.id,
      host_id: user.id,
      goal_type: parsed.data.goalType,
      target_value: parsed.data.targetValue,
      label: parsed.data.label,
      status: "active",
    })
    .select("id")
    .maybeSingle();

  if (error) {
    return {
      ok: false as const,
      error: `Création échouée : ${error.message}`,
    };
  }

  revalidatePath(`/lives/${r.id}`);
  revalidatePath(`/lives/${r.id}/studio`);
  return { ok: true as const, id: (created as { id: string }).id };
}

const endSchema = z.object({
  goalId: z.string().uuid(),
});

export async function endLiveGoal(args: z.infer<typeof endSchema>) {
  const parsed = endSchema.safeParse(args);
  if (!parsed.success) {
    return {
      ok: false as const,
      error: parsed.error.issues[0]?.message ?? "Invalide",
    };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false as const, error: "Non authentifié." };

  const { error } = await (supabase as SupabaseAny)
    .from("live_goals")
    .update({ status: "ended", ended_at: new Date().toISOString() })
    .eq("id", parsed.data.goalId)
    .eq("host_id", user.id);

  if (error) {
    return {
      ok: false as const,
      error: `Clôture échouée : ${error.message}`,
    };
  }

  return { ok: true as const };
}
