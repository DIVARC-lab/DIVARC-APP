/* Types Trust & Safety / Ads — migration 0048_ads_foundation.sql.
 *
 * Source unique de vérité côté code. Pour l'intégration au Supabase
 * client (`Database['public']['Tables']['...']`), voir l'extension de
 * lib/database.types.ts qui exporte les Row/Insert/Update standards.
 */

export type AdAccountRole = "admin" | "editor" | "analyst" | "finance";

export type CampaignObjective =
  | "brand_awareness"
  | "reach"
  | "traffic"
  | "engagement"
  | "app_installs"
  | "video_views"
  | "lead_generation"
  | "messages"
  | "event_responses"
  | "conversions"
  | "catalog_sales"
  | "store_traffic"
  | "marketplace_listing_boost"
  | "job_applications"
  | "circle_growth";

export type CampaignStatus =
  | "draft"
  | "pending_review"
  | "active"
  | "paused"
  | "completed"
  | "rejected";

export type ComplianceStatus =
  | "pending"
  | "approved"
  | "rejected"
  | "holding";

export type SpecialAdCategory = "housing" | "employment" | "credit" | "social";

export type BidStrategy =
  | "lowest_cost"
  | "cost_cap"
  | "bid_cap"
  | "target_cost";

export type OptimizationGoal =
  | "impressions"
  | "reach"
  | "link_clicks"
  | "landing_page_views"
  | "post_engagement"
  | "video_views_3s"
  | "video_views_15s"
  | "thruplay"
  | "lead_generation"
  | "conversions"
  | "app_installs"
  | "messages_initiated";

export type BillingEvent =
  | "impressions"
  | "clicks"
  | "video_views"
  | "app_installs"
  | "conversions";

export type AdPlacement =
  | "feed_home"
  | "feed_discover"
  | "reels"
  | "stories"
  | "story_interstitial"
  | "search_results"
  | "marketplace_feed"
  | "marketplace_listing_boost"
  | "jobs_feed"
  | "profile_right_rail"
  | "messages_inbox";

export type CreativeType =
  | "single_image"
  | "single_video"
  | "carousel"
  | "collection"
  | "instant_experience";

export type CallToActionType =
  | "learn_more"
  | "shop_now"
  | "sign_up"
  | "subscribe"
  | "download"
  | "contact_us"
  | "book_now"
  | "apply_now"
  | "get_quote"
  | "get_offer"
  | "send_message";

export type AdReviewStatus =
  | "pending"
  | "auto_approved"
  | "approved"
  | "rejected"
  | "limited"
  | "re_review";

export type AudienceType =
  | "saved"
  | "custom_list"
  | "custom_pixel"
  | "custom_engagement"
  | "lookalike"
  | "divarc_special";

/* Spec de targeting — sérialisée en JSONB côté DB. */
export type TargetingSpec = {
  geo: GeoTargeting;
  age_min: number; // ≥ 18 obligatoire (DSA art. 28)
  age_max: number;
  genders: ("all" | "male" | "female" | "non_binary")[];
  languages?: string[];
  /* Centres d'intérêt depuis taxonomie DIVARC topic_affinity. */
  interests?: InterestTarget[];
  interests_logic?: "or" | "and";
  /* Comportements déduits du recsys (achat marketplace, etc.). */
  behaviors?: BehaviorTarget[];
  /* Connections (amis des fans, exclus fans, etc.). */
  connections?: ConnectionTarget;
  /* Audiences personnalisées + exclusions. */
  custom_audience_ids?: string[];
  excluded_custom_audience_ids?: string[];
  lookalike_audience_ids?: string[];
};

export type GeoTargeting = {
  countries: string[]; // ISO 3166-1
  regions?: string[];
  cities?: CityTarget[];
  postal_codes?: string[];
  custom_locations?: CustomLocationTarget[]; // lat/lng + radius
  location_types?: ("home" | "recent" | "travel_in")[];
  excluded_locations?: string[];
};

export type CityTarget = {
  name: string;
  country: string;
  radius_km?: number;
};

export type CustomLocationTarget = {
  lat: number;
  lng: number;
  radius_km: number;
  name?: string;
};

export type InterestTarget = {
  topic_id: string; // ex: "tech.web_dev"
  affinity_threshold?: number; // 0-1, default 0.5
};

export type BehaviorTarget = {
  type: "marketplace_buyer" | "job_seeker" | "circle_member" | "mentor" | "early_adopter";
  detail?: string; // ex: catégorie marketplace
};

export type ConnectionTarget = {
  /* Friends d'utilisateurs ayant interagi avec entity X. */
  friends_of_engagers?: string; // entity_id
  /* Exclus les fans actuels (pour acquisition). */
  exclude_fans?: string;
};

/* Frequency cap. */
export type FrequencyCap = {
  max_impressions: number;
  period_days: number;
};

/* Dayparting : jours × tranches horaires. */
export type DayparTimeSlot = string; // "09-18"
export type DaypartSchedule = {
  mon?: DayparTimeSlot[];
  tue?: DayparTimeSlot[];
  wed?: DayparTimeSlot[];
  thu?: DayparTimeSlot[];
  fri?: DayparTimeSlot[];
  sat?: DayparTimeSlot[];
  sun?: DayparTimeSlot[];
};

/* Ad creative carousel card. */
export type CarouselCard = {
  media_url: string;
  headline: string;
  description?: string;
  destination_url: string;
};

/* ============================================================
 * Catégories sensibles RGPD art. 9 — interdites pour le ciblage.
 * ============================================================ */
export const FORBIDDEN_TARGETING_TOPIC_PREFIXES = [
  "health.",
  "religion.",
  "politics.party_",
  "sexuality.",
  "ethnicity.",
  "union.",
] as const;

/* ============================================================
 * Catégories d'ads — interdites / age-gated / cert-required.
 * ============================================================ */
export const ALWAYS_FORBIDDEN_AD_CATEGORIES = [
  "tabac_cigarettes",
  "drogues_illegales",
  "prostitution_escort",
  "armes_a_feu_civils",
  "cryptomonnaies_speculatives_non_regulees",
  "paris_sportifs_non_anj",
  "medicaments_prescription",
  "chirurgie_esthetique_non_regulee",
  "amaigrissement_promesses_miracles",
] as const;

export const AGE_GATED_18PLUS_CATEGORIES = [
  "alcool",
  "paris_sportifs_anj",
  "rencontres_adultes",
] as const;

export const REQUIRES_CERTIFICATION_CATEGORIES = [
  "finance_credit", // ORIAS / ACPR
  "assurance",
  "immobilier", // carte T
  "sante_para_medical",
  "juridique", // barreau
] as const;

/* Disclaimers automatiques par catégorie. */
export const CATEGORY_DISCLAIMERS: Record<string, string> = {
  alcool:
    "L'abus d'alcool est dangereux pour la santé. À consommer avec modération.",
  finance_credit:
    "Un crédit vous engage et doit être remboursé. Vérifiez vos capacités de remboursement avant de vous engager.",
  medicaments:
    "Ceci est un médicament. Lisez attentivement la notice. En cas de doute, demandez conseil à votre pharmacien.",
  paris_sportifs_anj:
    "Jouer comporte des risques : endettement, dépendance, isolement. Pour vous aider, appelez le 09 74 75 13 13 (appel non surtaxé).",
  investissement:
    "Les performances passées ne préjugent pas des performances futures. Tout investissement comporte un risque de perte en capital.",
  assurance:
    "Document à caractère publicitaire. Avant tout engagement, prenez connaissance des conditions générales.",
  immobilier:
    "Document non contractuel. Consultez les conditions auprès du professionnel.",
};

/* ============================================================
 * Estimation d'audience — k-anonymity ≥ 100.
 * ============================================================ */
export type AudienceEstimate = {
  /* Range plutôt que valeur exacte (anti-fingerprinting). */
  size_range: string; // "10K-50K"
  /* Définition : trop large / parfait / trop spécifique. */
  definition: "too_broad" | "good" | "too_specific";
  /* Daily impressions estimées selon budget. */
  estimated_daily_impressions?: { min: number; max: number };
  estimated_daily_reach?: { min: number; max: number };
  /* Si ciblage trop restrictif (< 100 users), on ne renvoie pas le size. */
  too_specific?: boolean;
};

/* ============================================================
 * Validation targeting — DSA art. 28 + RGPD art. 9.
 * ============================================================ */
export type ValidationResult = {
  valid: boolean;
  errors: string[];
  warnings: string[];
};

export function validateTargetingSpec(
  targeting: TargetingSpec,
  specialCategory?: SpecialAdCategory | null,
): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  /* DSA art. 28 — pas de ciblage des mineurs. */
  if (targeting.age_min < 18) {
    errors.push("L'âge minimum est 18 ans (DSA art. 28).");
  }
  if (targeting.age_max < targeting.age_min) {
    errors.push("L'âge maximum doit être supérieur à l'âge minimum.");
  }

  /* RGPD art. 9 — pas de ciblage sur catégories sensibles. */
  for (const interest of targeting.interests ?? []) {
    if (
      FORBIDDEN_TARGETING_TOPIC_PREFIXES.some((p) =>
        interest.topic_id.startsWith(p),
      )
    ) {
      errors.push(
        `Ciblage interdit sur catégorie sensible : ${interest.topic_id} (RGPD art. 9).`,
      );
    }
  }

  /* Special ad categories anti-discrimination. */
  if (
    specialCategory &&
    ["housing", "employment", "credit"].includes(specialCategory)
  ) {
    if (targeting.age_min !== 18 || targeting.age_max < 65) {
      errors.push(
        `Ciblage par âge restreint pour la catégorie ${specialCategory} (anti-discrimination).`,
      );
    }
    if (
      targeting.genders.length > 0 &&
      !targeting.genders.includes("all")
    ) {
      errors.push(
        `Ciblage par genre interdit pour la catégorie ${specialCategory}.`,
      );
    }
    if (
      targeting.geo.postal_codes &&
      targeting.geo.postal_codes.length > 0
    ) {
      errors.push(
        `Ciblage par code postal interdit pour la catégorie ${specialCategory}.`,
      );
    }
  }

  /* Validation géo : pas plus de 50 cibles de localisation. */
  const totalLocations =
    (targeting.geo.cities?.length ?? 0) +
    (targeting.geo.postal_codes?.length ?? 0) +
    (targeting.geo.custom_locations?.length ?? 0);
  if (totalLocations > 50) {
    warnings.push(
      "Plus de 50 cibles de localisation : performance dégradée probable.",
    );
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
  };
}
