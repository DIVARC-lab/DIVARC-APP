"use server";

/* Étape 11 — Server Actions polls live.
 *
 * createLivePoll : host crée un sondage (host check via RLS policy).
 * closeLivePoll : host ferme un sondage actif.
 * voteLivePoll : viewer authentifié vote (1 vote par user × poll). */

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";

/* eslint-disable @typescript-eslint/no-explicit-any */
type SupabaseAny = any;

const createSchema = z.object({
  sessionId: z.string().uuid(),
  question: z.string().trim().min(3).max(280),
  options: z
    .array(z.string().trim().min(1).max(80))
    .min(2)
    .max(6),
  durationSeconds: z.number().int().min(15).max(600).default(60),
});

const closeSchema = z.object({
  pollId: z.string().uuid(),
});

const voteSchema = z.object({
  pollId: z.string().uuid(),
  optionIndex: z.number().int().min(0).max(5),
});

export async function createLivePoll(args: z.infer<typeof createSchema>) {
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

  const endsAt = new Date(
    Date.now() + parsed.data.durationSeconds * 1000,
  ).toISOString();

  /* eslint-disable-next-line @typescript-eslint/no-explicit-any */
  const { data, error } = await (supabase as any)
    .from("live_polls")
    .insert({
      session_id: parsed.data.sessionId,
      host_id: user.id,
      question: parsed.data.question,
      options: parsed.data.options,
      ends_at: endsAt,
    })
    .select("id")
    .single();

  if (error || !data) {
    return {
      ok: false as const,
      error: error?.message ?? "Création impossible.",
    };
  }

  revalidatePath(`/lives/${parsed.data.sessionId}`);
  revalidatePath(`/lives/${parsed.data.sessionId}/studio`);
  return { ok: true as const, pollId: data.id as string };
}

export async function closeLivePoll(args: z.infer<typeof closeSchema>) {
  const parsed = closeSchema.safeParse(args);
  if (!parsed.success) return { ok: false as const, error: "Invalide" };
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false as const, error: "Non authentifié." };

  /* eslint-disable-next-line @typescript-eslint/no-explicit-any */
  const { error } = await (supabase as any)
    .from("live_polls")
    .update({ is_closed: true, ends_at: new Date().toISOString() })
    .eq("id", parsed.data.pollId)
    .eq("host_id", user.id);

  if (error) return { ok: false as const, error: error.message };
  return { ok: true as const };
}

export async function voteLivePoll(args: z.infer<typeof voteSchema>) {
  const parsed = voteSchema.safeParse(args);
  if (!parsed.success) return { ok: false as const, error: "Invalide" };
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false as const, error: "Non authentifié." };

  /* On vérifie d'abord que le poll est ouvert et pas expiré. */
  /* eslint-disable-next-line @typescript-eslint/no-explicit-any */
  const { data: poll } = await (supabase as any)
    .from("live_polls")
    .select("is_closed, ends_at, options")
    .eq("id", parsed.data.pollId)
    .maybeSingle();
  if (!poll) return { ok: false as const, error: "Sondage introuvable." };

  const p = poll as {
    is_closed: boolean;
    ends_at: string;
    options: string[];
  };
  if (p.is_closed || new Date(p.ends_at).getTime() < Date.now()) {
    return { ok: false as const, error: "Sondage terminé." };
  }
  if (parsed.data.optionIndex >= p.options.length) {
    return { ok: false as const, error: "Option invalide." };
  }

  /* eslint-disable-next-line @typescript-eslint/no-explicit-any */
  const { error } = await (supabase as any)
    .from("live_poll_votes")
    .upsert(
      {
        poll_id: parsed.data.pollId,
        user_id: user.id,
        option_index: parsed.data.optionIndex,
      },
      { onConflict: "poll_id,user_id" },
    );

  if (error) return { ok: false as const, error: error.message };
  return { ok: true as const };
}
