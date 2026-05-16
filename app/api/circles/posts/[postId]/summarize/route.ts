import { type NextRequest, NextResponse } from "next/server";
import { summarizeThread } from "@/lib/ai/summarizeThread";
import { createClient } from "@/lib/supabase/server";

/* Sprint G.2 — API endpoint pour résumer un thread.
 *
 * GET /api/circles/posts/[postId]/summarize
 * Réponse : { summary: string; bullets: string[]; error?: string }
 *
 * Sécurité : RLS posts s'applique (l'utilisateur doit pouvoir lire le
 * post pour le récupérer). Pour les cercles privés non-membres, posts
 * RLS bloque l'accès → summarize retourne 'post_not_found'.
 */

export const dynamic = "force-dynamic";

export async function GET(
  req: NextRequest,
  ctx: { params: Promise<{ postId: string }> },
) {
  const { postId } = await ctx.params;
  if (!/^[a-f0-9-]{36}$/i.test(postId)) {
    return NextResponse.json({ error: "invalid_post_id" }, { status: 400 });
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "unauthenticated" }, { status: 401 });
  }

  const result = await summarizeThread(postId);
  return NextResponse.json(result);
}
