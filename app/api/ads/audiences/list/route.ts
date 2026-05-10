import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

/* GET /api/ads/audiences/list?account=<id>
 *
 * Liste les audiences (saved, custom_list, custom_pixel, custom_engagement,
 * lookalike, divarc_special) pour un ad_account donné.
 *
 * Auth : authenticated + role analyst+ sur l'ad_account.
 *
 * Defensive : si la migration ads_audiences n'est pas appliquée (42P01),
 * on renvoie une liste vide plutôt qu'une erreur 500.
 */

export async function GET(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const accountId = new URL(request.url).searchParams.get("account");
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
    .from("ads_audiences")
    .select("id, name, type, estimated_size")
    .eq("ad_account_id", accountId)
    .order("created_at", { ascending: false })
    .limit(100);

  if (error && error.code !== "42P01") {
    console.error("[ads:audiences:list]", error);
    return NextResponse.json({ error: "List failed" }, { status: 500 });
  }

  return NextResponse.json({ audiences: data ?? [] });
}
