"use server";

/* Étape 18 — Server Actions chat live.
 *
 * sendLiveChatMessage : appelle RPC send_live_chat_message_with_rate_limit
 *  (rate-limit 1 msg / 2s atomic en DB).
 *
 * deleteLiveChatMessage : soft-delete (owner OU host). UPDATE policy RLS
 *  gère l'autorisation. */

import { z } from "zod";
import { createClient } from "@/lib/supabase/server";

/* eslint-disable @typescript-eslint/no-explicit-any */
type SupabaseAny = any;

const sendSchema = z.object({
  sessionId: z.string().uuid(),
  content: z.string().trim().min(1).max(400),
});

export async function sendLiveChatMessage(
  args: z.infer<typeof sendSchema>,
) {
  const parsed = sendSchema.safeParse(args);
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

  const { data, error } = await (supabase as SupabaseAny).rpc(
    "send_live_chat_message_with_rate_limit",
    { p_session_id: parsed.data.sessionId, p_content: parsed.data.content },
  );

  if (error) {
    const code = String(error.message ?? "").toLowerCase();
    const mapped =
      code.includes("rate_limited")
        ? "Doucement ! Attends 2 secondes avant ton prochain message."
        : code.includes("chat_disabled")
          ? "Le chat est désactivé sur ce live."
          : code.includes("live_not_active")
            ? "Le live n'est pas en cours."
            : code.includes("content_too_long")
              ? "Message trop long (400 caractères max)."
              : code.includes("empty_content")
                ? "Message vide."
                : `Envoi échoué : ${error.message}`;
    return { ok: false as const, error: mapped };
  }

  return { ok: true as const, id: data as string };
}

const deleteSchema = z.object({
  messageId: z.string().uuid(),
});

export async function deleteLiveChatMessage(
  args: z.infer<typeof deleteSchema>,
) {
  const parsed = deleteSchema.safeParse(args);
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

  const { error } = await (supabase as SupabaseAny)
    .from("live_chat_messages")
    .update({
      deleted_at: new Date().toISOString(),
      deleted_by: user.id,
    })
    .eq("id", parsed.data.messageId);

  if (error) {
    return {
      ok: false as const,
      error: `Suppression échouée : ${error.message}`,
    };
  }

  return { ok: true as const };
}
