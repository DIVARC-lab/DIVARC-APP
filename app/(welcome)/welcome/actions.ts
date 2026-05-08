"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import {
  flattenZodErrors,
  preferencesFormSchema,
  profileFormSchema,
  type FieldErrors,
  type ProfileFormInput,
} from "@/lib/validations/profile";

export type IdentityStepState = {
  status: "idle" | "success" | "error";
  message?: string;
  fieldErrors?: FieldErrors<ProfileFormInput>;
};

export async function saveIdentityStep(
  _prev: IdentityStepState | undefined,
  formData: FormData,
): Promise<IdentityStepState> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { status: "error", message: "Non authentifié." };

  const parsed = profileFormSchema.safeParse({
    username: formData.get("username"),
    fullName: formData.get("fullName"),
    bio: formData.get("bio"),
    location: formData.get("location"),
  });

  if (!parsed.success) {
    return {
      status: "error",
      message: "Vérifie les champs.",
      fieldErrors: flattenZodErrors(parsed.error),
    };
  }

  // Username uniqueness
  const { data: existing } = await supabase
    .from("profiles")
    .select("id")
    .eq("username", parsed.data.username)
    .neq("id", user.id)
    .maybeSingle();

  if (existing) {
    return {
      status: "error",
      fieldErrors: { username: "Ce pseudo est déjà pris." },
    };
  }

  const { error } = await supabase
    .from("profiles")
    .update({
      username: parsed.data.username,
      full_name: parsed.data.fullName,
      bio: parsed.data.bio,
      location: parsed.data.location,
    })
    .eq("id", user.id);

  if (error) {
    return { status: "error", message: "Impossible d'enregistrer." };
  }

  return { status: "success" };
}

export type PreferencesStepState = {
  status: "idle" | "success" | "error";
  message?: string;
};

export async function savePreferencesStep(
  _prev: PreferencesStepState | undefined,
  formData: FormData,
): Promise<PreferencesStepState> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { status: "error", message: "Non authentifié." };

  const parsed = preferencesFormSchema.safeParse({
    locale: formData.get("locale"),
    currency: formData.get("currency"),
    theme: formData.get("theme") ?? "system",
    email_notifications: formData.get("email_notifications") === "on",
    push_notifications: formData.get("push_notifications") === "on",
    discoverable: formData.get("discoverable") === "on",
    show_email: formData.get("show_email") === "on",
    show_location: formData.get("show_location") === "on",
  });

  if (!parsed.success) {
    return { status: "error", message: "Vérifie les champs." };
  }

  const { error } = await supabase
    .from("profiles")
    .update(parsed.data)
    .eq("id", user.id);

  if (error) {
    return { status: "error", message: "Impossible d'enregistrer." };
  }

  return { status: "success" };
}

export type InterestsStepState = {
  status: "idle" | "success" | "error";
  message?: string;
};

/* List source-of-truth pour les options et leur emoji. La validation
   ci-dessous filtre les inputs sur ce set. */
export const INTEREST_SLUGS = [
  "bons-plans",
  "jardinage",
  "velo",
  "cuisine",
  "tech",
  "musique",
  "sport",
  "art",
  "famille",
  "animaux",
  "lecture",
  "cinema",
  "voyage",
  "mode",
  "photo",
  "ecolo",
] as const;

export async function saveInterestsStep(
  _prev: InterestsStepState | undefined,
  formData: FormData,
): Promise<InterestsStepState> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { status: "error", message: "Non authentifié." };

  const raw = formData.getAll("interests").map(String);
  const allowed = new Set<string>(INTEREST_SLUGS);
  const interests = Array.from(new Set(raw)).filter((s) => allowed.has(s));

  /* Le step est "passable" — on accepte 0 intérêt. La règle "min 3"
     du handoff reste un nudge UX (côté client) pas une contrainte
     bloquante côté serveur. */

  const { error } = await supabase
    .from("profiles")
    .update({ interests })
    .eq("id", user.id);

  if (error) return { status: "error", message: error.message };

  revalidatePath("/welcome");
  return { status: "success" };
}

export async function completeOnboarding() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  await supabase
    .from("profiles")
    .update({ onboarded_at: new Date().toISOString() })
    .eq("id", user.id);

  revalidatePath("/welcome");
  revalidatePath("/dashboard");
  redirect("/dashboard");
}
