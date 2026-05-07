import { Briefcase, Plus, Bookmark, Send } from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { JobCard } from "@/components/jobs/JobCard";
import { listJobs } from "@/lib/queries/jobs";
import {
  JOB_CATEGORY_META,
  JOB_TYPE_META,
  WORK_MODE_META,
} from "@/lib/utils/jobs";
import { createClient } from "@/lib/supabase/server";
import type {
  JobCategory,
  JobType,
  WorkMode,
} from "@/lib/database.types";
import { JobFilters } from "./_components/JobFilters";

export const metadata = {
  title: "Emploi",
};

const ALL_CATEGORIES = Object.keys(JOB_CATEGORY_META) as JobCategory[];
const ALL_TYPES = Object.keys(JOB_TYPE_META) as JobType[];
const ALL_MODES = Object.keys(WORK_MODE_META) as WorkMode[];

type SearchParams = Promise<{
  category?: string;
  type?: string;
  mode?: string;
  q?: string;
}>;

export default async function JobsPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { category, type, mode, q } = await searchParams;

  const validCategory =
    category && ALL_CATEGORIES.includes(category as JobCategory)
      ? (category as JobCategory)
      : undefined;
  const validType =
    type && ALL_TYPES.includes(type as JobType) ? (type as JobType) : undefined;
  const validMode =
    mode && ALL_MODES.includes(mode as WorkMode)
      ? (mode as WorkMode)
      : undefined;

  const jobs = await listJobs(user.id, {
    category: validCategory,
    jobType: validType,
    workMode: validMode,
    query: q,
    limit: 50,
  });

  return (
    <div className="px-6 sm:px-10 py-10 max-w-6xl mx-auto w-full space-y-8">
      <header className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-4">
        <div>
          <span className="text-xs font-semibold tracking-widest uppercase text-gold-deep">
            Emploi
          </span>
          <h1 className="mt-2 font-display text-4xl sm:text-5xl text-night text-balance leading-[1.05]">
            Trouve ton prochain <em className="italic">job</em>.
          </h1>
          <p className="mt-2 text-muted-strong max-w-xl">
            CDI, CDD, freelance, missions. Postule en un clic, le recruteur
            voit ton profil DIVARC.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button variant="secondary" asChild>
            <Link href="/jobs/applied">
              <Send className="w-4 h-4" aria-hidden />
              Mes candidatures
            </Link>
          </Button>
          <Button variant="secondary" asChild>
            <Link href="/jobs/mine">
              <Briefcase className="w-4 h-4" aria-hidden />
              Mes offres
            </Link>
          </Button>
          <Button asChild>
            <Link href="/jobs/new">
              <Plus className="w-4 h-4" aria-hidden />
              Publier une offre
            </Link>
          </Button>
        </div>
      </header>

      <JobFilters />

      {jobs.length === 0 ? (
        <EmptyState
          hasFilters={Boolean(validCategory || validType || validMode || q)}
        />
      ) : (
        <>
          <p className="text-sm text-muted">
            {jobs.length} offre{jobs.length > 1 ? "s" : ""} active
            {jobs.length > 1 ? "s" : ""}
          </p>
          <ul className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {jobs.map((job) => (
              <li key={job.id}>
                <JobCard job={job} />
              </li>
            ))}
          </ul>
        </>
      )}
    </div>
  );
}

function EmptyState({ hasFilters }: { hasFilters: boolean }) {
  return (
    <div className="text-center py-20 px-6 rounded-3xl bg-white border border-line">
      <div
        aria-hidden
        className="w-20 h-20 mx-auto rounded-3xl bg-gradient-to-br from-cream via-bg to-gold/15 border border-gold/30 flex items-center justify-center mb-5 text-4xl"
      >
        💼
      </div>
      <h2 className="font-display text-2xl text-night">
        {hasFilters
          ? "Aucune offre avec ces filtres"
          : "Pas encore d'offres d'emploi"}
      </h2>
      <p className="mt-2 text-muted max-w-sm mx-auto">
        {hasFilters
          ? "Modifie tes filtres ou publie ta propre offre."
          : "Sois le premier à publier une offre sur DIVARC."}
      </p>
      <Button asChild className="mt-6">
        <Link href="/jobs/new">
          <Plus className="w-4 h-4" aria-hidden />
          Publier une offre
        </Link>
      </Button>
    </div>
  );
}
