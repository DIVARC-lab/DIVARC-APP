import "server-only";
import { createClient } from "@/lib/supabase/server";
import type { Profile } from "@/lib/database.types";

export type PublicProfile = Pick<
  Profile,
  | "id"
  | "username"
  | "full_name"
  | "avatar_url"
  | "bio"
  | "location"
  | "founder_rank"
  | "show_email"
  | "show_location"
  | "discoverable"
  | "headline"
  | "open_to_work"
  | "open_to_hiring"
  | "created_at"
> & {
  email?: string | null;
};

export async function getPublicProfileByUsername(
  username: string,
): Promise<PublicProfile | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("profiles")
    .select(
      "id, username, full_name, avatar_url, bio, location, founder_rank, show_email, show_location, discoverable, headline, open_to_work, open_to_hiring, created_at",
    )
    .eq("username", username.toLowerCase())
    .maybeSingle();

  if (error || !data) return null;
  return {
    ...(data as Omit<PublicProfile, "headline" | "open_to_work" | "open_to_hiring">),
    headline:
      (data as { headline?: string | null }).headline ?? null,
    open_to_work:
      (data as { open_to_work?: boolean }).open_to_work ?? false,
    open_to_hiring:
      (data as { open_to_hiring?: boolean }).open_to_hiring ?? false,
  };
}

export async function getPublicStatsByUserId(userId: string): Promise<{
  postsCount: number;
  listingsCount: number;
  friendsCount: number;
}> {
  const supabase = await createClient();
  const [postsRes, listingsRes, friendsRes] = await Promise.all([
    supabase
      .from("posts")
      .select("id", { count: "exact", head: true })
      .eq("author_id", userId)
      .is("deleted_at", null)
      .eq("visibility", "public"),
    supabase
      .from("listings")
      .select("id", { count: "exact", head: true })
      .eq("seller_id", userId)
      .eq("status", "active"),
    supabase
      .from("friendships")
      .select("id", { count: "exact", head: true })
      .eq("status", "accepted")
      .or(`requester_id.eq.${userId},recipient_id.eq.${userId}`),
  ]);

  return {
    postsCount: postsRes.count ?? 0,
    listingsCount: listingsRes.count ?? 0,
    friendsCount: friendsRes.count ?? 0,
  };
}
