"use server";

/* Chantier Live Streaming DIVARC — Étape 3.
 *
 * Server Actions pour les lives généralisés (publics ou cercle).
 * Étend l'infra Sprint E (live-actions.ts dans circles/[slug]) avec
 * le support des nouveaux champs migration 0155 :
 *  - visibility (public/unlisted/friends_only/circle/subscribers_only/private)
 *  - category, tags, language, thumbnail_url, age_restriction
 *  - chat config (followers_only, subscribers_only, slow_mode, emote_only,
 *    auto_mod_level)
 *  - monétisation (super_chat, gifts, tips toggles)
 *  - VOD (is_recording)
 *
 * RLS s'applique côté DB. Permissions :
 *  - createLiveStreamSession : tout user authentifié (TODO V2 : check
 *    Stripe Connect si super_chat/gifts/tips activés)
 *  - startLiveStreamSession : host_id uniquement
 *  - endLiveStreamSession : host_id ou owner cercle si circle_id défini
 *  - updateLiveStreamSettings : host_id uniquement
 */

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";

/* eslint-disable @typescript-eslint/no-explicit-any */
type SupabaseAny = any;

const LIVE_CATEGORIES = [
  "just_chatting", "gaming", "music", "art", "cooking", "sports",
  "education", "news", "tech", "business", "lifestyle", "beauty",
  "fashion", "travel", "fitness", "asmr", "podcast", "interview",
  "event", "q_and_a",
] as const;

const LIVE_VISIBILITIES = [
  "public", "unlisted", "friends_only", "circle",
  "subscribers_only", "private",
] as const;

const createSchema = z.object({
  title: z.string().trim().min(3).max(140),
  description: z.string().trim().max(2000).optional().transform((v) =>
    v && v.length > 0 ? v : null,
  ),
  kind: z.enum(["audio", "video"]),
  category: z.enum(LIVE_CATEGORIES).optional(),
  tags: z.array(z.string().trim().min(1).max(30)).max(10).optional().default([]),
  language: z.string().trim().min(2).max(8).default("fr"),
  visibility: z.enum(LIVE_VISIBILITIES).default("public"),
  circle_id: z.string().uuid().nullable().optional(),
  age_restriction: z.enum(["13+", "16+", "18+"]).nullable().optional(),
  thumbnail_url: z.string().url().nullable().optional(),
  scheduled_at: z.string().datetime().nullable().optional(),
  /* Chat config */
  chat_enabled: z.boolean().default(true),
  chat_followers_only: z.boolean().default(false),
  chat_subscribers_only: z.boolean().default(false),
  chat_slow_mode_seconds: z.number().int().min(0).max(600).default(0),
  chat_emote_only: z.boolean().default(false),
  auto_mod_level: z
    .enum(["off", "low", "medium", "high", "strict"])
    .default("medium"),
  /* Monétisation */
  is_super_chat_enabled: z.boolean().default(true),
  is_virtual_gifts_enabled: z.boolean().default(true),
  is_tips_enabled: z.boolean().default(true),
  is_subscribers_only_stream: z.boolean().default(false),
  /* VOD */
  is_recording: z.boolean().default(true),
});

const startSchema = z.object({
  sessionId: z.string().uuid(),
});

const endSchema = z.object({
  sessionId: z.string().uuid(),
});

const updateSchema = z.object({
  sessionId: z.string().uuid(),
  /* On accepte un sous-set des champs modifiables en cours de live. */
  chat_enabled: z.boolean().optional(),
  chat_followers_only: z.boolean().optional(),
  chat_subscribers_only: z.boolean().optional(),
  chat_slow_mode_seconds: z.number().int().min(0).max(600).optional(),
  chat_emote_only: z.boolean().optional(),
  auto_mod_level: z
    .enum(["off", "low", "medium", "high", "strict"])
    .optional(),
  title: z.string().trim().min(3).max(140).optional(),
  description: z.string().trim().max(2000).optional(),
  thumbnail_url: z.string().url().nullable().optional(),
  is_super_chat_enabled: z.boolean().optional(),
  is_virtual_gifts_enabled: z.boolean().optional(),
  is_tips_enabled: z.boolean().optional(),
});

/* ============================================================
 * createLiveStreamSession
 * ============================================================ */
export async function createLiveStreamSession(
  args: z.infer<typeof createSchema>,
) {
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

  /* Si visibility === 'circle', circle_id est obligatoire et l'user
     doit être membre actif du cercle. */
  if (parsed.data.visibility === "circle") {
    if (!parsed.data.circle_id) {
      return {
        ok: false as const,
        error: "Un cercle est requis pour la visibilité « cercle ».",
      };
    }
    const { data: member } = await supabase
      .from("circle_members")
      .select("role, status")
      .eq("circle_id", parsed.data.circle_id)
      .eq("user_id", user.id)
      .maybeSingle();
    if (
      !member ||
      (member as { status?: string }).status !== "active"
    ) {
      return {
        ok: false as const,
        error: "Tu n'es pas membre actif de ce cercle.",
      };
    }
  }

  const status: "scheduled" | "live" = parsed.data.scheduled_at
    ? "scheduled"
    : "live";
  const startedAt =
    status === "live" ? new Date().toISOString() : null;

  const { data, error } = await (supabase as SupabaseAny)
    .from("circle_live_rooms")
    .insert({
      circle_id: parsed.data.circle_id ?? null,
      host_id: user.id,
      kind: parsed.data.kind,
      title: parsed.data.title,
      description: parsed.data.description,
      status,
      scheduled_at: parsed.data.scheduled_at ?? null,
      started_at: startedAt,
      visibility: parsed.data.visibility,
      category: parsed.data.category ?? null,
      tags: parsed.data.tags,
      language: parsed.data.language,
      thumbnail_url: parsed.data.thumbnail_url ?? null,
      age_restriction: parsed.data.age_restriction ?? null,
      chat_enabled: parsed.data.chat_enabled,
      chat_followers_only: parsed.data.chat_followers_only,
      chat_subscribers_only: parsed.data.chat_subscribers_only,
      chat_slow_mode_seconds: parsed.data.chat_slow_mode_seconds,
      chat_emote_only: parsed.data.chat_emote_only,
      auto_mod_level: parsed.data.auto_mod_level,
      is_super_chat_enabled: parsed.data.is_super_chat_enabled,
      is_virtual_gifts_enabled: parsed.data.is_virtual_gifts_enabled,
      is_tips_enabled: parsed.data.is_tips_enabled,
      is_subscribers_only_stream: parsed.data.is_subscribers_only_stream,
      is_recording: parsed.data.is_recording,
    })
    .select("id")
    .single();

  if (error || !data) {
    return {
      ok: false as const,
      error: error?.message ?? "Création impossible.",
    };
  }

  /* Revalidate les surfaces concernées. */
  revalidatePath("/lives");
  revalidatePath("/feed");
  if (parsed.data.circle_id) {
    /* Pour récupérer le slug, lecture courte. */
    const { data: circle } = await supabase
      .from("circles")
      .select("slug")
      .eq("id", parsed.data.circle_id)
      .maybeSingle();
    const slug = (circle as { slug?: string } | null)?.slug;
    if (slug) revalidatePath(`/circles/${slug}/live`);
  }

  return { ok: true as const, id: data.id as string };
}

/* ============================================================
 * startLiveStreamSession
 * ============================================================ */
export async function startLiveStreamSession(
  args: z.infer<typeof startSchema>,
) {
  const parsed = startSchema.safeParse(args);
  if (!parsed.success) return { ok: false as const, error: "Invalide" };
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false as const, error: "Non authentifié." };

  /* Vérifie ownership host_id. */
  const { data: room } = await (supabase as SupabaseAny)
    .from("circle_live_rooms")
    .select("host_id, status")
    .eq("id", parsed.data.sessionId)
    .maybeSingle();
  if (!room) return { ok: false as const, error: "Salle introuvable." };
  if ((room as { host_id: string }).host_id !== user.id) {
    return { ok: false as const, error: "Réservé au host." };
  }
  const status = (room as { status: string }).status;
  if (status !== "scheduled" && status !== "live") {
    return { ok: false as const, error: `État invalide : ${status}` };
  }

  const { error } = await (supabase as SupabaseAny)
    .from("circle_live_rooms")
    .update({
      status: "live",
      started_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq("id", parsed.data.sessionId);
  if (error) return { ok: false as const, error: error.message };

  revalidatePath("/lives");
  revalidatePath(`/lives/${parsed.data.sessionId}`);
  return { ok: true as const };
}

/* ============================================================
 * endLiveStreamSession
 * ============================================================ */
export async function endLiveStreamSession(
  args: z.infer<typeof endSchema>,
) {
  const parsed = endSchema.safeParse(args);
  if (!parsed.success) return { ok: false as const, error: "Invalide" };
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false as const, error: "Non authentifié." };

  const { data: room } = await (supabase as SupabaseAny)
    .from("circle_live_rooms")
    .select("host_id, status")
    .eq("id", parsed.data.sessionId)
    .maybeSingle();
  if (!room) return { ok: false as const, error: "Salle introuvable." };
  if ((room as { host_id: string }).host_id !== user.id) {
    return { ok: false as const, error: "Réservé au host." };
  }
  if ((room as { status: string }).status === "ended") {
    return { ok: true as const };
  }

  const { error } = await (supabase as SupabaseAny)
    .from("circle_live_rooms")
    .update({
      status: "ended",
      ended_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq("id", parsed.data.sessionId);
  if (error) return { ok: false as const, error: error.message };

  revalidatePath("/lives");
  revalidatePath(`/lives/${parsed.data.sessionId}`);
  return { ok: true as const };
}

/* ============================================================
 * updateLiveStreamSettings (en cours de live)
 * ============================================================ */
export async function updateLiveStreamSettings(
  args: z.infer<typeof updateSchema>,
) {
  const parsed = updateSchema.safeParse(args);
  if (!parsed.success) return { ok: false as const, error: "Invalide" };
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false as const, error: "Non authentifié." };

  const { data: room } = await (supabase as SupabaseAny)
    .from("circle_live_rooms")
    .select("host_id")
    .eq("id", parsed.data.sessionId)
    .maybeSingle();
  if (!room) return { ok: false as const, error: "Salle introuvable." };
  if ((room as { host_id: string }).host_id !== user.id) {
    return { ok: false as const, error: "Réservé au host." };
  }

  const patch: Record<string, unknown> = { updated_at: new Date().toISOString() };
  for (const key of [
    "chat_enabled",
    "chat_followers_only",
    "chat_subscribers_only",
    "chat_slow_mode_seconds",
    "chat_emote_only",
    "auto_mod_level",
    "title",
    "description",
    "thumbnail_url",
    "is_super_chat_enabled",
    "is_virtual_gifts_enabled",
    "is_tips_enabled",
  ] as const) {
    const v = (parsed.data as Record<string, unknown>)[key];
    if (v !== undefined) patch[key] = v;
  }

  /* Si rien à changer, no-op success. */
  if (Object.keys(patch).length <= 1) {
    return { ok: true as const };
  }

  const { error } = await (supabase as SupabaseAny)
    .from("circle_live_rooms")
    .update(patch)
    .eq("id", parsed.data.sessionId);
  if (error) return { ok: false as const, error: error.message };

  revalidatePath(`/lives/${parsed.data.sessionId}`);
  return { ok: true as const };
}
