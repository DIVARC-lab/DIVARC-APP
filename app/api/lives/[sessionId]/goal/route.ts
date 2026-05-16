/* Étape 17 — Endpoint polling goal actif + progression calculée.
 *
 * GET /api/lives/[sessionId]/goal
 * → { goal: { id, goal_type, target_value, current_value, label,
 *             status, achieved_at } | null }
 *
 * Polling 5-10s côté viewer/host. RPC SECURITY DEFINER calcule
 * current_value à la volée selon goal_type. */

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
    "get_active_goal_with_progress",
    { p_session_id: sessionId },
  );

  if (error) {
    return NextResponse.json(
      { error: "rpc_failed", message: error.message },
      { status: 500 },
    );
  }

  const arr = (data ?? []) as Array<{
    id: string;
    goal_type: string;
    target_value: number;
    current_value: number;
    label: string;
    status: string;
    achieved_at: string | null;
  }>;
  return NextResponse.json({ goal: arr[0] ?? null });
}
