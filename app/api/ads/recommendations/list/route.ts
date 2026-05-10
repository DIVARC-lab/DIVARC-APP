import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

/* GET /api/ads/recommendations/list?account=<id>&status=pending
 *
 * Liste les recommandations IA pour un ad_account. Filtrées par status
 * (pending par défaut). Auto-expire si > expires_at.
 *
 * Auth : authenticated + role analyst+ sur l'ad_account.
 *
 * Defensive : si la migration n'est pas appliquée (42P01), retourne
 * une liste vide avec status 200.
 */

export async function GET(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const url = new URL(request.url);
  const accountId = url.searchParams.get("account");
  const statusParam = url.searchParams.get("status");
  const status: "pending" | "applied" | "dismissed" | "expired" =
    statusParam === "applied" ||
    statusParam === "dismissed" ||
    statusParam === "expired"
      ? statusParam
      : "pending";

  if (!accountId) {
    return NextResponse.json({ error: "Missing account" }, { status: 400 });
  }

  const { data: hasRole } = await supabase.rpc("user_has_ad_account_role", {
    p_ad_account_id: accountId,
    p_min_role: "analyst",
  });
  if (!hasRole) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { data, error } = await supabase
    .from("ads_recommendations")
    .select(
      "id, type, severity, title, description, action_payload, estimated_impact, status, generated_at, expires_at",
    )
    .eq("ad_account_id", accountId)
    .eq("status", status)
    .gt("expires_at", new Date().toISOString())
    .order("severity", { ascending: false })
    .order("generated_at", { ascending: false })
    .limit(20);

  if (error && error.code !== "42P01") {
    console.error("[ads:recommendations:list]", error);
    return NextResponse.json({ error: "List failed" }, { status: 500 });
  }

  return NextResponse.json({ recommendations: data ?? [] });
}
