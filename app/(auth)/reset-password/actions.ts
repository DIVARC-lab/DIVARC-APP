"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

/* Sprint Auth — Update du mot de passe utilisateur après récup.
 *
 * L'user est déjà authentifié avec une session de récup (issue du
 * code échangé dans /auth/callback). On appelle juste updateUser avec
 * le nouveau password. */
export async function updatePassword(
  _state: unknown,
  formData: FormData,
) {
  const password = String(formData.get("password") ?? "");
  const confirm = String(formData.get("confirm") ?? "");

  if (password.length < 8) {
    return { error: "Le mot de passe doit contenir au moins 8 caractères." };
  }
  if (password !== confirm) {
    return { error: "Les mots de passe ne correspondent pas." };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return {
      error:
        "Lien expiré ou invalide. Demande un nouveau lien depuis /forgot-password.",
    };
  }

  const { error } = await supabase.auth.updateUser({ password });
  if (error) {
    return { error: error.message };
  }

  redirect("/login?password_reset=success");
}
