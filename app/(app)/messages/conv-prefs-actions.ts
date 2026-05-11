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
  /* Trois cas :
     - { muted: false, until: null } = unmute
     - { muted: true,  until: <ISO>  } = mute jusqu'à cette date
     - { muted: true,  until: null  } = mute pour toujours (permanent) */
  muted: z.boolean(),
  until: z.string().datetime().nullable(),
});

export async function setConversationMute(
  conversationId: string,
  muteUntil: string | null,
  permanent: boolean = false,
): Promise<ConvPrefResult> {
  /* Mapping vers la sémantique RPC :
     - permanent === true → p_muted=true, p_until=null
     - muteUntil !== null → p_muted=true, p_until=<date>
     - sinon (muteUntil null + !permanent) → p_muted=false (unmute) */
  const muted = permanent || muteUntil !== null;
  const until = permanent ? null : muteUntil;

  const parsed = muteSchema.safeParse({ conversationId, muted, until });
  if (!parsed.success) return { ok: false, error: "Paramètres invalides." };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Non authentifié." };

  const { error } = await supabase.rpc("set_conversation_mute", {
    p_conv_id: parsed.data.conversationId,
    p_muted: parsed.data.muted,
    p_until: parsed.data.until ?? undefined,
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

/* === Chantier 3 : Themes per-conversation === */

const themeSchema = z.object({
  conversationId: z.string().uuid(),
  themePreset: z.enum([
    "default",
    "gold",
    "sunset",
    "ocean",
    "forest",
    "midnight",
    "rose",
    "lavender",
  ]),
  wallpaperId: z.enum([
    "none",
    "arcs",
    "dots",
    "waves",
    "gradient",
    "stars",
  ]),
});

export async function setConversationTheme(
  conversationId: string,
  themePreset: string,
  wallpaperId: string,
): Promise<ConvPrefResult> {
  const parsed = themeSchema.safeParse({
    conversationId,
    themePreset,
    wallpaperId,
  });
  if (!parsed.success) return { ok: false, error: "Thème invalide." };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Non authentifié." };

  const { error } = await supabase.rpc("set_conversation_theme", {
    p_conv_id: parsed.data.conversationId,
    p_theme_preset: parsed.data.themePreset,
    p_wallpaper_id: parsed.data.wallpaperId,
  });
  if (error) return { ok: false, error: `Échec : ${error.message}` };

  revalidatePath(`/messages/${parsed.data.conversationId}`);
  return { ok: true };
}
