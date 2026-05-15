/* lib/queries/circleHubs.ts — accès données Hubs (méta-cercles)
 * et reputation portable. */

import { createClient } from "@/lib/supabase/server";
import type {
  CircleHub,
  HubCircleSummary,
  HubFeedPost,
  UserGlobalReputation,
} from "@/lib/database.types";

/* eslint-disable @typescript-eslint/no-explicit-any */
type SupabaseAny = any;

export async function listDiscoverableHubs(opts: {
  category?: string;
  limit?: number;
} = {}): Promise<CircleHub[]> {
  const supabase = await createClient();
  const { data, error } = await (supabase as SupabaseAny).rpc(
    "list_discoverable_hubs",
    {
      p_category: opts.category ?? null,
      p_limit: opts.limit ?? 20,
    },
  );
  if (error || !data) return [];
  return data as CircleHub[];
}

export async function getHubBySlug(slug: string): Promise<CircleHub | null> {
  const supabase = await createClient();
  const { data, error } = await (supabase as SupabaseAny)
    .from("circle_hubs")
    .select("*")
    .eq("slug", slug)
    .is("archived_at", null)
    .maybeSingle();
  if (error || !data) return null;
  return data as CircleHub;
}

export async function listHubCircles(
  hubId: string,
): Promise<HubCircleSummary[]> {
  const supabase = await createClient();
  const { data, error } = await (supabase as SupabaseAny).rpc(
    "list_hub_circles",
    { p_hub_id: hubId },
  );
  if (error || !data) return [];
  return data as HubCircleSummary[];
}

export async function aggregateHubFeed(
  hubId: string,
  limit: number = 30,
): Promise<HubFeedPost[]> {
  const supabase = await createClient();
  const { data, error } = await (supabase as SupabaseAny).rpc(
    "aggregate_hub_feed",
    { p_hub_id: hubId, p_limit: limit },
  );
  if (error || !data) return [];
  return data as HubFeedPost[];
}

export async function getUserGlobalReputation(
  userId: string,
): Promise<UserGlobalReputation | null> {
  const supabase = await createClient();
  const { data, error } = await (supabase as SupabaseAny).rpc(
    "get_user_global_reputation",
    { p_user_id: userId },
  );
  if (error || !data) return null;
  return data as UserGlobalReputation;
}
