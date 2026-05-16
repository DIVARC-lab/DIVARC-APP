/* Étape 14 — Endpoint polling super-chats actifs.
 *
 * GET /api/lives/[sessionId]/super-chats
 * → liste les super-chats encore épinglés (pinned_until_at > now())
 * Triés par tier desc puis paid_at desc, limité à 10.
 *
 * Auth requise (RLS via list_active_super_chats SECURITY DEFINER).
 * Polling côté viewer toutes les 5s — pas Realtime pour V1. */

import { type NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ sessionId: string }> },
) {
  const { sessionId } = await params;
  if (!/^[a-f0-9-]{36}$/i.test(sessionId)) {
    return NextResponse.json({ error: "invalid_id" }, { status: 400 });
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  /* eslint-disable-next-line @typescript-eslint/no-explicit-any */
  const { data, error } = await (supabase as any).rpc(
    "list_active_super_chats",
    { p_session_id: sessionId },
  );

  if (error) {
    return NextResponse.json(
      { error: "rpc_failed", message: error.message },
      { status: 500 },
    );
  }

  return NextResponse.json({ items: data ?? [] });
}
