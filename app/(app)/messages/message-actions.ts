"use server";

/* Server Actions pour les actions par-message (Chantier 1.8) :
 *   - forwardMessage : duplique un message dans une autre conv, set
 *     forwarded_from_* + bump forward_count
 *   - togglePinInConv : flip is_pinned_in_conv
 *   - editOwnMessage : édit le body de son propre message (texte clair,
 *     pas chiffré V1 — voir limites doc)
 *
 * Sécurité : RLS sécurise déjà la conv membership. On ne fait que des
 * UPDATE/INSERT côté membre, pas de RPC car la logique est simple. */

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";

const idSchema = z.string().uuid();

export type MessageActionResult =
  | { ok: true }
  | { ok: false; error: string };

/* Forward : on crée un nouveau message dans la conv cible. */
export async function forwardMessage(
  messageId: string,
  targetConversationId: string,
): Promise<MessageActionResult> {
  const parsedMessageId = idSchema.safeParse(messageId);
  const parsedTarget = idSchema.safeParse(targetConversationId);
  if (!parsedMessageId.success || !parsedTarget.success) {
    return { ok: false, error: "IDs invalides." };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Non authentifié." };

  /* Lookup le message source. RLS bloque déjà si non-membre. */
  const { data: source, error: sourceError } = await supabase
    .from("messages")
    .select(
      "id, sender_id, conversation_id, type, body, attachment_url, attachment_type, attachment_name, attachment_size, attachment_width, attachment_height, attachment_duration_ms, is_secret",
    )
    .eq("id", parsedMessageId.data)
    .maybeSingle();

  if (sourceError || !source) {
    return { ok: false, error: "Message introuvable." };
  }

  /* Refus V1 : les messages secrets ne sortent pas de leur conv (la
     session key est unique par-conv → impossible de re-chiffrer avec
     une autre clé sans re-encrypt côté client). */
  if (source.is_secret) {
    return {
      ok: false,
      error: "Les messages secrets ne peuvent pas être transférés.",
    };
  }

  /* Insert dans la conv cible avec forwarded_from_*. */
  const { error: insertError } = await supabase.from("messages").insert({
    conversation_id: parsedTarget.data,
    sender_id: user.id,
    type: source.type,
    body: source.body,
    attachment_url: source.attachment_url,
    attachment_type: source.attachment_type,
    attachment_name: source.attachment_name,
    attachment_size: source.attachment_size,
    attachment_width: source.attachment_width,
    attachment_height: source.attachment_height,
    attachment_duration_ms: source.attachment_duration_ms,
    forwarded_from_message_id: source.id,
    forwarded_from_user_id: source.sender_id,
  });

  if (insertError) {
    console.error("[forwardMessage]", insertError);
    return { ok: false, error: "Échec du transfert." };
  }

  /* Bump forward_count côté source — best-effort, ignore l'erreur si
     RLS bloque (l'user n'est peut-être pas l'auteur, c'est OK). */
  const { data: refreshed } = await supabase
    .from("messages")
    .select("forward_count")
    .eq("id", source.id)
    .maybeSingle();
  if (refreshed) {
    await supabase
      .from("messages")
      .update({ forward_count: (refreshed.forward_count ?? 0) + 1 })
      .eq("id", source.id);
  }

  revalidatePath(`/messages/${parsedTarget.data}`);
  return { ok: true };
}

/* Pin dans la conv : flip le boolean. */
export async function togglePinInConv(
  messageId: string,
): Promise<MessageActionResult> {
  const parsed = idSchema.safeParse(messageId);
  if (!parsed.success) return { ok: false, error: "Message invalide." };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Non authentifié." };

  /* Lookup état actuel. */
  const { data: existing } = await supabase
    .from("messages")
    .select("id, conversation_id, is_pinned_in_conv")
    .eq("id", parsed.data)
    .maybeSingle();

  if (!existing) return { ok: false, error: "Message introuvable." };

  const { error } = await supabase
    .from("messages")
    .update({ is_pinned_in_conv: !existing.is_pinned_in_conv })
    .eq("id", parsed.data);

  if (error) return { ok: false, error: "Échec de l'épinglage." };

  revalidatePath(`/messages/${existing.conversation_id}`);
  return { ok: true };
}

/* Édition de son propre message (V1 texte non-secret uniquement). */
const editSchema = z.object({
  messageId: z.string().uuid(),
  body: z.string().trim().min(1).max(4000),
});

export async function editOwnMessage(
  messageId: string,
  newBody: string,
): Promise<MessageActionResult> {
  const parsed = editSchema.safeParse({ messageId, body: newBody });
  if (!parsed.success) return { ok: false, error: "Édition invalide." };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Non authentifié." };

  /* Vérifie propriété + non-secret. */
  const { data: existing } = await supabase
    .from("messages")
    .select("id, sender_id, is_secret, conversation_id")
    .eq("id", parsed.data.messageId)
    .maybeSingle();

  if (!existing) return { ok: false, error: "Message introuvable." };
  if (existing.sender_id !== user.id) {
    return { ok: false, error: "Tu ne peux modifier que tes propres messages." };
  }
  if (existing.is_secret) {
    return {
      ok: false,
      error: "Les messages secrets ne peuvent pas être édités en V1.",
    };
  }

  const { error } = await supabase
    .from("messages")
    .update({
      body: parsed.data.body,
      edited_at: new Date().toISOString(),
    })
    .eq("id", parsed.data.messageId);

  if (error) return { ok: false, error: "Échec de la modification." };

  revalidatePath(`/messages/${existing.conversation_id}`);
  return { ok: true };
}
