"use server";

/* Server Actions pour la gestion des bots cercles.
 *
 * Toutes les actions exigent le rôle owner/admin du cercle (RLS DB
 * + check côté code pour le feedback immédiat). */

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";

/* eslint-disable @typescript-eslint/no-explicit-any */
type SupabaseAny = any;

const installWelcomeSchema = z.object({
  circleId: z.string().uuid(),
  circleSlug: z.string().min(1),
  template: z
    .string()
    .min(5)
    .max(2000)
    .default("Bienvenue {{name}} dans {{circle}} 👋 N'hésite pas à te présenter !"),
});

export async function installWelcomeBot(
  args: z.infer<typeof installWelcomeSchema>,
) {
  const parsed = installWelcomeSchema.safeParse(args);
  if (!parsed.success) {
    return { ok: false as const, error: parsed.error.issues[0]?.message ?? "Invalid" };
  }
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false as const, error: "Non authentifié" };

  /* Création atomique : bot + trigger + action en cascade.
     Si un step échoue, on cleanup ce qui a été créé. */
  const { data: bot, error: botError } = await (supabase as SupabaseAny)
    .from("circle_bots")
    .insert({
      circle_id: parsed.data.circleId,
      bot_type: "welcome",
      name: "BienvenueBot",
      avatar_url: null,
      description: "Accueille chaque nouveau membre avec un message personnalisé.",
      config: { template: parsed.data.template },
      is_active: true,
      created_by: user.id,
    })
    .select("id")
    .single();

  if (botError || !bot) {
    return { ok: false as const, error: botError?.message ?? "Bot insert failed" };
  }

  /* Trigger : event member_joined, sans condition. */
  const { error: triggerError } = await (supabase as SupabaseAny)
    .from("circle_bot_triggers")
    .insert({
      bot_id: bot.id,
      trigger_kind: "event",
      trigger_event: "member_joined",
      conditions: {},
    });

  if (triggerError) {
    await (supabase as SupabaseAny).from("circle_bots").delete().eq("id", bot.id);
    return { ok: false as const, error: `Trigger : ${triggerError.message}` };
  }

  /* Action : post_chat_message avec template. */
  const { error: actionError } = await (supabase as SupabaseAny)
    .from("circle_bot_actions")
    .insert({
      bot_id: bot.id,
      action_kind: "post_chat_message",
      position: 0,
      params: { template: parsed.data.template },
    });

  if (actionError) {
    await (supabase as SupabaseAny).from("circle_bots").delete().eq("id", bot.id);
    return { ok: false as const, error: `Action : ${actionError.message}` };
  }

  revalidatePath(`/circles/${parsed.data.circleSlug}/bots`);
  return { ok: true as const, botId: bot.id };
}

const toggleSchema = z.object({
  botId: z.string().uuid(),
  circleSlug: z.string().min(1),
  isActive: z.boolean(),
});

export async function toggleCircleBot(args: z.infer<typeof toggleSchema>) {
  const parsed = toggleSchema.safeParse(args);
  if (!parsed.success) {
    return { ok: false as const, error: parsed.error.issues[0]?.message ?? "Invalid" };
  }
  const supabase = await createClient();
  const { error } = await (supabase as SupabaseAny)
    .from("circle_bots")
    .update({ is_active: parsed.data.isActive, updated_at: new Date().toISOString() })
    .eq("id", parsed.data.botId);
  if (error) return { ok: false as const, error: error.message };
  revalidatePath(`/circles/${parsed.data.circleSlug}/bots`);
  return { ok: true as const };
}

const deleteSchema = z.object({
  botId: z.string().uuid(),
  circleSlug: z.string().min(1),
});

export async function deleteCircleBot(args: z.infer<typeof deleteSchema>) {
  const parsed = deleteSchema.safeParse(args);
  if (!parsed.success) {
    return { ok: false as const, error: parsed.error.issues[0]?.message ?? "Invalid" };
  }
  const supabase = await createClient();
  const { error } = await (supabase as SupabaseAny)
    .from("circle_bots")
    .update({ deleted_at: new Date().toISOString(), is_active: false })
    .eq("id", parsed.data.botId);
  if (error) return { ok: false as const, error: error.message };
  revalidatePath(`/circles/${parsed.data.circleSlug}/bots`);
  return { ok: true as const };
}

const updateConfigSchema = z.object({
  botId: z.string().uuid(),
  circleSlug: z.string().min(1),
  config: z.record(z.string(), z.unknown()),
});

export async function updateCircleBotConfig(args: z.infer<typeof updateConfigSchema>) {
  const parsed = updateConfigSchema.safeParse(args);
  if (!parsed.success) {
    return { ok: false as const, error: parsed.error.issues[0]?.message ?? "Invalid" };
  }
  const supabase = await createClient();

  /* Update bot.config + propagate template au premier action
     post_chat_message si applicable (pour que le runtime utilise
     le nouveau template). */
  const { error: botError } = await (supabase as SupabaseAny)
    .from("circle_bots")
    .update({ config: parsed.data.config, updated_at: new Date().toISOString() })
    .eq("id", parsed.data.botId);
  if (botError) return { ok: false as const, error: botError.message };

  if (typeof parsed.data.config.template === "string") {
    await (supabase as SupabaseAny)
      .from("circle_bot_actions")
      .update({ params: { template: parsed.data.config.template } })
      .eq("bot_id", parsed.data.botId)
      .eq("action_kind", "post_chat_message");
  }

  revalidatePath(`/circles/${parsed.data.circleSlug}/bots`);
  return { ok: true as const };
}
