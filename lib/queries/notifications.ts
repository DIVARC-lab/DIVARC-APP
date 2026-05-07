import "server-only";
import { createClient } from "@/lib/supabase/server";
import type {
  Notification,
  NotificationWithActor,
  Profile,
} from "@/lib/database.types";

export async function listNotificationsForUser(
  userId: string,
  limit: number = 50,
): Promise<NotificationWithActor[]> {
  const supabase = await createClient();
  const { data: rows, error } = await supabase
    .from("notifications")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error || !rows) return [];

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
