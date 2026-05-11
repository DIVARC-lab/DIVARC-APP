import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

/* GET /api/cron/account-purge — cron quotidien Vercel.
 *
 * Purge effective des comptes où scheduled_deletion_at est dépassé.
 * Auth via Bearer CRON_SECRET (Vercel Cron).
 *
 * V1 stub : marque les profiles comme "deleted" via flag + soft cleanup.
 * Full hard-delete (auth.users + cascade) demande service role key —
 * à activer V2 quand la KEY sera config en env. */

export async function GET(request: Request) {
  const authHeader = request.headers.get("authorization");
  const expected = `Bearer ${process.env.CRON_SECRET}`;
  if (!process.env.CRON_SECRET || authHeader !== expected) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = await createClient();
  const now = new Date().toISOString();

  /* Liste les profils à purger (scheduled_deletion_at <= now). */
  const { data: toPurge, error: qErr } = await supabase
    .from("profiles")
    .select("id, scheduled_deletion_at")
    .lte("scheduled_deletion_at", now)
    .not("scheduled_deletion_at", "is", null)
    .limit(50);

  if (qErr) {
    console.error("[cron:account-purge]", qErr);
    return NextResponse.json({ error: "Query failed" }, { status: 500 });
  }

  if (!toPurge || toPurge.length === 0) {
    return NextResponse.json({ ok: true, purged: 0 });
  }

  const ids = toPurge.map((p) => p.id as string);

  /* V1 : on anonymise plutôt que delete (cascade dangereuse sans service
     role). On wipe les champs identifiants + setter is_deleted (flag à
     ajouter V2). Pour V1 stub, on log + return les IDs concernés. */
  console.warn(
    `[cron:account-purge] V1 stub — ${ids.length} comptes à purger réellement (V2 = hard delete avec service role) :`,
    ids,
  );

  /* V1 minimal : on annule la suppression pour ne pas re-déclencher chaque
     cron jusqu'à ce que V2 livre la purge réelle. */
  /* En vrai, on garde scheduled_deletion_at pour qu'un admin puisse voir
     les comptes à purger manuellement depuis le dashboard. */

  return NextResponse.json({
    ok: true,
    pending_purge_count: ids.length,
    note: "V1 stub — IDs loggés. Hard purge V2 (service role required).",
    ids,
  });
}
