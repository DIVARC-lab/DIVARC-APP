/* lib/queries/circleChannels.ts — accès données channels cercles. */

import { createClient } from "@/lib/supabase/server";
import type { CircleChannelSummary } from "@/lib/database.types";

/* eslint-disable @typescript-eslint/no-explicit-any */
type SupabaseAny = any;

export async function listCircleChannels(
  circleId: string,
): Promise<CircleChannelSummary[]> {
  const supabase = await createClient();
  const { data, error } = await (supabase as SupabaseAny).rpc(
    "list_circle_channels",
    { p_circle_id: circleId },
  );
  if (error || !data) return [];
  return data as CircleChannelSummary[];
}

export async function getCircleChannelBySlug(
  circleId: string,
  channelSlug: string,
): Promise<CircleChannelSummary | null> {
  const supabase = await createClient();
  const { data } = await (supabase as SupabaseAny)
    .from("circle_channels")
    .select("id, slug, name, description, channel_type, position, posts_count, created_at")
    .eq("circle_id", circleId)
    .eq("slug", channelSlug)
    .is("archived_at", null)
    .maybeSingle();
  return (data as CircleChannelSummary | null) ?? null;
}
