import { NextResponse } from "next/server";
import { z } from "zod";
import { createAdminClient, createClient } from "@/lib/supabase/server";

/* POST /api/ads/audiences/upload — réception batch hashes SHA-256.
 *
 * IMPORTANT — RGPD : le hashing SHA-256 est fait CÔTÉ CLIENT avant
 * upload. Les emails / phones en clair ne quittent JAMAIS le navigateur
 * de l'annonceur. Cette route reçoit uniquement des hashes hex 64 chars.
 *
 * Pipeline :
 *   1. Auth + role editor sur l'ad_account
 *   2. Validate : array de hashes hex 64 chars
 *   3. Insert ads_audience_members en batch (upsert sur PK composite)
 *   4. Match avec users DIVARC : pour chaque hash, on cherche
 *      sha256(profile.email_lowercased). Match ratio retourné.
 *   5. Update ads_audiences.custom_list_count + custom_match_count +
 *      custom_match_rate + estimated_size
 *
 * Contrainte de taille : max 100 000 hashes par upload (V1). Pour
 * volumes plus grands, paginer côté client en chunks.
 */

const uploadSchema = z
  .object({
    audience_id: z.string().uuid(),
    identifier_type: z.enum(["email", "phone", "external_id"]),
    /* Hashes SHA-256 = 64 chars hex. */
    hashes: z
      .array(z.string().regex(/^[a-f0-9]{64}$/))
      .min(1)
      .max(100_000),
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
  const parsed = uploadSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid payload", details: parsed.error.flatten() },
      { status: 400 },
    );
  }
  const data = parsed.data;

  /* Role check editor sur l'audience.ad_account_id. */
  const adminPre = createAdminClient();
  const { data: audience } = await adminPre
    .from("ads_audiences")
    .select("id, ad_account_id, type")
    .eq("id", data.audience_id)
    .maybeSingle();
  if (!audience) {
    return NextResponse.json({ error: "Audience not found" }, { status: 404 });
  }
  const { data: hasRole } = await supabase.rpc("user_has_ad_account_role", {
    p_ad_account_id: audience.ad_account_id,
    p_min_role: "editor",
  });
  if (!hasRole) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  /* Insert hashes (upsert pour idempotence sur re-upload). */
  const admin = createAdminClient();
  const rows = data.hashes.map((h) => ({
    audience_id: data.audience_id,
    identifier_hash: h,
    identifier_type: data.identifier_type,
  }));

  /* Insert par chunks de 5000 pour ne pas exploser le payload. */
  const CHUNK = 5000;
  for (let i = 0; i < rows.length; i += CHUNK) {
    await admin
      .from("ads_audience_members")
      .upsert(rows.slice(i, i + CHUNK), {
        onConflict: "audience_id,identifier_hash",
        ignoreDuplicates: true,
      });
  }

  /* Matching DIVARC users : on calcule sha256(lower(email)) pour tous
     les profiles et on regarde l'intersection avec les hashes uploadés.
     Pour V1 : SQL via RPC à créer côté DB (V2). En attendant, on
     considère le match comme "à calculer plus tard par cron". */

  /* On met juste à jour les stats de l'audience avec count uploadé. */
  await admin
    .from("ads_audiences")
    .update({
      custom_list_count: data.hashes.length,
      /* custom_match_count + custom_match_rate seront calculés par cron
         ads-audience-match (à venir). */
      estimated_size: null,
    })
    .eq("id", data.audience_id);

  return NextResponse.json({
    ok: true,
    audience_id: data.audience_id,
    hashes_uploaded: data.hashes.length,
    /* Match async. Le client peut poller GET /api/ads/audiences/{id}
       pour obtenir le custom_match_rate quand calculé. */
    matching_status: "pending",
  });
}
