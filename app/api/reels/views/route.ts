import { NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";

/* POST /api/reels/views — track une vue d'un reel.
 *
 * Insert dans reel_views avec watch_ms cumulé (signal recsys #1).
 * Idempotence : un user peut avoir plusieurs rows pour le même reel
 * (sessions différentes) — on n'upsert pas.
 *
 * Skip flag = vraie quand watch_ms < 3s ET pas atteint la fin = signal
 * négatif fort pour le ranker.
 */

const bodySchema = z.object({
  reel_id: z.string().uuid(),
  watch_ms: z.number().int().min(0).max(10 * 60 * 1000),
  completed_pct: z.number().int().min(0).max(100),
  replay_count: z.number().int().min(0).max(50).default(0),
  skipped: z.boolean().default(false),
  did_like: z.boolean().default(false),
  did_save: z.boolean().default(false),
  did_share: z.boolean().default(false),
  did_comment: z.boolean().default(false),
});

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const json = await request.json().catch(() => null);
  const parsed = bodySchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
  }
  const data = parsed.data;

  const { error } = await supabase.from("reel_views").insert({
    reel_id: data.reel_id,
    user_id: user.id,
    watch_ms: data.watch_ms,
    completed_pct: data.completed_pct,
    replay_count: data.replay_count,
    skipped: data.skipped,
    did_like: data.did_like,
    did_save: data.did_save,
    did_share: data.did_share,
    did_comment: data.did_comment,
  });

  if (error) {
    /* Tolérant aux migrations manquantes (42P01). */
    if (error.code !== "42P01") {
      console.error("[reels:views:insert]", error);
    }
    return NextResponse.json({ error: "Insert failed" }, { status: 500 });
  }

  /* Bump views_count + plays_count compteurs. Non-bloquant. */
  void supabase
    .from("reels")
    .update({
      views_count: 1, /* placeholder — update via SQL increment côté V2 */
      plays_count: data.replay_count + 1,
    })
    .eq("id", data.reel_id)
    .then(() => undefined);

  return NextResponse.json({ ok: true });
}
