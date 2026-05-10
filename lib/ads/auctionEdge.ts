/* Auction engine — version Vercel Edge Runtime.
 *
 * Différences avec lib/ads/auction.ts (Node) :
 *   - Pas d'import Supabase JS SDK (lourd, lent à init en Edge)
 *   - Queries directes à PostgREST via fetch (Bearer service_role)
 *   - logImpression en fire-and-forget via fetch keepalive
 *   - User ID extrait du JWT cookie côté caller (pas getUser())
 *
 * Latence cible : p95 < 150 ms à Frankfurt edge.
 */

import type { AdPlacement } from "./types";

export type EdgeAuctionContext = {
  user_id: string | null;
  surface: AdPlacement;
  slot_index: number;
  country?: string;
  locale?: string;
  device_type?: "mobile" | "tablet" | "desktop";
};

export type EdgeServedAd = {
  ad_id: string;
  advertiser_name: string;
  primary_text: string;
  headline: string;
  description: string | null;
  media_url: string | null;
  destination_url: string | null;
  call_to_action: string;
  auto_disclaimer: string | null;
  manual_disclaimer: string | null;
  paid_for_by: string | null;
  why_reasons: string[];
  charged_amount: number;
};

const SCORE_THRESHOLD = 0.5;

export async function runAuctionEdge(
  ctx: EdgeAuctionContext,
): Promise<EdgeServedAd | null> {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !serviceKey) {
    console.warn("[auctionEdge] Missing env vars, skipping");
    return null;
  }

  const headers = {
    apikey: serviceKey,
    Authorization: `Bearer ${serviceKey}`,
    "Content-Type": "application/json",
    Accept: "application/json",
  };

  /* 1. Consent user (skip silencieux si non configuré). */
  if (ctx.user_id) {
    const prefsRes = await fetch(
      `${supabaseUrl}/rest/v1/user_ad_preferences?user_id=eq.${ctx.user_id}&select=personalized_ads_consent,blocked_advertisers&limit=1`,
      { headers },
    );
    if (prefsRes.ok) {
      const rows = (await prefsRes.json()) as Array<{
        personalized_ads_consent: boolean;
        blocked_advertisers: string[];
      }>;
      const prefs = rows[0];
      if (prefs && !prefs.personalized_ads_consent) {
        return null;
      }
    }
  }

  /* 2. Récup ads éligibles : status active + review approved. */
  const adsRes = await fetch(
    `${supabaseUrl}/rest/v1/ads_ads?status=eq.active&review_status=in.(auto_approved,approved)&select=id,ad_set_id,campaign_id,ad_account_id,creative_id,quality_score,observed_ctr&limit=200`,
    { headers },
  );
  if (!adsRes.ok) return null;
  const ads = (await adsRes.json()) as Array<{
    id: string;
    ad_set_id: string;
    campaign_id: string;
    ad_account_id: string;
    creative_id: string;
    quality_score: number;
    observed_ctr: number | null;
  }>;
  if (ads.length === 0) return null;

  /* 3. Récup ad_sets (placement + targeting + schedule + freq cap). */
  const adSetIds = Array.from(new Set(ads.map((a) => a.ad_set_id))).join(",");
  const adSetsRes = await fetch(
    `${supabaseUrl}/rest/v1/ads_ad_sets?id=in.(${adSetIds})&status=eq.active&select=id,placements,start_time,end_time,frequency_cap,targeting`,
    { headers },
  );
  if (!adSetsRes.ok) return null;
  const adSets = (await adSetsRes.json()) as Array<{
    id: string;
    placements: string[];
    start_time: string | null;
    end_time: string | null;
    frequency_cap: { max_impressions?: number; period_days?: number } | null;
    targeting: { geo?: { countries?: string[] }; age_min?: number };
  }>;
  const adSetMap = new Map(adSets.map((s) => [s.id, s]));

  /* 4. Filtrage placement + schedule + targeting. */
  const now = new Date().toISOString();
  const eligible = ads.filter((ad) => {
    const set = adSetMap.get(ad.ad_set_id);
    if (!set) return false;
    if (!set.placements.includes(ctx.surface)) return false;
    if (set.start_time && set.start_time > now) return false;
    if (set.end_time && set.end_time < now) return false;
    if (
      ctx.country &&
      set.targeting?.geo?.countries &&
      set.targeting.geo.countries.length > 0 &&
      !set.targeting.geo.countries.includes(ctx.country)
    )
      return false;
    return true;
  });

  if (eligible.length === 0) return null;

  /* 5. Scoring + 2nd-price. */
  const scored = eligible.map((ad) => {
    const ctr = Number(ad.observed_ctr ?? 0.015);
    const quality = Number(ad.quality_score) / 10;
    const score = ctr * quality;
    return { ad, score, bid: ctr };
  });
  scored.sort((a, b) => b.score - a.score);
  const winner = scored[0];
  if (!winner || winner.score < SCORE_THRESHOLD) return null;
  const second = scored[1];
  const charged = second
    ? Math.max(
        0.01,
        Math.min(
          winner.bid,
          second.score / (Number(winner.ad.quality_score) / 10) + 0.01,
        ),
      )
    : winner.bid * 0.5;

  /* 6. Récup creative + business_name pour le payload. */
  const [creativeRes, accountRes] = await Promise.all([
    fetch(
      `${supabaseUrl}/rest/v1/ads_creatives?id=eq.${winner.ad.creative_id}&select=*&limit=1`,
      { headers },
    ),
    fetch(
      `${supabaseUrl}/rest/v1/ad_accounts?id=eq.${winner.ad.ad_account_id}&select=business_account_id&limit=1`,
      { headers },
    ),
  ]);

  if (!creativeRes.ok) return null;
  const creatives = (await creativeRes.json()) as Array<{
    id: string;
    primary_text: string;
    headline: string;
    description: string | null;
    media_url: string | null;
    destination_url: string | null;
    call_to_action: string;
    auto_disclaimer: string | null;
    manual_disclaimer: string | null;
    paid_for_by: string | null;
  }>;
  const creative = creatives[0];
  if (!creative) return null;

  let advertiserName = "Annonceur";
  if (accountRes.ok) {
    const accounts = (await accountRes.json()) as Array<{
      business_account_id: string;
    }>;
    if (accounts[0]) {
      const bizRes = await fetch(
        `${supabaseUrl}/rest/v1/ads_business_accounts?id=eq.${accounts[0].business_account_id}&select=legal_name&limit=1`,
        { headers },
      );
      if (bizRes.ok) {
        const bizs = (await bizRes.json()) as Array<{ legal_name: string }>;
        if (bizs[0]) advertiserName = bizs[0].legal_name;
      }
    }
  }

  /* 7. Log impression — fire-and-forget. */
  void fetch(`${supabaseUrl}/rest/v1/ad_impressions`, {
    method: "POST",
    headers: { ...headers, Prefer: "return=minimal" },
    body: JSON.stringify({
      ad_id: winner.ad.id,
      ad_set_id: winner.ad.ad_set_id,
      campaign_id: winner.ad.campaign_id,
      ad_account_id: winner.ad.ad_account_id,
      user_id: ctx.user_id,
      surface: ctx.surface,
      position: ctx.slot_index,
      bid_amount: winner.bid,
      charged_amount: charged,
      device_type: ctx.device_type ?? null,
      locale: ctx.locale ?? null,
      country: ctx.country ?? null,
    }),
    /* keepalive : la requête continue même si la réponse Edge est
       déjà retournée. */
    keepalive: true,
  }).catch(() => {});

  /* 8. Build why_reasons. */
  const reasons: string[] = [
    "Tu as plus de 18 ans (obligatoire DSA art. 28)",
  ];
  if (ctx.country) reasons.push(`Tu te trouves en ${ctx.country}`);
  reasons.push(`Tu utilises la surface ${ctx.surface}`);

  return {
    ad_id: winner.ad.id,
    advertiser_name: advertiserName,
    primary_text: creative.primary_text,
    headline: creative.headline,
    description: creative.description,
    media_url: creative.media_url,
    destination_url: creative.destination_url,
    call_to_action: creative.call_to_action,
    auto_disclaimer: creative.auto_disclaimer,
    manual_disclaimer: creative.manual_disclaimer,
    paid_for_by: creative.paid_for_by,
    why_reasons: reasons,
    charged_amount: charged,
  };
}
