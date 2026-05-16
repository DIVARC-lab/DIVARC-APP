import "server-only";

/* Étape 7 — Queries Live Streaming (différent de liveSessions.ts qui
 * gère les sessions recrutement Sprint Jobs).
 *
 * listLiveNow : wrap la RPC list_live_now(user_id, limit, category, language)
 * créée migration 0155. RLS applique le filtrage visibility automatiquement.
 *
 * Enrichi côté server avec les profils hosts (avatar, name, username).
 */

import { createClient } from "@/lib/supabase/server";
import type { LiveCategory, LiveNowItem, Profile } from "@/lib/database.types";

/* eslint-disable @typescript-eslint/no-explicit-any */
type SupabaseAny = any;

export type LiveNowItemWithHost = LiveNowItem & {
  host: Pick<Profile, "id" | "full_name" | "username" | "avatar_url"> | null;
};

export async function listLiveNow(
  userId: string,
  opts: {
    limit?: number;
    category?: LiveCategory | null;
    language?: string | null;
  } = {},
): Promise<LiveNowItemWithHost[]> {
  const supabase = await createClient();
  const { data, error } = await (supabase as SupabaseAny).rpc("list_live_now", {
    p_user_id: userId,
    p_limit: opts.limit ?? 30,
    p_category: opts.category ?? null,
    p_language: opts.language ?? null,
  });
  if (error || !data) return [];

  const rows = data as LiveNowItem[];
  if (rows.length === 0) return [];

  const hostIds = Array.from(new Set(rows.map((r) => r.host_id)));
  const { data: hosts } = await supabase
    .from("profiles")
    .select("id, full_name, username, avatar_url")
    .in("id", hostIds);

  const hostMap = new Map<
    string,
    Pick<Profile, "id" | "full_name" | "username" | "avatar_url">
  >();
  for (const h of (hosts ?? []) as Array<
    Pick<Profile, "id" | "full_name" | "username" | "avatar_url">
  >) {
    hostMap.set(h.id, h);
  }

  return rows.map((r) => ({
    ...r,
    host: hostMap.get(r.host_id) ?? null,
  }));
}
