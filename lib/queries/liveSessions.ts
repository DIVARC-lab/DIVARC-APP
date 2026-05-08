import "server-only";
import { createClient } from "@/lib/supabase/server";
import type {
  LiveSession,
  LiveSessionMessageWithAuthor,
  Profile,
} from "@/lib/database.types";

export async function listUpcomingLiveSessions(): Promise<
  Array<LiveSession & { host: Pick<Profile, "id" | "full_name" | "username" | "avatar_url"> | null }>
> {
  const supabase = await createClient();
  const { data: sessions } = await supabase
    .from("live_sessions")
    .select("*")
    .in("status", ["scheduled", "live"])
    .order("scheduled_at", { ascending: true });
  if (!sessions || sessions.length === 0) return [];

  const hostIds = Array.from(new Set(sessions.map((s) => s.host_id)));
  const { data: hosts } = await supabase
    .from("profiles")
    .select("id, full_name, username, avatar_url")
    .in("id", hostIds);
  const byId = new Map(hosts?.map((h) => [h.id, h]) ?? []);

  return sessions.map((s) => ({
    ...s,
    host: byId.get(s.host_id) ?? null,
  }));
}

export async function getLiveSession(
  sessionId: string,
): Promise<
  | (LiveSession & {
      host: Pick<Profile, "id" | "full_name" | "username" | "avatar_url"> | null;
    })
  | null
> {
  const supabase = await createClient();
  const { data: session } = await supabase
    .from("live_sessions")
    .select("*")
    .eq("id", sessionId)
    .maybeSingle();
  if (!session) return null;

  const { data: host } = await supabase
    .from("profiles")
    .select("id, full_name, username, avatar_url")
    .eq("id", session.host_id)
    .maybeSingle();

  return { ...session, host: host ?? null };
}

export async function isUserAttending(
  sessionId: string,
  userId: string,
): Promise<boolean> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("live_session_attendees")
    .select("user_id")
    .eq("session_id", sessionId)
    .eq("user_id", userId)
    .maybeSingle();
  return Boolean(data);
}

export async function listLiveSessionMessages(
  sessionId: string,
): Promise<LiveSessionMessageWithAuthor[]> {
  const supabase = await createClient();
  const { data: messages } = await supabase
    .from("live_session_messages")
    .select("*")
    .eq("session_id", sessionId)
    .order("created_at", { ascending: true })
    .limit(200);
  if (!messages) return [];

  const userIds = Array.from(new Set(messages.map((m) => m.user_id)));
  const { data: profiles } = await supabase
    .from("profiles")
    .select("id, full_name, username, avatar_url")
    .in("id", userIds);
  const byId = new Map(profiles?.map((p) => [p.id, p]) ?? []);
  return messages.map((m) => ({ ...m, author: byId.get(m.user_id) ?? null }));
}
