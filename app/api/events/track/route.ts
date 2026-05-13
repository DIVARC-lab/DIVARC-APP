import { NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import type { EventSurface } from "@/lib/database.types";

/* Endpoint d'ingestion des events comportementaux pour le système de
 * recommandation. V1 lite : insertion directe dans Supabase Postgres
 * (pas de Redis Streams ni Kafka). Cleanup 13 mois via cron séparé.
 *
 * Idempotence : event_id UUID v4 généré côté client → primary key.
 * Si même event arrive deux fois (retry, double-flush), insert ignoré.
 *
 * Rate limit : naïf pour V1, on s'appuie sur RLS Supabase + max 100
 * events par batch. Anti-fraude plus sophistiqué = V2. */

const SURFACES: EventSurface[] = [
  "feed_home",
  "feed_circle",
  "reels",
  "reels_foryou",
  "reels_following",
  "discover",
  "marketplace",
  "jobs",
  "profile",
  "search",
  "notif",
  "story",
  "message",
];

const eventSchema = z.object({
  event_id: z.string().uuid(),
  session_id: z.string().min(1).max(64),
  event_type: z
    .string()
    .min(1)
    .max(64)
    .regex(/^[a-z][a-z0-9_]*\.[a-z][a-z0-9_]*$/, {
      message: "event_type doit être au format 'namespace.action'",
    }),
  surface: z.enum(SURFACES as [EventSurface, ...EventSurface[]]).optional(),
  position: z.number().int().min(0).max(10_000).optional(),
  target_post_id: z.string().uuid().optional(),
  target_user_id: z.string().uuid().optional(),
  target_listing_id: z.string().uuid().optional(),
  target_job_id: z.string().uuid().optional(),
  target_circle_id: z.string().uuid().optional(),
  properties: z.record(z.string(), z.unknown()).optional(),
  device_type: z.enum(["mobile", "tablet", "desktop"]).optional(),
  locale: z.string().max(16).optional(),
  client_ts: z.number().int().positive().optional(),
});

const batchSchema = z.object({
  events: z.array(eventSchema).min(1).max(100),
});

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const json = await request.json().catch(() => null);
  const parsed = batchSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json(
      {
        error: "Invalid payload",
        details: parsed.error.issues.slice(0, 5),
      },
      { status: 400 },
    );
  }

  /* Map vers le schéma DB. user_id forcé depuis la session pour empêcher
     un user de tracker au nom d'un autre. */
  const rows = parsed.data.events.map((e) => ({
    event_id: e.event_id,
    user_id: user.id,
    session_id: e.session_id,
    event_type: e.event_type,
    surface: e.surface ?? null,
    position: e.position ?? null,
    target_post_id: e.target_post_id ?? null,
    target_user_id: e.target_user_id ?? null,
    target_listing_id: e.target_listing_id ?? null,
    target_job_id: e.target_job_id ?? null,
    target_circle_id: e.target_circle_id ?? null,
    properties: e.properties ?? {},
    device_type: e.device_type ?? null,
    locale: e.locale ?? null,
    client_ts: e.client_ts ?? null,
  }));

  /* Upsert avec ignoreDuplicates pour idempotence : un retry client ne
     duplique pas l'event. */
  const { error } = await supabase
    .from("recsys_events")
    .upsert(rows, { onConflict: "event_id", ignoreDuplicates: true });

  if (error) {
    /* On ne révèle pas le détail au client (security). Logger côté server
       pour debug si besoin. */
    return NextResponse.json(
      { error: "Insert failed" },
      { status: 500 },
    );
  }

  return NextResponse.json({ ok: true, inserted: rows.length });
}
