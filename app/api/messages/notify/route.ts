import { type NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { sendPushToUsers } from "@/lib/push/sender";
import { createClient } from "@/lib/supabase/server";

/* Route Handler qui remplace la Server Action notifyNewMessage.
 * Server Actions wrappent les erreurs en prod avec un message générique,
 * ce qui empêche le debug. Une Route Handler classique renvoie le vrai
 * message en JSON. */

const bodySchema = z.object({
  conversationId: z.string().uuid(),
  body: z.string().nullable().optional(),
  isSecret: z.boolean().optional(),
  attachmentType: z.string().nullable().optional(),
});

export async function POST(req: NextRequest) {
  try {
    const json = await req.json();
    const parsed = bodySchema.safeParse(json);
    if (!parsed.success) {
      return NextResponse.json(
        { ok: false, error: "Invalid payload", details: parsed.error.message },
        { status: 400 },
      );
    }
    const { conversationId, body, isSecret, attachmentType } = parsed.data;

    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json(
        { ok: false, error: "Not authenticated" },
        { status: 401 },
      );
    }

    /* Profil expéditeur. */
    const { data: senderProfile } = await supabase
      .from("profiles")
      .select("full_name, username")
      .eq("id", user.id)
      .maybeSingle();
    const senderName =
      senderProfile?.full_name ?? senderProfile?.username ?? "Quelqu'un";

    /* Conv pour distinguer direct vs groupe + nom du groupe. */
    const { data: conv } = await supabase
      .from("conversations")
      .select("type, name")
      .eq("id", conversationId)
      .maybeSingle();
    if (!conv) {
      return NextResponse.json(
        { ok: false, error: "Conversation introuvable" },
        { status: 404 },
      );
    }

    /* Autres membres. */
    const { data: targets, error: targetsErr } = await supabase
      .from("conversation_members")
      .select("user_id, is_muted, mute_until")
      .eq("conversation_id", conversationId)
      .neq("user_id", user.id);

    if (targetsErr) {
      return NextResponse.json(
        { ok: false, error: `Query targets: ${targetsErr.message}` },
        { status: 500 },
      );
    }

    if (!targets || targets.length === 0) {
      return NextResponse.json({ ok: true, delivered: 0, reason: "no_targets" });
    }

    const nowMs = Date.now();
    const activeTargets = targets.filter((t) => {
      if (!t.is_muted) return true;
      if (!t.mute_until) return false;
      return new Date(t.mute_until).getTime() <= nowMs;
    });

    if (activeTargets.length === 0) {
      return NextResponse.json({
        ok: true,
        delivered: 0,
        reason: "all_muted",
      });
    }

    /* Compose title + body. */
    const isGroup = conv.type === "group";
    const title = isGroup ? conv.name ?? "Groupe" : senderName;
    const bodyText = isSecret
      ? "🔒 Nouveau message"
      : body
        ? isGroup
          ? `${senderName}: ${body.slice(0, 100)}`
          : body.slice(0, 100)
        : attachmentType === "image"
          ? "📷 Photo"
          : attachmentType === "audio"
            ? "🎙️ Message vocal"
            : attachmentType
              ? "📎 Pièce jointe"
              : isGroup
                ? `${senderName} a envoyé un message`
                : "Nouveau message";

    const userIds = activeTargets.map((t) => t.user_id);
    const send = await sendPushToUsers(userIds, {
      title,
      body: bodyText,
      url: `/messages/${conversationId}`,
      tag: `msg-${conversationId}`,
      icon: "/icon-192.png",
    });

    return NextResponse.json({
      ok: true,
      delivered: send.delivered,
      failed: send.failed,
      removedStale: send.removedStale,
      _debug: send._debug,
    });
  } catch (err) {
    console.error("[/api/messages/notify] threw:", err);
    return NextResponse.json(
      {
        ok: false,
        error: err instanceof Error ? err.message : String(err),
        stack: err instanceof Error ? err.stack : null,
      },
      { status: 500 },
    );
  }
}
