import "server-only";
import { createClient } from "@/lib/supabase/server";

export type AdminStats = {
  profiles_total: number;
  profiles_new_7d: number;
  posts_total: number;
  listings_active: number;
  jobs_active: number;
  stories_active: number;
  conversations_total: number;
  messages_total: number;
  transfers_count: number;
  transfers_volume_eur: number;
};

export type AdminRecentUser = {
  id: string;
  email: string | null;
  full_name: string | null;
  username: string | null;
  avatar_url: string | null;
  founder_rank: number | null;
  is_admin: boolean;
  onboarded_at: string | null;
  created_at: string;
};

export async function isCurrentUserAdmin(): Promise<boolean> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return false;

  const { data } = await supabase
    .from("profiles")
    .select("is_admin")
    .eq("id", user.id)
    .maybeSingle();

  return Boolean(
    (data as { is_admin?: boolean } | null)?.is_admin,
  );
}

export async function getAdminStats(): Promise<AdminStats | null> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("admin_stats");
  if (error || !data) return null;
  const stats = data as AdminStats;
  return {
    ...stats,
    transfers_volume_eur: Number(stats.transfers_volume_eur ?? 0),
  };
}

export async function getAdminRecentUsers(
  limit: number = 50,
): Promise<AdminRecentUser[]> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("admin_recent_users", {
    items_limit: limit,
  });
  if (error || !data) return [];
  return data as AdminRecentUser[];
}
