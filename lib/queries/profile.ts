import "server-only";
import { createClient } from "@/lib/supabase/server";
import type { Profile } from "@/lib/database.types";

const PROFILE_DEFAULTS: Omit<
  Profile,
  | "id"
  | "username"
  | "full_name"
  | "avatar_url"
  | "bio"
  | "location"
  | "founder_rank"
  | "onboarded_at"
  | "created_at"
  | "updated_at"
  | "last_seen_at"
  | "headline"
  | "intro_video_url"
  | "intro_video_thumbnail_url"
  | "intro_video_duration_ms"
  | "intro_video_uploaded_at"
  /* Trust & Safety (migration 0047) — defaults gérés côté DB. */
  | "email_verified_at"
  | "phone_verified_at"
  | "phone_number"
  | "identity_verified_at"
  | "identity_verification_provider"
  | "warnings_count"
  | "content_removed_count"
  | "timeouts_received"
  | "trust_score"
  | "trust_score_updated_at"
  /* Profil v2 (migration 0063) — defaults gérés côté DB. */
  | "pronouns"
  | "cover_photo_url"
  | "cover_gradient"
  | "website"
  | "sections_order"
  /* Stripe Connect (migration 0087) — defaults gérés côté DB. */
  | "stripe_connect_account_id"
  | "stripe_connect_status"
  | "stripe_charges_enabled"
  | "stripe_payouts_enabled"
  | "stripe_details_submitted"
  | "stripe_connect_updated_at"
> = {
  locale: "fr-FR",
  currency: "EUR",
  theme: "system",
  email_notifications: true,
  push_notifications: true,
  discoverable: true,
  show_email: false,
  show_location: true,
  presence_status: "offline",
  custom_status: "available",
  presence_visibility: "everyone",
  open_to_work: false,
  open_to_hiring: false,
  discrete_search: false,
  interests: [],
  social_links: [],
  sections_visibility: {},
  profile_completion_score: 0,
  facets: ["particulier"],
  primary_facet: "particulier",
  followers_count: 0,
  following_count: 0,
  scheduled_deletion_at: null,
  deletion_requested_at: null,
};

export async function getCurrentProfile(): Promise<Profile | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  const { data, error } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .maybeSingle();

  if (error) {
    console.error("[divarc:getCurrentProfile]", error);
    return null;
  }

  if (!data) return null;

  // Defensive: tolerate missing columns from older migration state.
  return {
    id: (data as { id: string }).id,
    username: (data as { username: string | null }).username ?? null,
    full_name: (data as { full_name: string | null }).full_name ?? null,
    avatar_url: (data as { avatar_url: string | null }).avatar_url ?? null,
    bio: (data as { bio: string | null }).bio ?? null,
    location: (data as { location: string | null }).location ?? null,
    locale:
      (data as { locale?: Profile["locale"] }).locale ?? PROFILE_DEFAULTS.locale,
    currency:
      (data as { currency?: Profile["currency"] }).currency ??
      PROFILE_DEFAULTS.currency,
    theme:
      (data as { theme?: Profile["theme"] }).theme ?? PROFILE_DEFAULTS.theme,
    email_notifications:
      (data as { email_notifications?: boolean }).email_notifications ??
      PROFILE_DEFAULTS.email_notifications,
    push_notifications:
      (data as { push_notifications?: boolean }).push_notifications ??
      PROFILE_DEFAULTS.push_notifications,
    discoverable:
      (data as { discoverable?: boolean }).discoverable ??
      PROFILE_DEFAULTS.discoverable,
    show_email:
      (data as { show_email?: boolean }).show_email ??
      PROFILE_DEFAULTS.show_email,
    show_location:
      (data as { show_location?: boolean }).show_location ??
      PROFILE_DEFAULTS.show_location,
    founder_rank:
      (data as { founder_rank?: number | null }).founder_rank ?? null,
    onboarded_at:
      (data as { onboarded_at?: string | null }).onboarded_at ?? null,
    presence_status:
      (data as { presence_status?: Profile["presence_status"] })
        .presence_status ?? PROFILE_DEFAULTS.presence_status,
    last_seen_at:
      (data as { last_seen_at?: string | null }).last_seen_at ?? null,
    custom_status:
      (data as { custom_status?: Profile["custom_status"] }).custom_status ??
      PROFILE_DEFAULTS.custom_status,
    presence_visibility:
      (data as { presence_visibility?: Profile["presence_visibility"] })
        .presence_visibility ?? PROFILE_DEFAULTS.presence_visibility,
    headline: (data as { headline?: string | null }).headline ?? null,
    open_to_work:
      (data as { open_to_work?: boolean }).open_to_work ??
      PROFILE_DEFAULTS.open_to_work,
    open_to_hiring:
      (data as { open_to_hiring?: boolean }).open_to_hiring ??
      PROFILE_DEFAULTS.open_to_hiring,
    discrete_search:
      (data as { discrete_search?: boolean }).discrete_search ??
      PROFILE_DEFAULTS.discrete_search,
    intro_video_url:
      (data as { intro_video_url?: string | null }).intro_video_url ?? null,
    intro_video_thumbnail_url:
      (data as { intro_video_thumbnail_url?: string | null })
        .intro_video_thumbnail_url ?? null,
    intro_video_duration_ms:
      (data as { intro_video_duration_ms?: number | null })
        .intro_video_duration_ms ?? null,
    intro_video_uploaded_at:
      (data as { intro_video_uploaded_at?: string | null })
        .intro_video_uploaded_at ?? null,
    interests:
      (data as { interests?: string[] | null }).interests ?? [],
    /* Profil v2 (migration 0063) — defaults tolérants si la migration
       n'est pas encore appliquée en prod. */
    pronouns: (data as { pronouns?: string | null }).pronouns ?? null,
    cover_photo_url:
      (data as { cover_photo_url?: string | null }).cover_photo_url ?? null,
    cover_gradient:
      (data as { cover_gradient?: Profile["cover_gradient"] | null })
        .cover_gradient ?? null,
    website: (data as { website?: string | null }).website ?? null,
    social_links:
      (data as { social_links?: Profile["social_links"] | null })
        .social_links ?? PROFILE_DEFAULTS.social_links,
    sections_order:
      (data as { sections_order?: string[] | null }).sections_order ?? null,
    sections_visibility:
      (data as { sections_visibility?: Profile["sections_visibility"] | null })
        .sections_visibility ?? PROFILE_DEFAULTS.sections_visibility,
    profile_completion_score:
      (data as { profile_completion_score?: number }).profile_completion_score ??
      PROFILE_DEFAULTS.profile_completion_score,
    facets:
      (data as { facets?: Profile["facets"] | null }).facets ??
      PROFILE_DEFAULTS.facets,
    primary_facet:
      (data as { primary_facet?: Profile["primary_facet"] }).primary_facet ??
      PROFILE_DEFAULTS.primary_facet,
    followers_count:
      (data as { followers_count?: number }).followers_count ??
      PROFILE_DEFAULTS.followers_count,
    following_count:
      (data as { following_count?: number }).following_count ??
      PROFILE_DEFAULTS.following_count,
    scheduled_deletion_at:
      (data as { scheduled_deletion_at?: string | null }).scheduled_deletion_at ??
      null,
    deletion_requested_at:
      (data as { deletion_requested_at?: string | null }).deletion_requested_at ??
      null,
    /* Trust & Safety (migration 0047) — defaults tolérants si la
       migration n'est pas encore appliquée en prod. */
    email_verified_at:
      (data as { email_verified_at?: string | null }).email_verified_at ?? null,
    phone_verified_at:
      (data as { phone_verified_at?: string | null }).phone_verified_at ?? null,
    phone_number:
      (data as { phone_number?: string | null }).phone_number ?? null,
    identity_verified_at:
      (data as { identity_verified_at?: string | null }).identity_verified_at ??
      null,
    identity_verification_provider:
      (data as { identity_verification_provider?: string | null })
        .identity_verification_provider ?? null,
    warnings_count:
      (data as { warnings_count?: number }).warnings_count ?? 0,
    content_removed_count:
      (data as { content_removed_count?: number }).content_removed_count ?? 0,
    timeouts_received:
      (data as { timeouts_received?: number }).timeouts_received ?? 0,
    trust_score: (data as { trust_score?: number }).trust_score ?? 50,
    trust_score_updated_at:
      (data as { trust_score_updated_at?: string | null })
        .trust_score_updated_at ?? null,
    /* Stripe Connect (migration 0087) — defaults tolérants. */
    stripe_connect_account_id:
      (data as { stripe_connect_account_id?: string | null })
        .stripe_connect_account_id ?? null,
    stripe_connect_status:
      (data as { stripe_connect_status?: Profile["stripe_connect_status"] })
        .stripe_connect_status ?? "not_started",
    stripe_charges_enabled:
      (data as { stripe_charges_enabled?: boolean }).stripe_charges_enabled ??
      false,
    stripe_payouts_enabled:
      (data as { stripe_payouts_enabled?: boolean }).stripe_payouts_enabled ??
      false,
    stripe_details_submitted:
      (data as { stripe_details_submitted?: boolean }).stripe_details_submitted ??
      false,
    stripe_connect_updated_at:
      (data as { stripe_connect_updated_at?: string | null })
        .stripe_connect_updated_at ?? null,
    created_at:
      (data as { created_at?: string }).created_at ?? new Date().toISOString(),
    updated_at:
      (data as { updated_at?: string }).updated_at ?? new Date().toISOString(),
  };
}

export async function isUsernameAvailable(
  username: string,
  excludeUserId: string,
): Promise<boolean> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("profiles")
    .select("id")
    .eq("username", username.toLowerCase())
    .neq("id", excludeUserId)
    .maybeSingle();

  if (error) return false;
  return data === null;
}
