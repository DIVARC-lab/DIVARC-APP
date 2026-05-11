"use server";

/* Server Actions pour les Éclats (Chantier 1.6) :
 *   - markViewOnceViewed : marque un message view_once comme vu (one-shot)
 *   - flagScreenshotDetected : flag un screenshot détecté (best-effort,
 *     dépend de l'OS et de l'app — sur web on ne peut PAS détecter
 *     fiablement, mais on accepte le flag manuel)
 *   - setConversationAutoDelete : configure la durée d'auto-suppression
 *     (1, 7, 30 jours ou null) au niveau conv */

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";

const idSchema = z.string().uuid();

export type EclatActionResult = { ok: true } | { ok: false; error: string };

export async function markViewOnceViewed(
  messageId: string,
): Promise<EclatActionResult> {
  const parsed = idSchema.safeParse(messageId);
  if (!parsed.success) return { ok: false, error: "Message invalide." };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Non authentifié." };

  const { error } = await supabase.rpc("mark_view_once_viewed", {
    p_message_id: parsed.data,
  });
  if (error) return { ok: false, error: "Échec marquage." };

  return { ok: true };
}

export async function flagScreenshotDetected(
  messageId: string,
): Promise<EclatActionResult> {
  const parsed = idSchema.safeParse(messageId);
  if (!parsed.success) return { ok: false, error: "Message invalide." };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Non authentifié." };

  const { error } = await supabase.rpc("flag_screenshot_detected", {
    p_message_id: parsed.data,
  });
  if (error) return { ok: false, error: "Échec flag." };

  return { ok: true };
}

const autoDeleteSchema = z.object({
  conversationId: z.string().uuid(),
  /* null = disable, sinon 1 / 7 / 30 jours. */
  days: z.union([z.literal(1), z.literal(7), z.literal(30)]).nullable(),
});

export async function setConversationAutoDelete(
  conversationId: string,
  days: 1 | 7 | 30 | null,
): Promise<EclatActionResult> {
  const parsed = autoDeleteSchema.safeParse({ conversationId, days });
  if (!parsed.success) return { ok: false, error: "Paramètres invalides." };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Non authentifié." };

  const { error } = await supabase.rpc("set_conversation_auto_delete", {
    p_conv_id: parsed.data.conversationId,
    p_days: parsed.data.days,
  });
  if (error) return { ok: false, error: "Échec configuration." };

  revalidatePath(`/messages/${conversationId}`);
  revalidatePath(`/messages/${conversationId}/settings`);
  return { ok: true };
}
