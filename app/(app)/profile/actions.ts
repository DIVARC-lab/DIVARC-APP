"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import {
  flattenZodErrors,
  preferencesFormSchema,
  profileFormSchema,
  type FieldErrors,
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
