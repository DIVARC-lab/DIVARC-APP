import { NextResponse } from "next/server";
import { z } from "zod";
import { createAdminClient, createClient } from "@/lib/supabase/server";

/* POST /api/ads/keywords/research
 *
 * Recherche keywords via DataForSEO (Google Ads API proxy) avec cache
 * 90 jours dans ads_keyword_research (partagé global).
 *
 * Body : { keywords: string[], country: 'FR', language: 'fr' }
 * Réponse : { results: Array<{ keyword, search_volume, cpc_estimate,
 *             competition_level, competition_index, intent }> }
 *
 * Auth : authenticated.
 *
 * Si DATAFORSEO_LOGIN absent → 503 graceful (le frontend affiche
 * un placeholder informatif).
 */

export const runtime = "nodejs";
export const maxDuration = 30;

const bodySchema = z
  .object({
    keywords: z.array(z.string().min(2).max(80)).min(1).max(50),
    country: z.string().length(2).default("FR"),
    language: z.string().length(2).default("fr"),
  })
  .strict();

type CachedRow = {
  keyword: string;
  country: string;
  language: string;
  search_volume: number | null;
  cpc_estimate: number | null;
  competition_index: number | null;
  competition_level: string | null;
  intent: string | null;
  related_keywords: string[] | null;
  fetched_at: string;
  expires_at: string;
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
  const { keywords, country, language } = parsed.data;
  const normalized = [
    ...new Set(keywords.map((k) => k.trim().toLowerCase()).filter(Boolean)),
  ];

  const admin = createAdminClient();

  /* === 1. Cache lookup (fresh seulement) === */
  const nowIso = new Date().toISOString();
  const { data: cached } = await admin
    .from("ads_keyword_research")
    .select(
      "keyword, country, language, search_volume, cpc_estimate, competition_index, competition_level, intent, related_keywords, fetched_at, expires_at",
    )
    .in("keyword", normalized)
    .eq("country", country)
    .eq("language", language)
    .gt("expires_at", nowIso)
    .order("fetched_at", { ascending: false });

  const cachedMap = new Map<string, CachedRow>();
  for (const row of (cached ?? []) as CachedRow[]) {
    /* Garde la plus récente par keyword. */
    if (!cachedMap.has(row.keyword)) cachedMap.set(row.keyword, row);
  }

  const missing = normalized.filter((k) => !cachedMap.has(k));

  /* === 2. Fetch DataForSEO pour les manquants === */
  const login = process.env.DATAFORSEO_LOGIN;
  const password = process.env.DATAFORSEO_PASSWORD;
  let dataforseoUnavailable = false;

  if (missing.length > 0 && login && password) {
    try {
      const auth = Buffer.from(`${login}:${password}`).toString("base64");
      const res = await fetch(
        "https://api.dataforseo.com/v3/keywords_data/google_ads/search_volume/live",
        {
          method: "POST",
          headers: {
            Authorization: `Basic ${auth}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify([
            {
              keywords: missing,
              location_name: locationName(country),
              language_name: languageName(language),
            },
          ]),
          signal: AbortSignal.timeout(25000),
        },
      );
      if (res.ok) {
        const json = (await res.json()) as {
          tasks?: Array<{
            result?: Array<{
              keyword: string;
              search_volume: number | null;
              cpc: number | null;
              competition: string | null;
              competition_index: number | null;
            }>;
          }>;
        };
        const items = json.tasks?.[0]?.result ?? [];
        const insertRows = items.map((it) => {
          const compLevel: "low" | "medium" | "high" | null =
            it.competition === "LOW"
              ? "low"
              : it.competition === "MEDIUM"
                ? "medium"
                : it.competition === "HIGH"
                  ? "high"
                  : null;
          return {
            keyword: it.keyword.toLowerCase(),
            country,
            language,
            search_volume: it.search_volume,
            cpc_estimate: it.cpc,
            competition_index: it.competition_index,
            competition_level: compLevel,
            intent: classifyIntent(it.keyword),
            data_source: "dataforseo",
          };
        });
        if (insertRows.length > 0) {
          const { error: insErr } = await admin
            .from("ads_keyword_research")
            .insert(insertRows);
          if (insErr) {
            console.warn("[ads:keyword:cache-write]", insErr);
          }
          /* Re-charge depuis cache pour garantir cohérence. */
          for (const row of insertRows) {
            cachedMap.set(row.keyword, {
              ...row,
              related_keywords: null,
              fetched_at: nowIso,
              expires_at: new Date(
                Date.now() + 90 * 24 * 3600 * 1000,
              ).toISOString(),
            });
          }
        }
      } else {
        console.warn("[ads:keyword:dataforseo-status]", res.status);
        dataforseoUnavailable = true;
      }
    } catch (err) {
      console.warn("[ads:keyword:dataforseo]", err);
      dataforseoUnavailable = true;
    }
  } else if (missing.length > 0) {
    dataforseoUnavailable = true;
  }

  /* === 3. Build response === */
  const results = normalized.map((k) => {
    const row = cachedMap.get(k);
    if (!row) {
      return {
        keyword: k,
        country,
        language,
        search_volume: null,
        cpc_estimate: null,
        competition_index: null,
        competition_level: null,
        intent: classifyIntent(k),
        related_keywords: null,
        unavailable: dataforseoUnavailable,
      };
    }
    return {
      keyword: row.keyword,
      country: row.country,
      language: row.language,
      search_volume: row.search_volume,
      cpc_estimate: row.cpc_estimate,
      competition_index: row.competition_index,
      competition_level: row.competition_level,
      intent: row.intent,
      related_keywords: row.related_keywords,
      unavailable: false,
    };
  });

  return NextResponse.json({
    results,
    cache_hits: normalized.length - missing.length,
    cache_misses: missing.length,
    dataforseo_available: !dataforseoUnavailable,
  });
}

function locationName(country: string): string {
  return (
    {
      FR: "France",
      BE: "Belgium",
      CH: "Switzerland",
      LU: "Luxembourg",
      CA: "Canada",
      DE: "Germany",
      ES: "Spain",
      IT: "Italy",
      PT: "Portugal",
      NL: "Netherlands",
      US: "United States",
      GB: "United Kingdom",
    }[country] ?? "France"
  );
}

function languageName(lang: string): string {
  return (
    {
      fr: "French",
      en: "English",
      es: "Spanish",
      de: "German",
      it: "Italian",
      pt: "Portuguese",
      nl: "Dutch",
    }[lang] ?? "French"
  );
}

function classifyIntent(
  keyword: string,
):
  | "informational"
  | "commercial"
  | "transactional"
  | "navigational"
  | "mixed" {
  const lk = keyword.toLowerCase();
  if (
    /\b(prix|tarif|acheter|commander|achat|buy|order|cheap|deal|promo)\b/.test(
      lk,
    )
  )
    return "transactional";
  if (
    /\b(meilleur|comparatif|review|avis|test|vs|alternative|top|best)\b/.test(
      lk,
    )
  )
    return "commercial";
  if (
    /\b(comment|pourquoi|qu'?est-ce|guide|tuto|how|why|what|tutorial)\b/.test(
      lk,
    )
  )
    return "informational";
  return "mixed";
}
