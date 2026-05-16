"use server";

/* Server Actions admin/modo TikTok-like pour le live :
 *
 *   - pinChatMessage / unpinChatMessage : épingler un commentaire dans
 *     le chat (max 1 épinglé à la fois)
 *   - kickFromLive : éjecter un viewer (LiveKit removeParticipant)
 *   - muteParticipantTrack : couper un micro (LiveKit mute)
 *   - addLiveModerator / removeLiveModerator : gestion des modos
 *     custom de la session
 *
 * Autorisation : host de la session OU modérateur custom OU mod cercle.
 * Le check passe par RPC is_live_moderator (SECURITY DEFINER).
 */

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import {
  kickFromLiveRoom,
  muteParticipantTrackInLiveRoom,
} from "@/lib/livekit/admin";

/* eslint-disable @typescript-eslint/no-explicit-any */
type SupabaseAny = any;

async function assertModerator(
  supabase: SupabaseAny,
  sessionId: string,
): Promise<{ ok: true; userId: string } | { ok: false; error: string }> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Non authentifié." };

  const { data, error } = await supabase.rpc("is_live_moderator", {
    p_session_id: sessionId,
    p_user_id: user.id,
  });
  if (error || data !== true) {
    return { ok: false, error: "Action réservée aux modérateurs." };
  }
  return { ok: true, userId: user.id };
}

/* ============================================================
 * Pin / Unpin chat message
 * ============================================================ */
const pinSchema = z.object({ messageId: z.string().uuid() });

export async function pinChatMessage(args: z.infer<typeof pinSchema>) {
  const parsed = pinSchema.safeParse(args);
  if (!parsed.success) return { ok: false as const, error: "Invalide" };

  const supabase = await createClient();

  /* Récupère session_id du message. */
  const { data: msg } = await (supabase as SupabaseAny)
    .from("live_chat_messages")
    .select("session_id")
    .eq("id", parsed.data.messageId)
    .maybeSingle();
  if (!msg) return { ok: false as const, error: "Message introuvable." };
  const sessionId = (msg as { session_id: string }).session_id;

  const auth = await assertModerator(supabase, sessionId);
  if (!auth.ok) return { ok: false as const, error: auth.error };

  /* Unpin tous les autres messages de la session (1 seul épinglé). */
  await (supabase as SupabaseAny)
    .from("live_chat_messages")
    .update({ is_pinned: false })
    .eq("session_id", sessionId)
    .eq("is_pinned", true);

  /* Pin celui-ci. */
  const { error } = await (supabase as SupabaseAny)
    .from("live_chat_messages")
    .update({ is_pinned: true })
    .eq("id", parsed.data.messageId);

  if (error) return { ok: false as const, error: error.message };
  revalidatePath(`/lives/${sessionId}`);
  return { ok: true as const };
}

export async function unpinChatMessage(args: z.infer<typeof pinSchema>) {
  const parsed = pinSchema.safeParse(args);
  if (!parsed.success) return { ok: false as const, error: "Invalide" };

  const supabase = await createClient();
  const { data: msg } = await (supabase as SupabaseAny)
    .from("live_chat_messages")
    .select("session_id")
    .eq("id", parsed.data.messageId)
    .maybeSingle();
  if (!msg) return { ok: false as const, error: "Message introuvable." };
  const sessionId = (msg as { session_id: string }).session_id;

  const auth = await assertModerator(supabase, sessionId);
  if (!auth.ok) return { ok: false as const, error: auth.error };

  const { error } = await (supabase as SupabaseAny)
    .from("live_chat_messages")
    .update({ is_pinned: false })
    .eq("id", parsed.data.messageId);

  if (error) return { ok: false as const, error: error.message };
  revalidatePath(`/lives/${sessionId}`);
  return { ok: true as const };
}

/* ============================================================
 * Kick from live (LiveKit removeParticipant)
 * ============================================================ */
const kickSchema = z.object({
  sessionId: z.string().uuid(),
  userId: z.string().uuid(),
});

export async function kickFromLive(args: z.infer<typeof kickSchema>) {
  const parsed = kickSchema.safeParse(args);
  if (!parsed.success) return { ok: false as const, error: "Invalide" };

  const supabase = await createClient();
  const auth = await assertModerator(supabase, parsed.data.sessionId);
  if (!auth.ok) return { ok: false as const, error: auth.error };

  /* Le host ne peut pas être kicked. */
  const { data: room } = await (supabase as SupabaseAny)
    .from("circle_live_rooms")
    .select("host_id")
    .eq("id", parsed.data.sessionId)
    .maybeSingle();
  if (
    (room as { host_id: string } | null)?.host_id === parsed.data.userId
  ) {
    return { ok: false as const, error: "Impossible de kick le host." };
  }

  const res = await kickFromLiveRoom(
    parsed.data.sessionId,
    parsed.data.userId,
  );
  if (!res.ok) return { ok: false as const, error: res.error };
  return { ok: true as const };
}

/* ============================================================
 * Mute participant track
 * ============================================================ */
const muteSchema = z.object({
  sessionId: z.string().uuid(),
  userId: z.string().uuid(),
  trackSid: z.string().min(1),
});

export async function muteParticipantInLive(
  args: z.infer<typeof muteSchema>,
) {
  const parsed = muteSchema.safeParse(args);
  if (!parsed.success) return { ok: false as const, error: "Invalide" };

  const supabase = await createClient();
  const auth = await assertModerator(supabase, parsed.data.sessionId);
  if (!auth.ok) return { ok: false as const, error: auth.error };

  const res = await muteParticipantTrackInLiveRoom(
    parsed.data.sessionId,
    parsed.data.userId,
    parsed.data.trackSid,
  );
  if (!res.ok) return { ok: false as const, error: res.error };
  return { ok: true as const };
}

/* ============================================================
 * Ajouter / retirer modérateurs custom
 * ============================================================ */
const modSchema = z.object({
  sessionId: z.string().uuid(),
  userId: z.string().uuid(),
});

export async function addLiveModerator(args: z.infer<typeof modSchema>) {
  const parsed = modSchema.safeParse(args);
  if (!parsed.success) return { ok: false as const, error: "Invalide" };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false as const, error: "Non authentifié." };

  /* Seul le host peut ajouter un modo (RLS le force aussi). */
  const { data: room } = await (supabase as SupabaseAny)
    .from("circle_live_rooms")
    .select("host_id")
    .eq("id", parsed.data.sessionId)
    .maybeSingle();
  if ((room as { host_id: string } | null)?.host_id !== user.id) {
    return {
      ok: false as const,
      error: "Seul le host peut ajouter un modérateur.",
    };
  }

  if (parsed.data.userId === user.id) {
    return {
      ok: false as const,
      error: "Tu es déjà le host de ce live.",
    };
  }

  const { error } = await (supabase as SupabaseAny)
    .from("live_moderators")
    .insert({
      session_id: parsed.data.sessionId,
      user_id: parsed.data.userId,
      added_by: user.id,
    });

  if (error) {
    const msg = String(error.message ?? "").toLowerCase();
    if (msg.includes("unique") || msg.includes("duplicate")) {
      return {
        ok: false as const,
        error: "Cet utilisateur est déjà modérateur.",
      };
    }
    return { ok: false as const, error: error.message };
  }

  revalidatePath(`/lives/${parsed.data.sessionId}/studio`);
  return { ok: true as const };
}

export async function removeLiveModerator(args: z.infer<typeof modSchema>) {
  const parsed = modSchema.safeParse(args);
  if (!parsed.success) return { ok: false as const, error: "Invalide" };

  const supabase = await createClient();
  const { error } = await (supabase as SupabaseAny)
    .from("live_moderators")
    .delete()
    .eq("session_id", parsed.data.sessionId)
    .eq("user_id", parsed.data.userId);

  if (error) return { ok: false as const, error: error.message };
  revalidatePath(`/lives/${parsed.data.sessionId}/studio`);
  return { ok: true as const };
}
