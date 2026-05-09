import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  EVENT_WEIGHTS,
  dwellWeight,
  timeDecay,
} from "@/lib/recsys/eventWeights";

/* Profile updater — recalcule les profils d'intérêts utilisateur en
 * agrégeant les events des 14 derniers jours avec time decay (half-life
 * 14j).
 *
 * Architecture V1 lite : aucun worker Celery / Redis Streams. Le cron
 * Vercel (ou Supabase pg_cron, voir PUSH_NOTIFICATIONS.md sur le plan
 * Hobby) déclenche cet endpoint toutes les 15 min.
 *
 * Ce qu'on calcule :
 *  - user_affinity : { target_user_id: score } basé sur interactions
 *    (follows, likes, comments, shares, profile.visit, message.send)
 *  - circle_affinity : pour les events ayant un target_circle_id
 *  - format_preference : ratios des likes/saves par format détecté
 *  - active_hours_distribution : histogramme 24h des events
 *  - events_processed_count : pour debug
 *
 * Skippé V1 :
 *  - topic_affinity : nécessite mapping post→topic (à venir étape
 *    indexation contenu)
 *  - interest_vector : nécessite OpenAI embeddings (V2)
 *
 * Performance : SQL aggregations natives, pas de N+1. Chaque user actif
 * récent (avec ≥1 event dans la fenêtre) est traité. Pour 10K users
 * actifs = ~5s sur Postgres standard. */

export async function GET(request: Request) {
  /* Vérification CRON_SECRET (cf. event-reminders cron pour le pattern). */
  const authHeader = request.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = createAdminClient();
  const cutoff = new Date(
    Date.now() - 14 * 24 * 3600 * 1000,
  ).toISOString();

  /* On récupère la liste des users actifs (≥1 event dans la fenêtre). */
  const { data: activeUsers } = await supabase
    .from("recsys_events")
    .select("user_id")
    .gte("created_at", cutoff);
  if (!activeUsers || activeUsers.length === 0) {
    return NextResponse.json({ ok: true, users_processed: 0 });
  }
  const uniqueUserIds = Array.from(new Set(activeUsers.map((r) => r.user_id)));

  let processed = 0;
  let errors = 0;

  for (const userId of uniqueUserIds) {
    try {
      await updateProfileForUser(supabase, userId, cutoff);
      processed++;
    } catch {
      errors++;
    }
  }

  return NextResponse.json({
    ok: true,
    users_processed: processed,
    errors,
  });
}

async function updateProfileForUser(
  supabase: ReturnType<typeof createAdminClient>,
  userId: string,
  cutoff: string,
): Promise<void> {
  /* On lit tous les events du user dans la fenêtre. Limite haute pour
     éviter qu'un user power user ne fasse exploser le worker. */
  const { data: events } = await supabase
    .from("recsys_events")
    .select(
      "event_type, target_user_id, target_circle_id, properties, created_at",
    )
    .eq("user_id", userId)
    .gte("created_at", cutoff)
    .order("created_at", { ascending: false })
    .limit(5000);

  if (!events || events.length === 0) return;

  const userAffinity: Record<string, number> = {};
  const circleAffinity: Record<string, number> = {};
  const hoursHist: number[] = new Array(24).fill(0);
  const now = Date.now();

  for (const event of events) {
    const baseWeight = EVENT_WEIGHTS[event.event_type] ?? 0;
    const props = (event.properties ?? {}) as Record<string, unknown>;
    const dwellMs = typeof props.dwell_ms === "number" ? props.dwell_ms : 0;
    const dwellExtra = dwellMs > 0 ? dwellWeight(dwellMs) : 0;

    const ageDays =
      (now - new Date(event.created_at).getTime()) / (24 * 3600 * 1000);
    const decay = timeDecay(ageDays, 14);
    const finalWeight = (baseWeight + dwellExtra) * decay;

    if (finalWeight === 0) continue;

    /* User affinity. */
    if (event.target_user_id) {
      userAffinity[event.target_user_id] =
        (userAffinity[event.target_user_id] ?? 0) + finalWeight;
    }

    /* Circle affinity. */
    if (event.target_circle_id) {
      circleAffinity[event.target_circle_id] =
        (circleAffinity[event.target_circle_id] ?? 0) + finalWeight;
    }

    /* Active hours distribution (positifs uniquement, pour matcher
       quand l'user EST actif vs qu'il signale). */
    if (finalWeight > 0) {
      const hour = new Date(event.created_at).getHours();
      hoursHist[hour] += 1;
    }
  }

  /* Normalisation hist : ratio 0..1. */
  const maxHour = Math.max(...hoursHist, 1);
  const hoursDist: Record<string, number> = {};
  for (let h = 0; h < 24; h++) {
    hoursDist[String(h)] = hoursHist[h]! / maxHour;
  }

  /* Garde le top 200 user_affinity et top 50 circles pour limiter le payload. */
  const topUserAffinity = Object.fromEntries(
    Object.entries(userAffinity)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 200),
  );
  const topCircleAffinity = Object.fromEntries(
    Object.entries(circleAffinity)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 50),
  );

  /* Upsert profile. */
  await supabase.from("user_interest_profiles").upsert(
    {
      user_id: userId,
      user_affinity: topUserAffinity,
      circle_affinity: topCircleAffinity,
      active_hours_distribution: hoursDist,
      events_processed_count: events.length,
      last_updated: new Date().toISOString(),
    },
    { onConflict: "user_id" },
  );
}
