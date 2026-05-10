/* Types partagés pour le campaign builder pro. */

export type WizardStepId =
  | "objective"
  | "audience"
  | "budget"
  | "creative"
  | "review";

/* === Audience Builder riche (V4) === */

export type CustomLocation = {
  lat: number;
  lng: number;
  radius_km: number;
  name?: string;
};

export type CityRef = {
  name: string;
  country: string;
  radius_km?: number;
};

export type BehaviorEntry = {
  type:
    | "marketplace_buyer"
    | "job_seeker"
    | "circle_member"
    | "mentor"
    | "early_adopter";
  detail?: string;
};

export type AudienceConnections = {
  friends_of_engagers?: string;
  exclude_fans?: string;
};

export type LookalikeDraft = {
  source_audience_id: string;
  countries: string[];
  size_pct: number; // 1-10
};

export type CampaignFormState = {
  /* Étape 1 — Objectif. */
  objective: string;
  ad_category_hint: string;

  /* Étape 2 — Audience. */
  name: string;
  special_ad_category: string;
  /* Démographie. */
  age_min: number;
  age_max: number;
  genders: string[];
  /* Géo. */
  countries: string[];
  regions: string[];
  cities: CityRef[];
  postal_codes: string[];
  custom_locations: CustomLocation[];
  location_types: ("home" | "recent" | "travel_in")[];
  excluded_locations: string[];
  /* Langues + intérêts. */
  languages: string[];
  interests: string; // CSV — format historique
  interests_logic: "or" | "and";
  /* Comportements + connections. */
  behaviors: BehaviorEntry[];
  connections: AudienceConnections;
  /* Custom audiences + lookalikes. */
  custom_audience_ids: string[];
  excluded_custom_audience_ids: string[];
  lookalike_audience_ids: string[];
  lookalike_draft: LookalikeDraft | null;

  /* Étape 3 — Budget + placements + opti. */
  daily_budget: string;
  budget_type: "daily" | "lifetime";
  lifetime_budget: string;
  placements: string[];
  bid_strategy: string;
  optimization_goal: string;
  billing_event: string;
  frequency_max: string;
  frequency_period_days: string;
  start_date: string;
  end_date: string;

  /* Étape 4 — Creative. */
  creative_type: string;
  primary_text: string;
  headline: string;
  description: string;
  media_url: string;
  destination_url: string;
  call_to_action: string;
  advertiser_entity_id: string;
};

export const DEFAULT_FORM: CampaignFormState = {
  objective: "traffic",
  ad_category_hint: "",
  name: "",
  special_ad_category: "",
  age_min: 18,
  age_max: 65,
  genders: ["all"],
  countries: ["FR"],
  regions: [],
  cities: [],
  postal_codes: [],
  custom_locations: [],
  location_types: ["home"],
  excluded_locations: [],
  languages: [],
  interests: "",
  interests_logic: "or",
  behaviors: [],
  connections: {},
  custom_audience_ids: [],
  excluded_custom_audience_ids: [],
  lookalike_audience_ids: [],
  lookalike_draft: null,
  daily_budget: "20",
  budget_type: "daily",
  lifetime_budget: "500",
  placements: ["feed_home", "marketplace_feed"],
  bid_strategy: "lowest_cost",
  optimization_goal: "link_clicks",
  billing_event: "clicks",
  frequency_max: "3",
  frequency_period_days: "7",
  start_date: "",
  end_date: "",
  creative_type: "single_image",
  primary_text: "",
  headline: "",
  description: "",
  media_url: "",
  destination_url: "",
  call_to_action: "learn_more",
  advertiser_entity_id: "",
};

export type Entity = {
  id: string;
  name: string;
  type: string;
  url: string | null;
};
