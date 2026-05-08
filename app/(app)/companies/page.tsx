import { Building2, Plus, Users2 } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Button } from "@/components/ui/Button";
import {
  listCompanies,
  listMyCompanies,
} from "@/lib/queries/companies";
import { createClient } from "@/lib/supabase/server";
import { KickerLabel } from "@/components/ui/KickerLabel";

export const metadata = {
  title: "Entreprises",
};

export default async function CompaniesPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const [companies, myCompanies] = await Promise.all([
    listCompanies({ limit: 60 }),
    listMyCompanies(user.id),
  ]);

  return (
    <div className="px-6 sm:px-10 py-10 max-w-6xl mx-auto w-full space-y-8">
      <header className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
        <div>
          <KickerLabel>Entreprises</KickerLabel>
          <h1 className="mt-2 font-display text-4xl sm:text-5xl text-night text-balance leading-[1.05]">
            Les recruteurs qui font <em className="italic text-gold-deep">DIVARC</em>.
          </h1>
          <p className="mt-2 text-muted-strong max-w-xl">
            Suis les entreprises qui te font envie. Tu seras notifié dès
            qu&apos;elles publient une offre.
          </p>
        </div>
        <Button asChild size="lg">
          <Link href="/companies/new">
            <Plus className="w-4 h-4" aria-hidden />
            Créer une page entreprise
          </Link>
        </Button>
      </header>

      {myCompanies.length > 0 ? (
        <section>
          <h2 className="font-display text-2xl text-night mb-4">
            Mes pages entreprise
          </h2>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {myCompanies.map((company) => (
              <CompanyCard key={company.id} company={company} owned />
            ))}
          </div>
        </section>
      ) : null}

      <section>
        <h2 className="font-display text-2xl text-night mb-4">
          Toutes les entreprises
        </h2>
        {companies.length === 0 ? (
          <div className="text-center py-16 px-6 rounded-3xl bg-white border border-line">
            <div
              aria-hidden
              className="w-20 h-20 mx-auto rounded-3xl bg-gradient-to-br from-cream via-bg to-gold/15 border border-gold/30 flex items-center justify-center mb-5 text-4xl leading-none"
            >
              🏢
            </div>
            <h3 className="font-display text-2xl text-night">
              Aucune entreprise pour l&apos;instant
            </h3>
            <p className="mt-2 text-muted max-w-sm mx-auto">
              Sois le premier à créer une page entreprise sur DIVARC.
            </p>
          </div>
        ) : (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {companies.map((company) => (
              <CompanyCard key={company.id} company={company} />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

function CompanyCard({
  company,
  owned,
}: {
  company: Awaited<ReturnType<typeof listCompanies>>[number];
  owned?: boolean;
}) {
  return (
    <Link
      href={`/companies/${company.slug}`}
      className="group p-5 rounded-3xl bg-white border border-line hover:border-night/30 hover:shadow-[0_30px_60px_-30px_rgba(10,31,68,0.25)] transition-all"
    >
      <div className="flex items-start gap-4">
        <div className="w-14 h-14 rounded-2xl bg-night/5 border border-line flex items-center justify-center overflow-hidden shrink-0">
          {company.logo_url ? (
            <Image
              src={company.logo_url}
              alt=""
              width={56}
              height={56}
              className="object-cover w-full h-full"
              unoptimized
            />
          ) : (
            <Building2 className="w-5 h-5 text-night-muted" aria-hidden />
          )}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5">
            <h3 className="font-display text-lg text-night truncate group-hover:underline">
              {company.name}
            </h3>
            {company.verified ? (
              <span
                aria-label="Vérifiée"
                className="text-gold-deep text-sm leading-none"
              >
                ✓
              </span>
            ) : null}
            {owned ? (
              <span className="text-[9px] font-bold uppercase tracking-widest px-1.5 py-0.5 rounded-md bg-gold/15 text-gold-deep">
                Toi
              </span>
            ) : null}
          </div>
          {company.tagline ? (
            <p className="text-sm text-night-muted line-clamp-2 mt-0.5">
              {company.tagline}
            </p>
          ) : null}
          <p className="text-xs text-muted mt-2 flex items-center gap-3 flex-wrap">
            {company.industry ? <span>{company.industry}</span> : null}
            {company.size_label ? <span>· {company.size_label}</span> : null}
            <span className="inline-flex items-center gap-1">
              <Users2 className="w-3 h-3" aria-hidden />
              {company.followers_count}
            </span>
          </p>
        </div>
      </div>
    </Link>
  );
}
