/* Helpers cover photo — client-safe (PAS server-only, pour importer
 * depuis les composants client comme CoverUpload). */

import type {
  ProfileCoverGradient,
  ProfileSocialLink,
} from "@/lib/database.types";

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
  return { type: "gradient", css: COVER_GRADIENTS.navy_gold };
}

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
