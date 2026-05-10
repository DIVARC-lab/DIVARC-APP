import "server-only";
import { createAdminClient } from "@/lib/supabase/server";
import type { TargetingSpec, AudienceEstimate } from "./types";

/* Estimateur d'audience avec k-anonymity ≥ 100.
 *
 * Calcule une estimation de la taille de l'audience selon une spec de
 * targeting, à partir des données users DIVARC :
 *   - profiles.location, profile.created_at (ancienneté)
 *   - user_interest_profiles.topic_affinity (recsys)
 *   - posts/interactions récents (signal d'activité)
 *
 * Garde-fous :
 *   - Si l'estimation est < 100 users : retourne too_specific = true,
 *     pas de chiffre exposé (anti-fingerprinting + RGPD)
 *   - Le résultat est arrondi en range ("10K-50K") plutôt qu'en
 *     valeur exacte (transparence DSA art. 39 sur la library, mais
 *     aussi anti-leakage côté annonceur)
 *
 * Performance : la query agrège sur profiles via RLS bypass
 * (service_role). Pour V1 on fait du SQL simple ; pour V2 on
 * matérialisera une vue audience_buckets refresh 1h.
 */

export async function estimateAudience(
  targeting: TargetingSpec,
): Promise<AudienceEstimate> {
  const admin = createAdminClient();

  /* Step 1 : count users matching démographique (âge + pays via
     profile.location text matching simple). */
  let query = admin.from("profiles").select("id", { count: "exact", head: true });

  /* Country filter — on fait du LIKE simple sur profile.location V1.
     V2 : ajouter une colonne profile.country (ISO 3166-1) clean. */
  if (targeting.geo.countries.length > 0) {
    const countryNames: Record<string, string> = {
      FR: "France",
      BE: "Belgique",
      CH: "Suisse",
      CA: "Canada",
      LU: "Luxembourg",
      DE: "Allemagne",
      ES: "Espagne",
      IT: "Italie",
    };
    /* On filtre seulement si le targeting est un seul pays — sinon trop
       de combinaisons OR à matcher en text. La plupart des campagnes
       FR ciblent FR + DROM-COM. */
    const primary = targeting.geo.countries[0];
    const cn = countryNames[primary];
    if (cn) {
      query = query.ilike("location", `%${cn}%`);
    }
  }

  const { count: demoCount } = await query;
  const demographicCount = demoCount ?? 0;

  /* Step 2 : si pas d'intérêts ciblés, on retourne juste demographic. */
  if (!targeting.interests || targeting.interests.length === 0) {
    return formatEstimate(demographicCount);
  }

  /* Step 3 : intersection avec user_interest_profiles. On compte les
     users dont topic_affinity contient au moins un des intérêts cibles
     au-dessus du seuil (default 0.5). */
  const topicIds = targeting.interests.map((i) => i.topic_id);
  /* Limit topic_affinity scan à un sample raisonnable. Pour V1 :
     count des user_interest_profiles dont user_affinity[topic_id] > seuil
     pour AU MOINS un topic (logic OR). Postgres jsonb operator @? */
  const { data: profilesWithInterest } = await admin
    .from("user_interest_profiles")
    .select("user_id, topic_affinity")
    .limit(10000); // sample large

  let intersectCount = 0;
  for (const p of profilesWithInterest ?? []) {
    const topics = (p.topic_affinity ?? {}) as Record<string, number>;
    for (const it of targeting.interests) {
      const threshold = it.affinity_threshold ?? 0.5;
      if ((topics[it.topic_id] ?? 0) >= threshold) {
        intersectCount++;
        break;
      }
    }
  }

  /* Estimation finale = min(demographicCount, intersectCount * scaleFactor).
     scaleFactor : on a sample 10k profiles d'intérêts → on extrapole
     proportionnellement sur le total profiles. */
  const totalProfiles = await getTotalProfileCount();
  const sampleSize = (profilesWithInterest ?? []).length;
  const scaleFactor = sampleSize > 0 ? totalProfiles / sampleSize : 1;
  const extrapolatedInterest = Math.round(intersectCount * scaleFactor);
  const finalEstimate = Math.min(demographicCount, extrapolatedInterest);

  return formatEstimate(finalEstimate);
}

async function getTotalProfileCount(): Promise<number> {
  const admin = createAdminClient();
  const { count } = await admin
    .from("profiles")
    .select("id", { count: "exact", head: true });
  return count ?? 0;
}

/* Formate l'estimation en range public-safe + indicateur de définition. */
function formatEstimate(count: number): AudienceEstimate {
  /* k-anonymity : si < 100 users, on refuse de servir un chiffre. */
  if (count < 100) {
    return {
      size_range: "—",
      definition: "too_specific",
      too_specific: true,
    };
  }

  /* Bucket en ranges. */
  let range: string;
  let definition: AudienceEstimate["definition"];
  if (count < 1_000) {
    range = "100-1K";
    definition = "too_specific";
  } else if (count < 10_000) {
    range = `${Math.floor(count / 1_000)}K`;
    definition = "good";
  } else if (count < 100_000) {
    range = `${Math.floor(count / 10_000) * 10}K-${Math.ceil(count / 10_000) * 10}K`;
    definition = "good";
  } else if (count < 1_000_000) {
    range = `${Math.floor(count / 100_000) * 100}K-${Math.ceil(count / 100_000) * 100}K`;
    definition = "good";
  } else {
    range = `${(count / 1_000_000).toFixed(1)}M+`;
    definition = "too_broad";
  }

  /* Daily impressions estimées : ~3-5 imp/user/jour selon engagement. */
  const dailyImpMin = Math.round(count * 0.5);
  const dailyImpMax = Math.round(count * 3);

  return {
    size_range: range,
    definition,
    estimated_daily_impressions: { min: dailyImpMin, max: dailyImpMax },
    estimated_daily_reach: {
      min: Math.round(count * 0.3),
      max: Math.round(count * 0.7),
    },
  };
}
