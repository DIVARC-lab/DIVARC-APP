import { redirect } from "next/navigation";
import { getCurrentProfile } from "@/lib/queries/profile";
import { createClient } from "@/lib/supabase/server";
import { WelcomeWizard } from "./WelcomeWizard";

export const metadata = {
  title: "Bienvenue",
};

export default async function WelcomePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const profile = await getCurrentProfile();
  if (!profile) redirect("/login");

  if (profile.onboarded_at) {
    redirect("/dashboard");
  }

  const fullName =
    profile.full_name ?? user.email?.split("@")[0] ?? "Fondateur";

  return (
    <WelcomeWizard
      profile={profile}
      fullName={fullName}
      founderRank={profile.founder_rank}
    />
  );
}
