import { NextResponse } from "next/server";
import { z } from "zod";
import { createAdminClient } from "@/lib/supabase/server";

/* POST /api/ads/events/conversions — Conversions API server-to-server.
 *
 * Auth : Bearer token = ads_pixels.api_token (rotation possible).
 *
 * Dédoublonnage Pixel × Conversions API :
 *   - event_id unique (pixel_id, event_id) → si déjà reçu via Pixel,
 *     on update event_source à 'both' au lieu d'insérer un doublon
 *
 * Payload conforme Meta Conversions API style :
 *   {
 *     event_name, event_time, event_id, event_source_url,
 *     action_source: "website" | "app" | "physical_store",
 *     user_data: { em: [hash], ph: [hash], external_id: [...] },
 *     custom_data: { value, currency, content_ids, ... }
 *   }
 */

const conversionSchema = z
  .object({
    event_name: z.string().min(1).max(100),
    event_time: z.number().int(),
    event_id: z.string().min(1).max(100),
    event_source_url: z.string().url().optional(),
    action_source: z
      .enum(["website", "app", "physical_store", "phone_call"])
      .default("website"),
    user_data: z
      .object({
        em: z.array(z.string().regex(/^[a-f0-9]{64}$/)).optional(),
        ph: z.array(z.string().regex(/^[a-f0-9]{64}$/)).optional(),
        external_id: z.array(z.string()).optional(),
        client_ip: z.string().optional(),
        client_user_agent: z.string().optional(),
      })
      .optional(),
    custom_data: z
      .object({
        value: z.number().optional(),
        currency: z.string().length(3).optional(),
        content_ids: z.array(z.string()).optional(),
        content_type: z.string().optional(),
      })
      .passthrough()
      .optional(),
  })
  .strict();

export async function POST(request: Request) {
  /* Auth Bearer. */
  const auth = request.headers.get("authorization");
  if (!auth || !auth.startsWith("Bearer ")) {
    return NextResponse.json(
      { error: "Missing Bearer token" },
      { status: 401 },
    );
  }
  const token = auth.slice(7);

  const admin = createAdminClient();
  const { data: pixel } = await admin
    .from("ads_pixels")
    .select("id, ad_account_id")
    .eq("api_token", token)
    .maybeSingle();
  if (!pixel) {
    return NextResponse.json({ error: "Invalid token" }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  const parsed = conversionSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid event", details: parsed.error.flatten() },
      { status: 400 },
    );
  }
  const event = parsed.data;

  /* Anti-fraud minimal côté serveur. */
  const ua = event.user_data?.client_user_agent ?? "";
  const isBot = /bot|crawler|spider/i.test(ua);
  const fraudScore = isBot ? 0.9 : 0;

  /* IP côté serveur — anonymisée si présente. */
  const ipAnon = event.user_data?.client_ip
    ? anonymizeIp(event.user_data.client_ip)
    : null;

  /* Dédoublonnage : check si event_id existe déjà pour ce pixel. */
  const { data: existing } = await admin
    .from("ad_conversions")
    .select("id, event_source")
    .eq("pixel_id", pixel.id)
    .eq("event_id", event.event_id)
    .maybeSingle();

  if (existing) {
    /* Si Pixel a déjà envoyé, on upgrade à "both" (signal de double
       confirmation, plus haute fiabilité). */
    if (existing.event_source === "pixel") {
      await admin
        .from("ad_conversions")
        .update({ event_source: "both" })
        .eq("id", existing.id);
    }
    return NextResponse.json({ ok: true, deduplicated: true });
  }

  await admin.from("ad_conversions").insert({
    pixel_id: pixel.id,
    ad_account_id: pixel.ad_account_id,
    event_id: event.event_id,
    event_name: event.event_name,
    event_time: new Date(event.event_time * 1000).toISOString(),
    event_source: "conversions_api",
    user_data: event.user_data
      ? {
          ...event.user_data,
          /* Strip IP en clair, on garde anonymisée. */
          client_ip: undefined,
        }
      : null,
    custom_data: event.custom_data ?? null,
    client_ip_anon: ipAnon,
    fraud_score: fraudScore,
    is_invalid: isBot,
  });

  return NextResponse.json({ ok: true });
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
