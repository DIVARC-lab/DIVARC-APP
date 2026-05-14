import { ArrowLeft, Briefcase, Plus } from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { JobCard } from "@/components/jobs/JobCard";
import { listMyJobs } from "@/lib/queries/jobs";
import { createClient } from "@/lib/supabase/server";
import { MyJobActions } from "./_components/MyJobActions";
import { KickerLabel } from "@/components/ui/KickerLabel";
import { EmptyState } from "@/components/ui/EmptyState";
import { Container } from "@/components/primitives/Container";
import { Grid } from "@/components/primitives/Grid";
import { Stack } from "@/components/primitives/Stack";

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
    <Container maxWidth="wide" paddingX="page" paddingY="3xl">
      <Stack gap="3xl">
      <header className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
        <div>
          <Link
            href="/jobs"
            className="inline-flex items-center gap-2 text-sm text-night-muted hover:text-night mb-3"
          >
            <ArrowLeft className="w-4 h-4" aria-hidden />
            Emploi
          </Link>
          <KickerLabel>· Mes offres</KickerLabel>
          <h1 className="mt-3 font-display italic text-[40px] sm:text-[54px] text-night text-balance leading-[1.05] tracking-[-0.02em]">
            Tes <span className="text-gold-deep">offres</span>.
          </h1>
          <p className="mt-3 text-night-muted leading-relaxed">
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
        <EmptyState
          icon={Briefcase}
          title="Aucune offre publiée"
          body="Publie ta première offre pour recruter sur DIVARC."
          ctaHref="/jobs/new"
          ctaLabel="Publier une offre"
          tone="default"
          size="lg"
        />
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
      </Stack>
    </Container>
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
      <Grid cols={{ mobile: 1, desktop: 2 }} gap="lg">{children}</Grid>
    </section>
  );
}
