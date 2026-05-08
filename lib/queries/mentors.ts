import "server-only";
import { createClient } from "@/lib/supabase/server";
import type {
  MentorOffer,
  MentorOfferWithProfile,
  MentorSession,
  Profile,
} from "@/lib/database.types";

export async function listMentorOffers(options?: {
  topic?: string;
  limit?: number;
}): Promise<MentorOfferWithProfile[]> {
  const supabase = await createClient();
  let query = supabase
    .from("mentor_offers")
    .select("*")
    .eq("is_available", true)
    .order("rating_avg", { ascending: false, nullsFirst: false })
    .order("sessions_count", { ascending: false })
    .limit(options?.limit ?? 50);
  if (options?.topic) query = query.contains("topics", [options.topic]);

  const { data: offers } = await query;
  if (!offers || offers.length === 0) return [];

  const userIds = offers.map((o) => o.user_id);
  const { data: profiles } = await supabase
    .from("profiles")
    .select("id, full_name, username, avatar_url, headline, location")
    .in("id", userIds);

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

  return offers.map((o) => ({
    ...o,
    profile: byId.get(o.user_id) ?? null,
  }));
}

export async function getMyMentorOffer(
  userId: string,
): Promise<MentorOffer | null> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("mentor_offers")
    .select("*")
    .eq("user_id", userId)
    .maybeSingle();
  return data ?? null;
}

export async function getMentorOfferByUsername(
  username: string,
): Promise<MentorOfferWithProfile | null> {
  const supabase = await createClient();
  const { data: profile } = await supabase
    .from("profiles")
    .select("id, full_name, username, avatar_url, headline, location")
    .eq("username", username.toLowerCase())
    .maybeSingle();
  if (!profile) return null;

  const { data: offer } = await supabase
    .from("mentor_offers")
    .select("*")
    .eq("user_id", profile.id)
    .maybeSingle();
  if (!offer) return null;

  return {
    ...offer,
    profile: {
      id: profile.id,
      full_name: profile.full_name,
      username: profile.username,
      avatar_url: profile.avatar_url,
      headline: (profile as { headline?: string | null }).headline ?? null,
      location: profile.location,
    },
  };
}

export async function listMyMentorSessions(
  userId: string,
  role: "mentor" | "mentee",
): Promise<MentorSession[]> {
  const supabase = await createClient();
  const column = role === "mentor" ? "mentor_id" : "mentee_id";
  const { data } = await supabase
    .from("mentor_sessions")
    .select("*")
    .eq(column, userId)
    .order("created_at", { ascending: false });
  return data ?? [];
}
