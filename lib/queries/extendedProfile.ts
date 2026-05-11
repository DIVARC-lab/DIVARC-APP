import "server-only";
import { createClient } from "@/lib/supabase/server";
import type {
  Profile,
  ProfileFacet,
  ProfileSocialLink,
  ProfileCoverGradient,
  StoryHighlight,
  ProfileRecommendation,
  ProfileProject,
  ProfilePublication,
  ProfileVolunteer,
  ProfileAward,
  ProfileOpenToWork,
  UserBadge,
  CreatorStats,
  CreatorFeatured,
  CreatorCollaboration,
  CreatorMediaKit,
  EntrepreneurCompany,
  EntrepreneurInvestment,
  EntrepreneurFundraisingStatus,
} from "@/lib/database.types";

/* Profil étendu V2 — hydratation complète en 1 fetch parallèle.
 *
 * Récupère tous les sections nécessaires pour render le profil public
 * ou la vue propriétaire. Les sections sont chargées selon les facets
 * actives sur le profil (économie de queries pour les comptes simples).
 *
 * Note V1 : on n'applique pas encore sections_visibility filtering ici —
 * sera ajouté V12 avec helper canViewSection(viewer, owner, section). */

export type ExtendedProfileHeader = Pick<
  Profile,
  | "id"
  | "username"
  | "full_name"
  | "avatar_url"
  | "bio"
  | "location"
  | "founder_rank"
  | "show_email"
  | "show_location"
  | "discoverable"
  | "headline"
  | "open_to_work"
  | "open_to_hiring"
  | "intro_video_url"
  | "intro_video_thumbnail_url"
  | "intro_video_duration_ms"
  | "pronouns"
  | "cover_photo_url"
  | "cover_gradient"
  | "website"
  | "social_links"
  | "sections_order"
  | "sections_visibility"
  | "profile_completion_score"
  | "facets"
  | "primary_facet"
  | "followers_count"
  | "following_count"
  | "identity_verified_at"
  | "created_at"
>;

export type ExtendedProfilePackage = {
  profile: ExtendedProfileHeader;
  badges: UserBadge[];
  highlights: StoryHighlight[];
  recommendations_received: ProfileRecommendation[];
  open_to_work: ProfileOpenToWork | null;
  /* Sections facette PRO */
  projects: ProfileProject[];
  publications: ProfilePublication[];
  volunteer: ProfileVolunteer[];
  awards: ProfileAward[];
  /* Facette créateur */
  creator_stats: CreatorStats | null;
  creator_featured: CreatorFeatured[];
  creator_collaborations: CreatorCollaboration[];
  creator_media_kit: CreatorMediaKit | null;
  /* Facette entrepreneur */
  entrepreneur_companies: EntrepreneurCompany[];
  entrepreneur_investments: EntrepreneurInvestment[];
  fundraising_status: EntrepreneurFundraisingStatus | null;
};

const HEADER_COLUMNS =
  "id, username, full_name, avatar_url, bio, location, founder_rank, " +
  "show_email, show_location, discoverable, headline, open_to_work, open_to_hiring, " +
  "intro_video_url, intro_video_thumbnail_url, intro_video_duration_ms, " +
  "pronouns, cover_photo_url, cover_gradient, website, social_links, " +
  "sections_order, sections_visibility, profile_completion_score, " +
  "facets, primary_facet, followers_count, following_count, " +
  "identity_verified_at, created_at";

export async function getExtendedProfileByUsername(
  username: string,
): Promise<ExtendedProfilePackage | null> {
  const supabase = await createClient();

  /* 1. Fetch profil header */
  const { data: profile, error: pErr } = await supabase
    .from("profiles")
    .select(HEADER_COLUMNS)
    .eq("username", username.toLowerCase())
    .maybeSingle();

  if (pErr || !profile) return null;
  const header = profile as unknown as ExtendedProfileHeader;

  /* 2. Fetch toutes les sections en parallèle, conditionné aux facettes */
  const facets = (header.facets ?? []) as ProfileFacet[];
  const hasPro = facets.includes("professionnel");
  const hasCreator = facets.includes("createur");
  const hasEntrepreneur = facets.includes("entrepreneur");

  const [
    badgesRes,
    highlightsRes,
    recosRes,
    otwRes,
    projectsRes,
    publicationsRes,
    volunteerRes,
    awardsRes,
    creatorStatsRes,
    creatorFeaturedRes,
    creatorCollabsRes,
    creatorMediaKitRes,
    entrepCompaniesRes,
    entrepInvestmentsRes,
    fundraisingRes,
  ] = await Promise.all([
    supabase
      .from("user_badges")
      .select("*")
      .eq("user_id", header.id)
      .eq("is_visible", true)
      .order("awarded_at", { ascending: false }),
    supabase
      .from("story_highlights")
      .select("*")
      .eq("user_id", header.id)
      .order("sort_position", { ascending: true }),
    supabase
      .from("profile_recommendations")
      .select("*")
      .eq("to_user_id", header.id)
      .eq("is_visible", true)
      .order("given_at", { ascending: false })
      .limit(20),
    supabase
      .from("profile_open_to_work")
      .select("*")
      .eq("user_id", header.id)
      .maybeSingle(),
    hasPro
      ? supabase
          .from("profile_projects")
          .select("*")
          .eq("user_id", header.id)
          .order("sort_position", { ascending: true })
      : Promise.resolve({ data: [] }),
    hasPro
      ? supabase
          .from("profile_publications")
          .select("*")
          .eq("user_id", header.id)
          .order("sort_position", { ascending: true })
      : Promise.resolve({ data: [] }),
    hasPro
      ? supabase
          .from("profile_volunteer")
          .select("*")
          .eq("user_id", header.id)
          .order("sort_position", { ascending: true })
      : Promise.resolve({ data: [] }),
    hasPro
      ? supabase
          .from("profile_awards")
          .select("*")
          .eq("user_id", header.id)
          .order("sort_position", { ascending: true })
      : Promise.resolve({ data: [] }),
    hasCreator
      ? supabase
          .from("creator_stats")
          .select("*")
          .eq("user_id", header.id)
          .maybeSingle()
      : Promise.resolve({ data: null }),
    hasCreator
      ? supabase
          .from("creator_featured")
          .select("*")
          .eq("user_id", header.id)
          .order("sort_position", { ascending: true })
      : Promise.resolve({ data: [] }),
    hasCreator
      ? supabase
          .from("creator_collaborations")
          .select("*")
          .eq("user_id", header.id)
          .order("sort_position", { ascending: true })
      : Promise.resolve({ data: [] }),
    hasCreator
      ? supabase
          .from("creator_media_kit")
          .select("*")
          .eq("user_id", header.id)
          .maybeSingle()
      : Promise.resolve({ data: null }),
    hasEntrepreneur
      ? supabase
          .from("entrepreneur_companies")
          .select("*")
          .eq("user_id", header.id)
          .order("sort_position", { ascending: true })
      : Promise.resolve({ data: [] }),
    hasEntrepreneur
      ? supabase
          .from("entrepreneur_investments")
          .select("*")
          .eq("user_id", header.id)
          .order("sort_position", { ascending: true })
      : Promise.resolve({ data: [] }),
    hasEntrepreneur
      ? supabase
          .from("entrepreneur_fundraising_status")
          .select("*")
          .eq("user_id", header.id)
          .maybeSingle()
      : Promise.resolve({ data: null }),
  ]);

  return {
    profile: header,
    badges: (badgesRes.data ?? []) as UserBadge[],
    highlights: (highlightsRes.data ?? []) as StoryHighlight[],
    recommendations_received: (recosRes.data ?? []) as ProfileRecommendation[],
    open_to_work: (otwRes.data ?? null) as ProfileOpenToWork | null,
    projects: (projectsRes.data ?? []) as ProfileProject[],
    publications: (publicationsRes.data ?? []) as ProfilePublication[],
    volunteer: (volunteerRes.data ?? []) as ProfileVolunteer[],
    awards: (awardsRes.data ?? []) as ProfileAward[],
    creator_stats: (creatorStatsRes.data ?? null) as CreatorStats | null,
    creator_featured: (creatorFeaturedRes.data ?? []) as CreatorFeatured[],
    creator_collaborations: (creatorCollabsRes.data ?? []) as CreatorCollaboration[],
    creator_media_kit: (creatorMediaKitRes.data ?? null) as CreatorMediaKit | null,
    entrepreneur_companies: (entrepCompaniesRes.data ?? []) as EntrepreneurCompany[],
    entrepreneur_investments: (entrepInvestmentsRes.data ?? []) as EntrepreneurInvestment[],
    fundraising_status: (fundraisingRes.data ?? null) as EntrepreneurFundraisingStatus | null,
  };
}

/* Helper : récupère un Cover gradient par ID avec fallback. */
export const COVER_GRADIENTS: Record<ProfileCoverGradient, string> = {
  navy_gold: "linear-gradient(135deg, #0A1F44 0%, #F4B942 100%)",
  sunset: "linear-gradient(135deg, #F97316 0%, #DB2777 100%)",
  ocean: "linear-gradient(135deg, #0EA5E9 0%, #1E3A8A 100%)",
  forest: "linear-gradient(135deg, #166534 0%, #84CC16 100%)",
  rose: "linear-gradient(135deg, #F472B6 0%, #BE185D 100%)",
  aurora: "linear-gradient(135deg, #A855F7 0%, #06B6D4 50%, #84CC16 100%)",
  cream_navy: "linear-gradient(135deg, #FFF8EE 0%, #0A1F44 100%)",
  noir: "linear-gradient(135deg, #18181B 0%, #3F3F46 100%)",
  cyber: "linear-gradient(135deg, #FB7185 0%, #A855F7 50%, #06B6D4 100%)",
};

export function getCoverBackground(
  cover_photo_url: string | null,
  cover_gradient: ProfileCoverGradient | null,
): { type: "image"; url: string } | { type: "gradient"; css: string } {
  if (cover_photo_url) return { type: "image", url: cover_photo_url };
  if (cover_gradient && COVER_GRADIENTS[cover_gradient]) {
    return { type: "gradient", css: COVER_GRADIENTS[cover_gradient] };
  }
  /* Default : gradient navy_gold */
  return { type: "gradient", css: COVER_GRADIENTS.navy_gold };
}

/* Helper : icônes Lucide pour les types social_links. */
export function getSocialLinkIcon(kind: ProfileSocialLink["kind"]): string {
  const map: Record<ProfileSocialLink["kind"], string> = {
    instagram: "Instagram",
    twitter: "Twitter",
    linkedin: "Linkedin",
    github: "Github",
    youtube: "Youtube",
    tiktok: "Music2",
    behance: "Palette",
    dribbble: "Dribbble",
    mastodon: "AtSign",
    bluesky: "Cloud",
    custom: "Link",
  };
  return map[kind] ?? "Link";
}
