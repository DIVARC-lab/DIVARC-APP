import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/server";

/* GET /api/cron/circles-digest
 *
 * Cron Vercel hebdomadaire (dimanche matin) — pour chaque cercle non-archivé
 * avec au moins 1 post cette semaine, enfile une notification in-app
 * "Récap de ta semaine dans X" à tous les membres ayant
 * notifications.weekly_digest=true.
 *
 * Configuration vercel.json :
 *   { "path": "/api/cron/circles-digest", "schedule": "0 9 * * 0" }
 *   (chaque dimanche à 9h UTC = 10/11h Paris).
 *
 * Cap : 500 cercles par run. Si plus, le cron suivant prendra le relais
 * via un last_digest_at à venir au Chantier 5.7.
 *
 * Auth : Bearer CRON_SECRET.
 */

export const runtime = "nodejs";
export const maxDuration = 60;

type CircleStats = {
  posts_count: number;
  new_members: number;
  listings_count: number;
  jobs_count: number;
  events_count: number;
  top_posts: Array<{ id: string; body: string; upvotes: number; helpful: number }>;
};

export async function GET(request: Request) {
  const auth = request.headers.get("authorization");
  const expected = process.env.CRON_SECRET;
  if (expected && auth !== `Bearer ${expected}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const admin = createAdminClient();
  const start = Date.now();

  /* Cercles actifs cette semaine (au moins 1 post). On évite de spammer
   * les cercles dormants. */
  const sevenDaysAgo = new Date(
    Date.now() - 7 * 24 * 60 * 60 * 1000,
  ).toISOString();

  const { data: activeCircles, error: circlesErr } = await admin
    .from("circles")
    .select("id, slug, name")
    .is("archived_at", null)
    .gt("posts_count_7d", 0)
    .order("vitality_score", { ascending: false })
    .limit(500);

  if (circlesErr) {
    console.error("[cron:circles-digest:fetch]", circlesErr);
    return NextResponse.json(
      { error: "Fetch failed", code: circlesErr.code },
      { status: 500 },
    );
  }

  if (!activeCircles || activeCircles.length === 0) {
    return NextResponse.json({ ok: true, circles_processed: 0, notifications: 0 });
  }

  let totalNotifications = 0;
  let circlesProcessed = 0;

  for (const circle of activeCircles) {
    /* Stats agrégées. */
    const { data: stats, error: statsErr } = await admin.rpc(
      "circle_weekly_stats",
      { p_circle_id: circle.id },
    );
    if (statsErr || !stats) {
      console.warn(
        "[cron:circles-digest] stats fail for",
        circle.slug,
        statsErr?.message,
      );
      continue;
    }

    const s = stats as CircleStats;
    /* Skip si vraiment rien à dire (sécurité, le filtre posts_count_7d>0
     * devrait déjà l'éviter). */
    if (s.posts_count === 0 && s.new_members === 0) continue;

    /* Construction du body. */
    const parts: string[] = [];
    if (s.posts_count > 0)
      parts.push(`${s.posts_count} post${s.posts_count > 1 ? "s" : ""}`);
    if (s.new_members > 0)
      parts.push(
        `${s.new_members} nouveau${s.new_members > 1 ? "x" : ""} membre${s.new_members > 1 ? "s" : ""}`,
      );
    if (s.listings_count > 0)
      parts.push(`${s.listings_count} annonce${s.listings_count > 1 ? "s" : ""}`);
    if (s.jobs_count > 0)
      parts.push(`${s.jobs_count} offre${s.jobs_count > 1 ? "s" : ""} d'emploi`);
    if (s.events_count > 0)
      parts.push(
        `${s.events_count} event${s.events_count > 1 ? "s" : ""} à venir`,
      );

    const title = `Récap : ${circle.name}`;
    const body = parts.length > 0 ? parts.join(" · ") : "Activité douce cette semaine.";
    const href = `/circles/${circle.slug}`;

    /* Liste des membres avec digest activé. RLS bypass via admin client. */
    const { data: members } = await admin
      .from("circle_members")
      .select("user_id, notifications, last_active_at")
      .eq("circle_id", circle.id)
      .eq("status", "active");

    if (!members) continue;

    type Member = {
      user_id: string;
      notifications: { weekly_digest?: boolean } | null;
      last_active_at: string | null;
    };
    const eligible = (members as Member[]).filter((m) =>
      m.notifications?.weekly_digest !== false,
    );

    /* Insert notifications via RPC idempotent. */
    for (const m of eligible) {
      const { data: inserted } = await admin.rpc(
        "enqueue_circle_weekly_digest",
        {
          p_circle_id: circle.id,
          p_user_id: m.user_id,
          p_title: title,
          p_body: body,
          p_href: href,
        },
      );
      if (inserted) totalNotifications++;
    }

    circlesProcessed++;
  }

  return NextResponse.json({
    ok: true,
    circles_processed: circlesProcessed,
    notifications: totalNotifications,
    elapsed_ms: Date.now() - start,
    /* Le filter sevenDaysAgo est conservé pour observability même si non
     * utilisé directement (le RPC filtre côté SQL). */
    _since: sevenDaysAgo,
  });
}
