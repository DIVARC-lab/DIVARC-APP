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

/* === ModeratorBot install (rules-based V1) ============================ */

const installModeratorSchema = z.object({
  circleId: z.string().uuid(),
  circleSlug: z.string().min(1),
  blacklist: z.array(z.string().min(1).max(60)).max(50).default([]),
  maxUrls: z.number().int().min(0).max(20).optional(),
  capsThreshold: z.number().int().min(0).max(100).optional(),
  autoAction: z.enum(["hide_content", "flag_for_review"]).default("hide_content"),
  whitelistRoles: z
    .array(z.enum(["owner", "admin", "moderator", "mod"]))
    .default(["owner", "admin", "moderator", "mod"]),
});

export async function installModeratorBot(
  args: z.infer<typeof installModeratorSchema>,
) {
  const parsed = installModeratorSchema.safeParse(args);
  if (!parsed.success) {
    return {
      ok: false as const,
      error: parsed.error.issues[0]?.message ?? "Invalid",
    };
  }
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false as const, error: "Non authentifié" };

  /* Construit les conditions selon ce qui est paramétré.
     min_urls = "≥ N URLs détectées" → trigger fire. On veut fire
     quand le user dépasse maxUrls, donc min_urls = maxUrls+1. */
  const conditions: Record<string, unknown> = {
    exclude_roles: parsed.data.whitelistRoles,
  };
  if (parsed.data.blacklist.length > 0) {
    conditions.keywords_any = parsed.data.blacklist;
  }
  if (typeof parsed.data.maxUrls === "number" && parsed.data.maxUrls >= 0) {
    conditions.min_urls = parsed.data.maxUrls + 1;
  }
  if (
    typeof parsed.data.capsThreshold === "number" &&
    parsed.data.capsThreshold > 0
  ) {
    conditions.caps_threshold = parsed.data.capsThreshold;
  }

  /* Création atomique bot + trigger + action. */
  const { data: bot, error: botError } = await (supabase as SupabaseAny)
    .from("circle_bots")
    .insert({
      circle_id: parsed.data.circleId,
      bot_type: "moderation",
      name: "ModérateurBot",
      avatar_url: null,
      description:
        "Détecte automatiquement les messages contenant des mots-clés blacklistés, trop d'URLs, ou en CAPS LOCK.",
      config: {
        blacklist: parsed.data.blacklist,
        max_urls: parsed.data.maxUrls ?? null,
        caps_threshold: parsed.data.capsThreshold ?? null,
        auto_action: parsed.data.autoAction,
        whitelist_roles: parsed.data.whitelistRoles,
      },
      is_active: true,
      created_by: user.id,
    })
    .select("id")
    .single();

  if (botError || !bot) {
    return { ok: false as const, error: botError?.message ?? "Bot insert failed" };
  }

  /* Trigger : chat_message avec les conditions. */
  const { error: triggerError } = await (supabase as SupabaseAny)
    .from("circle_bot_triggers")
    .insert({
      bot_id: bot.id,
      trigger_kind: "event",
      trigger_event: "chat_message",
      conditions,
    });

  if (triggerError) {
    await (supabase as SupabaseAny).from("circle_bots").delete().eq("id", bot.id);
    return { ok: false as const, error: `Trigger : ${triggerError.message}` };
  }

  /* Action : hide_content ou flag_for_review selon config. */
  const { error: actionError } = await (supabase as SupabaseAny)
    .from("circle_bot_actions")
    .insert({
      bot_id: bot.id,
      action_kind: parsed.data.autoAction,
      position: 0,
      params: {
        reason: "Modération automatique : règle déclenchée",
      },
    });

  if (actionError) {
    await (supabase as SupabaseAny).from("circle_bots").delete().eq("id", bot.id);
    return { ok: false as const, error: `Action : ${actionError.message}` };
  }

  revalidatePath(`/circles/${parsed.data.circleSlug}/bots`);
  return { ok: true as const, botId: bot.id };
}

/* === ReminderBot install (cron-based V1) ============================== */

/* Validation cron expression 5-fields (cohérent avec engine
 * cronMatchesMinute). Accepte uniquement chiffres et '*'. */
function isValidCronExpression(expr: string): boolean {
  const parts = expr.trim().split(/\s+/);
  if (parts.length !== 5) return false;
  return parts.every((p) => p === "*" || /^\d+$/.test(p));
}

const installReminderSchema = z.object({
  circleId: z.string().uuid(),
  circleSlug: z.string().min(1),
  template: z
    .string()
    .min(5)
    .max(2000)
    .default("Bonjour ! Petit rappel : c'est le moment de la semaine 📅"),
  /* Cron expression UTC (5 fields : minute hour dom month dow).
     Validation custom car z.string().regex() est moins explicite. */
  schedule: z.string().min(5).max(80),
  /* Nom custom pour différencier plusieurs ReminderBots (ex:
     "Standup Lundi", "Feedback Vendredi"). */
  name: z.string().min(2).max(80).default("RappelBot"),
});

export async function installReminderBot(
  args: z.infer<typeof installReminderSchema>,
) {
  const parsed = installReminderSchema.safeParse(args);
  if (!parsed.success) {
    return {
      ok: false as const,
      error: parsed.error.issues[0]?.message ?? "Invalid",
    };
  }
  if (!isValidCronExpression(parsed.data.schedule)) {
    return {
      ok: false as const,
      error:
        "Cron invalide. Format 5 champs UTC, chiffres ou '*'. Ex: '0 9 * * 1' = lundi 9h.",
    };
  }
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false as const, error: "Non authentifié" };

  const { data: bot, error: botError } = await (supabase as SupabaseAny)
    .from("circle_bots")
    .insert({
      circle_id: parsed.data.circleId,
      bot_type: "reminder",
      name: parsed.data.name,
      avatar_url: null,
      description: `Rappel récurrent (cron : ${parsed.data.schedule} UTC).`,
      config: {
        template: parsed.data.template,
        schedule: parsed.data.schedule,
      },
      is_active: true,
      created_by: user.id,
    })
    .select("id")
    .single();

  if (botError || !bot) {
    return {
      ok: false as const,
      error: botError?.message ?? "Bot insert failed",
    };
  }

  /* Trigger : schedule cron. */
  const { error: triggerError } = await (supabase as SupabaseAny)
    .from("circle_bot_triggers")
    .insert({
      bot_id: bot.id,
      trigger_kind: "schedule",
      trigger_schedule: parsed.data.schedule,
      conditions: {},
    });

  if (triggerError) {
    await (supabase as SupabaseAny).from("circle_bots").delete().eq("id", bot.id);
    return {
      ok: false as const,
      error: `Trigger : ${triggerError.message}`,
    };
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
    return {
      ok: false as const,
      error: `Action : ${actionError.message}`,
    };
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
