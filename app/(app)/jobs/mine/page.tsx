import { ArrowLeft, Briefcase, Plus } from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { JobCard } from "@/components/jobs/JobCard";
import { listMyJobs } from "@/lib/queries/jobs";
import { createClient } from "@/lib/supabase/server";
import { MyJobActions } from "./_components/MyJobActions";
import { KickerLabel } from "@/components/ui/KickerLabel";

export const metadata = {
  title: "Mes offres",
};

export default async function MyJobsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const jobs = await listMyJobs(user.id);
  const active = jobs.filter((j) => j.status === "active");
  const closed = jobs.filter((j) => j.status !== "active");

  return (
    <div className="px-6 sm:px-10 py-10 max-w-6xl mx-auto w-full space-y-8">
      <header className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
        <div>
          <Link
            href="/jobs"
            className="inline-flex items-center gap-2 text-sm text-night-muted hover:text-night mb-3"
          >
            <ArrowLeft className="w-4 h-4" aria-hidden />
            Emploi
          </Link>
          <KickerLabel>Mes offres</KickerLabel>
          <h1 className="mt-2 font-display text-4xl text-night">
            Tes <em className="italic text-gold-deep">offres</em>.
          </h1>
          <p className="mt-1 text-muted-strong">
            {jobs.length} offre{jobs.length > 1 ? "s" : ""} · {active.length}{" "}
            active{active.length > 1 ? "s" : ""}
          </p>
        </div>
        <Button asChild size="lg">
          <Link href="/jobs/new">
            <Plus className="w-4 h-4" aria-hidden />
            Publier une offre
          </Link>
        </Button>
      </header>

      {jobs.length === 0 ? (
        <div className="text-center py-20 px-6 rounded-3xl bg-white border border-line">
          <div
            aria-hidden
            className="w-20 h-20 mx-auto rounded-3xl bg-gradient-to-br from-cream via-bg to-gold/15 border border-gold/30 flex items-center justify-center mb-5"
          >
            <Briefcase className="w-8 h-8 text-night-muted" aria-hidden />
          </div>
          <h2 className="font-display text-2xl text-night">
            Aucune offre publiée
          </h2>
          <p className="mt-2 text-muted max-w-sm mx-auto">
            Publie ta première offre pour recruter sur DIVARC.
          </p>
          <Button asChild className="mt-6">
            <Link href="/jobs/new">Publier une offre</Link>
          </Button>
        </div>
      ) : (
        <div className="space-y-10">
          {active.length > 0 ? (
            <Section title="Actives" count={active.length}>
              {active.map((job) => (
                <div key={job.id} className="space-y-2">
                  <JobCard job={job} showSave={false} />
                  <MyJobActions
                    jobId={job.id}
                    status={job.status}
                    applicationsCount={job.applications_count}
                  />
                </div>
              ))}
            </Section>
          ) : null}

          {closed.length > 0 ? (
            <Section title="Clôturées / archivées" count={closed.length}>
              {closed.map((job) => (
                <div key={job.id} className="space-y-2">
                  <JobCard job={job} showSave={false} />
                  <MyJobActions
                    jobId={job.id}
                    status={job.status}
                    applicationsCount={job.applications_count}
                  />
                </div>
              ))}
            </Section>
          ) : null}
        </div>
      )}
    </div>
  );
}

function Section({
  title,
  count,
  children,
}: {
  title: string;
  count: number;
  children: React.ReactNode;
}) {
  return (
    <section>
      <h2 className="font-display text-2xl text-night mb-4">
        {title} <span className="text-muted text-base">· {count}</span>
      </h2>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">{children}</div>
    </section>
  );
}
