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

/* ============================================================
 * Sprint H — Analytics Premium (Migration 0146)
 * ============================================================ */

export type CircleRetentionCohort = {
  cohort_month: string; // 'YYYY-MM-DD' (1er du mois)
  cohort_size: number;
  retention_pct: number[]; // index 0 = M+0, 1 = M+1, ...
};

export type CircleFunnel = {
  joined_30d: number;
  first_post_30d: number;
  active_30d: number;
  contributors_30d: number;
  total_members: number;
  churned_30d: number;
  churn_rate_30d: number;
  conv_join_to_post_pct: number;
  conv_active_to_contributor_pct: number;
};

export async function getCircleRetentionCohorts(
  circleId: string,
  months: number = 6,
): Promise<CircleRetentionCohort[]> {
  const supabase = await createClient();
  const { data, error } = await (supabase as SupabaseAny).rpc(
    "get_circle_retention_cohorts",
    { p_circle_id: circleId, p_months: months },
  );
  if (error || !data) return [];
  return data as CircleRetentionCohort[];
}

export async function getCircleFunnel(
  circleId: string,
): Promise<CircleFunnel | null> {
  const supabase = await createClient();
  const { data, error } = await (supabase as SupabaseAny).rpc(
    "get_circle_funnel_and_churn",
    { p_circle_id: circleId },
  );
  if (error || !data) return null;
  return data as CircleFunnel;
}
