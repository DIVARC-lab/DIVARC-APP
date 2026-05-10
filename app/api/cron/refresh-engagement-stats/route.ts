import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

/* Cron qui rafraîchit la vue matérialisée post_engagement_stats.
 *
 * Sur Vercel Pro : schedule "*/5 * * * *" (toutes les 5 min).
 * Sur Hobby : utiliser Supabase pg_cron à la place :
 *
 *   select cron.schedule(
 *     'refresh-engagement-stats',
 *     '*\/5 * * * *',
 *     'refresh materialized view concurrently public.post_engagement_stats'
 *   );
 */
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
