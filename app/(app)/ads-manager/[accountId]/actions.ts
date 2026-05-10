"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createAdminClient, createClient } from "@/lib/supabase/server";
import type { Database } from "@/lib/database.types";

/* Server actions Ads Manager — pause / play / duplicate / archive
 * pour campagnes, AdSets, et Ads.
 *
 * Cascade logique :
 *   - Pause campagne → met campaign.status='paused' (ne touche pas
 *     aux ad_sets ni ads, ils héritent par check status au serving)
 *   - Pause AdSet → idem
 *   - Pause Ad → idem
 *   - Archive campaign → status='completed' + archive cascade ad_sets
 *     + status='archived' + désactive ads
 *   - Duplicate campaign → copie complète (campaign + ad_sets + creatives
 *     + ads) avec status='draft'
 *
 * Auth : tous demandent role editor minimum sur l'ad_account.
 */

type ActionResult = { ok: true } | { ok: false; error: string };

async function checkEditor(adAccountId: string): Promise<ActionResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Non authentifié." };
  const { data: hasRole } = await supabase.rpc("user_has_ad_account_role", {
    p_ad_account_id: adAccountId,
    p_min_role: "editor",
  });
  if (!hasRole) {
    return { ok: false, error: "Permission refusée (role editor requis)." };
  }
  return { ok: true };
}

/* ============================================================
 * CAMPAIGN actions
 * ============================================================ */

const campaignActionSchema = z.object({
  campaign_id: z.string().uuid(),
  ad_account_id: z.string().uuid(),
});

export async function pauseCampaign(
  input: z.infer<typeof campaignActionSchema>,
): Promise<ActionResult> {
  const parsed = campaignActionSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Requête invalide." };
  const auth = await checkEditor(parsed.data.ad_account_id);
  if (!auth.ok) return auth;

  const admin = createAdminClient();
  const { error } = await admin
    .from("ads_campaigns")
    .update({ status: "paused" })
    .eq("id", parsed.data.campaign_id);
  if (error) {
    return { ok: false, error: `Pause impossible : ${error.message}` };
  }
  revalidatePath(`/ads-manager/${parsed.data.ad_account_id}`);
  revalidatePath(
    `/ads-manager/${parsed.data.ad_account_id}/campaigns/${parsed.data.campaign_id}`,
  );
  return { ok: true };
}

export async function activateCampaign(
  input: z.infer<typeof campaignActionSchema>,
): Promise<ActionResult> {
  const parsed = campaignActionSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Requête invalide." };
  const auth = await checkEditor(parsed.data.ad_account_id);
  if (!auth.ok) return auth;

  const admin = createAdminClient();

  /* Vérifie compliance_review_status avant activation. */
  const { data: campaign } = await admin
    .from("ads_campaigns")
    .select("compliance_review_status")
    .eq("id", parsed.data.campaign_id)
    .maybeSingle();
  if (!campaign) return { ok: false, error: "Campagne introuvable." };
  if (campaign.compliance_review_status === "rejected") {
    return {
      ok: false,
      error: "Cette campagne a été rejetée à la conformité. Crée-en une nouvelle.",
    };
  }

  const { error } = await admin
    .from("ads_campaigns")
    .update({ status: "active" })
    .eq("id", parsed.data.campaign_id);
  if (error) {
    return { ok: false, error: `Activation impossible : ${error.message}` };
  }
  revalidatePath(`/ads-manager/${parsed.data.ad_account_id}`);
  revalidatePath(
    `/ads-manager/${parsed.data.ad_account_id}/campaigns/${parsed.data.campaign_id}`,
  );
  return { ok: true };
}

export async function archiveCampaign(
  input: z.infer<typeof campaignActionSchema>,
): Promise<ActionResult> {
  const parsed = campaignActionSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Requête invalide." };
  const auth = await checkEditor(parsed.data.ad_account_id);
  if (!auth.ok) return auth;

  const admin = createAdminClient();

  /* Cascade : archive tous les ad_sets + désactive les ads. */
  await admin
    .from("ads_ad_sets")
    .update({ status: "archived" })
    .eq("campaign_id", parsed.data.campaign_id);
  await admin
    .from("ads_ads")
    .update({ status: "archived" })
    .eq("campaign_id", parsed.data.campaign_id);

  const { error } = await admin
    .from("ads_campaigns")
    .update({ status: "completed" })
    .eq("id", parsed.data.campaign_id);
  if (error) {
    return { ok: false, error: `Archive impossible : ${error.message}` };
  }
  revalidatePath(`/ads-manager/${parsed.data.ad_account_id}`);
  return { ok: true };
}

export async function duplicateCampaign(
  input: z.infer<typeof campaignActionSchema>,
): Promise<{ ok: true; new_campaign_id: string } | { ok: false; error: string }> {
  const parsed = campaignActionSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Requête invalide." };
  const auth = await checkEditor(parsed.data.ad_account_id);
  if (!auth.ok) return auth;

  const admin = createAdminClient();
  type CampaignInsert = Database["public"]["Tables"]["ads_campaigns"]["Insert"];
  type AdSetInsert = Database["public"]["Tables"]["ads_ad_sets"]["Insert"];
  type CreativeInsert = Database["public"]["Tables"]["ads_creatives"]["Insert"];
  type AdInsert = Database["public"]["Tables"]["ads_ads"]["Insert"];

  /* 1. Récup la campaign source. */
  const { data: src } = await admin
    .from("ads_campaigns")
    .select("*")
    .eq("id", parsed.data.campaign_id)
    .maybeSingle();
  if (!src) return { ok: false, error: "Campagne source introuvable." };

  /* 2. Insère la nouvelle campaign avec status='draft'. */
  const newCampaignInsert: CampaignInsert = {
    ad_account_id: src.ad_account_id,
    name: `${src.name} (copie)`,
    objective: src.objective,
    buying_type: src.buying_type,
    status: "draft",
    daily_budget: src.daily_budget,
    lifetime_budget: src.lifetime_budget,
    spend_cap: src.spend_cap,
    is_split_test: src.is_split_test,
    split_test_variant_ids: src.split_test_variant_ids,
    special_ad_category: src.special_ad_category,
    compliance_review_status: "pending",
    created_by: src.created_by,
  };
  const { data: newCampaign, error: ce } = await admin
    .from("ads_campaigns")
    .insert(newCampaignInsert)
    .select("id")
    .single();
  if (ce || !newCampaign) {
    return { ok: false, error: `Duplication échouée : ${ce?.message ?? ""}` };
  }

  /* 3. Pour chaque ad_set source : copie + nouveaux creatives + ads. */
  const { data: srcAdSets } = await admin
    .from("ads_ad_sets")
    .select("*")
    .eq("campaign_id", parsed.data.campaign_id);

  for (const srcSet of srcAdSets ?? []) {
    const setInsert: AdSetInsert = {
      campaign_id: newCampaign.id,
      ad_account_id: srcSet.ad_account_id,
      name: srcSet.name,
      daily_budget: srcSet.daily_budget,
      lifetime_budget: srcSet.lifetime_budget,
      bid_strategy: srcSet.bid_strategy,
      bid_amount: srcSet.bid_amount,
      targeting: srcSet.targeting as AdSetInsert["targeting"],
      placements: srcSet.placements,
      optimization_goal: srcSet.optimization_goal,
      billing_event: srcSet.billing_event,
      pacing_type: srcSet.pacing_type,
      frequency_cap: srcSet.frequency_cap as AdSetInsert["frequency_cap"],
      start_time: srcSet.start_time,
      end_time: srcSet.end_time,
      dayparting: srcSet.dayparting as AdSetInsert["dayparting"],
      status: "paused",
    };
    const { data: newSet } = await admin
      .from("ads_ad_sets")
      .insert(setInsert)
      .select("id")
      .single();
    if (!newSet) continue;

    /* Copie les ads de cet ad_set. */
    const { data: srcAds } = await admin
      .from("ads_ads")
      .select("*")
      .eq("ad_set_id", srcSet.id);

    for (const srcAd of srcAds ?? []) {
      /* Copie le creative. */
      const { data: srcCreative } = await admin
        .from("ads_creatives")
        .select("*")
        .eq("id", srcAd.creative_id)
        .maybeSingle();
      if (!srcCreative) continue;
      const creativeInsert: CreativeInsert = {
        ad_account_id: srcCreative.ad_account_id,
        type: srcCreative.type,
        media_url: srcCreative.media_url,
        media_thumbnail_url: srcCreative.media_thumbnail_url,
        primary_text: srcCreative.primary_text,
        headline: srcCreative.headline,
        description: srcCreative.description,
        call_to_action: srcCreative.call_to_action,
        destination_url: srcCreative.destination_url,
        deep_link: srcCreative.deep_link,
        advertiser_entity_id: srcCreative.advertiser_entity_id,
        auto_disclaimer: srcCreative.auto_disclaimer,
        manual_disclaimer: srcCreative.manual_disclaimer,
      };
      const { data: newCreative } = await admin
        .from("ads_creatives")
        .insert(creativeInsert)
        .select("id")
        .single();
      if (!newCreative) continue;

      const adInsert: AdInsert = {
        ad_set_id: newSet.id,
        ad_account_id: srcAd.ad_account_id,
        campaign_id: newCampaign.id,
        creative_id: newCreative.id,
        name: srcAd.name,
        status: "paused",
        review_status: "pending",
      };
      await admin.from("ads_ads").insert(adInsert);
    }
  }

  revalidatePath(`/ads-manager/${parsed.data.ad_account_id}`);
  return { ok: true, new_campaign_id: newCampaign.id };
}

/* ============================================================
 * AD SET actions
 * ============================================================ */

const adSetActionSchema = z.object({
  ad_set_id: z.string().uuid(),
  ad_account_id: z.string().uuid(),
});

export async function pauseAdSet(
  input: z.infer<typeof adSetActionSchema>,
): Promise<ActionResult> {
  const parsed = adSetActionSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Requête invalide." };
  const auth = await checkEditor(parsed.data.ad_account_id);
  if (!auth.ok) return auth;
  const admin = createAdminClient();
  const { error } = await admin
    .from("ads_ad_sets")
    .update({ status: "paused" })
    .eq("id", parsed.data.ad_set_id);
  if (error) return { ok: false, error: error.message };
  revalidatePath(`/ads-manager/${parsed.data.ad_account_id}`);
  return { ok: true };
}

export async function activateAdSet(
  input: z.infer<typeof adSetActionSchema>,
): Promise<ActionResult> {
  const parsed = adSetActionSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Requête invalide." };
  const auth = await checkEditor(parsed.data.ad_account_id);
  if (!auth.ok) return auth;
  const admin = createAdminClient();
  const { error } = await admin
    .from("ads_ad_sets")
    .update({ status: "active" })
    .eq("id", parsed.data.ad_set_id);
  if (error) return { ok: false, error: error.message };
  revalidatePath(`/ads-manager/${parsed.data.ad_account_id}`);
  return { ok: true };
}

export async function archiveAdSet(
  input: z.infer<typeof adSetActionSchema>,
): Promise<ActionResult> {
  const parsed = adSetActionSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Requête invalide." };
  const auth = await checkEditor(parsed.data.ad_account_id);
  if (!auth.ok) return auth;
  const admin = createAdminClient();
  await admin
    .from("ads_ads")
    .update({ status: "archived" })
    .eq("ad_set_id", parsed.data.ad_set_id);
  const { error } = await admin
    .from("ads_ad_sets")
    .update({ status: "archived" })
    .eq("id", parsed.data.ad_set_id);
  if (error) return { ok: false, error: error.message };
  revalidatePath(`/ads-manager/${parsed.data.ad_account_id}`);
  return { ok: true };
}

/* ============================================================
 * AD actions
 * ============================================================ */

const adActionSchema = z.object({
  ad_id: z.string().uuid(),
  ad_account_id: z.string().uuid(),
});

export async function pauseAd(
  input: z.infer<typeof adActionSchema>,
): Promise<ActionResult> {
  const parsed = adActionSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Requête invalide." };
  const auth = await checkEditor(parsed.data.ad_account_id);
  if (!auth.ok) return auth;
  const admin = createAdminClient();
  const { error } = await admin
    .from("ads_ads")
    .update({ status: "paused" })
    .eq("id", parsed.data.ad_id);
  if (error) return { ok: false, error: error.message };
  revalidatePath(`/ads-manager/${parsed.data.ad_account_id}`);
  return { ok: true };
}

export async function activateAd(
  input: z.infer<typeof adActionSchema>,
): Promise<ActionResult> {
  const parsed = adActionSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Requête invalide." };
  const auth = await checkEditor(parsed.data.ad_account_id);
  if (!auth.ok) return auth;
  const admin = createAdminClient();
  /* Vérifie review_status. */
  const { data: ad } = await admin
    .from("ads_ads")
    .select("review_status")
    .eq("id", parsed.data.ad_id)
    .maybeSingle();
  if (!ad) return { ok: false, error: "Ad introuvable." };
  if (ad.review_status === "rejected") {
    return {
      ok: false,
      error: "Cette pub a été rejetée par la modération. Crée-en une nouvelle.",
    };
  }
  if (ad.review_status === "pending") {
    return {
      ok: false,
      error:
        "Cette pub est encore en attente de revue conformité. Patiente quelques minutes.",
    };
  }
  const { error } = await admin
    .from("ads_ads")
    .update({ status: "active" })
    .eq("id", parsed.data.ad_id);
  if (error) return { ok: false, error: error.message };
  revalidatePath(`/ads-manager/${parsed.data.ad_account_id}`);
  return { ok: true };
}

export async function archiveAd(
  input: z.infer<typeof adActionSchema>,
): Promise<ActionResult> {
  const parsed = adActionSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Requête invalide." };
  const auth = await checkEditor(parsed.data.ad_account_id);
  if (!auth.ok) return auth;
  const admin = createAdminClient();
  const { error } = await admin
    .from("ads_ads")
    .update({ status: "archived" })
    .eq("id", parsed.data.ad_id);
  if (error) return { ok: false, error: error.message };
  revalidatePath(`/ads-manager/${parsed.data.ad_account_id}`);
  return { ok: true };
}
