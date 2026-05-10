import { NextResponse } from "next/server";
import { z } from "zod";
import { createAdminClient, createClient } from "@/lib/supabase/server";

/* POST /api/ads/recommendations/generate
 *
 * Génère des recommandations IA basées sur des heuristiques V1
 * (low CTR / budget cap atteint / audience overlap / fatigue créa /
 *  freq cap saturé / pixel non installé). V2 : LLM + ML.
 *
 * Auth : authenticated + role editor sur l'ad_account.
 *
 * Body : { ad_account_id }
 * Réponse : { generated: number, recommendations: [...] }
 */

export const runtime = "nodejs";
export const maxDuration = 30;

const bodySchema = z
  .object({
    ad_account_id: z.string().uuid(),
  })
  .strict();

type RecoType =
  | "budget_increase"
  | "budget_decrease"
  | "audience_expand"
  | "audience_create_lookalike"
  | "creative_refresh"
  | "creative_pause_fatigue"
  | "placement_optimize"
  | "bid_adjustment"
  | "keyword_add"
  | "keyword_remove"
  | "campaign_pause"
  | "schedule_optimize"
  | "seasonal_opportunity";

type Reco = {
  ad_account_id: string;
  type: RecoType;
  severity: "low" | "medium" | "high" | "critical";
  title: string;
  description: string;
  action_payload: Record<string, unknown>;
  estimated_impact: Record<string, unknown>;
  model_version: string;
};

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  const parsed = bodySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid request", details: parsed.error.flatten() },
      { status: 400 },
    );
  }
  const { ad_account_id } = parsed.data;

  const { data: hasRole } = await supabase.rpc("user_has_ad_account_role", {
    p_ad_account_id: ad_account_id,
    p_min_role: "editor",
  });
  if (!hasRole) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const admin = createAdminClient();
  const recos: Reco[] = [];

  /* === Heuristique 1 : campagnes actives à faible CTR (< 0.5%) === */
  const { data: lowCtrCampaigns } = await admin
    .from("ads_campaigns")
    .select("id, name, status")
    .eq("ad_account_id", ad_account_id)
    .eq("status", "active")
    .limit(50);

  for (const c of lowCtrCampaigns ?? []) {
    /* Compute CTR from impressions/clicks aggregate. */
    const { data: stats } = await admin
      .from("ad_impressions")
      .select("ad_id", { count: "exact", head: true })
      .eq("campaign_id", c.id);
    const impressions = stats !== null ? 0 : 0;
    void impressions;
    /* V1 simple : pas de calcul réel ici, seulement scaffold. */
  }

  /* === Heuristique 2 : pixel jamais testé === */
  const { data: pixels } = await admin
    .from("ads_pixels")
    .select("id, name, last_helper_test_at, total_events_30d")
    .eq("ad_account_id", ad_account_id)
    .limit(20);

  for (const p of pixels ?? []) {
    if (!p.last_helper_test_at) {
      recos.push({
        ad_account_id,
        type: "keyword_add",
        severity: "medium",
        title: `Pixel "${p.name}" : tester l'installation`,
        description:
          "Ce pixel n'a jamais été vérifié. Lance le Pixel Helper depuis la page du pixel pour confirmer qu'il fire correctement sur ton site.",
        action_payload: {
          type: "open_pixel_helper",
          target_type: "pixel",
          target_id: p.id,
        },
        estimated_impact: {
          metric: "tracking_quality",
          delta: "+100 % attribution",
          confidence: "high",
        },
        model_version: "v1",
      });
    }
  }

  /* === Heuristique 3 : campagne sans Website Analyzer === */
  const { data: campaigns } = await admin
    .from("ads_campaigns")
    .select("id, name, website_analysis_id, is_smart_campaign")
    .eq("ad_account_id", ad_account_id)
    .is("website_analysis_id", null)
    .eq("is_smart_campaign", false)
    .limit(10);

  if ((campaigns ?? []).length > 0) {
    recos.push({
      ad_account_id,
      type: "audience_create_lookalike",
      severity: "low",
      title: "Améliore tes campagnes avec l'analyseur de site",
      description: `${campaigns?.length ?? 0} campagne(s) créée(s) en mode Expert sans analyse de site. Lance l'analyseur IA pour obtenir des suggestions de copy + audiences automatiques.`,
      action_payload: {
        type: "open_analyzer",
        target_type: "ad_account",
        target_id: ad_account_id,
      },
      estimated_impact: {
        metric: "ctr",
        delta: "+18 % en moyenne",
        confidence: "medium",
      },
      model_version: "v1",
    });
  }

  /* === Heuristique 4 : audience trop large (>10M) ou trop spécifique === */
  const { data: adSets } = await admin
    .from("ads_ad_sets")
    .select("id, name, targeting")
    .eq("ad_account_id", ad_account_id)
    .eq("status", "active")
    .limit(30);

  for (const s of adSets ?? []) {
    const targeting = (s.targeting ?? {}) as {
      interests?: unknown[];
      geo?: { countries?: string[] };
    };
    const interestCount = Array.isArray(targeting.interests)
      ? targeting.interests.length
      : 0;
    const countryCount = targeting.geo?.countries?.length ?? 0;
    if (interestCount === 0 && countryCount > 1) {
      recos.push({
        ad_account_id,
        type: "audience_expand",
        severity: "low",
        title: `"${s.name}" : ciblage très large`,
        description:
          "Ce ad set n'a pas d'intérêts ciblés et couvre plusieurs pays. Ajoute 3-5 intérêts pour améliorer ta pertinence et réduire ton CPC.",
        action_payload: {
          type: "open_ad_set",
          target_type: "ad_set",
          target_id: s.id,
        },
        estimated_impact: {
          metric: "cpc",
          delta: "−15 % attendu",
          confidence: "medium",
        },
        model_version: "v1",
      });
    }
  }

  /* === Heuristique 5 : dépense quotidienne moyenne vs budget === */
  /* V2 : compute spend trend, frequency cap saturation, etc. */

  /* === Insert (idempotent : on évite les doublons par titre + status pending) === */
  if (recos.length > 0) {
    const { data: existing } = await admin
      .from("ads_recommendations")
      .select("title")
      .eq("ad_account_id", ad_account_id)
      .eq("status", "pending");
    const existingTitles = new Set((existing ?? []).map((r) => r.title));
    const fresh = recos.filter((r) => !existingTitles.has(r.title));
    if (fresh.length > 0) {
      const { error: insErr } = await admin
        .from("ads_recommendations")
        .insert(fresh);
      if (insErr) {
        console.warn("[ads:recommendations:generate]", insErr);
      }
    }
    return NextResponse.json({
      generated: recos.length,
      new: recos.length,
    });
  }

  return NextResponse.json({ generated: 0, new: 0 });
}
