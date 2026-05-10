import { NextResponse } from "next/server";
import { z } from "zod";
import { runAuction } from "@/lib/ads/auction";
import { createClient } from "@/lib/supabase/server";

/* POST /api/ads/serve — auction temps réel.
 *
 * Body : { surface, slot_index, country?, locale?, device_type? }
 *
 * Retourne :
 *   - 200 ServedAd { ad_id, advertiser_name, primary_text, headline,
 *                    media_url, destination_url, cta, disclaimer,
 *                    why_reasons, charged_amount }
 *   - 204 si aucune ad éligible (le caller affiche du contenu organique)
 *
 * Note : pour V2, migrer en Vercel Edge Function pour latence < 100ms.
 * Pour V1 on reste en Node Route Handler avec service_role client.
 */

const bodySchema = z
  .object({
    surface: z.enum([
      "feed_home",
      "marketplace_feed",
      "marketplace_listing_boost",
      "jobs_feed",
      "stories",
    ]),
    slot_index: z.number().int().min(0).default(0),
    country: z.string().length(2).optional(),
    locale: z.string().max(10).optional(),
    device_type: z.enum(["mobile", "tablet", "desktop"]).optional(),
  })
  .strict();

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  /* Anonymes acceptés pour V1 (mais auction retournera null sans
     personalized_ads_consent — on retourne 204). */

  const body = await request.json().catch(() => null);
  const parsed = bodySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid request" },
      { status: 400 },
    );
  }

  const result = await runAuction({
    user_id: user?.id ?? null,
    surface: parsed.data.surface,
    slot_index: parsed.data.slot_index,
    country: parsed.data.country,
    locale: parsed.data.locale,
    device_type: parsed.data.device_type,
  });

  if (!result) {
    return new NextResponse(null, { status: 204 });
  }

  /* Récupère le nom de l'annonceur (business legal_name). */
  const { data: account } = await supabase
    .from("ad_accounts")
    .select("business_account_id")
    .eq("id", result.ad.ad_account_id)
    .maybeSingle();
  let advertiserName = "Annonceur";
  if (account) {
    const { data: business } = await supabase
      .from("ads_business_accounts")
      .select("legal_name")
      .eq("id", account.business_account_id)
      .maybeSingle();
    advertiserName = business?.legal_name ?? advertiserName;
  }

  return NextResponse.json({
    ad_id: result.ad.id,
    advertiser_name: advertiserName,
    primary_text: result.ad.creative.primary_text,
    headline: result.ad.creative.headline,
    description: result.ad.creative.description,
    media_url: result.ad.creative.media_url,
    destination_url: result.ad.creative.destination_url,
    call_to_action: result.ad.creative.call_to_action,
    auto_disclaimer: result.ad.creative.auto_disclaimer,
    manual_disclaimer: result.ad.creative.manual_disclaimer,
    paid_for_by: result.ad.creative.paid_for_by,
    why_reasons: result.why_reasons,
    surface: parsed.data.surface,
    charged_amount: result.charged_amount,
  });
}
