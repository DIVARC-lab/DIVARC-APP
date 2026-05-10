import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

/* GET /api/hashtags/search?q=<query>
 *
 * Recherche d'hashtags pour autocomplete dans le composer.
 * Auth : authenticated. Si q vide, retourne les hashtags trending
 * (popularité = posts_count).
 */

export async function GET(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const url = new URL(request.url);
  const q = (url.searchParams.get("q") ?? "").trim().toLowerCase().slice(0, 40);

  let query = supabase
    .from("hashtags")
    .select("id, tag, posts_count")
    .order("posts_count", { ascending: false })
    .limit(10);

  if (q.length >= 1) {
    /* Match préfixe (le plus pertinent pour autocomplete). */
    const sanitized = q.replace(/[%_,]/g, "");
    query = query.ilike("tag", `${sanitized}%`);
  }

  const { data, error } = await query;
  if (error) {
    return NextResponse.json({ hashtags: [] });
  }

  return NextResponse.json({
    hashtags: (data ?? []).map((h) => ({
      id: h.id,
      tag: h.tag,
      posts_count: h.posts_count,
    })),
  });
}
