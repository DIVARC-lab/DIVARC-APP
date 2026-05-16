"use server";

/* Server Actions pour les sondages in-chat.
 *
 *   - createMessagePoll : crée message type=poll + message_polls
 *   - voteMessagePoll : toggle vote (RPC SECURITY DEFINER)
 *   - closeMessagePoll : ferme manuellement avant expiration
 */

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

/* eslint-disable @typescript-eslint/no-explicit-any */
type SupabaseAny = any;

const createPollSchema = z.object({
  conversationId: z.string().uuid(),
  question: z.string().trim().min(3).max(280),
  options: z.array(z.string().trim().min(1).max(80)).min(2).max(10),
  isMultipleChoice: z.boolean().default(false),
  isAnonymous: z.boolean().default(false),
  closesAt: z.string().datetime().optional(),
});

export async function createMessagePoll(
  args: z.infer<typeof createPollSchema>,
) {
  const parsed = createPollSchema.safeParse(args);
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

  /* INSERT message type=poll. */
  const { data: msg, error: msgErr } = await (supabase as SupabaseAny)
    .from("messages")
    .insert({
      conversation_id: parsed.data.conversationId,
      sender_id: user.id,
      type: "poll",
      body: parsed.data.question,
    })
    .select("id")
    .maybeSingle();
  if (msgErr || !msg) {
    return {
      ok: false as const,
      error: `Création message échouée : ${msgErr?.message ?? "inconnue"}`,
    };
  }

  /* INSERT message_polls avec options uniques (id court genre o1, o2...). */
  const optionsWithIds = parsed.data.options.map((text, i) => ({
    id: `o${i + 1}`,
    text,
  }));

  const { error: pollErr } = await (supabase as SupabaseAny)
    .from("message_polls")
    .insert({
      message_id: (msg as { id: string }).id,
      question: parsed.data.question,
      options: optionsWithIds,
      is_multiple_choice: parsed.data.isMultipleChoice,
      is_anonymous: parsed.data.isAnonymous,
      closes_at: parsed.data.closesAt ?? null,
    });

  if (pollErr) {
    return {
      ok: false as const,
      error: `Création sondage échouée : ${pollErr.message}`,
    };
  }

  revalidatePath(`/messages/${parsed.data.conversationId}`);
  return { ok: true as const, messageId: (msg as { id: string }).id };
}

const voteSchema = z.object({
  pollId: z.string().uuid(),
  optionId: z.string().min(1).max(20),
});

export async function voteMessagePoll(args: z.infer<typeof voteSchema>) {
  const parsed = voteSchema.safeParse(args);
  if (!parsed.success) return { ok: false as const, error: "Invalide" };

  const supabase = await createClient();
  const { error } = await (supabase as SupabaseAny).rpc("vote_message_poll", {
    p_poll_id: parsed.data.pollId,
    p_option_id: parsed.data.optionId,
  });

  if (error) {
    const msg = String(error.message ?? "").toLowerCase();
    if (msg.includes("poll_closed")) {
      return { ok: false as const, error: "Sondage clôturé." };
    }
    return { ok: false as const, error: error.message };
  }

  return { ok: true as const };
}

const closeSchema = z.object({ pollId: z.string().uuid() });

export async function closeMessagePoll(args: z.infer<typeof closeSchema>) {
  const parsed = closeSchema.safeParse(args);
  if (!parsed.success) return { ok: false as const, error: "Invalide" };

  const supabase = await createClient();
  const { error } = await (supabase as SupabaseAny)
    .from("message_polls")
    .update({ closed_at: new Date().toISOString() })
    .eq("id", parsed.data.pollId);

  if (error) return { ok: false as const, error: error.message };
  return { ok: true as const };
}
