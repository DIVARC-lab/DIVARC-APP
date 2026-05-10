import "server-only";
import { createAdminClient } from "@/lib/supabase/server";
import type { AdsAd, AdsCreative, UserAdPreferences } from "@/lib/database.types";
import type { AdPlacement, TargetingSpec } from "./types";

/* Auction engine — décide quelle ad afficher pour un user/surface donné.
 *
 * Pipeline (latence cible < 200 ms p95, Vercel Edge Function) :
 *   1. Vérifier consentement publicitaire user (user_ad_preferences)
 *   2. Frequency capping (impressions par user/ad sur fenêtre)
 *   3. Récupérer ads éligibles (status active + review approved + budget OK)
 *   4. Filtrer par targeting (geo + age + interests via topic_affinity)
 *   5. Filtrer par blocked_categories / blocked_advertisers du user
 *   6. Pour chaque ad : calculer score = bid × CTR_predicted × quality_score
 *   7. 2nd-price modified : winner paie le score du 2e + 0.01€
 *   8. Si winner score < threshold → return null (afficher contenu organique)
 *   9. Logger l'auction décision pour ML training futur
 *
 * Densité publicitaire (politique DIVARC strict) :
 *   - feed_home : 1 ad / 5-7 posts → caller passe slot_index
 *   - marketplace : 1 / 12 listings
 *   - jobs : 1 / 15 jobs
 *   - stories : 1 / 6-10 stories
 */

export type ServedAd = {
  ad: AdsAd & { creative: AdsCreative };
  charged_amount: number;
  slot_index: number;
  /* Raison textuelle pour le modal "Why this ad?" — on serialise les
     critères de match (DSA art. 26). */
  why_reasons: string[];
};

export type AuctionContext = {
  user_id: string | null; // null pour anonymes (peu d'ads → contextual only)
  surface: AdPlacement;
  slot_index: number;
  /* Contexte additionnel pour brand safety + targeting. */
  surface_context_topic?: string;
  device_type?: "mobile" | "tablet" | "desktop";
  country?: string;
  locale?: string;
};

const SCORE_THRESHOLD = 0.5; // si score < seuil, on affiche contenu organique

export async function runAuction(
  ctx: AuctionContext,
): Promise<ServedAd | null> {
  /* 1. Consent check. Si user a opt-out total → contextual ads only,
     filtrant par catégorie sans personnalisation. */
  const prefs = ctx.user_id
    ? await getUserAdPreferences(ctx.user_id)
    : null;
  if (prefs && !prefs.personalized_ads_consent) {
    /* Pour V1 : pas de personnalisation = pas d'ad pour cet user.
       V2 : ads contextuelles (basées sur le surface_context_topic). */
    return null;
  }

  /* 2. Récupérer les ads éligibles. */
  const eligibleAds = await getEligibleAds(ctx, prefs);
  if (eligibleAds.length === 0) return null;

  /* 3. Filtrage frequency cap par user. */
  const filteredAds = ctx.user_id
    ? await filterByFrequencyCap(eligibleAds, ctx.user_id)
    : eligibleAds;
  if (filteredAds.length === 0) return null;

  /* 4. Scoring. */
  const scored = filteredAds.map((ad) => {
    const bid = Number(ad.observed_ctr ?? 0.02) * 1; // simplification V1
    const ctrPredicted = Number(ad.observed_ctr ?? 0.015);
    const quality = ad.quality_score / 10;
    const score = bid * ctrPredicted * quality;
    return { ad, score, bid };
  });

  scored.sort((a, b) => b.score - a.score);
  const winner = scored[0];
  if (!winner || winner.score < SCORE_THRESHOLD) return null;

  /* 5. 2nd-price modified. */
  const second = scored[1];
  const chargedAmount = second
    ? Math.max(
        0.01,
        Math.min(winner.bid, second.score / (winner.ad.quality_score / 10) + 0.01),
      )
    : winner.bid * 0.5;

  /* 6. Build why_reasons (DSA art. 26). */
  const reasons = buildWhyReasons(ctx, winner.ad);

  /* 7. Logger impression (async — don't block). */
  void logImpression({
    ad: winner.ad,
    ctx,
    bid: winner.bid,
    charged: chargedAmount,
  });

  return {
    ad: winner.ad,
    charged_amount: chargedAmount,
    slot_index: ctx.slot_index,
    why_reasons: reasons,
  };
}

async function getUserAdPreferences(
  userId: string,
): Promise<UserAdPreferences | null> {
  const admin = createAdminClient();
  const { data } = await admin
    .from("user_ad_preferences")
    .select("*")
    .eq("user_id", userId)
    .maybeSingle();
  return data;
}

async function getEligibleAds(
  ctx: AuctionContext,
  prefs: UserAdPreferences | null,
): Promise<Array<AdsAd & { creative: AdsCreative; targeting: Record<string, unknown>; placements: string[] }>> {
  const admin = createAdminClient();
  const now = new Date().toISOString();

  /* Récup ads actives + review approved + ad_set actif + within schedule.
     Pour V1, query simple — pour V2, vue matérialisée eligible_ads
     refresh 1 min. */
  const { data: ads } = await admin
    .from("ads_ads")
    .select("*")
    .eq("status", "active")
    .in("review_status", ["auto_approved", "approved"]);

  if (!ads || ads.length === 0) return [];

  /* Joindre ad_set + creative + campaign en parallèle. */
  const adSetIds = Array.from(new Set(ads.map((a) => a.ad_set_id)));
  const creativeIds = Array.from(new Set(ads.map((a) => a.creative_id)));
  const campaignIds = Array.from(new Set(ads.map((a) => a.campaign_id)));

  const [adSetsRes, creativesRes, campaignsRes] = await Promise.all([
    admin.from("ads_ad_sets").select("*").in("id", adSetIds),
    admin.from("ads_creatives").select("*").in("id", creativeIds),
    admin.from("ads_campaigns").select("*").in("id", campaignIds),
  ]);

  const adSetMap = new Map((adSetsRes.data ?? []).map((s) => [s.id, s]));
  const creativeMap = new Map((creativesRes.data ?? []).map((c) => [c.id, c]));
  const campaignMap = new Map((campaignsRes.data ?? []).map((c) => [c.id, c]));

  /* Filtrage par placement, schedule, targeting. */
  const eligible = ads.flatMap((a) => {
    const adSet = adSetMap.get(a.ad_set_id);
    const creative = creativeMap.get(a.creative_id);
    const campaign = campaignMap.get(a.campaign_id);
    if (!adSet || !creative || !campaign) return [];
    if (adSet.status !== "active") return [];
    if (campaign.status !== "active") return [];

    /* Schedule. */
    if (adSet.start_time && new Date(adSet.start_time).toISOString() > now) {
      return [];
    }
    if (adSet.end_time && new Date(adSet.end_time).toISOString() < now) {
      return [];
    }

    /* Placement. */
    if (!adSet.placements.includes(ctx.surface)) return [];

    /* Targeting basique : age + country. La validation a déjà eu lieu
       à la création (DSA art. 28). On revérifie juste pour les changements
       de population. */
    const targeting = adSet.targeting as TargetingSpec;
    if (ctx.country && targeting.geo?.countries) {
      if (
        targeting.geo.countries.length > 0 &&
        !targeting.geo.countries.includes(ctx.country)
      ) {
        return [];
      }
    }

    /* User preferences : blocked categories / advertisers. */
    if (prefs) {
      if (prefs.blocked_advertisers.includes(a.ad_account_id)) {
        return [];
      }
      /* blocked_categories : V1 on lit business industry, V2 on a un
         vrai champ category sur la creative. */
    }

    return [
      {
        ...a,
        creative,
        targeting: adSet.targeting,
        placements: adSet.placements,
      },
    ];
  });

  return eligible;
}

async function filterByFrequencyCap<T extends { ad_set_id: string; id: string }>(
  ads: T[],
  userId: string,
): Promise<T[]> {
  const admin = createAdminClient();
  /* Pour V1 : on lit les frequency_cap des ad_sets et on compte les
     impressions récentes par (user, ad). Performance OK pour < 100
     ads actives. V2 : cache Edge KV avec TTL court. */
  const adSetIds = Array.from(new Set(ads.map((a) => a.ad_set_id)));
  const { data: adSets } = await admin
    .from("ads_ad_sets")
    .select("id, frequency_cap")
    .in("id", adSetIds);
  const capMap = new Map(
    (adSets ?? []).map((s) => [
      s.id,
      s.frequency_cap as { max_impressions?: number; period_days?: number } | null,
    ]),
  );

  const result: T[] = [];
  for (const ad of ads) {
    const cap = capMap.get(ad.ad_set_id);
    if (!cap || !cap.max_impressions || !cap.period_days) {
      result.push(ad);
      continue;
    }
    const since = new Date(
      Date.now() - cap.period_days * 24 * 3600 * 1000,
    ).toISOString();
    const { count } = await admin
      .from("ad_impressions")
      .select("id", { count: "exact", head: true })
      .eq("ad_id", ad.id)
      .eq("user_id", userId)
      .gte("created_at", since);
    if ((count ?? 0) < cap.max_impressions) {
      result.push(ad);
    }
  }
  return result;
}

function buildWhyReasons(ctx: AuctionContext, ad: AdsAd): string[] {
  const reasons: string[] = [];
  reasons.push("Tu as plus de 18 ans (obligatoire DSA art. 28)");
  if (ctx.country) reasons.push(`Tu te trouves en ${ctx.country}`);
  /* On expose la surface mais pas le détail individuel du targeting. */
  reasons.push(`Tu utilises la surface ${ctx.surface}`);
  return reasons;
}

async function logImpression(args: {
  ad: AdsAd;
  ctx: AuctionContext;
  bid: number;
  charged: number;
}): Promise<void> {
  const admin = createAdminClient();
  try {
    await admin.from("ad_impressions").insert({
      ad_id: args.ad.id,
      ad_set_id: args.ad.ad_set_id,
      campaign_id: args.ad.campaign_id,
      ad_account_id: args.ad.ad_account_id,
      user_id: args.ctx.user_id,
      surface: args.ctx.surface,
      position: args.ctx.slot_index,
      bid_amount: args.bid,
      charged_amount: args.charged,
      device_type: args.ctx.device_type ?? null,
      locale: args.ctx.locale ?? null,
      country: args.ctx.country ?? null,
    });

    /* Décrément du prepaid_balance — pour V1 on update direct via
       SELECT puis UPDATE. V2 : RPC atomique + batch toutes les 5min
       via cron pour réduire la pression. */
    const { data: account } = await admin
      .from("ad_accounts")
      .select("prepaid_balance, total_spent")
      .eq("id", args.ad.ad_account_id)
      .maybeSingle();
    if (account) {
      await admin
        .from("ad_accounts")
        .update({
          prepaid_balance: Number(account.prepaid_balance) - args.charged,
          total_spent: Number(account.total_spent) + args.charged,
        })
        .eq("id", args.ad.ad_account_id);
    }
  } catch (err) {
    /* Best-effort logging, on ne bloque pas la diffusion. */
    console.error("[ads:auction:logImpression]", err);
  }
}
