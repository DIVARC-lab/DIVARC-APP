import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

/* Cron qui rafraîchit la vue matérialisée post_engagement_stats.
 *
 * Sur Vercel Pro : schedule toutes les 5 minutes (cf. CRON_SETUP.md).
 * Sur Hobby : utiliser Supabase pg_cron à la place qui appelle
 * directement la RPC refresh_post_engagement_stats() — voir
 * CRON_SETUP.md pour les snippets SQL exacts. */
export async function GET(request: Request) {
  const authHeader = request.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = createAdminClient();
  const { error } = await supabase.rpc("refresh_post_engagement_stats");
  if (error) {
    return NextResponse.json(
      { error: "Refresh failed", details: error.message },
      { status: 500 },
    );
  }
  return NextResponse.json({ ok: true });
}
