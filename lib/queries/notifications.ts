import "server-only";
import { createClient } from "@/lib/supabase/server";
import type {
  Notification,
  NotificationWithActor,
  Profile,
} from "@/lib/database.types";

/* Sprint D.1 — Mode de tri des notifications.
 *  - "chronological" : tri DESC sur created_at (legacy)
 *  - "ranked"        : tri par score de pertinence (RPC rank_user_notifications)
 */
export type NotificationSortMode = "chronological" | "ranked";

export async function listNotificationsForUser(
  userId: string,
  limit: number = 50,
  mode: NotificationSortMode = "ranked",
): Promise<NotificationWithActor[]> {
  const supabase = await createClient();

  type Row = Notification & { relevance_score?: number | string };
  let rows: Row[] | null = null;

  if (mode === "ranked") {
    /* RPC dédié — combine type_weight + recency + actor_affinity + unread. */
    /* eslint-disable-next-line @typescript-eslint/no-explicit-any */
    const { data, error } = await (supabase as any).rpc(
      "rank_user_notifications",
      { p_user_id: userId, p_limit: limit },
    );
    if (!error && data) {
      rows = data as Row[];
    }
  }

  /* Fallback : chronological (mode legacy ou RPC down). */
  if (!rows) {
    const { data, error } = await supabase
      .from("notifications")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(limit);
    if (error || !data) return [];
    rows = data as unknown as Row[];
  }

  const actorIds = Array.from(
    new Set(
      rows
        .map((row) => row.related_user_id)
        .filter((value): value is string => typeof value === "string"),
    ),
  );

  const profileById = new Map<
    string,
    Pick<Profile, "id" | "full_name" | "username" | "avatar_url">
  >();

  if (actorIds.length > 0) {
    const { data: profiles } = await supabase
      .from("profiles")
      .select("id, full_name, username, avatar_url")
      .in("id", actorIds);
    for (const profile of profiles ?? []) {
      profileById.set(profile.id, profile);
    }
  }

  return rows.map((row) => ({
    ...(row as Notification),
    actor: row.related_user_id
      ? profileById.get(row.related_user_id) ?? null
      : null,
  }));
}

export async function countUnreadNotifications(
  userId: string,
): Promise<number> {
  const supabase = await createClient();
  const { count } = await supabase
    .from("notifications")
    .select("id", { count: "exact", head: true })
    .eq("user_id", userId)
    .is("read_at", null);
  return count ?? 0;
}
