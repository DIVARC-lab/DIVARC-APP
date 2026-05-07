import "server-only";
import { createClient } from "@/lib/supabase/server";
import type {
  Friendship,
  FriendshipStatus,
  FriendshipWithProfile,
  Profile,
} from "@/lib/database.types";

type ProfileRow = Pick<
  Profile,
  "id" | "full_name" | "username" | "avatar_url" | "location"
>;

async function enrichWithProfiles(
  rows: Friendship[],
  currentUserId: string,
): Promise<FriendshipWithProfile[]> {
  if (rows.length === 0) return [];
  const supabase = await createClient();

  const otherUserIds = Array.from(
    new Set(
      rows.map((row) =>
        row.requester_id === currentUserId
          ? row.recipient_id
          : row.requester_id,
      ),
    ),
  );

  const { data: profiles } = await supabase
    .from("profiles")
    .select("id, full_name, username, avatar_url, location")
    .in("id", otherUserIds);

  const profileById = new Map<string, ProfileRow>();
  for (const profile of profiles ?? []) {
    profileById.set(profile.id, profile);
  }

  return rows
    .map((row) => {
      const otherId =
        row.requester_id === currentUserId
          ? row.recipient_id
          : row.requester_id;
      const other = profileById.get(otherId);
      if (!other) return null;
      const direction: FriendshipWithProfile["direction"] =
        row.requester_id === currentUserId ? "outgoing" : "incoming";
      return { ...row, other, direction };
    })
    .filter((row): row is FriendshipWithProfile => row !== null);
}

export async function listFriendsForUser(
  userId: string,
): Promise<FriendshipWithProfile[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("friendships")
    .select("*")
    .eq("status", "accepted")
    .or(`requester_id.eq.${userId},recipient_id.eq.${userId}`)
    .order("responded_at", { ascending: false });

  if (error || !data) return [];
  return enrichWithProfiles(data, userId);
}

export async function listIncomingRequests(
  userId: string,
): Promise<FriendshipWithProfile[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("friendships")
    .select("*")
    .eq("recipient_id", userId)
    .eq("status", "pending")
    .order("created_at", { ascending: false });

  if (error || !data) return [];
  return enrichWithProfiles(data, userId);
}

export async function listOutgoingRequests(
  userId: string,
): Promise<FriendshipWithProfile[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("friendships")
    .select("*")
    .eq("requester_id", userId)
    .eq("status", "pending")
    .order("created_at", { ascending: false });

  if (error || !data) return [];
  return enrichWithProfiles(data, userId);
}

export async function countIncomingRequests(userId: string): Promise<number> {
  const supabase = await createClient();
  const { count } = await supabase
    .from("friendships")
    .select("id", { count: "exact", head: true })
    .eq("recipient_id", userId)
    .eq("status", "pending");
  return count ?? 0;
}

export type FriendshipState =
  | { status: "none" }
  | { status: "self" }
  | { status: "friends"; friendshipId: string }
  | { status: "outgoing"; friendshipId: string }
  | { status: "incoming"; friendshipId: string };

export async function lookupFriendshipState(
  currentUserId: string,
  otherUserId: string,
): Promise<FriendshipState> {
  if (currentUserId === otherUserId) return { status: "self" };

  const supabase = await createClient();
  const { data } = await supabase
    .from("friendships")
    .select("id, requester_id, status")
    .in("status", ["pending", "accepted"])
    .or(
      `and(requester_id.eq.${currentUserId},recipient_id.eq.${otherUserId}),and(requester_id.eq.${otherUserId},recipient_id.eq.${currentUserId})`,
    )
    .maybeSingle();

  if (!data) return { status: "none" };

  if ((data.status as FriendshipStatus) === "accepted") {
    return { status: "friends", friendshipId: data.id };
  }

  return data.requester_id === currentUserId
    ? { status: "outgoing", friendshipId: data.id }
    : { status: "incoming", friendshipId: data.id };
}
