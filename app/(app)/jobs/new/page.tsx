import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { listMyCompanies } from "@/lib/queries/companies";
import { getCurrentProfile } from "@/lib/queries/profile";
import { createClient } from "@/lib/supabase/server";
import { JobForm } from "./JobForm";
import { KickerLabel } from "@/components/ui/KickerLabel";

export const metadata = {
  title: "Nouvelle offre",
};

export default async function NewJobPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const profile = await getCurrentProfile();
  const myCompanies = await listMyCompanies(user.id);

  return (
    <div className="px-6 sm:px-10 py-10 max-w-3xl mx-auto w-full">
      <header className="mb-8">
        <Link
          href="/jobs"
          className="inline-flex items-center gap-2 text-sm text-night-muted hover:text-night mb-4"
        >
          <ArrowLeft className="w-4 h-4" aria-hidden />
          Retour aux offres
        </Link>
        <KickerLabel>Nouvelle offre</KickerLabel>
        <h1 className="mt-2 font-display text-4xl sm:text-5xl text-night text-balance leading-[1.05]">
          Recrute la <em className="italic text-gold-deep">bonne</em> personne.
        </h1>
        <p className="mt-2 text-muted-strong">
          Précis, c&apos;est efficace. Les candidats voient ton profil DIVARC.
        </p>
      </header>

      <JobForm
        defaultLocation={profile?.location ?? null}
        defaultCurrency={profile?.currency ?? "EUR"}
        myCompanies={myCompanies.map((c) => ({
          id: c.id,
          name: c.name,
          slug: c.slug,
        }))}
      />
    </div>
  );
}
