import { NextResponse } from "next/server";
import { createAdminClient, createClient } from "@/lib/supabase/server";

/* GET /api/ads/click?ad=xxx&dest=https%3A%2F%2F... — track click + redirect.
 *
 * Conformité :
 *   - Anti-fraud : score basique (UA Bot? IP suspecte ?) en V1
 *   - LCEN : on log IP anonymisée + UA pour traçabilité 1 an
 *   - DSA : la destination est validée (pas de open redirect arbitraire) :
 *           on ne suit que les URLs configurées dans l'ad creative.
 */

export async function GET(request: Request) {
  const url = new URL(request.url);
  const adId = url.searchParams.get("ad");
  const dest = url.searchParams.get("dest");
  if (!adId || !dest) {
    return NextResponse.json({ error: "Missing params" }, { status: 400 });
  }

  const supabase = await createClient();
  const { data: ad } = await supabase
    .from("ads_ads")
    .select("id, ad_set_id, campaign_id, ad_account_id, creative_id")
    .eq("id", adId)
    .maybeSingle();
  if (!ad) {
    return NextResponse.json({ error: "Ad not found" }, { status: 404 });
  }
  const { data: creative } = await supabase
    .from("ads_creatives")
    .select("destination_url")
    .eq("id", ad.creative_id)
    .maybeSingle();
  if (!creative?.destination_url) {
    return NextResponse.json({ error: "No destination" }, { status: 400 });
  }
  /* Validation anti open-redirect : la destination DOIT matcher la
     creative configurée. */
  if (creative.destination_url !== dest) {
    return NextResponse.json(
      { error: "Destination mismatch" },
      { status: 400 },
    );
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();

  /* Anti-fraud heuristique V1. */
  const ua = request.headers.get("user-agent") ?? "";
  const ip =
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? null;
  const isBot = /bot|crawler|spider|headless|phantom/i.test(ua);
  const fraudScore = isBot ? 0.95 : 0;
  const ipAnon = ip ? anonymizeIp(ip) : null;

  const admin = createAdminClient();
  await admin.from("ad_clicks").insert({
    ad_id: ad.id,
    ad_set_id: ad.ad_set_id,
    campaign_id: ad.campaign_id,
    ad_account_id: ad.ad_account_id,
    user_id: user?.id ?? null,
    surface: null,
    destination_url: dest,
    fraud_score: fraudScore,
    is_invalid: isBot,
    invalid_reason: isBot ? "bot_user_agent" : null,
    client_ip_anon: ipAnon,
    client_user_agent: ua.slice(0, 500),
  });

  return NextResponse.redirect(dest, { status: 302 });
}

function anonymizeIp(ip: string): string {
  if (ip.includes(":")) {
    const parts = ip.split(":");
    return `${parts.slice(0, 4).join(":")}::`;
  }
  const parts = ip.split(".");
  if (parts.length === 4) return `${parts[0]}.${parts[1]}.${parts[2]}.0`;
  return ip;
}
