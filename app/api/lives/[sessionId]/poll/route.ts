import { type NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

/* Étape 11 — Endpoint résultats poll live actif.
 *
 * GET /api/lives/[sessionId]/poll
 * Retourne le poll actif le plus récent (open OU fermé < 5 min) avec
 * compteurs par option + mon vote. NULL si aucun poll. */

export const dynamic = "force-dynamic";

export async function GET(
  req: NextRequest,
  ctx: { params: Promise<{ sessionId: string }> },
) {
  const { sessionId } = await ctx.params;
  if (!/^[a-f0-9-]{36}$/i.test(sessionId)) {
    return NextResponse.json({ error: "invalid_id" }, { status: 400 });
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "unauthenticated" }, { status: 401 });
  }

  /* eslint-disable-next-line @typescript-eslint/no-explicit-any */
  const { data, error } = await (supabase as any).rpc(
    "get_live_poll_results",
    { p_session_id: sessionId },
  );

  if (error) {
    console.error("[get_live_poll_results]", error);
    return NextResponse.json({ error: "rpc_failed" }, { status: 500 });
  }

  return NextResponse.json(data ?? null);
}
