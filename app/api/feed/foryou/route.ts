import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { runForYouPipeline } from "@/lib/recsys/foryouPipeline";

/* GET /api/feed/foryou — Chantier Reels Recsys étape 12.
 *
 * Pipeline V3 TikTok-style pour le feed posts personnel.
 * Surface : feed_foryou. Limit 5..50 (default 30).
 *
 * Réponse : ForYouResult avec items + pipeline_metadata pour debug.
 */
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const url = new URL(request.url);
  const limit = Number(url.searchParams.get("limit") ?? "30");

  const result = await runForYouPipeline(supabase, user.id, "feed_foryou", {
    limit,
  });

  return NextResponse.json(result);
}
