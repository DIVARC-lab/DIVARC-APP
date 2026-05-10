import { NextResponse } from "next/server";
import { z } from "zod";
import { createAdminClient, createClient } from "@/lib/supabase/server";

/* POST /api/ads/audiences/lookalike — génération d'une audience lookalike.
 *
 * Body : { source_audience_id, name, target_size_pct, countries }
 *
 * Pipeline :
 *   1. Auth + role editor sur l'audience source
 *   2. Vérifier audience source : type=custom_list, custom_match_count >= 100
 *   3. Créer ads_audiences row type=lookalike
 *   4. Appeler RPC compute_lookalike_audience qui :
 *      - Calcule centroïd des interest_vector des matched_user_id source
 *      - Trouve top N users similaires (cosine pgvector)
 *      - Insert ads_audience_members avec matched_user_id
 *   5. Retourne audience id + count
 *
 * Tailles cibles standard : 1% (très similaire) → 10% (large).
 * Pour V1, "1%" = ~10 000 users si plateforme à 1M actifs.
 */

const lookalikeSchema = z
  .object({
    source_audience_id: z.string().uuid(),
    name: z.string().min(2).max(100),
    /* 1-10% de la base totale active. */
    target_size_pct: z.number().int().min(1).max(10).default(2),
    countries: z.array(z.string().length(2)).min(1).default(["FR"]),
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
  const parsed = lookalikeSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid request", details: parsed.error.flatten() },
      { status: 400 },
    );
  }
  const data = parsed.data;

  /* Vérifier audience source. */
  const { data: source } = await supabase
    .from("ads_audiences")
    .select("id, ad_account_id, type, custom_match_count")
    .eq("id", data.source_audience_id)
    .maybeSingle();
  if (!source) {
    return NextResponse.json(
      { error: "Audience source introuvable" },
      { status: 404 },
    );
  }
  if (source.type !== "custom_list") {
    return NextResponse.json(
      { error: "L'audience source doit être de type custom_list" },
      { status: 400 },
    );
  }
  if (!source.custom_match_count || source.custom_match_count < 100) {
    return NextResponse.json(
      {
        error:
          "L'audience source contient moins de 100 users matchés DIVARC. Attends que le matching soit terminé ou enrichis ta liste.",
      },
      { status: 400 },
    );
  }

  /* Role check editor sur l'ad_account de la source. */
  const { data: hasRole } = await supabase.rpc("user_has_ad_account_role", {
    p_ad_account_id: source.ad_account_id,
    p_min_role: "editor",
  });
  if (!hasRole) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const admin = createAdminClient();

  /* 1. Créer la row lookalike. */
  const { data: created, error: createErr } = await admin
    .from("ads_audiences")
    .insert({
      ad_account_id: source.ad_account_id,
      name: data.name,
      type: "lookalike",
      lookalike_source_id: data.source_audience_id,
      lookalike_countries: data.countries,
      lookalike_size_pct: data.target_size_pct,
      created_by: user.id,
    })
    .select("id")
    .single();
  if (createErr || !created) {
    console.error("[ads:lookalike:create]", createErr);
    return NextResponse.json(
      { error: "Création audience lookalike échouée" },
      { status: 500 },
    );
  }

  /* 2. Calculer la taille cible : pourcentage des users actifs. */
  const { count: totalUsers } = await admin
    .from("user_interest_profiles")
    .select("user_id", { count: "exact", head: true });
  const targetSize = Math.max(
    1000,
    Math.round(((totalUsers ?? 100000) * data.target_size_pct) / 100),
  );

  /* 3. Appeler la RPC compute_lookalike_audience. */
  const { data: insertedCount, error: rpcErr } = await admin.rpc(
    "compute_lookalike_audience" as never,
    {
      p_lookalike_audience_id: created.id,
      p_source_audience_id: data.source_audience_id,
      p_target_size: targetSize,
      p_country: data.countries[0] ?? null,
    } as never,
  );

  if (rpcErr) {
    console.error("[ads:lookalike:rpc]", rpcErr);
    /* Cleanup audience créée si le calcul a échoué. */
    await admin.from("ads_audiences").delete().eq("id", created.id);
    return NextResponse.json(
      {
        error:
          "Calcul du lookalike échoué. Vérifie que l'audience source contient au moins 100 users matchés avec un profil d'intérêts généré.",
      },
      { status: 500 },
    );
  }

  return NextResponse.json({
    id: created.id,
    inserted_count: insertedCount ?? 0,
    target_size: targetSize,
  });
}
