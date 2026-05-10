import { NextResponse } from "next/server";
import crypto from "node:crypto";
import { createAdminClient } from "@/lib/supabase/server";

/* Cron : matching custom audience hashes ↔ users DIVARC.
 *
 * Schedule recommandé : toutes les heures.
 *
 * Process :
 *   1. Récup audiences custom_list où custom_match_count IS NULL
 *      (pas encore matchées) ou updated_at > last_match_at + 24h
 *   2. Pour chaque audience :
 *      - Récup tous les hashes uploadés
 *      - Pour chaque profile DIVARC : sha256(lower(email)) — sample
 *        ou batch
 *      - Intersection → matched_user_id update
 *      - Update audience.custom_match_count + custom_match_rate
 *
 * Performance : V1 simple full-scan profiles. V2 :
 *   - Stocker sha256(email) en colonne dénormalisée (cron à jour)
 *   - Matching via SQL JOIN sur cette colonne (~100ms vs minutes)
 */

export async function GET(request: Request) {
  const auth = request.headers.get("authorization");
  if (
    process.env.CRON_SECRET &&
    auth !== `Bearer ${process.env.CRON_SECRET}`
  ) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const admin = createAdminClient();

  /* Audiences à matcher. */
  const { data: audiences } = await admin
    .from("ads_audiences")
    .select("id, ad_account_id, type, custom_list_count")
    .eq("type", "custom_list")
    .is("custom_match_count", null)
    .limit(10);

  if (!audiences || audiences.length === 0) {
    return NextResponse.json({ ok: true, processed: 0 });
  }

  /* Récup tous les profiles avec un email — V2 colonne dénormalisée
     `email_sha256` indexée pour match O(log n) JOIN. */
  const { data: authUsers } = await admin
    .schema("auth" as never)
    .from("users" as never)
    .select("id, email" as never)
    .limit(50_000);

  const emailHashMap = new Map<string, string>();
  for (const u of (authUsers ?? []) as Array<{ id: string; email: string | null }>) {
    if (!u.email) continue;
    const hash = sha256(u.email.toLowerCase().trim());
    emailHashMap.set(hash, u.id);
  }

  let totalProcessed = 0;
  for (const audience of audiences) {
    /* Récup les hashes de cette audience. */
    const { data: members } = await admin
      .from("ads_audience_members")
      .select("identifier_hash")
      .eq("audience_id", audience.id)
      .eq("identifier_type", "email")
      .limit(100_000);

    if (!members || members.length === 0) continue;

    let matched = 0;
    /* Update matched_user_id en batch. */
    const matchedRows: Array<{
      audience_id: string;
      identifier_hash: string;
      identifier_type: "email";
      matched_user_id: string;
    }> = [];
    for (const m of members) {
      const userId = emailHashMap.get(m.identifier_hash);
      if (userId) {
        matched++;
        matchedRows.push({
          audience_id: audience.id,
          identifier_hash: m.identifier_hash,
          identifier_type: "email",
          matched_user_id: userId,
        });
      }
    }

    /* Upsert avec matched_user_id. */
    const CHUNK = 5000;
    for (let i = 0; i < matchedRows.length; i += CHUNK) {
      await admin
        .from("ads_audience_members")
        .upsert(matchedRows.slice(i, i + CHUNK), {
          onConflict: "audience_id,identifier_hash",
        });
    }

    /* Update audience stats. */
    const matchRate = members.length > 0 ? matched / members.length : 0;
    await admin
      .from("ads_audiences")
      .update({
        custom_list_count: members.length,
        custom_match_count: matched,
        custom_match_rate: matchRate,
        estimated_size: matched,
      })
      .eq("id", audience.id);

    totalProcessed++;
  }

  return NextResponse.json({
    ok: true,
    processed: totalProcessed,
    audiences_matched: audiences.length,
  });
}

function sha256(input: string): string {
  return crypto.createHash("sha256").update(input).digest("hex");
}
