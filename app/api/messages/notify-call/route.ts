import { type NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { sendPushToUsers } from "@/lib/push/sender";
import { createClient } from "@/lib/supabase/server";

/* Route Handler qui remplace la Server Action notifyIncomingCall. */

const bodySchema = z.object({
  calleeUserId: z.string().uuid(),
  conversationId: z.string().uuid(),
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
    const { calleeUserId, conversationId } = parsed.data;

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

    const { data: callerProfile } = await supabase
      .from("profiles")
      .select("full_name, username")
      .eq("id", user.id)
      .maybeSingle();
    const callerName =
      callerProfile?.full_name ?? callerProfile?.username ?? "Quelqu'un";

    const send = await sendPushToUsers([calleeUserId], {
      title: `📞 ${callerName} t'appelle`,
      body: "Touche pour décrocher",
      url: `/messages/${conversationId}`,
      tag: `call-${conversationId}`,
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
    console.error("[/api/messages/notify-call] threw:", err);
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
