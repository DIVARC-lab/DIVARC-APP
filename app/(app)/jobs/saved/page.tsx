import { ArrowLeft, Bookmark } from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { JobCard } from "@/components/jobs/JobCard";
import { listSavedJobs } from "@/lib/queries/jobs";
import { createClient } from "@/lib/supabase/server";
import { KickerLabel } from "@/components/ui/KickerLabel";
import { EmptyState } from "@/components/ui/EmptyState";
import { Container } from "@/components/primitives/Container";
import { Grid } from "@/components/primitives/Grid";
import { Stack } from "@/components/primitives/Stack";

export const metadata = {
  title: "Offres sauvegardées",
};

export default async function SavedJobsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const jobs = await listSavedJobs(user.id);

  return (
    <Container maxWidth="wide" paddingX="page" paddingY="3xl">
      <Stack gap="3xl">
        <header>
          <Link
            href="/jobs"
            className="inline-flex items-center gap-2 text-sm text-night-muted hover:text-night mb-3"
          >
            <ArrowLeft className="w-4 h-4" aria-hidden />
            Emploi
          </Link>
          <KickerLabel>Sauvegardés</KickerLabel>
          <h1 className="mt-2 font-display text-4xl text-night">
            Tes <em className="italic text-gold-deep">offres marquées</em>.
          </h1>
          <p className="mt-1 text-muted-strong">
            {jobs.length} offre{jobs.length > 1 ? "s" : ""} sauvegardée
            {jobs.length > 1 ? "s" : ""}.
          </p>
        </header>

        {jobs.length === 0 ? (
          <EmptyState
            icon={Bookmark}
            title="Aucune offre sauvegardée"
            body="Sur une offre, clique sur le drapeau pour la garder ici et y revenir plus tard."
            tone="default"
            size="lg"
          />
        ) : (
          <Grid cols={{ mobile: 1, desktop: 2 }} gap="lg">
            {jobs.map((job) => (
              <JobCard key={job.id} job={job} />
            ))}
          </Grid>
        )}
      </Stack>
    </Container>
  );
}
