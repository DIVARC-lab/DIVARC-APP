import { NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";

/* POST /api/ads/audiences/create — création d'une audience.
 *
 * Body : { ad_account_id, name, type, targeting_spec? }
 *
 * Auth : authenticated + role editor sur l'ad_account.
 */

const createSchema = z
  .object({
    ad_account_id: z.string().uuid(),
    name: z.string().min(2).max(100),
    type: z.enum([
      "saved",
      "custom_list",
      "custom_pixel",
      "custom_engagement",
      "lookalike",
      "divarc_special",
    ]),
    targeting_spec: z.record(z.string(), z.unknown()).optional(),
    /* Pour lookalike. */
    lookalike_source_id: z.string().uuid().optional(),
    lookalike_countries: z.array(z.string().length(2)).optional(),
    lookalike_size_pct: z.number().int().min(1).max(10).optional(),
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

  const { data: hasRole } = await supabase.rpc("user_has_ad_account_role", {
    p_ad_account_id: data.ad_account_id,
    p_min_role: "editor",
  });
  if (!hasRole) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { data: audience, error } = await supabase
    .from("ads_audiences")
    .insert({
      ad_account_id: data.ad_account_id,
      name: data.name,
      type: data.type,
      targeting_spec: data.targeting_spec ?? null,
      lookalike_source_id: data.lookalike_source_id ?? null,
      lookalike_countries: data.lookalike_countries ?? null,
      lookalike_size_pct: data.lookalike_size_pct ?? null,
      created_by: user.id,
    })
    .select("id")
    .single();

  if (error || !audience) {
    console.error("[ads:audiences:create]", error);
    return NextResponse.json({ error: "Création échouée" }, { status: 500 });
  }

  return NextResponse.json({ id: audience.id });
}
