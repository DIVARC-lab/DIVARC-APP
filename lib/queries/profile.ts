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
> = {
  locale: "fr-FR",
  currency: "EUR",
  theme: "system",
  email_notifications: true,
  push_notifications: true,
  discoverable: true,
  show_email: false,
  show_location: true,
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
