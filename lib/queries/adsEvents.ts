import "server-only";
import { createAdminClient } from "@/lib/supabase/server";

/* Reporting par event_name avec drilldown attribution.
 *
 * Pour un ad_account donné :
 *   - Liste tous les events agrégés par event_name sur la période
 *   - Pour chaque event_name : count, total_value, % attribué (vs
 *     non-attribué = direct), répartition par modèle d'attribution
 *   - Top 10 ads attribuées (count + value par ad)
 *   - Breakdown source : Pixel only / CAPI only / Both (dédoublonnés)
 */

export type EventReport = {
  event_name: string;
  total_count: number;
  attributed_count: number;
  attributed_rate: number;
  total_value: number;
  by_source: {
    pixel: number;
    conversions_api: number;
    both: number;
  };
  by_attribution_model: Record<string, number>;
};

export type AttributedAd = {
  ad_id: string;
  ad_name: string;
  campaign_name: string;
  event_count: number;
  total_value: number;
  unique_users: number;
};

export type EventDrilldown = {
  event_name: string;
  total_count: number;
  attributed_count: number;
  attribution_models: Record<string, number>;
  top_ads: AttributedAd[];
  daily_trend: Array<{ date: string; count: number; value: number }>;
};

export async function listEventReports(args: {
  ad_account_id: string;
  since?: string;
  until?: string;
}): Promise<EventReport[]> {
  const admin = createAdminClient();
  const since =
    args.since ?? new Date(Date.now() - 30 * 24 * 3600 * 1000).toISOString();
  const until = args.until ?? new Date().toISOString();

  const { data: events } = await admin
    .from("ad_conversions")
    .select(
      "event_name, event_source, attribution_model, custom_data, attributed_ad_id",
    )
    .eq("ad_account_id", args.ad_account_id)
    .eq("is_invalid", false)
    .gte("created_at", since)
    .lte("created_at", until)
    .limit(50_000);

  const buckets = new Map<string, EventReport>();

  for (const e of events ?? []) {
    if (!buckets.has(e.event_name)) {
      buckets.set(e.event_name, {
        event_name: e.event_name,
        total_count: 0,
        attributed_count: 0,
        attributed_rate: 0,
        total_value: 0,
        by_source: { pixel: 0, conversions_api: 0, both: 0 },
        by_attribution_model: {},
      });
    }
    const b = buckets.get(e.event_name)!;
    b.total_count++;
    if (e.attributed_ad_id) b.attributed_count++;
    const cd = e.custom_data as { value?: number } | null;
    if (cd?.value) b.total_value += Number(cd.value);
    /* Sources. */
    if (e.event_source === "pixel") b.by_source.pixel++;
    else if (e.event_source === "conversions_api") b.by_source.conversions_api++;
    else if (e.event_source === "both") b.by_source.both++;
    /* Attribution models. */
    if (e.attribution_model) {
      b.by_attribution_model[e.attribution_model] =
        (b.by_attribution_model[e.attribution_model] ?? 0) + 1;
    }
  }

  /* Calcul rates. */
  const reports = Array.from(buckets.values()).map((b) => ({
    ...b,
    attributed_rate: b.total_count > 0 ? b.attributed_count / b.total_count : 0,
  }));

  /* Sort par total_count desc. */
  reports.sort((a, b) => b.total_count - a.total_count);
  return reports;
}

export async function getEventDrilldown(args: {
  ad_account_id: string;
  event_name: string;
  since?: string;
  until?: string;
}): Promise<EventDrilldown> {
  const admin = createAdminClient();
  const since =
    args.since ?? new Date(Date.now() - 30 * 24 * 3600 * 1000).toISOString();
  const until = args.until ?? new Date().toISOString();

  const { data: events } = await admin
    .from("ad_conversions")
    .select(
      "id, event_time, event_source, attribution_model, attributed_ad_id, custom_data, user_id",
    )
    .eq("ad_account_id", args.ad_account_id)
    .eq("event_name", args.event_name)
    .eq("is_invalid", false)
    .gte("created_at", since)
    .lte("created_at", until)
    .limit(50_000);

  const totalCount = events?.length ?? 0;
  let attributedCount = 0;
  const attributionModels: Record<string, number> = {};
  const adAggs = new Map<
    string,
    { count: number; value: number; users: Set<string> }
  >();
  const dayMap = new Map<string, { count: number; value: number }>();

  for (const e of events ?? []) {
    /* Daily trend. */
    const day = e.event_time.slice(0, 10);
    if (!dayMap.has(day)) dayMap.set(day, { count: 0, value: 0 });
    const d = dayMap.get(day)!;
    d.count++;
    const cd = e.custom_data as { value?: number } | null;
    if (cd?.value) d.value += Number(cd.value);

    if (e.attributed_ad_id) {
      attributedCount++;
      if (e.attribution_model) {
        attributionModels[e.attribution_model] =
          (attributionModels[e.attribution_model] ?? 0) + 1;
      }
      if (!adAggs.has(e.attributed_ad_id)) {
        adAggs.set(e.attributed_ad_id, { count: 0, value: 0, users: new Set() });
      }
      const agg = adAggs.get(e.attributed_ad_id)!;
      agg.count++;
      if (cd?.value) agg.value += Number(cd.value);
      if (e.user_id) agg.users.add(e.user_id);
    }
  }

  /* Récup metadata des top 10 ads. */
  const adIds = Array.from(adAggs.keys()).slice(0, 10);
  const { data: ads } = adIds.length > 0
    ? await admin
        .from("ads_ads")
        .select("id, name, campaign_id")
        .in("id", adIds)
    : { data: [] };
  const campaignIds = (ads ?? [])
    .map((a) => a.campaign_id)
    .filter((id): id is string => Boolean(id));
  const { data: campaigns } = campaignIds.length > 0
    ? await admin
        .from("ads_campaigns")
        .select("id, name")
        .in("id", campaignIds)
    : { data: [] };
  const campaignMap = new Map((campaigns ?? []).map((c) => [c.id, c.name]));

  const topAds: AttributedAd[] = (ads ?? [])
    .map((ad) => {
      const agg = adAggs.get(ad.id)!;
      return {
        ad_id: ad.id,
        ad_name: ad.name,
        campaign_name: campaignMap.get(ad.campaign_id) ?? "—",
        event_count: agg.count,
        total_value: agg.value,
        unique_users: agg.users.size,
      };
    })
    .sort((a, b) => b.event_count - a.event_count);

  const dailyTrend = Array.from(dayMap.entries())
    .map(([date, v]) => ({ date, count: v.count, value: v.value }))
    .sort((a, b) => a.date.localeCompare(b.date));

  return {
    event_name: args.event_name,
    total_count: totalCount,
    attributed_count: attributedCount,
    attribution_models: attributionModels,
    top_ads: topAds,
    daily_trend: dailyTrend,
  };
}
