import "server-only";

/* Sprint F — Queries gamification. */

import { createClient } from "@/lib/supabase/server";
import type {
  CircleLeaderboardRow,
  CircleLeaderboardSort,
  Quest,
  QuestWithProgress,
  UserQuestProgress,
} from "@/lib/database.types";

/* eslint-disable @typescript-eslint/no-explicit-any */
type SupabaseAny = any;

/* Period key calculé côté JS pour s'aligner avec celui SQL (ISO week
 * pour weekly, YYYY-MM-DD pour daily, en UTC). */
function periodKey(period: "daily" | "weekly"): string {
  const now = new Date();
  if (period === "daily") {
    return now.toISOString().slice(0, 10);
  }
  /* ISO week — pas natif en JS, on calcule à la main. */
  const tmp = new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()),
  );
  const dayNum = tmp.getUTCDay() || 7;
  tmp.setUTCDate(tmp.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(tmp.getUTCFullYear(), 0, 1));
  const weekNo = Math.ceil(
    ((tmp.getTime() - yearStart.getTime()) / 86400000 + 1) / 7,
  );
  return `${tmp.getUTCFullYear()}-W${String(weekNo).padStart(2, "0")}`;
}

/* Liste les quêtes actives + le progress de l'user courant pour la
 * période en cours. */
export async function listActiveQuestsForUser(
  userId: string,
): Promise<QuestWithProgress[]> {
  const supabase = await createClient();
  const { data: quests } = await (supabase as SupabaseAny)
    .from("quests")
    .select("*")
    .eq("is_active", true)
    .order("period", { ascending: true })
    .order("xp_reward", { ascending: false });

  if (!quests || quests.length === 0) return [];

  const q = quests as Quest[];
  const dailyKey = periodKey("daily");
  const weeklyKey = periodKey("weekly");
  const questIds = q.map((quest) => quest.id);

  const { data: progressRows } = await (supabase as SupabaseAny)
    .from("user_quest_progress")
    .select("*")
    .eq("user_id", userId)
    .in("quest_id", questIds)
    .in("period_key", [dailyKey, weeklyKey]);

  const progressMap = new Map<string, UserQuestProgress>();
  for (const row of (progressRows ?? []) as UserQuestProgress[]) {
    progressMap.set(`${row.quest_id}__${row.period_key}`, row);
  }

  return q.map((quest) => {
    const key = quest.period === "daily" ? dailyKey : weeklyKey;
    const progress = progressMap.get(`${quest.id}__${key}`) ?? null;
    return {
      ...quest,
      progress: progress?.progress ?? 0,
      completed_at: progress?.completed_at ?? null,
      claimed_at: progress?.claimed_at ?? null,
    };
  });
}

export async function listCircleLeaderboardV2(
  circleId: string,
  sort: CircleLeaderboardSort = "karma",
  limit: number = 25,
): Promise<CircleLeaderboardRow[]> {
  const supabase = await createClient();
  const { data, error } = await (supabase as SupabaseAny).rpc(
    "circle_leaderboard_v2",
    { p_circle_id: circleId, p_sort: sort, p_limit: limit },
  );
  if (error || !data) return [];
  return data as CircleLeaderboardRow[];
}

/* Ping streak : ré-exécutable plusieurs fois par jour sans effet
 * indésirable (no-op si déjà fait aujourd'hui). À appeler depuis le
 * layout authenticated. */
export async function pingUserStreak(userId: string): Promise<void> {
  const supabase = await createClient();
  await (supabase as SupabaseAny).rpc("bump_user_streak", {
    p_user_id: userId,
  });
}
