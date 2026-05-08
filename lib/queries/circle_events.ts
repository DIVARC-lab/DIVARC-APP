import "server-only";
import { createClient } from "@/lib/supabase/server";
import type { CircleEvent, CircleEventWithRsvp } from "@/lib/database.types";

async function attachRsvp(
  rows: CircleEvent[],
  currentUserId: string,
): Promise<CircleEventWithRsvp[]> {
  if (rows.length === 0) return [];

  const supabase = await createClient();
  const { data: rsvps } = await supabase
    .from("circle_event_attendance")
    .select("event_id, status")
    .eq("user_id", currentUserId)
    .in(
      "event_id",
      rows.map((e) => e.id),
    );

  const map = new Map<string, "going" | "interested">();
  for (const r of rsvps ?? []) {
    map.set(r.event_id, r.status as "going" | "interested");
  }

  return rows.map((e) => ({
    ...e,
    my_status: map.get(e.id) ?? null,
  }));
}

/** Événements à venir d'un cercle, triés par date croissante. */
export async function listUpcomingCircleEvents(
  circleId: string,
  currentUserId: string,
  limit: number = 10,
): Promise<CircleEventWithRsvp[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("circle_events")
    .select("*")
    .eq("circle_id", circleId)
    .gte("starts_at", new Date().toISOString())
    .order("starts_at", { ascending: true })
    .limit(limit);

  if (error || !data) return [];
  return attachRsvp(data, currentUserId);
}

export async function getCircleEventById(
  eventId: string,
  currentUserId: string,
): Promise<CircleEventWithRsvp | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("circle_events")
    .select("*")
    .eq("id", eventId)
    .maybeSingle();
  if (error || !data) return null;
  const [enriched] = await attachRsvp([data], currentUserId);
  return enriched ?? null;
}
