import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { listMyCompanies } from "@/lib/queries/companies";
import { getCurrentProfile } from "@/lib/queries/profile";
import { createClient } from "@/lib/supabase/server";
import { JobForm } from "./JobForm";
import { KickerLabel } from "@/components/ui/KickerLabel";
import { Container } from "@/components/primitives/Container";

export const metadata = {
  title: "Nouvelle offre",
};

type SearchParamsP = Promise<{ circle?: string }>;

export default async function NewJobPage({
  searchParams,
}: {
  searchParams: SearchParamsP;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const profile = await getCurrentProfile();
  const myCompanies = await listMyCompanies(user.id);
  const sp = await searchParams;

  /* Chantier 3.4 — si ?circle=<slug>, on récupère le cercle pour rattacher l'offre. */
  let circleContext: { id: string; name: string; slug: string } | null = null;
  if (sp.circle) {
    const { data: c } = await supabase
      .from("circles")
      .select("id, name, slug")
      .eq("slug", sp.circle)
      .maybeSingle();
    if (c) {
      const { data: m } = await supabase
        .from("circle_members")
        .select("user_id")
        .eq("circle_id", c.id)
        .eq("user_id", user.id)
        .maybeSingle();
      if (m) circleContext = c;
    }
  }

  return (
    <Container maxWidth="default" paddingX="page" paddingY="3xl">
      <header className="mb-8">
        <Link
          href={
            circleContext ? `/circles/${circleContext.slug}/jobs` : "/jobs"
          }
          className="inline-flex items-center gap-2 text-sm text-night-muted hover:text-night mb-4"
        >
          <ArrowLeft className="w-4 h-4" aria-hidden />
          {circleContext
            ? `Retour aux jobs de ${circleContext.name}`
            : "Retour aux offres"}
        </Link>
        <KickerLabel>
          Nouvelle offre
          {circleContext ? ` · pour ${circleContext.name}` : ""}
        </KickerLabel>
        <h1 className="mt-2 font-display text-4xl sm:text-5xl text-night text-balance leading-[1.05]">
          Recrute la <em className="italic text-gold-deep">bonne</em> personne.
        </h1>
        <p className="mt-2 text-muted-strong">
          {circleContext
            ? `Cette offre sera visible dans le job board du cercle ${circleContext.name}.`
            : "Précis, c'est efficace. Les candidats voient ton profil DIVARC."}
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
        circleId={circleContext?.id ?? null}
      />
    </Container>
  );
}
