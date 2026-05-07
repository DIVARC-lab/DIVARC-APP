"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export async function signIn(_state: unknown, formData: FormData) {
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");

  if (!email || !password) {
    return { error: "Email et mot de passe requis." };
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) {
    return { error: traduireErreur(error.message) };
  }

  redirect("/dashboard");
}

function traduireErreur(message: string) {
  if (/invalid login credentials/i.test(message)) {
    return "Email ou mot de passe incorrect.";
  }
  if (/email not confirmed/i.test(message)) {
    return "Confirme ton email avant de te connecter.";
  }
  return message;
}
