import { NextResponse } from "next/server";
import { z } from "zod";
import { createAdminClient, createClient } from "@/lib/supabase/server";
import {
  ALWAYS_FORBIDDEN_AD_CATEGORIES,
  CATEGORY_DISCLAIMERS,
} from "@/lib/ads/types";
import type { Database } from "@/lib/database.types";

/* POST /api/ads/ads/create — création d'une Ad supplémentaire dans un
 * AdSet existant (V3.2 : multi-Ads par AdSet pour A/B test creative).
 *
 * Auth : authenticated + role editor sur l'ad_account.
 * Pipeline review pending par défaut → cron ads-review valide.
 */

const createSchema = z
  .object({
    ad_set_id: z.string().uuid(),
    name: z.string().min(2).max(100),
    creative_type: z.enum([
      "single_image",
      "single_video",
      "carousel",
    ]),
    primary_text: z.string().min(1).max(125),
    headline: z.string().min(1).max(40),
    description: z.string().max(30).optional(),
    media_url: z.string().url().optional(),
    destination_url: z.string().url().optional(),
    call_to_action: z.string(),
    advertiser_entity_id: z.string().uuid(),
    ad_category_hint: z.string().optional(),
  })
  .strict();

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  const parsed = createSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Données invalides", details: parsed.error.flatten() },
      { status: 400 },
    );
  }
  const data = parsed.data;

  /* Récup l'ad_set + check role. */
  const admin = createAdminClient();
  const { data: adSet } = await admin
    .from("ads_ad_sets")
    .select("id, ad_account_id, campaign_id")
    .eq("id", data.ad_set_id)
    .maybeSingle();
  if (!adSet) {
    return NextResponse.json(
      { error: "AdSet introuvable" },
      { status: 404 },
    );
  }

  const { data: hasRole } = await supabase.rpc("user_has_ad_account_role", {
    p_ad_account_id: adSet.ad_account_id,
    p_min_role: "editor",
  });
  if (!hasRole) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  /* Validation catégorie interdite. */
  if (
    data.ad_category_hint &&
    (ALWAYS_FORBIDDEN_AD_CATEGORIES as readonly string[]).includes(
      data.ad_category_hint,
    )
  ) {
    return NextResponse.json(
      {
        error: `La catégorie "${data.ad_category_hint}" est interdite à la publicité sur DIVARC.`,
      },
      { status: 400 },
    );
  }

  const autoDisclaimer = data.ad_category_hint
    ? CATEGORY_DISCLAIMERS[data.ad_category_hint] ?? null
    : null;

  /* 1. Creative. */
  const { data: creative, error: crErr } = await admin
    .from("ads_creatives")
    .insert({
      ad_account_id: adSet.ad_account_id,
      type: data.creative_type,
      media_url: data.media_url ?? null,
      primary_text: data.primary_text,
      headline: data.headline,
      description: data.description ?? null,
      call_to_action: data.call_to_action,
      destination_url: data.destination_url ?? null,
      advertiser_entity_id: data.advertiser_entity_id,
      auto_disclaimer: autoDisclaimer,
    } satisfies Database["public"]["Tables"]["ads_creatives"]["Insert"])
    .select("id")
    .single();

  if (crErr || !creative) {
    console.error("[ads:ads:create:creative]", crErr);
    return NextResponse.json(
      { error: "Création creative échouée" },
      { status: 500 },
    );
  }

  /* 2. Ad. */
  const { data: ad, error: aErr } = await admin
    .from("ads_ads")
    .insert({
      ad_set_id: data.ad_set_id,
      ad_account_id: adSet.ad_account_id,
      campaign_id: adSet.campaign_id,
      creative_id: creative.id,
      name: data.name,
      status: "paused",
      review_status: "pending",
    })
    .select("id")
    .single();

  if (aErr || !ad) {
    console.error("[ads:ads:create:ad]", aErr);
    return NextResponse.json(
      { error: "Création ad échouée" },
      { status: 500 },
    );
  }

  return NextResponse.json({ id: ad.id, creative_id: creative.id });
}
