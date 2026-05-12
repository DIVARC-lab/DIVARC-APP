"use server";

/* Server Action pour notifier l'arrivée d'un nouveau message via Web Push
 * VAPID. Respecte le mute par-conversation (skip push si le destinataire
 * a muté la conv).
 *
 * Appelée fire-and-forget par le MessageComposer après chaque envoi. */

import { z } from "zod";
import { sendPushToUsers } from "@/lib/push/sender";
import { createClient } from "@/lib/supabase/server";

const idSchema = z.string().uuid();

export type NotifyResult =
  | { ok: true; delivered: number }
  | { ok: false; error: string };

/* Notifie tous les autres membres de la conv (sauf l'expéditeur) qui
 * n'ont pas muté cette conversation. V1 : preview = body (ou "Photo"
 * pour image / "Vocal" pour audio etc). Si le message est secret, on
 * ne révèle pas le contenu (placeholder "🔒 Nouveau message"). */
export async function notifyNewMessage(
  conversationId: string,
  preview: {
    body?: string | null;
    isSecret?: boolean;
    attachmentType?: string | null;
  } = {},
): Promise<NotifyResult> {
  try {
    const parsed = idSchema.safeParse(conversationId);
    if (!parsed.success) return { ok: false, error: "Conv invalide." };

    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return { ok: false, error: "Non authentifié." };

    /* Récupère le nom de l'expéditeur. */
    const { data: senderProfile } = await supabase
      .from("profiles")
      .select("full_name, username")
      .eq("id", user.id)
      .maybeSingle();
    const senderName =
      senderProfile?.full_name ?? senderProfile?.username ?? "Quelqu'un";

    /* Récupère le nom de la conv (utile pour les groupes). */
    const { data: conv } = await supabase
      .from("conversations")
      .select("type, name")
      .eq("id", parsed.data)
      .maybeSingle();
    if (!conv) return { ok: false, error: "Conv introuvable." };

    /* Récupère les autres membres NON-mutés.
       Important : on a besoin du admin client pour bypasser RLS et lire
       les autres membres (RLS restreint aux membres seulement, mais
       l'auth.uid() est le membre, donc OK). */
    const { data: targets } = await supabase
      .from("conversation_members")
      .select("user_id, is_muted, mute_until")
      .eq("conversation_id", parsed.data)
      .neq("user_id", user.id);

    if (!targets || targets.length === 0) {
      return { ok: true, delivered: 0 };
    }

    const now = Date.now();
    const activeTargets = targets.filter((t) => {
      /* Skip si is_muted et (mute_until null = permanent OU mute_until
         dans le futur). */
      if (!t.is_muted) return true;
      if (!t.mute_until) return false; // muté pour toujours
      return new Date(t.mute_until).getTime() <= now; // mute expiré
    });

    if (activeTargets.length === 0) {
      return { ok: true, delivered: 0 };
    }

    /* Compose le titre + body. */
    const isGroup = conv.type === "group";
    const title = isGroup
      ? `${conv.name ?? "Groupe"}`
      : senderName;
    const bodyText = preview.isSecret
      ? "🔒 Nouveau message"
      : preview.body
        ? isGroup
          ? `${senderName}: ${preview.body.slice(0, 100)}`
          : preview.body.slice(0, 100)
        : preview.attachmentType === "image"
          ? "📷 Photo"
          : preview.attachmentType === "audio"
            ? "🎙️ Message vocal"
            : preview.attachmentType
              ? "📎 Pièce jointe"
              : isGroup
                ? `${senderName} a envoyé un message`
                : "Nouveau message";

    /* sendPushToUsers utilise la RPC SECURITY DEFINER pour bypass RLS
       et récupérer les subs des destinataires. */
    const userIds = activeTargets.map((t) => t.user_id);
    const res = await sendPushToUsers(userIds, {
      title,
      body: bodyText,
      url: `/messages/${parsed.data}`,
      tag: `msg-${parsed.data}`, // replace les notifs précédentes de la conv
      icon: "/icon-192.png",
    });

    return { ok: true, delivered: res.delivered };
  } catch (err) {
    console.error("[notifyNewMessage] threw:", err);
    return {
      ok: false,
      error: err instanceof Error ? err.message : "Exception push msg.",
    };
  }
}
