import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/server";
import {
  attribute,
  fetchTouchpoints,
  type AttributionModel,
  type AttributionConfig,
} from "@/lib/ads/attribution";

/* Cron : attribution des conversions à des clicks DIVARC.
 *
 * Schedule recommandé : toutes les 10 minutes.
 *
 * Modèle d'attribution par campagne (V2 — pour V1, on utilise un défaut
 * configurable via env ADS_ATTRIBUTION_MODEL_DEFAULT, sinon last_click).
 *
 * Window par défaut : 7 jours click + 1 jour view-through.
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
  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 3600 * 1000).toISOString();

  /* Modèle par défaut configurable. */
  const defaultModel = (process.env.ADS_ATTRIBUTION_MODEL_DEFAULT ??
    "last_click") as AttributionModel;
  const config: AttributionConfig = {
    model: defaultModel,
    click_window_days: Number(process.env.ADS_ATTRIBUTION_WINDOW ?? "7"),
    view_through_window_days: 1,
  };

  /* Récup conversions non attribuées. */
  const { data: conversions } = await admin
    .from("ad_conversions")
    .select("*")
    .is("attributed_ad_id", null)
    .gte("created_at", sevenDaysAgo)
    .eq("is_invalid", false)
    .limit(500);

  if (!conversions || conversions.length === 0) {
    return NextResponse.json({ ok: true, processed: 0, attributed: 0 });
  }

  let attributedCount = 0;
  const modelStats: Record<string, number> = {};

  for (const conv of conversions) {
    if (!conv.user_id) {
      /* Sans user_id, pas de matching cross-device V1. V2 :
         hashing email/phone pour join sur sessions DIVARC. */
      continue;
    }

    const touchpoints = await fetchTouchpoints(
      conv.user_id,
      new Date(conv.event_time),
      config.click_window_days,
    );
    if (touchpoints.length === 0) {
      /* Pas de click → tente view-through (impressions dans 1j). */
      const viewWindow = new Date(conv.event_time);
      const viewStart = new Date(
        viewWindow.getTime() - config.view_through_window_days * 24 * 3600 * 1000,
      );
      const { data: impressions } = await admin
        .from("ad_impressions")
        .select("ad_id, ad_account_id, campaign_id, created_at")
        .eq("user_id", conv.user_id)
        .gte("created_at", viewStart.toISOString())
        .lte("created_at", viewWindow.toISOString())
        .order("created_at", { ascending: false })
        .limit(1);
      if (impressions && impressions.length > 0) {
        const view = impressions[0]!;
        await admin
          .from("ad_conversions")
          .update({
            attributed_ad_id: view.ad_id,
            attribution_model: "view_through",
            attribution_window_days: config.view_through_window_days,
          })
          .eq("id", conv.id);
        attributedCount++;
        modelStats.view_through = (modelStats.view_through ?? 0) + 1;
      }
      continue;
    }

    const result = attribute(
      touchpoints,
      new Date(conv.event_time),
      config,
    );
    if (!result) continue;

    await admin
      .from("ad_conversions")
      .update({
        attributed_ad_id: result.attributed_ad_id,
        attributed_click_id: result.attributed_click_id,
        attribution_model: result.attribution_model,
        attribution_window_days: result.attribution_window_days,
      })
      .eq("id", conv.id);

    attributedCount++;
    modelStats[result.attribution_model] =
      (modelStats[result.attribution_model] ?? 0) + 1;
  }

  return NextResponse.json({
    ok: true,
    processed: conversions.length,
    attributed: attributedCount,
    by_model: modelStats,
  });
}
