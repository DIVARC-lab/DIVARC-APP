import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

/* Endpoints RGPD pour le profil de recommandation.
 *
 * GET    : export complet en JSON (droit d'accès, art. 15)
 * DELETE : suppression complète events + profil + settings (droit à
 *          l'oubli, art. 17). Sous 30 jours d'après la promesse RGPD,
 *          en pratique synchrone et immédiat.
 *
 * On utilise le admin client pour DELETE car certaines tables (events,
 * profile) n'ont pas de policy update/delete grand public. */

export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  /* Lecture parallèle. */
  const [profile, settings, eventsCount] = await Promise.all([
    supabase
      .from("user_interest_profiles")
      .select("*")
      .eq("user_id", user.id)
      .maybeSingle(),
    supabase
      .from("user_algorithm_settings")
      .select("*")
      .eq("user_id", user.id)
      .maybeSingle(),
    supabase
      .from("recsys_events")
      .select("event_id", { count: "exact", head: true })
      .eq("user_id", user.id),
  ]);

  /* Sample des 100 derniers events pour transparence (pas tous, sinon
     payload énorme). L'utilisateur peut déduire de cet échantillon ce
     qu'on track exactement. */
  const { data: recentEvents } = await supabase
    .from("recsys_events")
    .select(
      "event_type, surface, target_post_id, properties, created_at",
    )
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(100);

  const exportPayload = {
    exported_at: new Date().toISOString(),
    user_id: user.id,
    profile: profile.data
      ? {
          ...profile.data,
          /* On omet l'interest_vector (1536 floats opaques pour l'user). */
          interest_vector: profile.data.interest_vector
            ? "[1536 floats — opaque, omis du export pour lisibilité]"
            : null,
        }
      : null,
    algorithm_settings: settings.data ?? null,
    events: {
      total_count: eventsCount.count ?? 0,
      sample_recent_100: recentEvents ?? [],
      retention_policy: "Events conservés 13 mois max, cleanup automatique.",
    },
  };

  return NextResponse.json(exportPayload, {
    headers: {
      /* Force le download avec filename — UX inspirée du Twitter Archive. */
      "Content-Disposition": `attachment; filename="divarc-algorithm-data-${user.id}.json"`,
    },
  });
}

export async function DELETE() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  /* Admin client pour bypass RLS sur les deletes. */
  const admin = createAdminClient();

  const [eventsRes, profileRes, settingsRes] = await Promise.all([
    admin.from("recsys_events").delete().eq("user_id", user.id),
    admin.from("user_interest_profiles").delete().eq("user_id", user.id),
    admin.from("user_algorithm_settings").delete().eq("user_id", user.id),
  ]);

  const errors = [eventsRes, profileRes, settingsRes]
    .filter((r) => r.error)
    .map((r) => r.error!.message);

  if (errors.length > 0) {
    return NextResponse.json(
      {
        error: "Partial deletion — some tables failed",
        details: errors,
      },
      { status: 500 },
    );
  }

  return NextResponse.json({
    ok: true,
    deleted: {
      events: true,
      profile: true,
      settings: true,
    },
    message:
      "Toutes tes données de recommandation ont été supprimées. Un nouveau profil sera reconstruit à partir de tes futures interactions.",
  });
}
