import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { isCurrentUserAdmin } from "@/lib/queries/admin";

/* GET /api/ads/diagnostic
 *
 * Endpoint de debug : retourne le statut des env vars + tables critiques
 * pour le module Ads V4. Réservé aux admins (ne révèle aucune valeur).
 *
 * Usage : ouvre /api/ads/diagnostic dans ton navigateur après login admin
 * pour voir ce qui manque côté Vercel.
 */

type CheckStatus = "ok" | "missing" | "error";

type Diagnostic = {
  env: Record<string, { status: CheckStatus; required: boolean; impact: string }>;
  tables: Record<string, { status: CheckStatus; impact: string }>;
  rpcs: Record<string, { status: CheckStatus; impact: string }>;
  ready: boolean;
};

export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const isAdmin = await isCurrentUserAdmin();
  if (!isAdmin) {
    return NextResponse.json({ error: "Admin only" }, { status: 403 });
  }

  /* === Env vars === */
  const envChecks: Diagnostic["env"] = {
    NEXT_PUBLIC_SUPABASE_URL: {
      status: process.env.NEXT_PUBLIC_SUPABASE_URL ? "ok" : "missing",
      required: true,
      impact: "Sans ça, rien ne fonctionne.",
    },
    NEXT_PUBLIC_SUPABASE_ANON_KEY: {
      status: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ? "ok" : "missing",
      required: true,
      impact: "Sans ça, rien ne fonctionne.",
    },
    SUPABASE_SERVICE_ROLE_KEY: {
      status: process.env.SUPABASE_SERVICE_ROLE_KEY ? "ok" : "missing",
      required: true,
      impact:
        "Bypass RLS pour les écritures privilégiées (création comptes, analyses).",
    },
    OPENAI_API_KEY: {
      status: process.env.OPENAI_API_KEY ? "ok" : "missing",
      required: true,
      impact: "Website Analyzer + modération texte/image. Sans ça → 503.",
    },
    REPLICATE_API_TOKEN: {
      status: process.env.REPLICATE_API_TOKEN ? "ok" : "missing",
      required: false,
      impact: "Génération IA d'images SDXL. Si absent → onglet IA désactivé.",
    },
    PEXELS_API_KEY: {
      status: process.env.PEXELS_API_KEY ? "ok" : "missing",
      required: false,
      impact: "Stock photos Pexels. Si absent → résultats vides.",
    },
    UNSPLASH_ACCESS_KEY: {
      status: process.env.UNSPLASH_ACCESS_KEY ? "ok" : "missing",
      required: false,
      impact: "Stock photos Unsplash. Si absent → résultats vides.",
    },
    DATAFORSEO_LOGIN: {
      status: process.env.DATAFORSEO_LOGIN ? "ok" : "missing",
      required: false,
      impact: "Keyword Planner. Si absent → warning + cache only.",
    },
    DATAFORSEO_PASSWORD: {
      status: process.env.DATAFORSEO_PASSWORD ? "ok" : "missing",
      required: false,
      impact: "Keyword Planner. Idem.",
    },
  };

  /* === Tables critiques === */
  const tableChecks: Diagnostic["tables"] = {};
  const tablesToCheck: Array<[string, string]> = [
    ["ads_website_analyses", "Cache du Website Analyzer (migration 0050)"],
    ["ads_keyword_research", "Cache Keyword Planner (migration 0050)"],
    ["ads_recommendations", "Recos IA (migration 0050)"],
    ["ads_lead_forms", "Lead Forms natifs (migration 0050)"],
    ["ads_dynamic_creative_variants", "Dynamic Creative (migration 0050)"],
    ["ads_smart_audience_segments", "Smart Mode (migration 0050)"],
  ];

  for (const [tname, impact] of tablesToCheck) {
    try {
      /* Cast typing : on accepte des table names dynamiques pour le diag.
         supabase-js a un typing strict du from(name), on bypass via
         unknown pour ce check générique de diagnostic. */
      type DiagBuilder = {
        select: (
          cols: string,
          opts: { count: "exact"; head: boolean },
        ) => {
          limit: (n: number) => Promise<{ error: { code?: string } | null }>;
        };
      };
      const builder = supabase.from(
        tname as never,
      ) as unknown as DiagBuilder;
      const { error } = await builder
        .select("id", { count: "exact", head: true })
        .limit(1);
      tableChecks[tname] = {
        status: error
          ? error.code === "42P01"
            ? "missing"
            : "error"
          : "ok",
        impact,
      };
    } catch {
      tableChecks[tname] = { status: "error", impact };
    }
  }

  /* === RPC critiques === */
  const rpcChecks: Diagnostic["rpcs"] = {};
  try {
    const { error } = await supabase.rpc("normalize_url", {
      p_url: "https://example.com",
    });
    rpcChecks.normalize_url = {
      status: error
        ? error.code === "42883" || /does not exist/i.test(error.message)
          ? "missing"
          : "error"
        : "ok",
      impact:
        "Cache Website Analyzer (migration 0050). Sans ça, toutes les analyses échouent.",
    };
  } catch {
    rpcChecks.normalize_url = { status: "error", impact: "RPC en erreur" };
  }

  try {
    /* On utilise un UUID null pour ne pas révéler de data — la fonction
       doit juste exister. */
    const { error } = await supabase.rpc("user_has_ad_account_role", {
      p_ad_account_id: "00000000-0000-0000-0000-000000000000",
      p_min_role: "analyst",
    });
    rpcChecks.user_has_ad_account_role = {
      status: error
        ? error.code === "42883" || /does not exist/i.test(error.message)
          ? "missing"
          : "ok" // erreur autre = la fonction existe (ex: bad UUID)
        : "ok",
      impact: "Auth multi-tenant (migration ads core). Sans ça, tout est 403.",
    };
  } catch {
    rpcChecks.user_has_ad_account_role = {
      status: "error",
      impact: "RPC en erreur",
    };
  }

  /* === Ready ? === */
  const requiredEnvOk = Object.values(envChecks)
    .filter((e) => e.required)
    .every((e) => e.status === "ok");
  const tablesOk = Object.values(tableChecks).every((t) => t.status === "ok");
  const rpcsOk = Object.values(rpcChecks).every((r) => r.status === "ok");

  const diag: Diagnostic = {
    env: envChecks,
    tables: tableChecks,
    rpcs: rpcChecks,
    ready: requiredEnvOk && tablesOk && rpcsOk,
  };

  return NextResponse.json(diag, {
    headers: { "Cache-Control": "no-store" },
  });
}
