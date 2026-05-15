/* lib/queries/circleAnalytics.ts — accès analytics admin cercles.
 *
 * Toutes les RPC sont SECURITY DEFINER et check is_circle_admin().
 * Donc accès refusé silencieusement (RAISE exception) si l'user
 * courant n'est ni owner ni admin du cercle. */

import { createClient } from "@/lib/supabase/server";

/* eslint-disable @typescript-eslint/no-explicit-any */
type SupabaseAny = any;

export type CircleAnalyticsKPI = {
  members_total: number;
  members_active_7d: number;
  members_active_30d: number;
  members_new_7d: number;
  members_new_30d: number;
  posts_total: number;
  posts_7d: number;
  posts_30d: number;
  comments_7d: number;
  reactions_7d: number;
  engagement_per_post_7d: number;
  vitality_score: number;
  retention_rate_30d: number;
};

export type CircleDailyActivity = {
  day: string; // ISO date YYYY-MM-DD
  posts: number;
  comments: number;
  reactions: number;
  new_members: number;
};

export type CircleTopContributor = {
  user_id: string;
  full_name: string | null;
  username: string | null;
  avatar_url: string | null;
  role: string;
  posts_count: number;
  comments_count: number;
  reactions_received: number;
  score: number;
};

export async function getCircleAnalytics(
  circleId: string,
): Promise<CircleAnalyticsKPI | null> {
  const supabase = await createClient();
  const { data, error } = await (supabase as SupabaseAny).rpc(
    "get_circle_analytics",
    { p_circle_id: circleId },
  );
  if (error || !data) return null;
  return data as CircleAnalyticsKPI;
}

export async function getCircleDailyActivity(
  circleId: string,
  days: number = 30,
): Promise<CircleDailyActivity[]> {
  const supabase = await createClient();
  const { data, error } = await (supabase as SupabaseAny).rpc(
    "get_circle_daily_activity",
    { p_circle_id: circleId, p_days: days },
  );
  if (error || !data) return [];
  return data as CircleDailyActivity[];
}

export async function getCircleTopContributors(
  circleId: string,
  opts: { periodDays?: number; limit?: number } = {},
): Promise<CircleTopContributor[]> {
  const supabase = await createClient();
  const { data, error } = await (supabase as SupabaseAny).rpc(
    "get_circle_top_contributors",
    {
      p_circle_id: circleId,
      p_period_days: opts.periodDays ?? 30,
      p_limit: opts.limit ?? 10,
    },
  );
  if (error || !data) return [];
  return data as CircleTopContributor[];
}
