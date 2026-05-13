import { Briefcase, Plus } from "lucide-react";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { EmptyState } from "@/components/ui/EmptyState";
import { KickerLabel } from "@/components/ui/KickerLabel";
import { JobCard } from "@/components/jobs/JobCard";
import { getCircleBySlug } from "@/lib/queries/circles";
import { listJobs } from "@/lib/queries/jobs";
import { createClient } from "@/lib/supabase/server";

type Params = Promise<{ slug: string }>;

export const metadata = { title: "Jobs du cercle" };

/* Onglet Jobs — offres rattachées au cercle (jobs.circle_id, migration 0097).
 * CTA "Poster une offre" → /jobs/new?circle=<slug>.
 * Gratuit pour les membres (différenciateur vs LinkedIn Jobs). */
export default async function CircleJobsTab({
  params,
}: {
  params: Params;
}) {
  const { slug } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const circle = await getCircleBySlug(slug, user.id);
  if (!circle) notFound();

  if (circle.modules && !circle.modules.jobs) {
    return (
      <div className="px-5 sm:px-8 py-10 text-center">
        <p className="text-[14px] text-night-dim">
          Le module Jobs n&apos;est pas activé pour ce cercle.
        </p>
      </div>
    );
  }

  const jobs = await listJobs(user.id, {
    circleId: circle.id,
    limit: 50,
  });

  return (
    <section className="px-5 sm:px-8 pb-8">
      <header className="pb-4 flex items-baseline justify-between gap-2 flex-wrap">
        <div className="flex items-center gap-2">
          <Briefcase className="w-4 h-4 text-gold-deep" aria-hidden />
          <KickerLabel>
            {jobs.length} offre{jobs.length > 1 ? "s" : ""}
          </KickerLabel>
        </div>
        {circle.is_member ? (
          <Link
            href={`/jobs/new?circle=${slug}`}
            className="inline-flex items-center gap-1.5 h-9 px-3.5 rounded-full bg-night text-cream text-[12px] font-extrabold hover:bg-night-soft transition-colors"
          >
            <Plus className="w-3.5 h-3.5" aria-hidden strokeWidth={2.5} />
            Poster une offre
          </Link>
        ) : null}
      </header>

      {jobs.length === 0 ? (
        <EmptyState
          emoji="💼"
          kicker="Aucune offre"
          title={
            <>
              Pas encore d&apos;offre dans{" "}
              <em className="italic text-gold-deep">{circle.name}</em>
            </>
          }
          body={
            circle.is_member
              ? "Tu cherches ou tu recrutes ? Poster une offre est gratuit pour les membres."
              : "Rejoins le cercle pour poster une offre ou postuler."
          }
          ctaHref={
            circle.is_member ? `/jobs/new?circle=${slug}` : `/circles/${slug}`
          }
          ctaLabel={
            circle.is_member ? "Poster la première" : "Rejoindre le cercle"
          }
          size="lg"
        />
      ) : (
        <ul className="grid grid-cols-1 lg:grid-cols-2 gap-3">
          {jobs.map((job) => (
            <li key={job.id}>
              <JobCard job={job} />
            </li>
          ))}
        </ul>
      )}

      <p className="mt-6 text-[11px] text-night-dim text-center">
        Poster est <strong>gratuit</strong> pour les membres — c&apos;est notre
        signature face aux job boards payants.
      </p>
    </section>
  );
}
