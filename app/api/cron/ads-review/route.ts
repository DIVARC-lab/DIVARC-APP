import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/server";
import { applyAdReview, reviewAd } from "@/lib/ads/brandSafety";

/* Cron : revue automatique des ads en statut pending.
 *
 * Schedule recommandé : toutes les 5 minutes.
 *
 * Process :
 *   1. Récup ads where review_status = 'pending' (max 50/run)
 *   2. Pour chaque ad : reviewAd(ad, creative)
 *      - Niveau 1 (auto) : auto_approved
 *      - Niveau 2 (sensible) : pending → reste en attente humaine
 *      - Niveau 3 (interdit) : rejected
 *   3. applyAdReview met à jour ad + creative (auto_disclaimer)
 *
 * Niveau 4 (re-review post-publication) : 5% sample des
 * auto_approved + ads avec observed_ctr / total_impressions
 * anormal → flagué en re_review pour examen humain.
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

  const { data: pendingAds } = await admin
    .from("ads_ads")
    .select("*")
    .eq("review_status", "pending")
    .limit(50);

  if (!pendingAds || pendingAds.length === 0) {
    return NextResponse.json({ ok: true, reviewed: 0 });
  }

  const creativeIds = pendingAds.map((a) => a.creative_id);
  const { data: creatives } = await admin
    .from("ads_creatives")
    .select("*")
    .in("id", creativeIds);
  const creativeMap = new Map((creatives ?? []).map((c) => [c.id, c]));

  let approved = 0;
  let rejected = 0;
  let held = 0;

  for (const ad of pendingAds) {
    const creative = creativeMap.get(ad.creative_id);
    if (!creative) continue;
    try {
      const result = await reviewAd(ad, creative);
      await applyAdReview(ad.id, result, null);
      if (result.decision === "auto_approved") approved++;
      else if (result.decision === "rejected") rejected++;
      else held++;
    } catch (err) {
      console.error(`[cron:ads-review] ad ${ad.id} failed:`, err);
    }
  }

  /* Niveau 4 — re-review 5% sample auto_approved (V2) :
     SELECT * FROM ads_ads WHERE review_status='auto_approved'
     AND created_at > now()-interval '7 days' ORDER BY random() LIMIT 5
     → flag en re_review pour modérateur. */

  return NextResponse.json({
    ok: true,
    reviewed: pendingAds.length,
    approved,
    rejected,
    held,
  });
}
