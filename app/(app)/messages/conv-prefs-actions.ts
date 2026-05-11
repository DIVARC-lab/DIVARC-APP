"use server";

/* Server Actions pour les préférences par-conversation côté membre :
 * - épinglage (toggle_conversation_pin)
 * - archivage (toggle_conversation_archive)
 * - mute / unmute (set_conversation_mute)
 *
 * Toutes branchées sur les RPC créées en migration 0073. RLS sécurise
 * déjà côté DB (chaque RPC vérifie auth.uid() === user_id), on n'a donc
 * qu'à appeler. */

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";

const idSchema = z.string().uuid();

export type ConvPrefResult = { ok: true } | { ok: false; error: string };

export async function togglePinConversation(
  conversationId: string,
): Promise<ConvPrefResult> {
  const parsed = idSchema.safeParse(conversationId);
  if (!parsed.success) return { ok: false, error: "Conversation invalide." };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Non authentifié." };

  const { error } = await supabase.rpc("toggle_conversation_pin", {
    p_conv_id: parsed.data,
  });
  if (error) return { ok: false, error: "Échec de l'épinglage." };

  revalidatePath("/messages");
  return { ok: true };
}

export async function toggleArchiveConversation(
  conversationId: string,
): Promise<ConvPrefResult> {
  const parsed = idSchema.safeParse(conversationId);
  if (!parsed.success) return { ok: false, error: "Conversation invalide." };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Non authentifié." };

  const { error } = await supabase.rpc("toggle_conversation_archive", {
    p_conv_id: parsed.data,
  });
  if (error) return { ok: false, error: "Échec de l'archivage." };

  revalidatePath("/messages");
  return { ok: true };
}

const muteSchema = z.object({
  conversationId: z.string().uuid(),
  /* null = unmute, sinon ISO datetime ou Date. */
  muteUntil: z.string().datetime().nullable(),
});

export async function setConversationMute(
  conversationId: string,
  muteUntil: string | null,
): Promise<ConvPrefResult> {
  const parsed = muteSchema.safeParse({ conversationId, muteUntil });
  if (!parsed.success) return { ok: false, error: "Paramètres invalides." };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Non authentifié." };

  const muted = parsed.data.muteUntil !== null;
  const { error } = await supabase.rpc("set_conversation_mute", {
    p_conv_id: parsed.data.conversationId,
    p_muted: muted,
    p_until: parsed.data.muteUntil ?? undefined,
  });
  if (error) return { ok: false, error: "Échec du mute." };

  revalidatePath("/messages");
  return { ok: true };
}

/* Helpers de durée prédéfinies (pratique côté UI). */
export const MUTE_DURATIONS = {
  HOUR_1: 60 * 60 * 1000,
  HOURS_8: 8 * 60 * 60 * 1000,
  DAY_1: 24 * 60 * 60 * 1000,
  WEEK_1: 7 * 24 * 60 * 60 * 1000,
} as const;
