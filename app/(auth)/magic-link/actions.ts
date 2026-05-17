"use server";

import { headers } from "next/headers";
import { createClient } from "@/lib/supabase/server";

export type MagicLinkState =
  | { status: "idle" }
  | { status: "sent"; email: string }
  | { status: "error"; message: string };

export async function sendMagicLink(
  _state: MagicLinkState,
  formData: FormData,
): Promise<MagicLinkState> {
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  if (!email || !email.includes("@")) {
    return { status: "error", message: "Email invalide." };
  }

  const headersList = await headers();
  const origin =
    headersList.get("origin") ??
    `https://${headersList.get("host") ?? "divarc.fr"}`;

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithOtp({
    email,
    options: {
      emailRedirectTo: `${origin}/auth/callback`,
      /* false = ne pas créer de compte si inexistant ; on veut juste
         le login. Pour pré-inscription, l'utilisateur passe par /signup. */
      shouldCreateUser: false,
    },
  });

  if (error) {
    /* On évite de leaker si l'email existe ou non — message générique. */
    if (/signups not allowed/i.test(error.message) || /user not found/i.test(error.message)) {
      return { status: "sent", email };
    }
    return { status: "error", message: error.message };
  }

  return { status: "sent", email };
}
