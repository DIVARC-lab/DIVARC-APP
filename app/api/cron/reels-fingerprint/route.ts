import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

/* GET /api/cron/reels-fingerprint — V4 worker AcoustID/Chromaprint.
 *
 * V3.13 ship : endpoint stub qui marque les rows pending comme 'ok' (pas
 * de check copyright réel). Quand AcoustID sera configuré :
 *   1. Lire les reels fingerprint_status='pending', limit 10
 *   2. Pour chaque : fetch video_url, ffmpeg extract audio,
 *      chromaprint génère fingerprint
 *   3. POST AcoustID API (https://acoustid.org/webservice)
 *   4. Si match score > 0.85 et metadata copyright → set 'copyrighted' +
 *      copyright_match_id + copyright_match_details
 *   5. Sinon → 'ok'
 *
 * Auth : Vercel Cron HMAC bearer (CRON_SECRET env). */

export async function GET(request: Request) {
  const authHeader = request.headers.get("authorization");
  const expected = `Bearer ${process.env.CRON_SECRET}`;
  if (!process.env.CRON_SECRET || authHeader !== expected) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = await createClient();
  const { data: pendingReels, error } = await supabase
    .from("reels")
    .select("id, fingerprint_hash")
    .eq("fingerprint_status", "pending")
    .order("fingerprinted_at", { ascending: true })
    .limit(10);

  if (error) {
    console.error("[cron:reels-fingerprint]", error);
    return NextResponse.json({ error: "Query failed" }, { status: 500 });
  }

  if (!pendingReels || pendingReels.length === 0) {
    return NextResponse.json({ ok: true, processed: 0 });
  }

  /* V3.13 stub : marque comme 'ok' sans vraiment vérifier copyright.
   * V4 remplacera ce bloc par l'appel Chromaprint + AcoustID. */
  const ids = pendingReels.map((r) => r.id);
  const { error: updErr } = await supabase
    .from("reels")
    .update({ fingerprint_status: "ok", fingerprinted_at: new Date().toISOString() })
    .in("id", ids);

  if (updErr) {
    console.error("[cron:reels-fingerprint:update]", updErr);
    return NextResponse.json({ error: "Update failed" }, { status: 500 });
  }

  return NextResponse.json({
    ok: true,
    processed: ids.length,
    note: "V3.13 stub — AcoustID integration V4",
  });
}
