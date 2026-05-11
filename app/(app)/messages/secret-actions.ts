"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";

/* Server Actions pour le mode "Conversation secrète" (E2E opt-in).
 *
 * Logique :
 *   - Chaque membre d'une conv direct peut activer wants_secret=true.
 *   - Quand LES DEUX membres ont wants_secret=true → la conv est en
 *     mode secret effectif : tous les nouveaux messages sont chiffrés.
 *   - Les messages clairs préexistants restent lisibles ; seuls les
 *     nouveaux sont chiffrés.
 *
 * V1 limité aux conv direct (2 membres). Les groupes ne supportent pas
 * le secret en V1 (Double Ratchet par-sender V2). */

export type SecretActionResult =
  | { ok: true; isSecret: boolean; peerWantsSecret: boolean }
  | { ok: false; error: string };

const convIdSchema = z.string().uuid();

/* Toggle wants_secret pour le membre courant. */
export async function setMyWantsSecret(
  conversationId: string,
  wants: boolean,
): Promise<SecretActionResult> {
  const parsed = convIdSchema.safeParse(conversationId);
  if (!parsed.success) return { ok: false, error: "ID conv invalide." };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Non authentifié." };

  /* Vérifie que la conv est direct (V1 limit). */
  const { data: conv } = await supabase
    .from("conversations")
    .select("type")
    .eq("id", conversationId)
    .maybeSingle();
  if (!conv) return { ok: false, error: "Conversation introuvable." };
  if (conv.type !== "direct") {
    return {
      ok: false,
      error: "Le mode secret n'est disponible que pour les conversations 1:1 en V1.",
    };
  }

  /* Vérifie que l'user a uploadé une identity_key. */
  if (wants) {
    const { data: identity } = await supabase
      .from("signal_identity_keys")
      .select("user_id")
      .eq("user_id", user.id)
      .maybeSingle();
    if (!identity) {
      return {
        ok: false,
        error:
          "Active d'abord le chiffrement dans Paramètres → Sécurité → Chiffrement.",
      };
    }
  }

  /* Set wants_secret côté membre. */
  const { error } = await supabase
    .from("conversation_members")
    .update({ wants_secret: wants })
    .eq("conversation_id", conversationId)
    .eq("user_id", user.id);

  if (error) {
    console.error("[setMyWantsSecret]", error);
    return { ok: false, error: "Échec mise à jour." };
  }

  /* Récupère le statut peer pour informer l'UI. */
  const { data: peer } = await supabase
    .from("conversation_members")
    .select("wants_secret")
    .eq("conversation_id", conversationId)
    .neq("user_id", user.id)
    .maybeSingle();

  const peerWantsSecret = peer?.wants_secret ?? false;
  const isSecret = wants && peerWantsSecret;

  revalidatePath(`/messages/${conversationId}`);
  revalidatePath(`/messages/${conversationId}/settings`);
  return { ok: true, isSecret, peerWantsSecret };
}

/* Lookup statut secret d'une conversation pour le membre courant. */
export async function getSecretStatus(
  conversationId: string,
): Promise<{
  myWantsSecret: boolean;
  peerWantsSecret: boolean;
  peerUserId: string | null;
  peerHasIdentity: boolean;
  isEffectiveSecret: boolean;
}> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return {
      myWantsSecret: false,
      peerWantsSecret: false,
      peerUserId: null,
      peerHasIdentity: false,
      isEffectiveSecret: false,
    };
  }

  const { data: members } = await supabase
    .from("conversation_members")
    .select("user_id, wants_secret")
    .eq("conversation_id", conversationId);

  const me = members?.find((m) => m.user_id === user.id);
  const peer = members?.find((m) => m.user_id !== user.id);

  const myWantsSecret = me?.wants_secret ?? false;
  const peerWantsSecret = peer?.wants_secret ?? false;
  const peerUserId = peer?.user_id ?? null;

  let peerHasIdentity = false;
  if (peerUserId) {
    const { data: peerIdentity } = await supabase
      .from("signal_identity_keys")
      .select("user_id")
      .eq("user_id", peerUserId)
      .maybeSingle();
    peerHasIdentity = peerIdentity !== null;
  }

  return {
    myWantsSecret,
    peerWantsSecret,
    peerUserId,
    peerHasIdentity,
    isEffectiveSecret: myWantsSecret && peerWantsSecret && peerHasIdentity,
  };
}

/* Envoyer un message chiffré. L'UI a déjà chiffré côté client. */
const secretMessageSchema = z.object({
  conversationId: z.string().uuid(),
  encryptedPayload: z.object({
    ciphertext: z.string().min(1),
    iv: z.string().min(1),
    sessionKeyHash: z.string().min(1),
    version: z.literal(1),
  }),
  replyToMessageId: z.string().uuid().nullable().optional(),
});

export async function sendSecretMessage(
  input: z.infer<typeof secretMessageSchema>,
): Promise<{ ok: true; messageId: string } | { ok: false; error: string }> {
  const parsed = secretMessageSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalide." };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Non authentifié." };

  /* encrypted_content stocké en base64 dans une colonne bytea —
     Supabase JS auto-converts si on passe un Uint8Array. Pour V1
     simplification on stocke directement le base64 dans un text via
     encryption_metadata.ciphertext, et on laisse encrypted_content null.
     V2 : passage en bytea raw via Buffer.from(base64, 'base64'). */
  const { data: inserted, error } = await supabase
    .from("messages")
    .insert({
      conversation_id: parsed.data.conversationId,
      sender_id: user.id,
      type: "text",
      body: null,
      is_secret: true,
      encryption_metadata: {
        ciphertext: parsed.data.encryptedPayload.ciphertext,
        iv: parsed.data.encryptedPayload.iv,
        sessionKeyHash: parsed.data.encryptedPayload.sessionKeyHash,
        version: parsed.data.encryptedPayload.version,
      },
      reply_to_message_id: parsed.data.replyToMessageId ?? null,
    })
    .select("id")
    .single();

  if (error || !inserted) {
    console.error("[sendSecretMessage]", error);
    return { ok: false, error: "Échec envoi." };
  }

  revalidatePath(`/messages/${parsed.data.conversationId}`);
  return { ok: true, messageId: inserted.id };
}
