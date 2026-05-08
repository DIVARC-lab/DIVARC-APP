import { ArrowLeft, Bookmark } from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { JobCard } from "@/components/jobs/JobCard";
import { listSavedJobs } from "@/lib/queries/jobs";
import { createClient } from "@/lib/supabase/server";

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
    <div className="px-6 sm:px-10 py-10 max-w-5xl mx-auto w-full space-y-8">
      <header>
        <Link
          href="/jobs"
          className="inline-flex items-center gap-2 text-sm text-night-muted hover:text-night mb-3"
        >
          <ArrowLeft className="w-4 h-4" aria-hidden />
          Emploi
        </Link>
        <span className="text-xs font-semibold tracking-widest uppercase text-gold-deep">
          Sauvegardés
        </span>
        <h1 className="mt-2 font-display text-4xl text-night">
          Tes <em className="italic">offres marquées</em>.
        </h1>
        <p className="mt-1 text-muted-strong">
          {jobs.length} offre{jobs.length > 1 ? "s" : ""} sauvegardée
          {jobs.length > 1 ? "s" : ""}.
        </p>
      </header>

      {jobs.length === 0 ? (
        <div className="text-center py-20 px-6 rounded-3xl bg-white border border-line">
          <div
            aria-hidden
            className="w-20 h-20 mx-auto rounded-3xl bg-gradient-to-br from-cream via-bg to-gold/15 border border-gold/30 flex items-center justify-center mb-5 text-4xl"
          >
            <Bookmark className="w-8 h-8 text-gold-deep" aria-hidden />
          </div>
          <h2 className="font-display text-2xl text-night">
            Aucune offre sauvegardée
          </h2>
          <p className="mt-2 text-muted max-w-sm mx-auto">
            Sur une offre, clique sur le drapeau pour la garder ici et y
            revenir plus tard.
          </p>
        </div>
      ) : (
        <ul className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {jobs.map((job) => (
            <li key={job.id}>
              <JobCard job={job} />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
