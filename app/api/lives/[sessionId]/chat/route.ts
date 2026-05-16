/* Étape 18 — Endpoint polling chat live.
 *
 * GET /api/lives/[sessionId]/chat?since=<iso>&limit=<n>
 * → liste les messages non supprimés via RPC list_live_chat_messages.
 *
 * Polling 2s côté drawer chat (faux realtime). */

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
  const limitParam = req.nextUrl.searchParams.get("limit");
  const limit = Math.max(
    1,
    Math.min(Number.parseInt(limitParam ?? "50", 10) || 50, 200),
  );

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  /* eslint-disable-next-line @typescript-eslint/no-explicit-any */
  const { data, error } = await (supabase as any).rpc(
    "list_live_chat_messages",
    {
      p_session_id: sessionId,
      p_since: sinceParam ?? null,
      p_limit: limit,
    },
  );

  if (error) {
    return NextResponse.json(
      { error: "rpc_failed", message: error.message },
      { status: 500 },
    );
  }

  /* RPC retourne DESC → on inverse pour l'affichage chronologique. */
  const items = ((data ?? []) as Array<unknown>).slice().reverse();
  return NextResponse.json({ items });
}
