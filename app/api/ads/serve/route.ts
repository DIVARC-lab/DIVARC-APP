import { NextResponse } from "next/server";
import { z } from "zod";
import { runAuctionEdge } from "@/lib/ads/auctionEdge";

/* POST /api/ads/serve — auction temps réel sur Vercel Edge Runtime.
 *
 * Body : { surface, slot_index, country?, locale?, device_type? }
 *
 * Retourne :
 *   - 200 ServedAd { ad_id, advertiser_name, primary_text, headline,
 *                    media_url, destination_url, cta, disclaimer,
 *                    why_reasons, charged_amount }
 *   - 204 si aucune ad éligible (le caller affiche du contenu organique)
 *
 * Migration B6 : Edge Runtime pour latence p95 < 150 ms (vs ~300 ms en
 * Node serverless). L'auction utilise fetch direct vers PostgREST
 * Supabase, sans SDK lourd, pour démarrage à froid minimal. La logique
 * d'auction est isolée dans lib/ads/auctionEdge.ts (pure fetch + crypto.subtle).
 *
 * Trade-offs Edge :
 *   - Pas d'accès à node:crypto / fs / cookies() complet
 *   - Pas d'admin client Supabase SDK classique → on hit PostgREST direct
 *   - logImpression reste async best-effort (fire-and-forget)
 *
 * Pour des volumes massifs (>100k imp/sec), migrer vers service Rust
 * dédié sur Fly.io/Railway derrière un load balancer.
 */
export const runtime = "edge";
export const preferredRegion = "fra1"; // Frankfurt, proche de l'audience FR/EU

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
  const body = await request.json().catch(() => null);
  const parsed = bodySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid request" },
      { status: 400 },
    );
  }

  /* Récupère l'auth user_id depuis le cookie supabase. En Edge, on
     décode juste le JWT pour obtenir le sub (user.id) sans appeler
     getUser() qui ferait un round-trip Supabase. */
  const userId = extractUserIdFromAuthCookie(request);

  const result = await runAuctionEdge({
    user_id: userId,
    surface: parsed.data.surface,
    slot_index: parsed.data.slot_index,
    country: parsed.data.country,
    locale: parsed.data.locale,
    device_type: parsed.data.device_type,
  });

  if (!result) {
    return new NextResponse(null, { status: 204 });
  }

  return NextResponse.json({
    ad_id: result.ad_id,
    advertiser_name: result.advertiser_name,
    primary_text: result.primary_text,
    headline: result.headline,
    description: result.description,
    media_url: result.media_url,
    destination_url: result.destination_url,
    call_to_action: result.call_to_action,
    auto_disclaimer: result.auto_disclaimer,
    manual_disclaimer: result.manual_disclaimer,
    paid_for_by: result.paid_for_by,
    why_reasons: result.why_reasons,
    surface: parsed.data.surface,
    charged_amount: result.charged_amount,
  });
}

/* Helper Edge : extrait le user_id depuis le cookie sb-*-auth-token
 * sans toucher au SDK Supabase. Le cookie contient un JSON encodé
 * avec access_token JWT — on décode juste le payload base64. */
function extractUserIdFromAuthCookie(request: Request): string | null {
  const cookie = request.headers.get("cookie") ?? "";
  /* Match sb-{project}-auth-token=base64encoded[...] */
  const match = cookie.match(/sb-[^=]+-auth-token=([^;]+)/);
  if (!match) return null;
  try {
    const decoded = decodeURIComponent(match[1]!);
    /* Le cookie peut être un array JSON [access_token, refresh_token, ...]. */
    const parsed = JSON.parse(decoded);
    const accessToken = Array.isArray(parsed) ? parsed[0] : parsed.access_token;
    if (!accessToken || typeof accessToken !== "string") return null;
    /* Décodage JWT payload (segment 2). */
    const segments = accessToken.split(".");
    if (segments.length !== 3) return null;
    const payloadB64 = segments[1]!.replace(/-/g, "+").replace(/_/g, "/");
    const payload = JSON.parse(atob(payloadB64));
    return payload.sub ?? null;
  } catch {
    return null;
  }
}
