import { NextResponse } from "next/server";
import { z } from "zod";
import { analyzeWebsite } from "@/lib/ads/websiteAnalyzer";
import { createClient } from "@/lib/supabase/server";

/* POST /api/ads/website-analyzer
 *
 * Body : { url, ad_account_id?, force_refresh? }
 *
 * Pipeline synchrone (~30-50s) :
 *   1. Auth + role analyst+ si ad_account_id fourni
 *   2. Cache lookup
 *   3. Crawl polite + extract structured + 4 LLM calls + assemble
 *   4. Return WebsiteAnalysisResult complet
 *
 * Runtime : nodejs (jsdom + fetch) avec maxDuration 60s.
 */

export const runtime = "nodejs";
export const maxDuration = 60;

const bodySchema = z
  .object({
    url: z.string().url("URL invalide"),
    ad_account_id: z.string().uuid().optional(),
    force_refresh: z.boolean().optional().default(false),
  })
  .strict();

export async function POST(request: Request) {
  /* Top-level try/catch pour ne JAMAIS renvoyer un 500 nu —
     on surface toujours un message exploitable côté UI. */
  try {
    /* Pré-check env vars critiques. Si OPENAI_API_KEY ou
       SUPABASE_SERVICE_ROLE_KEY manquent, le pipeline va crasher
       de toute façon — autant le dire clairement avec un 503. */
    if (!process.env.OPENAI_API_KEY) {
      console.error("[website-analyzer] OPENAI_API_KEY manquante");
      return NextResponse.json(
        {
          status: "failed",
          error:
            "L'analyseur IA n'est pas configuré sur ce déploiement (OPENAI_API_KEY manquante côté serveur). Contacte l'équipe DIVARC.",
        },
        { status: 503 },
      );
    }
    if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
      console.error("[website-analyzer] SUPABASE_SERVICE_ROLE_KEY manquante");
      return NextResponse.json(
        {
          status: "failed",
          error:
            "Configuration serveur incomplète (SUPABASE_SERVICE_ROLE_KEY manquante). Contacte l'équipe DIVARC.",
        },
        { status: 503 },
      );
    }

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

    /* Si ad_account_id fourni : check role analyst+. */
    if (parsed.data.ad_account_id) {
      const { data: hasRole } = await supabase.rpc(
        "user_has_ad_account_role",
        {
          p_ad_account_id: parsed.data.ad_account_id,
          p_min_role: "analyst",
        },
      );
      if (!hasRole) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }
    }

    /* Rate limit basique : max 10 analyses/heure par user. Tolérant à
       42P01 (table missing) → on skip le rate limit gracieusement. */
    const oneHourAgo = new Date(Date.now() - 3600_000).toISOString();
    const { count: recentCount, error: rlErr } = await supabase
      .from("ads_website_analyses")
      .select("id", { count: "exact", head: true })
      .eq("requested_by", user.id)
      .gte("created_at", oneHourAgo);
    if (rlErr && rlErr.code === "42P01") {
      return NextResponse.json(
        {
          status: "failed",
          error:
            "Migration Supabase 0050_ads_advanced.sql non appliquée. La table ads_website_analyses est requise.",
        },
        { status: 503 },
      );
    }
    if ((recentCount ?? 0) >= 10) {
      return NextResponse.json(
        {
          error:
            "Limite atteinte (10 analyses/heure). Réessaie plus tard.",
        },
        { status: 429 },
      );
    }

    /* Lance le pipeline. */
    const result = await analyzeWebsite({
      url: parsed.data.url,
      ad_account_id: parsed.data.ad_account_id,
      requested_by: user.id,
      force_refresh: parsed.data.force_refresh,
    });

    if (result.status === "failed") {
      return NextResponse.json(
        {
          analysis_id: result.analysis_id,
          status: "failed",
          error: result.error,
        },
        { status: 502 },
      );
    }

    return NextResponse.json({
      analysis_id: result.analysis_id,
      status: result.status,
      cached: result.cached,
      result: result.result,
    });
  } catch (err) {
    /* Filet de sécurité ultime — capture toute exception non gérée. */
    console.error("[website-analyzer] uncaught:", err);
    const msg = err instanceof Error ? err.message : "Erreur inconnue";
    return NextResponse.json(
      {
        status: "failed",
        error: `Erreur serveur lors de l'analyse : ${msg}`,
      },
      { status: 500 },
    );
  }
}

/* GET /api/ads/website-analyzer?id=xxx — récup une analyse existante.
 * Utilisé par le frontend pour polling ou pour ré-afficher un résultat. */
export async function GET(request: Request) {
  const url = new URL(request.url);
  const analysisId = url.searchParams.get("id");
  if (!analysisId) {
    return NextResponse.json({ error: "Missing id" }, { status: 400 });
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data, error } = await supabase
    .from("ads_website_analyses")
    .select(
      "id, status, error_message, analysis_result, business_name, business_category, primary_objective, pages_crawled, duration_ms, expires_at, created_at, ad_account_id",
    )
    .eq("id", analysisId)
    .maybeSingle();

  if (error) {
    return NextResponse.json({ error: "Lookup failed" }, { status: 500 });
  }
  if (!data) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  return NextResponse.json({
    analysis_id: data.id,
    status: data.status,
    error_message: data.error_message,
    result: data.analysis_result,
    business_name: data.business_name,
    business_category: data.business_category,
    primary_objective: data.primary_objective,
    pages_crawled: data.pages_crawled,
    duration_ms: data.duration_ms,
    expires_at: data.expires_at,
    created_at: data.created_at,
  });
}
