"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import {
  facetsUpdateSchema,
  flattenZodErrors,
  identityExtendedSchema,
  preferencesFormSchema,
  profileFormSchema,
  type FieldErrors,
  type IdentityExtendedInput,
  type PreferencesFormInput,
  type ProfileFormInput,
} from "@/lib/validations/profile";

export type ProfileFormState = {
  status: "idle" | "success" | "error";
  message?: string;
  fieldErrors?: FieldErrors<ProfileFormInput>;
};

export type PreferencesFormState = {
  status: "idle" | "success" | "error";
  message?: string;
  fieldErrors?: FieldErrors<PreferencesFormInput>;
};

export type PasswordFormState = {
  status: "idle" | "success" | "error";
  message?: string;
};

export async function updateProfile(
  _prev: ProfileFormState | undefined,
  formData: FormData,
): Promise<ProfileFormState> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return {
      status: "error",
      message: "Tu dois être connecté pour modifier ton profil.",
    };
  }

  const parsed = profileFormSchema.safeParse({
    username: formData.get("username"),
    fullName: formData.get("fullName"),
    bio: formData.get("bio"),
    location: formData.get("location"),
  });

  if (!parsed.success) {
    return {
      status: "error",
      message: "Vérifie les champs en rouge.",
      fieldErrors: flattenZodErrors(parsed.error),
    };
  }

  const { username, fullName, bio, location } = parsed.data;

  const { data: existing, error: lookupError } = await supabase
    .from("profiles")
    .select("id")
    .eq("username", username)
    .neq("id", user.id)
    .maybeSingle();

  if (lookupError) {
    return {
      status: "error",
      message: "Impossible de vérifier le pseudo. Réessaie dans un instant.",
    };
  }

  if (existing) {
    return {
      status: "error",
      fieldErrors: { username: "Ce pseudo est déjà pris." },
    };
  }

  const { error: updateError } = await supabase
    .from("profiles")
    .update({
      username,
      full_name: fullName,
      bio,
      location,
    })
    .eq("id", user.id);

  if (updateError) {
    return {
      status: "error",
      message: traduireErreurSupabase(updateError.message),
    };
  }

  revalidatePath("/profile");
  revalidatePath("/dashboard");

  return {
    status: "success",
    message: "Profil mis à jour.",
  };
}

export async function updatePreferences(
  _prev: PreferencesFormState | undefined,
  formData: FormData,
): Promise<PreferencesFormState> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { status: "error", message: "Tu dois être connecté." };
  }

  const parsed = preferencesFormSchema.safeParse({
    locale: formData.get("locale"),
    currency: formData.get("currency"),
    theme: formData.get("theme"),
    email_notifications: formData.get("email_notifications") === "on",
    push_notifications: formData.get("push_notifications") === "on",
    discoverable: formData.get("discoverable") === "on",
    show_email: formData.get("show_email") === "on",
    show_location: formData.get("show_location") === "on",
    custom_status: formData.get("custom_status"),
    presence_visibility: formData.get("presence_visibility"),
  });

  if (!parsed.success) {
    return {
      status: "error",
      message: "Vérifie les champs.",
      fieldErrors: flattenZodErrors(parsed.error),
    };
  }

  const { error } = await supabase
    .from("profiles")
    .update(parsed.data)
    .eq("id", user.id);

  if (error) {
    return {
      status: "error",
      message: "Impossible d'enregistrer tes préférences.",
    };
  }

  revalidatePath("/profile");
  return { status: "success", message: "Préférences enregistrées." };
}

export async function changePassword(
  _prev: PasswordFormState | undefined,
  formData: FormData,
): Promise<PasswordFormState> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { status: "error", message: "Tu dois être connecté." };
  }

  const newPassword = String(formData.get("newPassword") ?? "");
  if (newPassword.length < 8) {
    return {
      status: "error",
      message: "Le mot de passe doit contenir au moins 8 caractères.",
    };
  }

  const { error } = await supabase.auth.updateUser({ password: newPassword });
  if (error) {
    return { status: "error", message: error.message };
  }

  return { status: "success", message: "Mot de passe mis à jour." };
}

function traduireErreurSupabase(message: string): string {
  if (/duplicate key|unique/i.test(message)) {
    return "Ce pseudo est déjà pris.";
  }
  if (/constraint .* check/i.test(message)) {
    return "Format invalide. Vérifie tes informations.";
  }
  return "Une erreur est survenue. Réessaie dans un instant.";
}

// =====================================================
// Identité étendue (V0063 — pronouns/cover/website/social_links/headline)
// =====================================================
export type ExtendedIdentityState = {
  status: "idle" | "success" | "error";
  message?: string;
  fieldErrors?: FieldErrors<IdentityExtendedInput>;
};

/* Met à jour les champs étendus de l'identité. Acceptable depuis n'importe
 * quel formulaire qui POST des FormData JSON-serializées pour social_links. */
export async function updateExtendedIdentity(
  _prev: ExtendedIdentityState | undefined,
  formData: FormData,
): Promise<ExtendedIdentityState> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { status: "error", message: "Tu dois être connecté." };

  /* social_links est JSON-encoded dans FormData. */
  let socialLinks: unknown = [];
  const slRaw = formData.get("social_links");
  if (typeof slRaw === "string" && slRaw.length > 0) {
    try {
      socialLinks = JSON.parse(slRaw);
    } catch {
      socialLinks = [];
    }
  }

  const parsed = identityExtendedSchema.safeParse({
    pronouns: nullableString(formData.get("pronouns")),
    cover_photo_url: nullableString(formData.get("cover_photo_url")),
    cover_gradient: nullableString(formData.get("cover_gradient")),
    website: nullableString(formData.get("website")),
    headline: nullableString(formData.get("headline")),
    social_links: socialLinks,
  });

  if (!parsed.success) {
    return {
      status: "error",
      message: "Vérifie les champs en rouge.",
      fieldErrors: flattenZodErrors(parsed.error),
    };
  }

  const { error } = await supabase
    .from("profiles")
    .update({
      pronouns: parsed.data.pronouns ?? null,
      cover_photo_url: parsed.data.cover_photo_url ?? null,
      cover_gradient: parsed.data.cover_gradient ?? null,
      website: parsed.data.website ?? null,
      headline: parsed.data.headline ?? null,
      social_links: parsed.data.social_links,
    })
    .eq("id", user.id);

  if (error) {
    console.error("[updateExtendedIdentity]", error);
    return { status: "error", message: traduireErreurSupabase(error.message) };
  }

  revalidatePath("/profile");
  revalidatePath(`/u/${user.id}`);
  return { status: "success", message: "Identité étendue mise à jour." };
}

// =====================================================
// Facettes (V0063)
// =====================================================
export type FacetsState = {
  status: "idle" | "success" | "error";
  message?: string;
};

/* Active/désactive les facettes. 'particulier' reste obligatoire. */
export async function updateFacets(
  _prev: FacetsState | undefined,
  formData: FormData,
): Promise<FacetsState> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { status: "error", message: "Tu dois être connecté." };

  const facetsRaw = formData.getAll("facets").map(String);
  const primary = String(formData.get("primary_facet") ?? "");

  const parsed = facetsUpdateSchema.safeParse({
    facets: Array.from(new Set([...facetsRaw, "particulier"])),
    primary_facet: primary || "particulier",
  });

  if (!parsed.success) {
    return {
      status: "error",
      message:
        parsed.error.issues[0]?.message ?? "Sélection de facettes invalide.",
    };
  }

  const { error } = await supabase
    .from("profiles")
    .update({
      facets: parsed.data.facets,
      primary_facet: parsed.data.primary_facet,
    })
    .eq("id", user.id);

  if (error) {
    console.error("[updateFacets]", error);
    return { status: "error", message: "Impossible d'enregistrer les facettes." };
  }

  revalidatePath("/profile");
  revalidatePath(`/u/${user.id}`);
  return { status: "success", message: "Facettes mises à jour." };
}

// =====================================================
// Sections visibility (V0063 — sections_visibility jsonb)
// =====================================================
export type SectionsVisibilityState = {
  status: "idle" | "success" | "error";
  message?: string;
};

const ALLOWED_VISIBILITY = new Set([
  "public",
  "friends",
  "friends_of_friends",
  "private",
  "custom",
]);

const ALLOWED_SECTIONS = new Set([
  "about",
  "highlights",
  "photos",
  "posts",
  "experiences",
  "education",
  "skills",
  "languages",
  "certifications",
  "projects",
  "publications",
  "volunteer",
  "awards",
  "recommendations",
  "open_to_work",
  "marketplace",
  "mentor",
  "creator",
  "entrepreneur",
  "badges",
  "interests",
]);

/* Update visibility per section. Payload JSON dans formData "visibility". */
export async function updateSectionsVisibility(
  _prev: SectionsVisibilityState | undefined,
  formData: FormData,
): Promise<SectionsVisibilityState> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { status: "error", message: "Tu dois être connecté." };

  let payload: unknown = {};
  const raw = formData.get("visibility");
  if (typeof raw === "string" && raw.length > 0) {
    try {
      payload = JSON.parse(raw);
    } catch {
      return { status: "error", message: "Format JSON invalide." };
    }
  }

  if (typeof payload !== "object" || payload === null) {
    return { status: "error", message: "Payload invalide." };
  }

  /* Filter only known sections + visibility values. */
  const sanitized: Record<
    string,
    "public" | "friends" | "friends_of_friends" | "private" | "custom"
  > = {};
  for (const [section, vis] of Object.entries(payload as Record<string, unknown>)) {
    if (!ALLOWED_SECTIONS.has(section)) continue;
    if (typeof vis !== "string" || !ALLOWED_VISIBILITY.has(vis)) continue;
    sanitized[section] = vis as
      | "public"
      | "friends"
      | "friends_of_friends"
      | "private"
      | "custom";
  }

  const { error } = await supabase
    .from("profiles")
    .update({ sections_visibility: sanitized })
    .eq("id", user.id);

  if (error) {
    return { status: "error", message: "Impossible d'enregistrer la visibilité." };
  }

  revalidatePath("/profile");
  revalidatePath(`/u/${user.id}`);
  return { status: "success", message: "Visibilité mise à jour." };
}

// =====================================================
// Refresh completion score (RPC wrapper, non-bloquant)
// =====================================================
export async function refreshCompletionScore(): Promise<number | null> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("refresh_my_completion_score");
  if (error) {
    console.error("[refreshCompletionScore]", error);
    return null;
  }
  revalidatePath("/profile");
  return typeof data === "number" ? data : null;
}

// =====================================================
// Helpers internes
// =====================================================
function nullableString(value: FormDataEntryValue | null): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed.length === 0 ? null : trimmed;
}
