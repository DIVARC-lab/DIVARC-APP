import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

/* GET /api/ads/diagnostic/last-error
 *
 * Retourne la dernière analyse Website Analyzer en status "failed"
 * (toutes analyses confondues sur le compte du user). Permet de voir
 * le vrai message d'erreur serveur quand un 500 / 502 a été reçu côté
 * frontend mais que la cause réelle est stockée en DB.
 *
 * Auth : authenticated only.
 */

export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data, error } = await supabase
    .from("ads_website_analyses")
    .select(
      "id, url_original, status, error_message, pages_crawled, duration_ms, created_at",
    )
    .eq("requested_by", user.id)
    .order("created_at", { ascending: false })
    .limit(5);

  if (error) {
    return NextResponse.json(
      { error: "Lookup failed", code: error.code, message: error.message },
      { status: 500 },
    );
  }

  return NextResponse.json(
    { recent_analyses: data ?? [] },
    { headers: { "Cache-Control": "no-store" } },
  );
}
