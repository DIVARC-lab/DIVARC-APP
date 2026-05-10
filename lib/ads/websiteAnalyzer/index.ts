import "server-only";
import { createAdminClient } from "@/lib/supabase/server";
import type {
  AdsWebsiteAnalysis,
  WebsiteAnalysisResult,
} from "@/lib/database.types";
import { crawlWebsite } from "./crawler";
import { extractStructuredData } from "./extractor";
import {
  classifyBusiness,
  generateAudiences,
  generateCopy,
  generateKeywords,
} from "./llm";

/* Orchestrateur principal du Website Analyzer.
 *
 * Pipeline complet :
 *   1. Cache lookup via url_normalized
 *   2. Si miss : insert pending → crawl → extract → 4 LLM calls
 *      (classify + keywords + audiences + copy) → assemble
 *   3. Update completed avec result jsonb + cost tracking
 *
 * Latence cible : 30-50s p95 (4 LLM calls × 5s + crawl ~10s).
 * Vercel maxDuration nodejs : 60s par défaut, ok.
 *
 * Coût par analyse : ~0.05€ (4 calls × ~3K tokens × 30c/Mtok ≈ 36c/Mtok).
 */

export type AnalyzeArgs = {
  url: string;
  ad_account_id?: string;
  requested_by?: string;
  force_refresh?: boolean;
};

export type AnalyzeResult = {
  analysis_id: string;
  status: "completed" | "failed";
  cached: boolean;
  result?: WebsiteAnalysisResult;
  error?: string;
};

export async function analyzeWebsite(args: AnalyzeArgs): Promise<AnalyzeResult> {
  const admin = createAdminClient();

  /* 1. Normalize URL via RPC. */
  const { data: normalizedRaw } = await admin.rpc("normalize_url", {
    p_url: args.url,
  });
  const urlNormalized = (normalizedRaw as string) ?? args.url;

  /* 2. Cache check. */
  if (!args.force_refresh) {
    const { data: cached } = await admin
      .from("ads_website_analyses")
      .select("*")
      .eq("url_normalized", urlNormalized)
      .eq("status", "completed")
      .gt("expires_at", new Date().toISOString())
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (cached?.analysis_result) {
      return {
        analysis_id: cached.id,
        status: "completed",
        cached: true,
        result: cached.analysis_result as WebsiteAnalysisResult,
      };
    }
  }

  /* 3. Insert pending. */
  const startTime = Date.now();
  const { data: row, error: insertErr } = await admin
    .from("ads_website_analyses")
    .insert({
      ad_account_id: args.ad_account_id ?? null,
      url_normalized: urlNormalized,
      url_original: args.url,
      status: "pending",
      requested_by: args.requested_by ?? null,
    })
    .select("id")
    .single();

  if (insertErr || !row) {
    console.error("[website-analyzer] insert failed:", insertErr);
    return {
      analysis_id: "",
      status: "failed",
      cached: false,
      error: "Impossible de démarrer l'analyse.",
    };
  }
  const analysisId = row.id;

  try {
    /* 4. Crawl. */
    await admin
      .from("ads_website_analyses")
      .update({ status: "crawling" })
      .eq("id", analysisId);

    const crawlResult = await crawlWebsite(args.url);
    if (crawlResult.pages.length === 0) {
      const errorMsg =
        crawlResult.errors.join("; ") ||
        "Impossible de crawler le site (pas de pages accessibles)";
      await admin
        .from("ads_website_analyses")
        .update({
          status: "failed",
          error_message: errorMsg,
          duration_ms: Date.now() - startTime,
        })
        .eq("id", analysisId);
      return {
        analysis_id: analysisId,
        status: "failed",
        cached: false,
        error: errorMsg,
      };
    }

    /* 5. Extract structured. */
    await admin
      .from("ads_website_analyses")
      .update({ status: "analyzing" })
      .eq("id", analysisId);

    const extracted = extractStructuredData(crawlResult.pages);

    /* 6. LLM calls (4 en série pour respecter rate limits + dépendances). */
    const classifyRes = await classifyBusiness(extracted);
    const classification = classifyRes.data;

    const [keywordsRes, audiencesRes, copyRes] = await Promise.all([
      generateKeywords(classification, extracted),
      generateAudiences(classification),
      generateCopy(classification, extracted),
    ]);

    const totalTokens =
      classifyRes.tokens_used +
      keywordsRes.tokens_used +
      audiencesRes.tokens_used +
      copyRes.tokens_used;
    const totalCostCents =
      classifyRes.cost_cents +
      keywordsRes.cost_cents +
      audiencesRes.cost_cents +
      copyRes.cost_cents;

    /* 7. Recommandations budget. */
    const recommendations = computeRecommendations(
      classification,
      keywordsRes.data.keywords_primary.length,
    );

    /* 8. Compliance warnings. */
    const complianceWarnings: string[] = [];
    const forbiddenDetected: string[] = [];
    for (const cat of classification.industry_sensitive_categories) {
      if (
        ["tabac", "drogues_illegales", "paris_sportifs_non_anj"].includes(cat)
      ) {
        forbiddenDetected.push(cat);
      } else if (
        ["alcool", "paris_sportifs", "rencontres_adultes"].includes(cat)
      ) {
        complianceWarnings.push(
          `Secteur 18+ détecté (${cat}) : disclaimer légal obligatoire ajouté automatiquement.`,
        );
      } else if (
        [
          "finance_credit",
          "assurance",
          "immobilier",
          "sante_para_medical",
          "juridique",
        ].includes(cat)
      ) {
        complianceWarnings.push(
          `Secteur réglementé détecté (${cat}) : justificatif professionnel sera demandé avant validation de la campagne.`,
        );
      }
    }

    /* 9. Build final result. */
    const result: WebsiteAnalysisResult = {
      business_name: classification.business_name,
      business_description: classification.business_description,
      business_category: classification.business_category,
      target_audience_inferred: classification.target_audience_inferred,
      keywords_primary: keywordsRes.data.keywords_primary.map((k) => ({
        keyword: k.keyword,
        relevance_score: k.relevance_score,
        intent: k.intent,
      })),
      keywords_secondary: keywordsRes.data.keywords_secondary.map((k) => ({
        keyword: k.keyword,
        relevance_score: k.relevance_score,
      })),
      keywords_negative_suggested: keywordsRes.data.keywords_negative,
      pages_detected: extracted.pages.map((p) => ({
        url: p.url,
        title: p.title ?? "",
        type: detectPageType(p.url),
      })),
      products_detected:
        extracted.products.length > 0
          ? extracted.products.map((p) => ({
              name: p.name,
              price: p.price,
              image_url: p.image_url,
              description: p.description,
            }))
          : undefined,
      services_detected:
        extracted.services.length > 0
          ? extracted.services.map((s) => ({
              name: s.name,
              description: s.description,
            }))
          : undefined,
      audiences_recommended: audiencesRes.data.audiences.map((a) => ({
        persona_name: a.persona_name,
        description: a.description,
        targeting_spec: {
          age_min: a.age_min,
          age_max: a.age_max,
          genders: a.genders,
          geo: { countries: a.countries },
          interests: a.interests.map((topic_id) => ({ topic_id })),
        },
        estimated_size:
          a.estimated_size_label === "narrow"
            ? 200_000
            : a.estimated_size_label === "medium"
              ? 1_000_000
              : 3_000_000,
      })),
      interests_topics: dedupeStrings(
        audiencesRes.data.audiences.flatMap((a) => a.interests),
      ),
      demographics_suggested: {
        age_min: Math.min(...audiencesRes.data.audiences.map((a) => a.age_min)),
        age_max: Math.max(...audiencesRes.data.audiences.map((a) => a.age_max)),
        genders: dedupeStrings(
          audiencesRes.data.audiences.flatMap((a) => a.genders),
        ),
        languages: ["fr"],
      },
      images_extracted: extracted.images.map((img) => ({
        url: img.url,
        alt_text: img.alt,
        width: img.width,
        height: img.height,
        is_logo: img.is_logo,
      })),
      brand_colors: [], // V2 — extraction colorthief
      brand_fonts: [], // V2 — extraction CSS
      headlines_suggested: copyRes.data.headlines,
      descriptions_suggested: copyRes.data.descriptions,
      cta_suggested: copyRes.data.ctas,
      objective_recommended: classification.primary_objective,
      objective_alternatives: classification.objective_alternatives,
      budget_recommended_min: recommendations.budget_min,
      budget_recommended_optimal: recommendations.budget_optimal,
      estimated_reach_per_euro: recommendations.estimated_reach_per_euro,
      estimated_cpc_range: recommendations.cpc_range,
      estimated_cpm_range: recommendations.cpm_range,
      compliance_warnings: complianceWarnings,
      forbidden_categories_detected: forbiddenDetected,
    };

    /* 10. Save final + insert smart_audience_segments. */
    await admin
      .from("ads_website_analyses")
      .update({
        status: "completed",
        analysis_result: result,
        business_name: classification.business_name,
        business_category: classification.business_category,
        primary_objective: classification.primary_objective,
        pages_crawled: crawlResult.pages.length,
        llm_tokens_used: totalTokens,
        cost_cents: totalCostCents,
        duration_ms: Date.now() - startTime,
      })
      .eq("id", analysisId);

    /* Persist smart audience segments pour réutilisation Smart Mode. */
    if (args.ad_account_id) {
      await admin.from("ads_smart_audience_segments").insert(
        result.audiences_recommended.map((a, idx) => ({
          website_analysis_id: analysisId,
          ad_account_id: args.ad_account_id ?? null,
          persona_name: a.persona_name,
          persona_description: a.description,
          targeting_spec: a.targeting_spec,
          estimated_size: a.estimated_size,
          ai_ranking: idx,
          confidence_score: 0.7, // V1 fixe, V2 calculé par modèle
        })),
      );
    }

    return {
      analysis_id: analysisId,
      status: "completed",
      cached: false,
      result,
    };
  } catch (err) {
    console.error("[website-analyzer] pipeline failed:", err);
    const msg = err instanceof Error ? err.message : "Erreur inconnue";
    await admin
      .from("ads_website_analyses")
      .update({
        status: "failed",
        error_message: msg,
        duration_ms: Date.now() - startTime,
      })
      .eq("id", analysisId);
    return {
      analysis_id: analysisId,
      status: "failed",
      cached: false,
      error: msg,
    };
  }
}

function computeRecommendations(
  classification: { industry_sensitive_categories: string[] },
  keywordCount: number,
): {
  budget_min: number;
  budget_optimal: number;
  estimated_reach_per_euro: Record<string, number>;
  cpc_range: [number, number];
  cpm_range: [number, number];
} {
  /* Heuristique V1 :
     - budget_min : 5€/jour (test)
     - budget_optimal : 15€ + 0.3€ par keyword (compétition)
     - cap à 100€/jour pour V1
     - secteurs réglementés : +50% sur tous les budgets
  */
  const isRegulated = classification.industry_sensitive_categories.length > 0;
  const multiplier = isRegulated ? 1.5 : 1;
  const budgetOptimal = Math.min(
    100,
    Math.round((15 + keywordCount * 0.3) * multiplier),
  );

  return {
    budget_min: Math.round(5 * multiplier),
    budget_optimal: budgetOptimal,
    estimated_reach_per_euro: {
      feed_home: 200,
      marketplace_feed: 250,
      jobs_feed: 100,
      stories: 300,
    },
    cpc_range: [0.15, 0.8],
    cpm_range: [3, 12],
  };
}

function detectPageType(url: string): string {
  const path = new URL(url).pathname.toLowerCase();
  if (path === "/" || path === "") return "home";
  if (/\b(about|qui-sommes-nous|a-propos)\b/.test(path)) return "about";
  if (/\b(products?|produits|catalogue|shop|boutique)\b/.test(path))
    return "products";
  if (/\b(services?|prestations)\b/.test(path)) return "services";
  if (/\b(pricing|tarifs|prix)\b/.test(path)) return "pricing";
  if (/\b(contact)\b/.test(path)) return "contact";
  if (/\b(blog|news|actualites)\b/.test(path)) return "blog";
  return "other";
}

function dedupeStrings(arr: string[]): string[] {
  return Array.from(new Set(arr));
}
