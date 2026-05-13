import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/server";

/* GET /api/cron/circles-vitality
 *
 * Cron Vercel quotidien — recalcule vitality_score + counters dénormalisés
 * pour TOUS les cercles non archivés via le RPC refresh_all_circles_vitality
 * (migration 0105).
 *
 * Configuration vercel.json :
 *   { "path": "/api/cron/circles-vitality", "schedule": "0 4 * * *" }
 *   (chaque jour à 4h UTC = 5/6h Paris).
 *
 * Auth : Bearer CRON_SECRET (Vercel ajoute le token automatiquement).
 */

export const runtime = "nodejs";
export const maxDuration = 60;

export async function GET(request: Request) {
  const auth = request.headers.get("authorization");
  const expected = process.env.CRON_SECRET;
  if (expected && auth !== `Bearer ${expected}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const admin = createAdminClient();

  const start = Date.now();
  const { data, error } = await admin.rpc(
    "refresh_all_circles_vitality",
    {},
  );

  if (error) {
    console.error("[cron:circles-vitality]", error);
    return NextResponse.json(
      { error: "RPC failed", message: error.message, code: error.code },
      { status: 500 },
    );
  }

  const elapsedMs = Date.now() - start;
  const rows = (data ?? []) as Array<{ circle_id: string }>;

  return NextResponse.json({
    ok: true,
    circles_refreshed: rows.length,
    elapsed_ms: elapsedMs,
  });
}
