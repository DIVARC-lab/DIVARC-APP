import { NextResponse } from "next/server";
import crypto from "node:crypto";
import { z } from "zod";
import { createAdminClient, createClient } from "@/lib/supabase/server";

/* POST /api/ads/pixels/create — création d'un pixel DIVARC.
 *
 * Auth : authenticated + role editor sur l'ad_account.
 * Génère un api_token Bearer (32 bytes random hex) pour la
 * Conversions API server-to-server.
 */

const createSchema = z
  .object({
    ad_account_id: z.string().uuid(),
    name: z.string().min(2).max(100),
    authorized_domains: z.array(z.string().max(100)).max(20).default([]),
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
      { error: "Invalid request", details: parsed.error.flatten() },
      { status: 400 },
    );
  }
  const data = parsed.data;

  /* Role check editor sur l'ad_account. */
  const { data: hasRole } = await supabase.rpc("user_has_ad_account_role", {
    p_ad_account_id: data.ad_account_id,
    p_min_role: "editor",
  });
  if (!hasRole) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  /* Génère un Bearer token cryptographiquement sûr. */
  const apiToken = `dvarc_pk_${crypto.randomBytes(32).toString("hex")}`;

  const admin = createAdminClient();
  const { data: pixel, error } = await admin
    .from("ads_pixels")
    .insert({
      ad_account_id: data.ad_account_id,
      name: data.name,
      api_token: apiToken,
      authorized_domains: data.authorized_domains,
    })
    .select("id, name, api_token")
    .single();

  if (error || !pixel) {
    console.error("[ads:pixels:create]", error);
    return NextResponse.json(
      { error: "Création impossible" },
      { status: 500 },
    );
  }

  return NextResponse.json({
    id: pixel.id,
    name: pixel.name,
    api_token: pixel.api_token,
  });
}
