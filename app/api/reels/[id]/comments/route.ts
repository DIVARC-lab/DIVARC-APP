import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

/* GET /api/reels/[id]/comments
 *
 * Récupère les commentaires d'un reel avec auteur. Tri par date desc
 * (plus récent en haut, comme TikTok).
 *
 * Threads (parent_id) : V1 = liste flat. V1.5 : reply tree.
 */

export async function GET(
  _request: Request,
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

  const { data: comments, error } = await supabase
    .from("reel_comments")
    .select("id, reel_id, author_id, body, parent_id, likes_count, created_at")
    .eq("reel_id", id)
    .is("deleted_at", null)
    .order("created_at", { ascending: false })
    .limit(100);

  if (error) {
    console.error("[reels:comments:list]", error);
    return NextResponse.json({ comments: [], authors: [] });
  }

  /* Hydrate authors. */
  const authorIds = Array.from(
    new Set(((comments ?? []) as Array<{ author_id: string }>).map((c) => c.author_id)),
  );
  const { data: authors } =
    authorIds.length > 0
      ? await supabase
          .from("profiles")
          .select("id, full_name, username, avatar_url")
          .in("id", authorIds)
      : { data: [] };

  return NextResponse.json({
    comments: comments ?? [],
    authors: authors ?? [],
  });
}
