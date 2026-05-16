import { type NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

/* Sprint Recsys — Étape 18 : "Pourquoi je vois ce post" (DSA art. 27 + 38).
 *
 * GET /api/feed/posts/[postId]/explain
 *
 * Retourne un JSON de raisons lisibles expliquant pourquoi le ranker a
 * surfacé ce post pour l'utilisateur connecté. Utilisé par le modal
 * d'explainability sur le PostCard.
 *
 * RLS posts s'applique : si l'user ne peut pas voir le post, RPC retourne
 * 'post_not_found'. */

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

  /* eslint-disable-next-line @typescript-eslint/no-explicit-any */
  const { data, error } = await (supabase as any).rpc("explain_post_ranking", {
    p_post_id: postId,
    p_user_id: user.id,
  });

  if (error) {
    console.error("[explain_post_ranking]", error);
    return NextResponse.json(
      { error: "explain_failed" },
      { status: 500 },
    );
  }

  return NextResponse.json(data ?? { reasons: [], primary_reason: null });
}
