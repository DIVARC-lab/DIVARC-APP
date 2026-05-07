"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import {
  flattenZodErrors,
  profileFormSchema,
  type FieldErrors,
  type ProfileFormInput,
} from "@/lib/validations/profile";

export type ProfileFormState = {
  status: "idle" | "success" | "error";
  message?: string;
  fieldErrors?: FieldErrors<ProfileFormInput>;
};

const IDLE: ProfileFormState = { status: "idle" };

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

export async function getInitialProfileFormState(): Promise<ProfileFormState> {
  return IDLE;
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
