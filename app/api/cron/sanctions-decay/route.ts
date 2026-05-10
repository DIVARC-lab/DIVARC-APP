import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/server";

/* Cron : décay des sanctions expirées + recalcul trust_score.
 *
 * Schedule recommandé : toutes les heures (cf CRON_SETUP.md).
 *
 * Tâches :
 *   1. Marquer is_active=false sur les sanctions dont expires_at < now()
 *   2. Pour chaque user impacté, déclencher recalculate_trust_score
 *   3. Le trigger user_sanctions_trust_recalc s'occupe déjà du recalcul
 *      sur INSERT, mais ici on agit sur UPDATE is_active → pareil
 *   4. Marquer également les sanctions de niveau 1 (warning) > 180 jours
 *      comme "lifted" pour que le décay du score s'applique
 *
 * Auth : Bearer CRON_SECRET (Vercel Cron) OU appel direct depuis pg_cron.
 */

export async function GET(request: Request) {
  const auth = request.headers.get("authorization");
  if (
    process.env.CRON_SECRET &&
    auth !== `Bearer ${process.env.CRON_SECRET}`
  ) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const admin = createAdminClient();
  const stamp = new Date().toISOString();

  /* 1. Sanctions expirées par expires_at. */
  const { data: expired, error: expiredErr } = await admin
    .from("user_sanctions")
    .update({ is_active: false, lifted_at: stamp, lifted_reason: "expired" })
    .eq("is_active", true)
    .lt("expires_at", stamp)
    .select("id, user_id");

  if (expiredErr) {
    console.error("[cron:sanctions-decay] expired update failed:", expiredErr);
    return NextResponse.json(
      { ok: false, error: "expired_update_failed" },
      { status: 500 },
    );
  }

  /* 2. Warnings > 180 jours sans nouvelle violation → lifted (décay
     RGPD-friendly, conforme principe de proportionnalité DSA). */
  const sixMonthsAgo = new Date(
    Date.now() - 180 * 24 * 3600 * 1000,
  ).toISOString();
  const { data: stale, error: staleErr } = await admin
    .from("user_sanctions")
    .update({ is_active: false, lifted_at: stamp, lifted_reason: "decay_180d" })
    .eq("is_active", true)
    .eq("level", 1)
    .lt("starts_at", sixMonthsAgo)
    .select("id, user_id");

  if (staleErr) {
    console.error("[cron:sanctions-decay] stale update failed:", staleErr);
  }

  /* 3. Recalcul trust_score pour les users impactés (le trigger DB le
     fait déjà sur UPDATE de is_active, mais on déclenche à nouveau pour
     garantir la cohérence si le trigger a été désactivé temporairement
     pendant une migration). */
  const userIds = new Set<string>();
  for (const s of expired ?? []) userIds.add(s.user_id);
  for (const s of stale ?? []) userIds.add(s.user_id);

  let recalculated = 0;
  for (const uid of userIds) {
    const { error } = await admin.rpc("recalculate_trust_score", {
      p_user_id: uid,
    });
    if (!error) recalculated++;
  }

  return NextResponse.json({
    ok: true,
    expired: expired?.length ?? 0,
    stale: stale?.length ?? 0,
    trust_recalculated: recalculated,
    timestamp: stamp,
  });
}
