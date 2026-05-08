import "server-only";
import { createClient } from "@/lib/supabase/server";
import type { PresenceInfo } from "@/lib/database.types";

/** Renvoie la présence visible pour chaque user_id donné, en respectant les
 * règles de visibilité (everyone / friends / nobody) côté SQL. Les users non
 * visibles sont absents de la map (renvoie undefined). */
export async function getPresenceForUsers(
  userIds: string[],
): Promise<Record<string, PresenceInfo>> {
  if (userIds.length === 0) return {};
  const supabase = await createClient();

  const uniqueIds = Array.from(new Set(userIds));

  const { data, error } = await supabase.rpc("get_visible_presence_batch", {
    target_user_ids: uniqueIds,
  });

  if (error || !data) return {};

  const result: Record<string, PresenceInfo> = {};
  for (const row of data) {
    result[row.user_id] = {
      user_id: row.user_id,
      presence_status: row.presence_status,
      last_seen_at: row.last_seen_at,
      custom_status: row.custom_status,
    };
  }
  return result;
}

export async function getPresenceForUser(
  userId: string,
): Promise<PresenceInfo | null> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("get_visible_presence", {
    target_user_id: userId,
  });
  if (error || !data || data.length === 0) return null;
  const row = data[0]!;
  return {
    user_id: row.user_id,
    presence_status: row.presence_status,
    last_seen_at: row.last_seen_at,
    custom_status: row.custom_status,
  };
}
