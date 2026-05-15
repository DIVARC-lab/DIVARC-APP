/* lib/queries/circleBots.ts — accès données bots cercle. */

import { createClient } from "@/lib/supabase/server";
import type { CircleBotSummary } from "@/lib/database.types";

/* eslint-disable @typescript-eslint/no-explicit-any */
type SupabaseAny = any;

export async function listCircleBots(
  circleId: string,
): Promise<CircleBotSummary[]> {
  const supabase = await createClient();
  const { data, error } = await (supabase as SupabaseAny).rpc("list_circle_bots", {
    p_circle_id: circleId,
  });
  if (error || !data) return [];
  return data as CircleBotSummary[];
}

/* Récupère le profil "bot" pour un set d'IDs (utilisé par CircleChatView
 * pour rendre les messages bot avec leur identité). */
export async function getCircleBotsById(
  botIds: string[],
): Promise<
  Map<
    string,
    { id: string; name: string; avatar_url: string | null; bot_type: string }
  >
> {
  if (botIds.length === 0) return new Map();
  const supabase = await createClient();
  const { data } = await (supabase as SupabaseAny)
    .from("circle_bots")
    .select("id, name, avatar_url, bot_type")
    .in("id", botIds);
  const map = new Map<
    string,
    { id: string; name: string; avatar_url: string | null; bot_type: string }
  >();
  for (const b of (data ?? []) as Array<{
    id: string;
    name: string;
    avatar_url: string | null;
    bot_type: string;
  }>) {
    map.set(b.id, b);
  }
  return map;
}
