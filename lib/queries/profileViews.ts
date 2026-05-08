import "server-only";
import { createClient } from "@/lib/supabase/server";
import type { ProfileViewWithViewer } from "@/lib/database.types";

export async function listMyProfileViewers(
  userId: string,
  limit: number = 50,
): Promise<ProfileViewWithViewer[]> {
  const supabase = await createClient();
  const { data: views } = await supabase
    .from("profile_views")
    .select("viewer_id, viewed_id, last_viewed_at, view_count")
    .eq("viewed_id", userId)
    .order("last_viewed_at", { ascending: false })
    .limit(limit);
  if (!views || views.length === 0) return [];

  const viewerIds = views.map((v) => v.viewer_id);
  const { data: profiles } = await supabase
    .from("profiles")
    .select("id, full_name, username, avatar_url, headline, location")
    .in("id", viewerIds);

  const profileById = new Map(
    (profiles ?? []).map((p) => [
      p.id,
      {
        id: p.id,
        full_name: p.full_name,
        username: p.username,
        avatar_url: p.avatar_url,
        headline: (p as { headline?: string | null }).headline ?? null,
        location: p.location,
      },
    ]),
  );

  return views.map((v) => ({
    ...v,
    viewer: profileById.get(v.viewer_id) ?? null,
  }));
}

export async function countMyProfileViews(userId: string): Promise<number> {
  const supabase = await createClient();
  const { count } = await supabase
    .from("profile_views")
    .select("viewer_id", { count: "exact", head: true })
    .eq("viewed_id", userId);
  return count ?? 0;
}
