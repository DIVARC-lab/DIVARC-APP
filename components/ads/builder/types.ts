/* Types partagés pour le campaign builder pro. */

export type WizardStepId =
  | "objective"
  | "audience"
  | "budget"
  | "creative"
  | "review";

export type CampaignFormState = {
  /* Étape 1 — Objectif. */
  objective: string;
  ad_category_hint: string;

  /* Étape 2 — Audience. */
  name: string;
  special_ad_category: string;
  age_min: number;
  age_max: number;
  genders: string[];
  countries: string[];
  interests: string;

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
  interests: "",
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
