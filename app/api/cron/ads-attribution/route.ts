import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/server";

/* Cron : attribution des conversions à des clicks DIVARC.
 *
 * Schedule recommandé : toutes les 10 minutes.
 *
 * Algorithme V1 (last-click) :
 *   1. Récup conversions where attributed_ad_id IS NULL
 *      AND created_at > now() - interval '7 days'
 *   2. Pour chaque conversion :
 *      - Si user_id présent : cherche dernier ad_click de ce user
 *        dans la fenêtre [event_time - 7j, event_time]
 *      - Si pas de user_id mais external_id présent : V2 cross-device
 *      - Match → update attributed_ad_id + attributed_click_id +
 *        attribution_model = 'last_click' + attribution_window_days = 7
 *
 * Modèles supportés (V2 : configurable par campaign) :
 *   - last_click (défaut V1)
 *   - first_click
 *   - linear (réparti également)
 *   - time_decay (poids exponentiel 7j)
 *   - position_based (40/40/20)
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

  for (const conv of conversions) {
    if (!conv.user_id) {
      /* V2 : matching via external_id hashed. Pour V1 on skip. */
      continue;
    }

    /* Last-click : dernier ad_click du user dans les 7 jours avant
       event_time. */
    const eventTime = new Date(conv.event_time);
    const windowStart = new Date(eventTime.getTime() - 7 * 24 * 3600 * 1000);

    const { data: clicks } = await admin
      .from("ad_clicks")
      .select("id, ad_id, created_at")
      .eq("user_id", conv.user_id)
      .eq("is_invalid", false)
      .gte("created_at", windowStart.toISOString())
      .lt("created_at", eventTime.toISOString())
      .order("created_at", { ascending: false })
      .limit(1);

    if (clicks && clicks.length > 0) {
      const click = clicks[0];
      await admin
        .from("ad_conversions")
        .update({
          attributed_ad_id: click.ad_id,
          attributed_click_id: click.id,
          attribution_model: "last_click",
          attribution_window_days: 7,
        })
        .eq("id", conv.id);
      attributedCount++;
    }
  }

  return NextResponse.json({
    ok: true,
    processed: conversions.length,
    attributed: attributedCount,
  });
}
