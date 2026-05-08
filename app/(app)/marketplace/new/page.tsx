import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getCurrentProfile } from "@/lib/queries/profile";
import { ListingForm } from "./ListingForm";
import { KickerLabel } from "@/components/ui/KickerLabel";

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
    <div className="px-6 sm:px-10 py-10 max-w-3xl mx-auto w-full">
      <header className="mb-8">
        <Link
          href="/marketplace"
          className="inline-flex items-center gap-2 text-sm text-night-muted hover:text-night mb-4"
        >
          <ArrowLeft className="w-4 h-4" aria-hidden />
          Retour à la marketplace
        </Link>
        <KickerLabel>Nouvelle annonce</KickerLabel>
        <h1 className="mt-2 font-display text-4xl sm:text-5xl text-night text-balance leading-[1.05]">
          Vends quelque chose <em className="italic text-gold-deep">de bien</em>.
        </h1>
        <p className="mt-2 text-muted-strong">
          Quelques minutes pour publier ton annonce sur DIVARC.
        </p>
      </header>

      <ListingForm
        userId={user.id}
        defaultLocation={profile?.location ?? null}
        defaultCurrency={profile?.currency ?? "EUR"}
      />
    </div>
  );
}
