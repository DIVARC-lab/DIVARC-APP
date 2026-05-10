import { NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";

/* Recommandations jobs personnalisées.
 *
 * Sources V1 :
 *  1. Match catégorie/work_mode du profil pro déclaré
 *  2. Localisation (si location_consent)
 *  3. Boost si "tes connexions y travaillent" (jobs où l'auteur est un
 *     ami)
 *
 * Filtres : status active uniquement, exclut mes propres jobs, exclut
 * jobs déjà candidatés. */

const querySchema = z.object({
  limit: z.coerce.number().int().min(1).max(30).default(10),
});

export async function GET(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const url = new URL(request.url);
  const parsed = querySchema.safeParse(
    Object.fromEntries(url.searchParams.entries()),
  );
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid query" }, { status: 400 });
  }
  const { limit } = parsed.data;

  /* Lit le profil pour location + headline (utilisable comme match
     thématique faible si pas de profil pro complet). */
  const { data: profile } = await supabase
    .from("profiles")
    .select("location, headline")
    .eq("id", user.id)
    .maybeSingle();

  /* Mes amis pour le boost "tes connexions y travaillent". */
  const { data: friendships } = await supabase
    .from("friendships")
    .select("requester_id, recipient_id")
    .eq("status", "accepted")
    .or(`requester_id.eq.${user.id},recipient_id.eq.${user.id}`);
  const friendIds = new Set(
    (friendships ?? []).map((f) =>
      f.requester_id === user.id ? f.recipient_id : f.requester_id,
    ),
  );

  /* Jobs auxquels j'ai déjà candidaté (à exclure). */
  const { data: applications } = await supabase
    .from("job_applications")
    .select("job_id")
    .eq("applicant_id", user.id);
  const appliedJobIds = new Set(
    (applications ?? []).map((a) => a.job_id),
  );

  /* Candidate set : jobs actifs des 30 derniers jours, hors miens et hors
     déjà candidaté. */
  let query = supabase
    .from("jobs")
    .select(
      "id, title, company_name, category, job_type, work_mode, location, salary_min, salary_max, salary_currency, poster_id, created_at",
    )
    .eq("status", "active")
    .neq("poster_id", user.id)
    .gte("created_at", new Date(Date.now() - 30 * 24 * 3600 * 1000).toISOString())
    .order("created_at", { ascending: false })
    .limit(limit * 3);

  const { data: candidates } = await query;
  if (!candidates) {
    return NextResponse.json({ items: [] });
  }

  const filtered = candidates.filter((c) => !appliedJobIds.has(c.id));

  /* Score : freshness + locality + connections. */
  const now = Date.now();
  const scored = filtered.map((c) => {
    const ageHours = (now - new Date(c.created_at).getTime()) / 3600_000;
    const freshness = Math.pow(0.5, ageHours / 72);
    let score = freshness;
    let reason = "Publication récente";

    /* Locality match basique (city contains). */
    if (
      profile?.location &&
      c.location &&
      profile.location.toLowerCase().includes(c.location.toLowerCase().slice(0, 4))
    ) {
      score += 0.5;
      reason = `Près de ${profile.location}`;
    }

    /* Connection boost. */
    if (friendIds.has(c.poster_id)) {
      score += 1.0;
      reason = "Une de tes connexions y travaille";
    }

    return { job: c, score, reason };
  });

  scored.sort((a, b) => b.score - a.score);

  return NextResponse.json({ items: scored.slice(0, limit) });
}
