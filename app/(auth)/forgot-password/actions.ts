"use server";

import { headers } from "next/headers";
import { createClient } from "@/lib/supabase/server";

/* Sprint Auth — Envoi du lien de réinitialisation par email.
 *
 * Le lien généré par Supabase pointe vers /auth/callback?code=... avec
 * un param `next=/reset-password` pour rediriger l'user vers le form
 * "nouveau mot de passe" une fois la session récup créée. */
export async function requestPasswordReset(
  _state: unknown,
  formData: FormData,
) {
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  if (!email || !email.includes("@")) {
    return { error: "Saisis un email valide." };
  }

  const headersList = await headers();
  const origin =
    headersList.get("origin") ??
    `https://${headersList.get("host") ?? "divarc.app"}`;

  const supabase = await createClient();
  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${origin}/auth/callback?next=/reset-password`,
  });

  /* Pas de leak d'info : qu'on trouve l'email ou non, on affiche le même
     message côté UI (anti enumeration). Mais on log côté serveur pour
     debug. */
  if (error) {
    console.error("[requestPasswordReset]", error.message);
  }

  return { success: true as const };
}
