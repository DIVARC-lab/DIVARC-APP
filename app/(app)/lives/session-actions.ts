"use server";

/* Étape 2/60 — LiveSessionService TikTok-style.
 *
 * Adaptation du brief Python en Server Actions Next.js + Supabase.
 *
 * Actions exposées :
 *   - createLiveSession(config) : crée la session + stream_key + LiveKit room
 *   - joinAsViewer(sessionId) : viewer rejoint (track + system comment)
 *   - requestToJoinPanel(sessionId, message?) : demande à monter sur panel
 *   - acceptGuestRequest(requestId) : host/mod accepte → INSERT panel_participants
 *   - removeGuestFromPanel(sessionId, userId, reason?) : retire un guest
 *   - leavePanel(sessionId) : guest se retire lui-même
 *
 * Auto-system comments (X a rejoint, X est monté sur scène, etc.).
 */

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createAdminClient, createClient } from "@/lib/supabase/server";
import {
  grantPublishToLiveParticipant,
  revokePublishFromLiveParticipant,
} from "@/lib/livekit/admin";

/* eslint-disable @typescript-eslint/no-explicit-any */
type SupabaseAny = any;

/* ============================================================
 * Helper : compute layout from participant count (host + guests)
 * ============================================================ */
export type LiveLayoutKind =
  | "solo"
  | "panel_2"
  | "panel_4"
  | "panel_6"
  | "panel_8"
  | "pk_battle"
  | "audio_only";

function computeLayoutFromCountInternal(guestsCount: number): LiveLayoutKind {
  const total = 1 + Math.max(0, guestsCount);
  if (total <= 1) return "solo";
  if (total === 2) return "panel_2";
  if (total <= 4) return "panel_4";
  if (total <= 6) return "panel_6";
  return "panel_8";
}

export async function computeLayoutFromCount(
  guestsCount: number,
): Promise<LiveLayoutKind> {
  return computeLayoutFromCountInternal(guestsCount);
}

/* ============================================================
 * createLiveSession
 * ============================================================ */
const createConfigSchema = z.object({
  title: z.string().trim().min(3).max(120),
  description: z.string().trim().max(500).optional(),
  category: z.string().min(1).max(40).optional(),
  tags: z.array(z.string().min(1).max(30)).max(8).optional(),
  kind: z.enum(["audio", "video"]).default("video"),
  visibility: z
    .enum(["public", "unlisted", "friends_only", "circle", "subscribers_only", "private"])
    .default("public"),
  guestRequestMode: z
    .enum(["open", "followers_only", "friends_only", "invite_only", "off"])
    .default("open"),
  maxGuestsOnPanel: z.number().int().min(0).max(8).default(8),
  ageRestriction: z.string().max(20).optional(),
  geoBlockedCountries: z.array(z.string().length(2)).max(50).optional(),
  isRecording: z.boolean().default(true),
  isTipsEnabled: z.boolean().default(true),
  chatEnabled: z.boolean().default(true),
  coverUrl: z.string().url().optional(),
  circleId: z.string().uuid().optional(),
  scheduledAt: z.string().datetime().optional(),
});

export async function createLiveSession(
  args: z.infer<typeof createConfigSchema>,
) {
  const parsed = createConfigSchema.safeParse(args);
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

  /* Snapshot host profile (dénormalisé). */
  const { data: hostProfile } = await supabase
    .from("profiles")
    .select("username, full_name, avatar_url")
    .eq("id", user.id)
    .maybeSingle();
  const hp = hostProfile as {
    username: string | null;
    full_name: string | null;
    avatar_url: string | null;
  } | null;

  /* Compte les followers du host pour la dénormalisation. */
  const { count: followersCount } = await (supabase as SupabaseAny)
    .from("user_follows")
    .select("*", { count: "exact", head: true })
    .eq("followed_id", user.id);

  const status = parsed.data.scheduledAt ? "scheduled" : "live";
  const startedAt = status === "live" ? new Date().toISOString() : null;

  const { data: created, error } = await (supabase as SupabaseAny)
    .from("circle_live_rooms")
    .insert({
      host_id: user.id,
      host_username: hp?.username ?? null,
      host_avatar_url: hp?.avatar_url ?? null,
      host_followers_count: followersCount ?? 0,

      title: parsed.data.title,
      description: parsed.data.description ?? null,
      category: parsed.data.category ?? null,
      tags: parsed.data.tags ?? [],
      kind: parsed.data.kind,
      visibility: parsed.data.visibility,
      cover_url: parsed.data.coverUrl ?? null,

      layout: "solo",
      max_guests_on_panel: parsed.data.maxGuestsOnPanel,
      guest_request_mode_v2: parsed.data.guestRequestMode,

      age_restriction: parsed.data.ageRestriction ?? null,
      geo_blocked_countries: parsed.data.geoBlockedCountries ?? [],

      is_recording: parsed.data.isRecording,
      is_tips_enabled: parsed.data.isTipsEnabled,
      chat_enabled: parsed.data.chatEnabled,

      circle_id: parsed.data.circleId ?? null,
      scheduled_at: parsed.data.scheduledAt ?? null,
      status,
      started_at: startedAt,
    })
    .select("id, stream_key")
    .maybeSingle();

  if (error || !created) {
    return {
      ok: false as const,
      error: `Création échouée : ${error?.message ?? "inconnue"}`,
    };
  }

  const c = created as { id: string; stream_key: string };
  revalidatePath("/lives");
  return { ok: true as const, sessionId: c.id, streamKey: c.stream_key };
}

/* ============================================================
 * joinAsViewer — track viewer + auto system comment
 * ============================================================ */
const joinSchema = z.object({ sessionId: z.string().uuid() });

export async function joinAsViewer(args: z.infer<typeof joinSchema>) {
  const parsed = joinSchema.safeParse(args);
  if (!parsed.success) return { ok: false as const, error: "Invalide" };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false as const, error: "Non authentifié." };

  /* Lit la session. */
  const { data: room } = await (supabase as SupabaseAny)
    .from("circle_live_rooms")
    .select(
      "id, host_id, status, viewers_current, peak_participants, chat_enabled",
    )
    .eq("id", parsed.data.sessionId)
    .maybeSingle();
  if (!room) {
    return { ok: false as const, error: "Live introuvable." };
  }
  const r = room as {
    id: string;
    host_id: string;
    status: string;
    viewers_current: number;
    peak_participants: number;
    chat_enabled: boolean;
  };

  /* Increment compteurs unique + current via admin client (bypass RLS). */
  let admin;
  try {
    admin = createAdminClient();
  } catch {
    admin = supabase;
  }

  const newCurrent = (r.viewers_current ?? 0) + 1;
  const newPeak = Math.max(r.peak_participants ?? 0, newCurrent);
  await (admin as SupabaseAny)
    .from("circle_live_rooms")
    .update({
      participants_count: newCurrent,
      viewers_current: newCurrent,
      peak_participants: newPeak,
      viewers_total_unique: ((r as any).viewers_total_unique ?? 0) + 1,
    })
    .eq("id", r.id);

  /* Auto-system comment "X a rejoint". Skip si user est le host. */
  if (r.host_id !== user.id && r.chat_enabled) {
    const { data: userProfile } = await supabase
      .from("profiles")
      .select("username, full_name, avatar_url")
      .eq("id", user.id)
      .maybeSingle();
    const up = userProfile as {
      username: string | null;
      full_name: string | null;
      avatar_url: string | null;
    } | null;

    /* Throttle : skip si déjà 1 join comment de cet user dans les
       dernières 30 min (anti-spam re-connect). */
    const { data: recentJoin } = await (admin as SupabaseAny)
      .from("live_chat_messages")
      .select("id")
      .eq("session_id", r.id)
      .eq("user_id", user.id)
      .eq("comment_type", "join")
      .gte("created_at", new Date(Date.now() - 30 * 60 * 1000).toISOString())
      .limit(1)
      .maybeSingle();

    if (!recentJoin) {
      await (admin as SupabaseAny).from("live_chat_messages").insert({
        session_id: r.id,
        user_id: user.id,
        username: up?.username ?? up?.full_name ?? null,
        avatar_url: up?.avatar_url ?? null,
        content: `${up?.full_name ?? up?.username ?? "Un viewer"} a rejoint`,
        comment_type: "join",
      });
    }
  }

  return { ok: true as const };
}

/* ============================================================
 * requestToJoinPanel — viewer demande à monter
 * ============================================================ */
const requestPanelSchema = z.object({
  sessionId: z.string().uuid(),
  message: z.string().trim().max(140).optional(),
});

export async function requestToJoinPanel(
  args: z.infer<typeof requestPanelSchema>,
) {
  const parsed = requestPanelSchema.safeParse(args);
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

  /* Charge la session pour check mode + panel full. */
  const { data: room } = await (supabase as SupabaseAny)
    .from("circle_live_rooms")
    .select(
      "id, host_id, status, guest_request_mode_v2, max_guests_on_panel",
    )
    .eq("id", parsed.data.sessionId)
    .maybeSingle();
  if (!room) return { ok: false as const, error: "Live introuvable." };
  const r = room as {
    id: string;
    host_id: string;
    status: string;
    guest_request_mode_v2: string;
    max_guests_on_panel: number;
  };

  if (r.host_id === user.id) {
    return {
      ok: false as const,
      error: "Tu es déjà le host de ce live.",
    };
  }
  if (r.status !== "live") {
    return { ok: false as const, error: "Le live n'est pas actif." };
  }
  if (r.guest_request_mode_v2 === "off") {
    return {
      ok: false as const,
      error: "Le créateur n'accepte pas de guests.",
    };
  }

  /* Mode followers_only : check follow. */
  if (r.guest_request_mode_v2 === "followers_only") {
    const { data: follow } = await (supabase as SupabaseAny)
      .from("user_follows")
      .select("follower_id")
      .eq("follower_id", user.id)
      .eq("followed_id", r.host_id)
      .maybeSingle();
    if (!follow) {
      return {
        ok: false as const,
        error: "Réservé aux abonnés du créateur.",
      };
    }
  }

  /* Mode friends_only : check friendship accepted. */
  if (r.guest_request_mode_v2 === "friends_only") {
    const { data: friend } = await (supabase as SupabaseAny)
      .from("friendships")
      .select("status")
      .or(
        `and(requester_id.eq.${user.id},recipient_id.eq.${r.host_id}),and(recipient_id.eq.${user.id},requester_id.eq.${r.host_id})`,
      )
      .eq("status", "accepted")
      .maybeSingle();
    if (!friend) {
      return {
        ok: false as const,
        error: "Réservé aux amis du créateur.",
      };
    }
  }

  /* Mode invite_only : refuse complètement les demandes user-initiated. */
  if (r.guest_request_mode_v2 === "invite_only") {
    return {
      ok: false as const,
      error: "Sur invitation uniquement.",
    };
  }

  /* Panel full ? */
  const { count: panelCount } = await (supabase as SupabaseAny)
    .from("live_panel_participants")
    .select("*", { count: "exact", head: true })
    .eq("session_id", r.id)
    .is("left_panel_at", null);
  if ((panelCount ?? 0) >= r.max_guests_on_panel) {
    return {
      ok: false as const,
      error: "Panel complet, réessaie plus tard.",
    };
  }

  /* Snapshot user pour dénormalisation. */
  const { data: userProfile } = await supabase
    .from("profiles")
    .select("username, full_name, avatar_url")
    .eq("id", user.id)
    .maybeSingle();
  const up = userProfile as {
    username: string | null;
    full_name: string | null;
    avatar_url: string | null;
  } | null;

  const { count: followerCount } = await (supabase as SupabaseAny)
    .from("user_follows")
    .select("*", { count: "exact", head: true })
    .eq("followed_id", user.id);

  /* Relations bidirectionnelles avec le host. */
  const [{ data: iFollowHost }, { data: hostFollowsMe }] = await Promise.all([
    (supabase as SupabaseAny)
      .from("user_follows")
      .select("follower_id")
      .eq("follower_id", user.id)
      .eq("followed_id", r.host_id)
      .maybeSingle(),
    (supabase as SupabaseAny)
      .from("user_follows")
      .select("follower_id")
      .eq("follower_id", r.host_id)
      .eq("followed_id", user.id)
      .maybeSingle(),
  ]);

  const { error } = await (supabase as SupabaseAny)
    .from("live_stage_requests")
    .insert({
      session_id: r.id,
      requester_id: user.id,
      username: up?.username ?? up?.full_name ?? null,
      avatar_url: up?.avatar_url ?? null,
      user_follower_count: followerCount ?? 0,
      user_is_following_host: !!iFollowHost,
      user_is_followed_by_host: !!hostFollowsMe,
      message: parsed.data.message ?? null,
      status: "pending",
      expires_at: new Date(Date.now() + 60_000).toISOString(),
    });

  if (error) {
    const msg = String(error.message ?? "").toLowerCase();
    if (msg.includes("unique") || msg.includes("duplicate")) {
      return {
        ok: false as const,
        error: "Tu as déjà une demande en attente pour ce live.",
      };
    }
    return { ok: false as const, error: error.message };
  }

  return { ok: true as const };
}

/* ============================================================
 * acceptGuestRequest — host approve → INSERT panel_participants
 * ============================================================ */
const acceptSchema = z.object({ requestId: z.string().uuid() });

export async function acceptGuestRequest(args: z.infer<typeof acceptSchema>) {
  const parsed = acceptSchema.safeParse(args);
  if (!parsed.success) return { ok: false as const, error: "Invalide" };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false as const, error: "Non authentifié." };

  /* Charge la demande + session. */
  const { data: reqRow } = await (supabase as SupabaseAny)
    .from("live_stage_requests")
    .select("id, session_id, requester_id, status, username, avatar_url, expires_at")
    .eq("id", parsed.data.requestId)
    .maybeSingle();
  const req = reqRow as {
    id: string;
    session_id: string;
    requester_id: string;
    status: string;
    username: string | null;
    avatar_url: string | null;
    expires_at: string | null;
  } | null;
  if (!req) return { ok: false as const, error: "Demande introuvable." };
  if (req.status !== "pending") {
    return { ok: false as const, error: "Demande déjà traitée." };
  }
  if (req.expires_at && new Date(req.expires_at) < new Date()) {
    return { ok: false as const, error: "Demande expirée." };
  }

  /* Check : user est host OU mod (RPC). */
  const { data: isMod } = await (supabase as SupabaseAny).rpc(
    "is_live_moderator",
    { p_session_id: req.session_id, p_user_id: user.id },
  );
  if (isMod !== true) {
    return {
      ok: false as const,
      error: "Action réservée aux modérateurs.",
    };
  }

  /* Récupère la session pour layout + max guests. */
  const { data: room } = await (supabase as SupabaseAny)
    .from("circle_live_rooms")
    .select("id, max_guests_on_panel, livekit_room_id")
    .eq("id", req.session_id)
    .maybeSingle();
  if (!room) return { ok: false as const, error: "Live introuvable." };
  const r = room as {
    id: string;
    max_guests_on_panel: number;
    livekit_room_id: string | null;
  };

  /* Panel pas plein. */
  const { count: panelCount } = await (supabase as SupabaseAny)
    .from("live_panel_participants")
    .select("*", { count: "exact", head: true })
    .eq("session_id", r.id)
    .is("left_panel_at", null);
  if ((panelCount ?? 0) >= r.max_guests_on_panel) {
    return { ok: false as const, error: "Panel complet." };
  }

  /* Calcule la prochaine position libre. */
  const { data: occupied } = await (supabase as SupabaseAny)
    .from("live_panel_participants")
    .select("position")
    .eq("session_id", r.id)
    .is("left_panel_at", null);
  const occupiedSet = new Set(
    ((occupied ?? []) as Array<{ position: number }>).map((o) => o.position),
  );
  let nextPosition = 0;
  for (let i = 0; i < 8; i++) {
    if (!occupiedSet.has(i)) {
      nextPosition = i;
      break;
    }
  }

  let admin;
  try {
    admin = createAdminClient();
  } catch {
    admin = supabase;
  }

  /* INSERT panel + update request status. */
  const { error: insertErr } = await (admin as SupabaseAny)
    .from("live_panel_participants")
    .insert({
      session_id: r.id,
      user_id: req.requester_id,
      username: req.username,
      avatar_url: req.avatar_url,
      position: nextPosition,
    });
  if (insertErr) {
    return {
      ok: false as const,
      error: `Insertion panel échouée : ${insertErr.message}`,
    };
  }

  await (supabase as SupabaseAny)
    .from("live_stage_requests")
    .update({
      status: "approved",
      resolved_at: new Date().toISOString(),
      resolved_by: user.id,
    })
    .eq("id", req.id);

  /* Update layout selon nouveau count. */
  const newGuestsCount = (panelCount ?? 0) + 1;
  const newLayout = computeLayoutFromCountInternal(newGuestsCount);
  await (admin as SupabaseAny)
    .from("circle_live_rooms")
    .update({ layout: newLayout })
    .eq("id", r.id);

  /* Grant publish LiveKit. */
  const grantRes = await grantPublishToLiveParticipant(
    r.id,
    req.requester_id,
  );
  if (!grantRes.ok) {
    console.error("[acceptGuestRequest] LiveKit grant failed", grantRes.error);
  }

  /* Auto-system comment "X est monté sur le live ✨". */
  const displayName = req.username ?? "Un spectateur";
  await (admin as SupabaseAny).from("live_chat_messages").insert({
    session_id: r.id,
    user_id: req.requester_id,
    username: req.username,
    avatar_url: req.avatar_url,
    content: `${displayName} est monté sur le live ✨`,
    comment_type: "system",
  });

  revalidatePath(`/lives/${r.id}`);
  revalidatePath(`/lives/${r.id}/studio`);
  return { ok: true as const };
}

/* ============================================================
 * removeGuestFromPanel — host vire ou guest se retire
 * ============================================================ */
const removeSchema = z.object({
  sessionId: z.string().uuid(),
  userId: z.string().uuid(),
  reason: z.string().max(200).optional(),
});

export async function removeGuestFromPanel(
  args: z.infer<typeof removeSchema>,
) {
  const parsed = removeSchema.safeParse(args);
  if (!parsed.success) return { ok: false as const, error: "Invalide" };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false as const, error: "Non authentifié." };

  /* Permission : self OU mod. */
  const isSelf = parsed.data.userId === user.id;
  if (!isSelf) {
    const { data: isMod } = await (supabase as SupabaseAny).rpc(
      "is_live_moderator",
      { p_session_id: parsed.data.sessionId, p_user_id: user.id },
    );
    if (isMod !== true) {
      return {
        ok: false as const,
        error: "Action réservée aux modérateurs.",
      };
    }
  }

  let admin;
  try {
    admin = createAdminClient();
  } catch {
    admin = supabase;
  }

  /* Soft-leave : UPDATE left_panel_at + reason. */
  const { error: updErr } = await (admin as SupabaseAny)
    .from("live_panel_participants")
    .update({
      left_panel_at: new Date().toISOString(),
      removed_by: user.id,
      removed_reason: parsed.data.reason ?? (isSelf ? "self_leave" : null),
    })
    .eq("session_id", parsed.data.sessionId)
    .eq("user_id", parsed.data.userId)
    .is("left_panel_at", null);
  if (updErr) {
    return { ok: false as const, error: updErr.message };
  }

  /* Revoke publish LiveKit. */
  const revoke = await revokePublishFromLiveParticipant(
    parsed.data.sessionId,
    parsed.data.userId,
  );
  if (!revoke.ok) {
    console.error("[removeGuestFromPanel] revoke failed", revoke.error);
  }

  /* Re-compute layout. */
  const { count: remaining } = await (admin as SupabaseAny)
    .from("live_panel_participants")
    .select("*", { count: "exact", head: true })
    .eq("session_id", parsed.data.sessionId)
    .is("left_panel_at", null);
  const newLayout = computeLayoutFromCountInternal(remaining ?? 0);
  await (admin as SupabaseAny)
    .from("circle_live_rooms")
    .update({ layout: newLayout })
    .eq("id", parsed.data.sessionId);

  revalidatePath(`/lives/${parsed.data.sessionId}`);
  revalidatePath(`/lives/${parsed.data.sessionId}/studio`);
  return { ok: true as const };
}

/* leavePanel : alias pratique pour self. */
export async function leavePanel(args: { sessionId: string }) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false as const, error: "Non authentifié." };
  return removeGuestFromPanel({
    sessionId: args.sessionId,
    userId: user.id,
    reason: "self_leave",
  });
}
