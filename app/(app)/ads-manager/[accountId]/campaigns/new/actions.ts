"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import {
  ALWAYS_FORBIDDEN_AD_CATEGORIES,
  CATEGORY_DISCLAIMERS,
  validateTargetingSpec,
  type TargetingSpec,
} from "@/lib/ads/types";
import type { Database } from "@/lib/database.types";

/* Création atomique d'une campagne complète :
 *   campaigns + ad_sets + creatives + ads + ads_library_entry
 *
 * Toutes les vérifications conformité (targeting DSA art. 28 + RGPD art. 9 +
 * catégorie interdite + special_ad_category) sont faites côté server pour
 * empêcher tout bypass client.
 */

const campaignFormSchema = z
  .object({
    ad_account_id: z.string().uuid(),
    /* Étape 1 — objectif. */
    objective: z.enum([
      "brand_awareness",
      "reach",
      "traffic",
      "engagement",
      "video_views",
      "lead_generation",
      "messages",
      "conversions",
      "marketplace_listing_boost",
      "job_applications",
      "circle_growth",
    ]),
    /* Étape 2 — config campagne. */
    name: z.string().min(2).max(100),
    daily_budget: z.number().positive().optional(),
    lifetime_budget: z.number().positive().optional(),
    spend_cap: z.number().positive().optional(),
    start_time: z.string().datetime().optional(),
    end_time: z.string().datetime().optional(),
    special_ad_category: z
      .enum(["housing", "employment", "credit", "social"])
      .optional(),
    /* Étape 3 — adset audience + placements + budget + opti.
       Riche : geo radius, démographie, intérêts logique, comportements,
       connections, custom audiences + exclusions + lookalikes. */
    targeting: z
      .object({
        geo: z.object({
          countries: z.array(z.string().length(2)).default(["FR"]),
          regions: z.array(z.string()).optional(),
          cities: z
            .array(
              z.object({
                name: z.string(),
                country: z.string().length(2),
                radius_km: z.number().positive().optional(),
              }),
            )
            .optional(),
          postal_codes: z.array(z.string()).optional(),
          custom_locations: z
            .array(
              z.object({
                lat: z.number().min(-90).max(90),
                lng: z.number().min(-180).max(180),
                radius_km: z.number().positive().max(80),
                name: z.string().optional(),
              }),
            )
            .optional(),
          location_types: z
            .array(z.enum(["home", "recent", "travel_in"]))
            .optional(),
          excluded_locations: z.array(z.string()).optional(),
        }),
        age_min: z.number().int().min(18).max(99),
        age_max: z.number().int().min(18).max(99),
        genders: z.array(z.enum(["all", "male", "female", "non_binary"])),
        languages: z.array(z.string()).optional(),
        interests: z
          .array(
            z.object({
              topic_id: z.string(),
              affinity_threshold: z.number().min(0).max(1).optional(),
            }),
          )
          .optional(),
        interests_logic: z.enum(["or", "and"]).optional(),
        behaviors: z
          .array(
            z.object({
              type: z.enum([
                "marketplace_buyer",
                "job_seeker",
                "circle_member",
                "mentor",
                "early_adopter",
              ]),
              detail: z.string().optional(),
            }),
          )
          .optional(),
        connections: z
          .object({
            friends_of_engagers: z.string().uuid().optional(),
            exclude_fans: z.string().uuid().optional(),
          })
          .optional(),
        custom_audience_ids: z.array(z.string().uuid()).optional(),
        excluded_custom_audience_ids: z.array(z.string().uuid()).optional(),
        lookalike_audience_ids: z.array(z.string().uuid()).optional(),
      })
      .passthrough(),
    placements: z
      .array(
        z.enum([
          "feed_home",
          "marketplace_feed",
          "marketplace_listing_boost",
          "jobs_feed",
          "stories",
        ]),
      )
      .min(1),
    /* V4 — DIVARC Audience Network + Brand Safety. */
    audience_network_enabled: z.boolean().optional(),
    brand_safety_filter: z
      .enum(["standard", "limited", "expanded"])
      .optional(),
    excluded_topics: z.array(z.string().max(40)).max(15).optional(),
    excluded_keywords: z.array(z.string().max(40)).max(50).optional(),
    bid_strategy: z
      .enum([
        "lowest_cost",
        "cost_cap",
        "bid_cap",
        "target_cost",
        "target_roas",
        "minimum_roas",
      ])
      .default("lowest_cost"),
    bid_amount: z.number().positive().optional(),
    target_roas: z.number().positive().optional(),
    minimum_roas: z.number().positive().optional(),
    cost_cap: z.number().positive().optional(),
    bid_cap: z.number().positive().optional(),
    /* Spending. */
    spend_cap_lifetime: z.number().positive().optional(),
    /* Schedule + dayparting + delivery. */
    delivery_type: z.enum(["standard", "accelerated"]).optional(),
    dayparting: z.record(z.string(), z.array(z.boolean())).optional(),
    /* A/B testing. */
    ab_test_enabled: z.boolean().optional(),
    ab_test_variable: z
      .enum(["creative", "audience", "placement", "optimization"])
      .optional(),
    ab_test_variants_count: z.number().int().min(2).max(5).optional(),
    ab_test_min_days: z.number().int().min(3).max(30).optional(),
    ab_test_metric: z.enum(["ctr", "cpa", "roas", "engagement"]).optional(),
    /* Tracking. */
    pixel_id: z.string().uuid().optional(),
    utm_source: z.string().max(50).optional(),
    utm_medium: z.string().max(50).optional(),
    utm_campaign: z.string().max(100).optional(),
    optimization_goal: z.enum([
      "impressions",
      "reach",
      "link_clicks",
      "landing_page_views",
      "post_engagement",
      "video_views_3s",
      "thruplay",
      "lead_generation",
      "conversions",
    ]),
    billing_event: z.enum([
      "impressions",
      "clicks",
      "video_views",
      "conversions",
    ]),
    frequency_max: z.number().int().min(1).max(50).optional(),
    frequency_period_days: z.number().int().min(1).max(30).optional(),
    /* Étape 4 — creative. */
    creative_type: z.enum([
      "single_image",
      "single_video",
      "carousel",
    ]),
    primary_text: z.string().min(1).max(125),
    headline: z.string().min(1).max(40),
    description: z.string().max(30).optional(),
    media_url: z.string().url().optional(),
    destination_url: z.string().url().optional(),
    call_to_action: z.string(),
    advertiser_entity_id: z.string().uuid(),
    /* Catégorie d'ad pour disclaimers automatiques. */
    ad_category_hint: z.string().optional(),
  })
  .strict();

export type CreateCampaignResult =
  | { ok: true; campaign_id: string; ad_id: string }
  | { ok: false; error: string; validation_errors?: string[] };

export async function createFullCampaign(
  input: z.infer<typeof campaignFormSchema>,
): Promise<CreateCampaignResult> {
  const parsed = campaignFormSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      error: "Données invalides.",
      validation_errors: parsed.error.issues.map((e) => e.message),
    };
  }
  const data = parsed.data;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Non authentifié." };

  /* Vérification droit éditeur. */
  const { data: hasRole } = await supabase.rpc("user_has_ad_account_role", {
    p_ad_account_id: data.ad_account_id,
    p_min_role: "editor",
  });
  if (!hasRole) {
    return {
      ok: false,
      error:
        "Tu n'as pas les droits pour créer une campagne sur ce compte (rôle editor minimum requis).",
    };
  }

  /* Validation conformité — categorie interdite. */
  if (
    data.ad_category_hint &&
    (ALWAYS_FORBIDDEN_AD_CATEGORIES as readonly string[]).includes(
      data.ad_category_hint,
    )
  ) {
    return {
      ok: false,
      error: `La catégorie "${data.ad_category_hint}" est interdite à la publicité sur DIVARC.`,
    };
  }

  /* Validation targeting DSA + RGPD. */
  const targetingValidation = validateTargetingSpec(
    data.targeting as TargetingSpec,
    data.special_ad_category,
  );
  if (!targetingValidation.valid) {
    return {
      ok: false,
      error: "Ciblage non conforme.",
      validation_errors: targetingValidation.errors,
    };
  }

  /* Disclaimers automatiques par catégorie. */
  const autoDisclaimer = data.ad_category_hint
    ? CATEGORY_DISCLAIMERS[data.ad_category_hint] ?? null
    : null;

  /* Insert atomique : campaign → ad_set → creative → ad. Si une étape
     échoue, on ne nettoie pas pour V1 — l'admin pourra les supprimer.
     Pour V2 : transaction RPC Postgres. */

  /* 1. Campaign — incluant target_roas + spend_cap_lifetime depuis
     la config avancée. */
  const { data: campaign, error: cErr } = await supabase
    .from("ads_campaigns")
    .insert({
      ad_account_id: data.ad_account_id,
      name: data.name,
      objective: data.objective,
      status: "draft",
      buying_type: "auction",
      daily_budget: data.daily_budget ?? null,
      lifetime_budget: data.lifetime_budget ?? null,
      spend_cap: data.spend_cap_lifetime ?? data.spend_cap ?? null,
      start_time: data.start_time ?? null,
      end_time: data.end_time ?? null,
      special_ad_category: data.special_ad_category ?? null,
      compliance_review_status: "pending",
      target_roas: data.target_roas ?? null,
      created_by: user.id,
    })
    .select("id")
    .single();
  if (cErr || !campaign) {
    console.error("[ads:createCampaign]", cErr);
    return { ok: false, error: "Création campagne échouée." };
  }

  /* 2. Ad set. */
  const frequencyCap =
    data.frequency_max && data.frequency_period_days
      ? {
          max_impressions: data.frequency_max,
          period_days: data.frequency_period_days,
        }
      : null;

  /* Convert dayparting checkbox grid to target jsonb. */
  const daypartingFinal: Record<string, unknown> | null = data.dayparting
    ? Object.fromEntries(
        Object.entries(data.dayparting).map(([day, hours]) => [
          day,
          (hours as boolean[]).reduce<string[]>((slots, active, hour) => {
            if (active) slots.push(`${hour}-${hour + 1}`);
            return slots;
          }, []),
        ]),
      )
    : null;

  /* Audience riche : behaviors / connections / locations_advanced
     dénormalisés dans des colonnes jsonb dédiées (audience_*). */
  const targetingObj = data.targeting as TargetingSpec & {
    behaviors?: unknown;
    connections?: unknown;
    custom_locations?: unknown;
  };
  const audienceBehaviors = Array.isArray(targetingObj.behaviors)
    ? { items: targetingObj.behaviors }
    : {};
  const audienceConnections: Record<string, unknown> = {
    ...((targetingObj.connections &&
    typeof targetingObj.connections === "object"
      ? (targetingObj.connections as Record<string, unknown>)
      : {}) as Record<string, unknown>),
  };
  /* Brand Safety + Audience Network — pas de colonnes dédiées V1, on les
     plante dans audience_connections jsonb pour usage downstream (cron
     match, ad_serve). */
  if (data.audience_network_enabled)
    audienceConnections.audience_network_enabled = true;
  if (data.brand_safety_filter)
    audienceConnections.brand_safety_filter = data.brand_safety_filter;
  if (data.excluded_topics && data.excluded_topics.length > 0)
    audienceConnections.excluded_topics = data.excluded_topics;
  if (data.excluded_keywords && data.excluded_keywords.length > 0)
    audienceConnections.excluded_keywords = data.excluded_keywords;

  const audienceLocationsAdvanced: Record<string, unknown> = {};
  if (targetingObj.geo.cities && targetingObj.geo.cities.length > 0)
    audienceLocationsAdvanced.cities = targetingObj.geo.cities;
  if (targetingObj.geo.custom_locations)
    audienceLocationsAdvanced.custom_locations =
      targetingObj.geo.custom_locations;
  if (targetingObj.geo.postal_codes && targetingObj.geo.postal_codes.length > 0)
    audienceLocationsAdvanced.postal_codes = targetingObj.geo.postal_codes;
  if (targetingObj.geo.location_types)
    audienceLocationsAdvanced.location_types = targetingObj.geo.location_types;

  const { data: adSet, error: asErr } = await supabase
    .from("ads_ad_sets")
    .insert({
      campaign_id: campaign.id,
      ad_account_id: data.ad_account_id,
      name: `${data.name} — Set 1`,
      daily_budget: data.daily_budget ?? null,
      lifetime_budget: data.lifetime_budget ?? null,
      bid_strategy: data.bid_strategy,
      bid_amount: data.bid_amount ?? null,
      cost_cap: data.cost_cap ?? null,
      bid_cap: data.bid_cap ?? null,
      minimum_roas: data.minimum_roas ?? null,
      delivery_type: data.delivery_type ?? "standard",
      dayparting: daypartingFinal,
      targeting:
        data.targeting as Database["public"]["Tables"]["ads_ad_sets"]["Insert"]["targeting"],
      audience_behaviors: audienceBehaviors,
      audience_connections: audienceConnections,
      audience_locations_advanced: audienceLocationsAdvanced,
      placements: data.placements,
      optimization_goal: data.optimization_goal,
      billing_event: data.billing_event,
      pacing_type: data.delivery_type === "accelerated" ? "no_pacing" : "standard",
      frequency_cap: frequencyCap as
        | Record<string, unknown>
        | null,
      start_time: data.start_time ?? null,
      end_time: data.end_time ?? null,
      status: "paused",
    })
    .select("id")
    .single();
  if (asErr || !adSet) {
    console.error("[ads:createAdSet]", asErr);
    return { ok: false, error: "Création ad set échouée." };
  }

  /* 3. Creative. */
  const { data: creative, error: crErr } = await supabase
    .from("ads_creatives")
    .insert({
      ad_account_id: data.ad_account_id,
      type: data.creative_type,
      media_url: data.media_url ?? null,
      primary_text: data.primary_text,
      headline: data.headline,
      description: data.description ?? null,
      call_to_action: data.call_to_action,
      destination_url: data.destination_url ?? null,
      advertiser_entity_id: data.advertiser_entity_id,
      auto_disclaimer: autoDisclaimer,
      brand_safety_filter: data.brand_safety_filter ?? "standard",
      utm_params:
        data.utm_source || data.utm_medium || data.utm_campaign
          ? {
              utm_source: data.utm_source,
              utm_medium: data.utm_medium,
              utm_campaign: data.utm_campaign,
            }
          : {},
    })
    .select("id")
    .single();
  if (crErr || !creative) {
    console.error("[ads:createCreative]", crErr);
    return { ok: false, error: "Création creative échouée." };
  }

  /* 4. Ad. */
  const { data: ad, error: aErr } = await supabase
    .from("ads_ads")
    .insert({
      ad_set_id: adSet.id,
      ad_account_id: data.ad_account_id,
      campaign_id: campaign.id,
      creative_id: creative.id,
      name: `${data.name} — Ad 1`,
      status: "paused",
      review_status: "pending",
    })
    .select("id")
    .single();
  if (aErr || !ad) {
    console.error("[ads:createAd]", aErr);
    return { ok: false, error: "Création ad échouée." };
  }

  /* 5. Ads library entry (DSA art. 39 — snapshot dès création, même en
     draft, pour transparence totale). is_active passera à true au lancement. */
  const targetingSummary = {
    age_range: `${data.targeting.age_min}-${data.targeting.age_max}`,
    genders: data.targeting.genders,
    countries: data.targeting.geo.countries,
    interests_categories: (data.targeting.interests ?? [])
      .slice(0, 5)
      .map((i: { topic_id: string }) => i.topic_id.split(".")[0]),
  };

  /* On a besoin du business_name pour la library. */
  const { data: account } = await supabase
    .from("ad_accounts")
    .select("business_account_id")
    .eq("id", data.ad_account_id)
    .maybeSingle();
  let businessName = "Annonceur";
  if (account) {
    const { data: business } = await supabase
      .from("ads_business_accounts")
      .select("legal_name")
      .eq("id", account.business_account_id)
      .maybeSingle();
    businessName = business?.legal_name ?? "Annonceur";
  }

  await supabase.from("ads_library_entries").insert({
    ad_id: ad.id,
    ad_account_id: data.ad_account_id,
    business_name: businessName,
    business_id: account?.business_account_id ?? null,
    campaign_objective: data.objective,
    creative_snapshot: {
      type: data.creative_type,
      primary_text: data.primary_text,
      headline: data.headline,
      description: data.description,
      media_url: data.media_url,
      destination_url: data.destination_url,
    },
    targeting_summary: targetingSummary,
    placements: data.placements,
    is_active: false, // passe à true au lancement effectif
    first_served_at: new Date().toISOString(),
    /* Conservation 1 an post-fin de diffusion (DSA art. 39). */
    retention_until: new Date(
      Date.now() + 365 * 24 * 3600 * 1000,
    ).toISOString(),
  });

  revalidatePath(`/ads-manager/${data.ad_account_id}`);
  return { ok: true, campaign_id: campaign.id, ad_id: ad.id };
}
