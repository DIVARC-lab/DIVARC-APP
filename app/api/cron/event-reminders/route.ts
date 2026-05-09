import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { sendPushToUser } from "@/lib/push/sender";

/* Cron Vercel — déclenché toutes les heures (vercel.json `crons`).
 *
 * Logique :
 *  - Rappel J-1 : events qui démarrent dans 22-26h sans reminded_24h_at
 *  - Rappel H-1 : events qui démarrent dans 45-75min sans reminded_1h_at
 *  - Pour chaque event éligible : list les attendees `going` + leur push
 *  - Marque reminded_*_at = now() pour empêcher les doublons
 *
 * Sécurité : Vercel envoie un header Authorization avec le CRON_SECRET
 * configuré dans les env vars. On vérifie à l'entrée. */
export async function GET(request: Request) {
  /* Vérification du secret cron — Vercel envoie automatiquement
     `Authorization: Bearer ${CRON_SECRET}` quand le cron est déclenché. */
  const authHeader = request.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = createAdminClient();
  const now = new Date();

  /* Fenêtres de rappel — un peu plus larges que 24h/1h pile pour absorber
     les décalages de planification du cron (qui tourne à intervalles d'1h). */
  const window24Start = new Date(now.getTime() + 22 * 3600 * 1000);
  const window24End = new Date(now.getTime() + 26 * 3600 * 1000);
  const window1Start = new Date(now.getTime() + 45 * 60 * 1000);
  const window1End = new Date(now.getTime() + 75 * 60 * 1000);

  let summary = { reminders24: 0, reminders1: 0, pushes: 0 };

  /* --- Rappel J-1 --- */
  const { data: events24 } = await supabase
    .from("circle_events")
    .select("id, title, starts_at, location, circle_id")
    .is("reminded_24h_at", null)
    .gte("starts_at", window24Start.toISOString())
    .lte("starts_at", window24End.toISOString());

  for (const event of events24 ?? []) {
    const startsLocal = new Date(event.starts_at).toLocaleString("fr-FR", {
      weekday: "long",
      hour: "2-digit",
      minute: "2-digit",
    });
    const attendeeIds = await listAttendeeIds(supabase, event.id);
    for (const userId of attendeeIds) {
      const r = await sendPushToUser(
        userId,
        {
          title: `Demain : ${event.title}`,
          body: `${startsLocal}${event.location ? ` · ${event.location}` : ""}`,
          url: `/circles/events/${event.id}`,
          tag: `event-reminder-${event.id}`,
        },
        supabase,
      );
      summary.pushes += r.delivered;
    }
    await supabase
      .from("circle_events")
      .update({ reminded_24h_at: now.toISOString() })
      .eq("id", event.id);
    summary.reminders24++;
  }

  /* --- Rappel H-1 --- */
  const { data: events1 } = await supabase
    .from("circle_events")
    .select("id, title, starts_at, location, circle_id")
    .is("reminded_1h_at", null)
    .gte("starts_at", window1Start.toISOString())
    .lte("starts_at", window1End.toISOString());

  for (const event of events1 ?? []) {
    const startsTime = new Date(event.starts_at).toLocaleTimeString("fr-FR", {
      hour: "2-digit",
      minute: "2-digit",
    });
    const attendeeIds = await listAttendeeIds(supabase, event.id);
    for (const userId of attendeeIds) {
      const r = await sendPushToUser(
        userId,
        {
          title: `Dans ~1 h : ${event.title}`,
          body: `${startsTime}${event.location ? ` · ${event.location}` : ""}`,
          url: `/circles/events/${event.id}`,
          tag: `event-reminder-${event.id}`,
        },
        supabase,
      );
      summary.pushes += r.delivered;
    }
    await supabase
      .from("circle_events")
      .update({ reminded_1h_at: now.toISOString() })
      .eq("id", event.id);
    summary.reminders1++;
  }

  return NextResponse.json({ ok: true, ...summary });
}

/* Helper : list les user_id des attendees `going` d'un event. */
async function listAttendeeIds(
  supabase: ReturnType<typeof createAdminClient>,
  eventId: string,
): Promise<string[]> {
  const { data } = await supabase
    .from("circle_event_attendance")
    .select("user_id")
    .eq("event_id", eventId)
    .eq("status", "going");
  return (data ?? []).map((a) => a.user_id);
}
