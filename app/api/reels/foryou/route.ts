import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { runForYouPipeline } from "@/lib/recsys/foryouPipeline";

/* GET /api/reels/foryou — Chantier Reels Recsys étape 12.
 *
 * Pipeline V3 TikTok-style pour le Reels For You Page.
 * Surface : reels_foryou. Limit 5..50 (default 10).
 *
 * Réponse : { items, pipeline_metadata }. Les items sont des content_id
 * + ranking_metadata — le caller hydrate via lib/queries/reels.ts.
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
  const limit = Number(url.searchParams.get("limit") ?? "10");

  const result = await runForYouPipeline(supabase, user.id, "reels_foryou", {
    limit,
  });

  return NextResponse.json(result);
}
