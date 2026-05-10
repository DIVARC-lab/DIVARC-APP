import { NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";

/* PATCH /api/ads/recommendations/[id]
 *
 * Action sur une recommandation : apply ou dismiss.
 * Auth : authenticated + role editor sur l'ad_account de la reco.
 *
 * Body : { action: 'apply' | 'dismiss' }
 */

const bodySchema = z
  .object({
    action: z.enum(["apply", "dismiss"]),
  })
  .strict();

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const body = await request.json().catch(() => null);
  const parsed = bodySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }
  const { action } = parsed.data;

  /* Fetch reco pour récupérer ad_account_id + check perms. */
  const { data: reco, error: rErr } = await supabase
    .from("ads_recommendations")
    .select("id, ad_account_id, status")
    .eq("id", id)
    .single();
  if (rErr || !reco) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  if (reco.status !== "pending") {
    return NextResponse.json(
      { error: "Déjà traitée." },
      { status: 409 },
    );
  }

  const { data: hasRole } = await supabase.rpc("user_has_ad_account_role", {
    p_ad_account_id: reco.ad_account_id,
    p_min_role: "editor",
  });
  if (!hasRole) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const update =
    action === "apply"
      ? {
          status: "applied" as const,
          applied_at: new Date().toISOString(),
          applied_by: user.id,
        }
      : {
          status: "dismissed" as const,
          dismissed_at: new Date().toISOString(),
          dismissed_by: user.id,
        };

  const { error: uErr } = await supabase
    .from("ads_recommendations")
    .update(update)
    .eq("id", id);

  if (uErr) {
    console.error("[ads:recommendations:patch]", uErr);
    return NextResponse.json({ error: "Update failed" }, { status: 500 });
  }

  return NextResponse.json({ ok: true, status: update.status });
}
