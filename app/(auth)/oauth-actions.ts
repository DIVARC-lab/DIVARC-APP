"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

type Provider = "google" | "apple" | "facebook" | "github";

const ALLOWED: Provider[] = ["google", "apple", "facebook", "github"];

export async function signInWithProvider(formData: FormData): Promise<void> {
  const raw = String(formData.get("provider") ?? "");
  const next = String(formData.get("next") ?? "/dashboard");
  if (!ALLOWED.includes(raw as Provider)) {
    redirect("/login?error=provider_invalid");
  }
  const provider = raw as Provider;

  const headersList = await headers();
  const origin =
    headersList.get("origin") ??
    `https://${headersList.get("host") ?? "divarc.fr"}`;

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider,
    options: {
      redirectTo: `${origin}/auth/callback?next=${encodeURIComponent(next)}`,
    },
  });

  if (error || !data?.url) {
    redirect(`/login?error=oauth_failed&provider=${provider}`);
  }

  redirect(data.url);
}
