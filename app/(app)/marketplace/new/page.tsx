import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getCurrentProfile } from "@/lib/queries/profile";
import { CreateListingWizard } from "./CreateListingWizard";

export const metadata = {
  title: "Nouvelle annonce",
};

export default async function NewListingPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const profile = await getCurrentProfile();

  return (
    <div className="bg-bg-soft min-h-[calc(100dvh-56px)]">
      <div className="max-w-2xl mx-auto px-4 sm:px-8 py-6 sm:py-10">
        <header className="mb-6">
          <Link
            href="/marketplace"
            className="inline-flex items-center gap-2 text-[12px] text-night-dim hover:text-night mb-3"
          >
            <ArrowLeft className="w-3.5 h-3.5" aria-hidden />
            Retour à la marketplace
          </Link>
          <span className="text-[11px] font-extrabold uppercase tracking-[0.18em] text-gold-deep">
            · Nouvelle annonce
          </span>
          <h1 className="mt-1 font-display text-[28px] sm:text-[42px] text-night text-balance leading-[1.05]">
            Vends en{" "}
            <em className="italic bg-gradient-to-br from-gold to-gold-deep bg-clip-text text-transparent">
              quelques étapes
            </em>
            .
          </h1>
        </header>

        <CreateListingWizard
          userId={user.id}
          defaultLocation={profile?.location ?? null}
          defaultCurrency={profile?.currency ?? "EUR"}
        />
      </div>
    </div>
  );
}
