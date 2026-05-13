import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  backfillPostEmbeddings,
  backfillReelEmbeddings,
} from "@/lib/recsys/indexers";

/* Embeddings backfill — Chantier Reels Recsys étape 5.
 *
 * Rattrape les posts et reels publiés mais non indexés dans
 * content_embeddings / reel_embeddings (échec d'indexation au moment
 * de la publication, OpenAI rate limit, etc.).
 *
 * Cadence recommandée : toutes les heures (60 posts + 60 reels par run).
 * Avec text-embedding-3-small à $0.02/M tokens, un post moyen ~500 tokens =
 * 100 posts ≈ 50k tokens ≈ $0.001 / heure. Coût négligeable.
 *
 * Sécurité : Bearer CRON_SECRET (cf. event-reminders cron pour le pattern).
 */

export const dynamic = "force-dynamic";
export const maxDuration = 300; /* up to 5min, dépend du nb d'embeddings */

export async function GET(request: Request) {
  const authHeader = request.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!process.env.OPENAI_API_KEY) {
    return NextResponse.json({
      skipped: true,
      reason: "OPENAI_API_KEY not configured",
    });
  }

  const supabase = createAdminClient();

  /* Batches limitées pour éviter timeout Vercel + rate limit OpenAI. */
  const [posts, reels] = await Promise.all([
    backfillPostEmbeddings(supabase, 60),
    backfillReelEmbeddings(supabase, 60),
  ]);

  return NextResponse.json({
    posts,
    reels,
    timestamp: new Date().toISOString(),
  });
}
