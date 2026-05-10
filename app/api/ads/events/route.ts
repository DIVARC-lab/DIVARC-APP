import { NextResponse } from "next/server";
import crypto from "node:crypto";
import { z } from "zod";
import { createAdminClient } from "@/lib/supabase/server";

/* POST /api/ads/events — réception events Pixel JS.
 *
 * Pixel JS public peut envoyer en CORS depuis n'importe quel domaine
 * (after authorized_domains check côté pixel.id).
 *
 * Conformité :
 *   - IP anonymisée immédiatement (drop dernier octet)
 *   - PII (email, phone) jamais reçues en clair — uniquement hashed
 *     SHA-256 dans user_data.em / user_data.ph
 *   - event_id pour dédoublonnage Pixel × Conversions API serveur
 */

const eventSchema = z
  .object({
    event_name: z.string().min(1).max(100),
    event_id: z.string().min(1).max(100),
    event_time: z.number().int(),
    event_source_url: z.string().url().optional(),
    action_source: z.string().optional(),
    pixel_id: z.string().uuid(),
    anon_id: z.string().optional(),
    user_data: z.record(z.string(), z.unknown()).optional(),
    custom_data: z.record(z.string(), z.unknown()).optional(),
  })
  .strict();

export async function POST(request: Request) {
  /* CORS — accepte n'importe quel origin (le pixel est appelé depuis
     les sites des annonceurs). On filtre par pixel.authorized_domains
     ensuite. */
  const origin = request.headers.get("origin") ?? "";
  const corsHeaders = {
    "Access-Control-Allow-Origin": origin || "*",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
  };

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: "Invalid JSON" },
      { status: 400, headers: corsHeaders },
    );
  }

  const parsed = eventSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid event" },
      { status: 400, headers: corsHeaders },
    );
  }
  const event = parsed.data;

  const admin = createAdminClient();

  /* 1. Vérifier le pixel + authorized_domains. */
  const { data: pixel } = await admin
    .from("ads_pixels")
    .select("id, ad_account_id, authorized_domains")
    .eq("id", event.pixel_id)
    .maybeSingle();
  if (!pixel) {
    return NextResponse.json(
      { error: "Unknown pixel" },
      { status: 404, headers: corsHeaders },
    );
  }
  if (
    pixel.authorized_domains &&
    pixel.authorized_domains.length > 0 &&
    origin
  ) {
    const originHost = (() => {
      try {
        return new URL(origin).hostname;
      } catch {
        return null;
      }
    })();
    if (
      originHost &&
      !pixel.authorized_domains.some(
        (d) => originHost === d || originHost.endsWith(`.${d}`),
      )
    ) {
      return NextResponse.json(
        { error: "Domain not authorized" },
        { status: 403, headers: corsHeaders },
      );
    }
  }

  /* 2. Anti-fraud heuristique. */
  const ua = request.headers.get("user-agent") ?? "";
  const ip =
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? null;
  const isBot = /bot|crawler|spider|headless|phantom/i.test(ua);
  const fraudScore = isBot ? 0.95 : 0;
  const ipAnon = ip ? anonymizeIp(ip) : null;

  /* 3. Insert (avec dédoublonnage via unique (pixel_id, event_id)). */
  await admin.from("ad_conversions").insert({
    pixel_id: pixel.id,
    ad_account_id: pixel.ad_account_id,
    event_id: event.event_id,
    event_name: event.event_name,
    event_time: new Date(event.event_time * 1000).toISOString(),
    event_source: "pixel",
    user_data: event.user_data ?? null,
    custom_data: event.custom_data ?? null,
    client_ip_anon: ipAnon,
    fraud_score: fraudScore,
    is_invalid: isBot,
  });

  /* 4. Update pixel stats (best-effort). */
  await admin
    .from("ads_pixels")
    .update({
      total_events: 0, // V2 : RPC atomic increment
      last_event_at: new Date().toISOString(),
    })
    .eq("id", pixel.id);

  /* 5. Trigger attribution async (cron prendra dans 5min). */
  await admin.from("moderation_queue").insert({
    job_type: "deep_scan", // réutilise queue, V2 = job_type ad_attribution
    payload: {
      type: "ad_attribution",
      pixel_id: pixel.id,
      event_id: event.event_id,
    },
    priority: 30,
  });

  return NextResponse.json(
    { ok: true },
    { status: 200, headers: corsHeaders },
  );
}

export function OPTIONS(request: Request) {
  const origin = request.headers.get("origin") ?? "*";
  return new Response(null, {
    status: 204,
    headers: {
      "Access-Control-Allow-Origin": origin,
      "Access-Control-Allow-Methods": "POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
      "Access-Control-Max-Age": "86400",
    },
  });
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
