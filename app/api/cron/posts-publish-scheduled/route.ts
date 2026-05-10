import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/server";

/* GET /api/cron/posts-publish-scheduled
 *
 * Cron Vercel — passe les posts status='scheduled' avec
 * scheduled_for ≤ now() en status='published' + published_at=scheduled_for.
 *
 * Configuration recommandée dans vercel.json :
 *   { "crons": [{ "path": "/api/cron/posts-publish-scheduled",
 *                 "schedule": "* / 5 * * * *" }] }
 *
 * Auth : header Authorization: Bearer <CRON_SECRET> (Vercel envoie
 * automatiquement le token configuré dans le dashboard).
 */

export const runtime = "nodejs";
export const maxDuration = 30;

export async function GET(request: Request) {
  /* Auth simple via Bearer token (Vercel envoie le secret). */
  const auth = request.headers.get("authorization");
  const expected = process.env.CRON_SECRET;
  if (expected && auth !== `Bearer ${expected}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const admin = createAdminClient();
  const nowIso = new Date().toISOString();

  /* Sélectionne les posts à publier (limit 200 pour éviter timeout). */
  const { data: due, error: fetchErr } = await admin
    .from("posts")
    .select("id, scheduled_for")
    .eq("status", "scheduled")
    .lte("scheduled_for", nowIso)
    .is("deleted_at", null)
    .limit(200);

  if (fetchErr) {
    console.error("[cron:posts-publish-scheduled:fetch]", fetchErr);
    return NextResponse.json(
      { error: "Fetch failed", code: fetchErr.code },
      { status: 500 },
    );
  }

  if (!due || due.length === 0) {
    return NextResponse.json({ published: 0 });
  }

  const ids = due.map((p) => p.id);
  const { error: updateErr } = await admin
    .from("posts")
    .update({
      status: "published",
      published_at: nowIso,
    })
    .in("id", ids);

  if (updateErr) {
    console.error("[cron:posts-publish-scheduled:update]", updateErr);
    return NextResponse.json(
      { error: "Update failed", code: updateErr.code },
      { status: 500 },
    );
  }

  return NextResponse.json({
    published: ids.length,
    ids,
    ran_at: nowIso,
  });
}
