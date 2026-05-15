"use server";

/* Server Actions chat de groupe cercle.
 *
 * Toutes les actions reposent sur RLS Supabase (cf. migration 0131) :
 *  - INSERT : membres actifs uniquement
 *  - UPDATE/DELETE : own messages
 *  - SELECT : membres actifs
 *
 * Les mentions @username sont extraites du body avant insert pour
 * que le trigger DB puisse créer les notifs.
 *
 * Note : les types Supabase générés ne contiennent pas encore les
 * tables `circle_chat_messages` et `circle_chat_reactions` (regen
 * manuelle pending). On caste `supabase` en `SupabaseAny` pour ces
 * accès — la RLS sécurise déjà au runtime. */

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import type { CircleChatMessage } from "@/lib/database.types";

/* eslint-disable @typescript-eslint/no-explicit-any */
type SupabaseAny = any;

const MENTION_REGEX = /@([a-zA-Z0-9_]{3,30})/g;

/* Extrait les usernames mentionnés, résout en user_id via profiles. */
async function resolveMentions(
  supabase: Awaited<ReturnType<typeof createClient>>,
  body: string,
): Promise<string[]> {
  const usernames = new Set<string>();
  let match: RegExpExecArray | null;
  /* Reset regex.lastIndex pour les calls multiples. */
  const rx = new RegExp(MENTION_REGEX.source, MENTION_REGEX.flags);
  while ((match = rx.exec(body)) !== null) {
    const u = match[1]?.toLowerCase();
    if (u) usernames.add(u);
  }
  if (usernames.size === 0) return [];
  const { data } = await supabase
    .from("profiles")
    .select("id, username")
    .in("username", Array.from(usernames));
  return ((data ?? []) as Array<{ id: string; username: string }>).map((p) => p.id);
}

const sendSchema = z.object({
  circleId: z.string().uuid(),
  circleSlug: z.string().min(1),
  body: z.string().min(1).max(4000),
  parentMessageId: z.string().uuid().nullable().optional(),
});

export async function sendCircleChatMessage(
  args: z.infer<typeof sendSchema>,
): Promise<{ ok: true; message: CircleChatMessage } | { ok: false; error: string }> {
  const parsed = sendSchema.safeParse(args);
  if (!parsed.success) return { ok: false, error: "Invalid args" };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Not authenticated" };

  const mentions = await resolveMentions(supabase, parsed.data.body);

  const { data, error } = await (supabase as SupabaseAny)
    .from("circle_chat_messages")
    .insert({
      circle_id: parsed.data.circleId,
      author_id: user.id,
      body: parsed.data.body,
      parent_message_id: parsed.data.parentMessageId ?? null,
      mentions,
    })
    .select("*")
    .single();

  if (error || !data) {
    return { ok: false, error: error?.message ?? "Insert failed" };
  }

  revalidatePath(`/circles/${parsed.data.circleSlug}/chat`);
  return { ok: true, message: data as CircleChatMessage };
}

const editSchema = z.object({
  messageId: z.string().uuid(),
  circleSlug: z.string().min(1),
  body: z.string().min(1).max(4000),
});

export async function editCircleChatMessage(
  args: z.infer<typeof editSchema>,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const parsed = editSchema.safeParse(args);
  if (!parsed.success) return { ok: false, error: "Invalid args" };

  const supabase = await createClient();
  const { error } = await (supabase as SupabaseAny)
    .from("circle_chat_messages")
    .update({
      body: parsed.data.body,
      edited_at: new Date().toISOString(),
    })
    .eq("id", parsed.data.messageId);

  if (error) return { ok: false, error: error.message };
  revalidatePath(`/circles/${parsed.data.circleSlug}/chat`);
  return { ok: true };
}

const deleteSchema = z.object({
  messageId: z.string().uuid(),
  circleSlug: z.string().min(1),
});

export async function deleteCircleChatMessage(
  args: z.infer<typeof deleteSchema>,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const parsed = deleteSchema.safeParse(args);
  if (!parsed.success) return { ok: false, error: "Invalid args" };

  const supabase = await createClient();
  /* Soft delete via UPDATE deleted_at (RLS UPDATE own seulement). */
  const { error } = await (supabase as SupabaseAny)
    .from("circle_chat_messages")
    .update({ deleted_at: new Date().toISOString() })
    .eq("id", parsed.data.messageId);

  if (error) return { ok: false, error: error.message };
  revalidatePath(`/circles/${parsed.data.circleSlug}/chat`);
  return { ok: true };
}

const reactSchema = z.object({
  messageId: z.string().uuid(),
  emoji: z.string().min(1).max(8),
});

export async function toggleCircleChatReaction(
  args: z.infer<typeof reactSchema>,
): Promise<{ ok: true; toggled: "added" | "removed" } | { ok: false; error: string }> {
  const parsed = reactSchema.safeParse(args);
  if (!parsed.success) return { ok: false, error: "Invalid args" };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Not authenticated" };

  /* Check existing → toggle (remove si présent, sinon insert). */
  const { data: existing } = await (supabase as SupabaseAny)
    .from("circle_chat_reactions")
    .select("message_id")
    .eq("message_id", parsed.data.messageId)
    .eq("user_id", user.id)
    .eq("emoji", parsed.data.emoji)
    .maybeSingle();

  if (existing) {
    const { error } = await (supabase as SupabaseAny)
      .from("circle_chat_reactions")
      .delete()
      .eq("message_id", parsed.data.messageId)
      .eq("user_id", user.id)
      .eq("emoji", parsed.data.emoji);
    if (error) return { ok: false, error: error.message };
    return { ok: true, toggled: "removed" };
  }

  const { error } = await (supabase as SupabaseAny)
    .from("circle_chat_reactions")
    .insert({
      message_id: parsed.data.messageId,
      user_id: user.id,
      emoji: parsed.data.emoji,
    });
  if (error) return { ok: false, error: error.message };
  return { ok: true, toggled: "added" };
}

export async function markCircleChatRead(
  circleId: string,
): Promise<{ ok: boolean }> {
  const supabase = await createClient();
  const { error } = await supabase.rpc("mark_circle_chat_read" as never, {
    p_circle_id: circleId,
  } as never);
  return { ok: !error };
}
