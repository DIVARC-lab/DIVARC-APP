import { ArrowLeft, Users } from "lucide-react";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getJobById, listApplicationsForJob } from "@/lib/queries/jobs";
import { createClient } from "@/lib/supabase/server";
import { ApplicantCard } from "./_components/ApplicantCard";

type Params = Promise<{ id: string }>;

export const metadata = {
  title: "Candidatures reçues",
};

export default async function ApplicantsPage({
  params,
}: {
  params: Params;
}) {
  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const job = await getJobById(id, user.id);
  if (!job || job.poster_id !== user.id) notFound();

  const applications = await listApplicationsForJob(id);

  return (
    <div className="px-6 sm:px-10 py-10 max-w-4xl mx-auto w-full space-y-8">
      <header>
        <Link
          href={`/jobs/${id}`}
          className="inline-flex items-center gap-2 text-sm text-night-muted hover:text-night mb-3"
        >
          <ArrowLeft className="w-4 h-4" aria-hidden />
          Retour à l&apos;offre
        </Link>
        <span className="text-xs font-semibold tracking-widest uppercase text-gold-deep">
          Candidatures
        </span>
        <h1 className="mt-2 font-display text-3xl sm:text-4xl text-night text-balance leading-[1.1]">
          {job.title}
        </h1>
        <p className="mt-2 text-muted-strong">
          {applications.length} candidature{applications.length > 1 ? "s" : ""}
          {" reçue"}
          {applications.length > 1 ? "s" : ""}
        </p>
      </header>

      {applications.length === 0 ? (
        <div className="text-center py-16 px-6 rounded-3xl bg-white border border-line">
          <div
            aria-hidden
            className="w-16 h-16 mx-auto rounded-2xl bg-gradient-to-br from-cream via-bg to-gold/15 border border-gold/30 flex items-center justify-center mb-4"
          >
            <Users className="w-7 h-7 text-night-muted" aria-hidden />
          </div>
          <h2 className="font-display text-xl text-night">
            Pas encore de candidature
          </h2>
          <p className="mt-1 text-sm text-muted max-w-sm mx-auto">
            Quand quelqu&apos;un postulera, tu le verras ici en temps réel.
          </p>
        </div>
      ) : (
        <ul className="space-y-3">
          {applications.map((application) => (
            <li key={application.id}>
              <ApplicantCard application={application} />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
