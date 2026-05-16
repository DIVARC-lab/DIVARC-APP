/* Étape 16 — Endpoint polling cadeaux récents.
 *
 * GET /api/lives/[sessionId]/gifts?since=60
 * → liste les cadeaux payés récents (max 30, fenêtre <= since secondes).
 *
 * Polling 3s côté viewer pour déclencher les animations overlay. */

import { type NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ sessionId: string }> },
) {
  const { sessionId } = await params;
  if (!/^[a-f0-9-]{36}$/i.test(sessionId)) {
    return NextResponse.json({ error: "invalid_id" }, { status: 400 });
  }

  const sinceParam = req.nextUrl.searchParams.get("since");
  const sinceSeconds = Math.min(
    Math.max(Number.parseInt(sinceParam ?? "60", 10) || 60, 5),
    300,
  );

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  /* eslint-disable-next-line @typescript-eslint/no-explicit-any */
  const { data, error } = await (supabase as any).rpc("list_recent_gifts", {
    p_session_id: sessionId,
    p_since_seconds: sinceSeconds,
  });

  if (error) {
    return NextResponse.json(
      { error: "rpc_failed", message: error.message },
      { status: 500 },
    );
  }

  return NextResponse.json({ items: data ?? [] });
}
