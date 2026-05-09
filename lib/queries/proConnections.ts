import "server-only";
import { createClient } from "@/lib/supabase/server";
import type {
  ProConnectionWithProfile,
  Profile,
} from "@/lib/database.types";

type Direction = "all" | "incoming" | "outgoing";
type StatusFilter = "accepted" | "pending";

async function listConnectionsRaw(args: {
  userId: string;
  direction: Direction;
  status: StatusFilter;
}): Promise<ProConnectionWithProfile[]> {
  const supabase = await createClient();

  let query = supabase
    .from("pro_connections")
    .select("*")
    .eq("status", args.status);

  if (args.direction === "incoming") {
    query = query.eq("recipient_id", args.userId);
  } else if (args.direction === "outgoing") {
    query = query.eq("requester_id", args.userId);
  } else {
    query = query.or(
      `requester_id.eq.${args.userId},recipient_id.eq.${args.userId}`,
    );
  }

  const { data, error } = await query.order("created_at", { ascending: false });
  if (error || !data) return [];

  const otherIds = data.map((row) =>
    row.requester_id === args.userId ? row.recipient_id : row.requester_id,
  );
  const { data: profiles } = await supabase
    .from("profiles")
    .select("id, full_name, username, avatar_url, headline, location")
    .in("id", otherIds);

  const byId = new Map<
    string,
    Pick<
      Profile,
      "id" | "full_name" | "username" | "avatar_url" | "headline" | "location"
    >
  >();
  for (const p of profiles ?? []) {
    byId.set(p.id, {
      id: p.id,
      full_name: p.full_name,
      username: p.username,
      avatar_url: p.avatar_url,
      headline: (p as { headline?: string | null }).headline ?? null,
      location: p.location,
    });
  }

  return data
    .map((row) => {
      const otherId =
        row.requester_id === args.userId ? row.recipient_id : row.requester_id;
      const other = byId.get(otherId);
      if (!other) return null;
      return { ...row, other };
    })
    .filter((r): r is ProConnectionWithProfile => r !== null);
}

export async function listMyProConnections(
  userId: string,
): Promise<ProConnectionWithProfile[]> {
  return listConnectionsRaw({ userId, direction: "all", status: "accepted" });
}

export async function listIncomingProRequests(
  userId: string,
): Promise<ProConnectionWithProfile[]> {
  return listConnectionsRaw({
    userId,
    direction: "incoming",
    status: "pending",
  });
}

export async function listOutgoingProRequests(
  userId: string,
): Promise<ProConnectionWithProfile[]> {
  return listConnectionsRaw({
    userId,
    direction: "outgoing",
    status: "pending",
  });
}

export async function getConnectionDegree(
  targetUserId: string,
): Promise<number | null> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("connection_degree", {
    target_user_id: targetUserId,
  });
  if (error) return null;
  return (data as unknown as number | null) ?? null;
}
