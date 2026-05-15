/* lib/queries/circleChannels.ts — accès données channels cercles. */

import { createClient } from "@/lib/supabase/server";
import type {
  CircleChannelSummary,
  CircleRole,
} from "@/lib/database.types";
import { canViewChannel } from "@/lib/utils/circleChannelPermissions";

/* eslint-disable @typescript-eslint/no-explicit-any */
type SupabaseAny = any;

/* Sprint B.5 — on passe par un SELECT direct (au lieu du RPC) pour
 * inclure le champ permissions et appliquer le filtre permissions.view
 * côté code. RLS strict membre actif s'applique déjà côté DB. */
export async function listCircleChannels(
  circleId: string,
  currentUserRole?: CircleRole | null,
): Promise<CircleChannelSummary[]> {
  const supabase = await createClient();
  const { data, error } = await (supabase as SupabaseAny)
    .from("circle_channels")
    .select(
      "id, slug, name, description, channel_type, position, posts_count, permissions, created_at",
    )
    .eq("circle_id", circleId)
    .is("archived_at", null)
    .order("position", { ascending: true })
    .order("created_at", { ascending: true });
  if (error || !data) return [];

  const channels = data as CircleChannelSummary[];
  /* Filtre permissions.view : un channel avec permissions.view explicite
     qui n'inclut pas le rôle de l'user n'est pas listé. */
  return channels.filter((channel) =>
    canViewChannel(channel, currentUserRole ?? null),
  );
}

export async function getCircleChannelBySlug(
  circleId: string,
  channelSlug: string,
): Promise<CircleChannelSummary | null> {
  const supabase = await createClient();
  const { data } = await (supabase as SupabaseAny)
    .from("circle_channels")
    .select(
      "id, slug, name, description, channel_type, position, posts_count, permissions, created_at",
    )
    .eq("circle_id", circleId)
    .eq("slug", channelSlug)
    .is("archived_at", null)
    .maybeSingle();
  return (data as CircleChannelSummary | null) ?? null;
}
