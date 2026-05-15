/* lib/queries/circleLiveRooms.ts — accès données live rooms cercle. */

import { createClient } from "@/lib/supabase/server";
import type {
  CircleLiveRoom,
  CircleLiveRoomWithHost,
  Profile,
} from "@/lib/database.types";

/* eslint-disable @typescript-eslint/no-explicit-any */
type SupabaseAny = any;

type ProfileLite = Pick<Profile, "id" | "full_name" | "username" | "avatar_url">;

export async function listCircleLiveRooms(
  circleId: string,
  opts: { statuses?: Array<CircleLiveRoom["status"]>; limit?: number } = {},
): Promise<CircleLiveRoomWithHost[]> {
  const supabase = await createClient();
  const statuses = opts.statuses ?? ["scheduled", "live"];
  const limit = opts.limit ?? 20;

  const { data, error } = await (supabase as SupabaseAny)
    .from("circle_live_rooms")
    .select("*")
    .eq("circle_id", circleId)
    .is("deleted_at", null)
    .in("status", statuses)
    .order("status", { ascending: true }) // live first, then scheduled
    .order("scheduled_at", { ascending: true, nullsFirst: false })
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error || !data) return [];
  const rows = data as CircleLiveRoom[];
  if (rows.length === 0) return [];

  const hostIds = Array.from(new Set(rows.map((r) => r.host_id)));
  const { data: hosts } = await supabase
    .from("profiles")
    .select("id, full_name, username, avatar_url")
    .in("id", hostIds);

  const hostById = new Map<string, ProfileLite>();
  for (const h of (hosts ?? []) as ProfileLite[]) hostById.set(h.id, h);

  return rows.map((r) => ({
    ...r,
    host: hostById.get(r.host_id) ?? null,
  })) as CircleLiveRoomWithHost[];
}

export async function getCircleLiveRoom(
  roomId: string,
): Promise<CircleLiveRoomWithHost | null> {
  const supabase = await createClient();
  const { data, error } = await (supabase as SupabaseAny)
    .from("circle_live_rooms")
    .select("*")
    .eq("id", roomId)
    .is("deleted_at", null)
    .maybeSingle();
  if (error || !data) return null;
  const { data: host } = await supabase
    .from("profiles")
    .select("id, full_name, username, avatar_url")
    .eq("id", data.host_id)
    .maybeSingle();
  return { ...(data as CircleLiveRoom), host: host as ProfileLite } as CircleLiveRoomWithHost;
}
