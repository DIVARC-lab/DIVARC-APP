import { NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";

/* Endpoint /api/push/subscribe — appelé côté client après que le browser
 * a accordé la permission Notification et créé une PushSubscription. */
const subscribeSchema = z.object({
  endpoint: z.string().url(),
  keys: z.object({
    p256dh: z.string().min(1),
    auth: z.string().min(1),
  }),
});

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const json = await request.json().catch(() => null);
  const parsed = subscribeSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid payload" },
      { status: 400 },
    );
  }

  const userAgent = request.headers.get("user-agent");

  /* Upsert sur (endpoint) — un même device qui se réinscrit overwrite ses
     keys (peuvent changer si le browser tourne ses keys). */
  const { error } = await supabase
    .from("push_subscriptions")
    .upsert(
      {
        user_id: user.id,
        endpoint: parsed.data.endpoint,
        p256dh: parsed.data.keys.p256dh,
        auth: parsed.data.keys.auth,
        user_agent: userAgent,
      },
      { onConflict: "endpoint" },
    );

  if (error) {
    return NextResponse.json(
      { error: "Subscription failed" },
      { status: 500 },
    );
  }

  return NextResponse.json({ ok: true });
}
