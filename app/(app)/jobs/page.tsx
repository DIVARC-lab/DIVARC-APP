import {
  Bookmark,
  MoreHorizontal,
  Plus,
  Search,
  Send,
} from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { EmptyState } from "@/components/ui/EmptyState";
import { JobCard } from "@/components/jobs/JobCard";
import {
  listJobs,
  listMyApplications,
  listSavedJobs,
} from "@/lib/queries/jobs";
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
  skills?: string;
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

  const { category, type, mode, q, skills } = await searchParams;
  const skillsList = skills
    ? skills
        .split(",")
        .map((s) => s.trim())
        .filter((s) => s.length > 0)
    : undefined;

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

  const [jobs, savedJobs, applications] = await Promise.all([
    listJobs(user.id, {
      category: validCategory,
      jobType: validType,
      workMode: validMode,
      query: q,
      skills: skillsList,
      limit: 50,
    }),
    listSavedJobs(user.id),
    listMyApplications(user.id),
  ]);

  const hasFilters = !!(validCategory || validType || validMode || q);
  const activeApplications = applications.filter(
    (a) => a.status !== "withdrawn" && a.status !== "rejected",
  );

  /* Refonte audit (handoff feed-jobs.jsx JobsListScreen L17-108) :
     header mobile-first compact + search bar + 2 shortcut tabs +
     filter chips + count line + cards. Les routes secondaires (/lives,
     /alerts, /referrals, /mine) restent accessibles via le menu "Plus"
     ou les liens contextuels. */
  return (
    <div className="bg-bg-soft min-h-screen pb-24">
      <div className="mx-auto w-full max-w-2xl lg:max-w-5xl">
        {/* Header */}
        <header className="px-5 sm:px-8 pt-8 sm:pt-10 pb-3 flex items-end justify-between gap-3">
          <div className="min-w-0">
            <span className="text-[11px] font-extrabold uppercase tracking-[0.18em] text-gold-deep">
              · Emploi
            </span>
            <h1 className="mt-1 font-display text-[38px] sm:text-[48px] text-night leading-[1] font-normal tracking-[-0.02em] text-balance">
              Trouve ton prochain{" "}
              <em className="italic bg-gradient-to-br from-gold to-gold-deep bg-clip-text text-transparent">
                job
              </em>
              .
            </h1>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <Link
              href="/jobs/mine"
              aria-label="Plus d'options"
              className="hidden sm:flex h-9 w-9 items-center justify-center rounded-full bg-white border border-line text-night hover:border-gold/40 transition-colors"
            >
              <MoreHorizontal className="w-[15px] h-[15px]" aria-hidden />
            </Link>
            <Link
              href="/jobs/new"
              aria-label="Publier une offre"
              className="flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br from-gold to-gold-deep text-night shadow-[0_8px_22px_-8px_rgba(244,185,66,0.55)] hover:opacity-95 transition-opacity"
            >
              <Plus className="w-4 h-4" aria-hidden strokeWidth={2.5} />
            </Link>
          </div>
        </header>

        {/* Search bar (visual placeholder, lien vers /search avec scope jobs) */}
        <div className="px-5 sm:px-8 pt-1 pb-3">
          <Link
            href="/search?scope=jobs"
            className="flex h-[42px] items-center gap-2.5 rounded-[21px] bg-white border border-line px-3.5 text-[13px] text-night-dim hover:border-gold/40 transition-colors"
          >
            <Search className="w-[15px] h-[15px]" aria-hidden />
            <span className="truncate">Poste, entreprise, lieu…</span>
          </Link>
        </div>

        {/* Shortcut tabs : Mes candidatures + Sauvegardés */}
        <div className="px-5 sm:px-8 pb-3.5 grid grid-cols-2 gap-2">
          <Link
            href="/jobs/applied"
            className="rounded-[14px] bg-white border border-line p-3 hover:border-gold/40 transition-colors"
          >
            <p className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-night-dim">
              <Send className="w-3 h-3" aria-hidden />
              Mes candidatures
            </p>
            <p className="flex items-baseline gap-1 mt-0.5">
              <span className="font-display italic text-[22px] text-night leading-none">
                {activeApplications.length}
              </span>
              <span className="text-[11px] text-night-dim">actives</span>
            </p>
          </Link>
          <Link
            href="/jobs/saved"
            className="rounded-[14px] bg-white border border-line p-3 hover:border-gold/40 transition-colors"
          >
            <p className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-night-dim">
              <Bookmark className="w-3 h-3" aria-hidden />
              Sauvegardés
            </p>
            <p className="flex items-baseline gap-1 mt-0.5">
              <span className="font-display italic text-[22px] text-gold-deep leading-none">
                {savedJobs.length}
              </span>
              <span className="text-[11px] text-night-dim">en stock</span>
            </p>
          </Link>
        </div>

        {/* Filter chips */}
        <div className="px-4 sm:px-7 pb-3">
          <JobFilters />
        </div>

        {/* Count line */}
        {jobs.length > 0 ? (
          <p className="px-6 sm:px-9 pb-2 text-[12px] text-night-dim">
            {jobs.length} offre{jobs.length > 1 ? "s" : ""} active
            {jobs.length > 1 ? "s" : ""} ·{" "}
            {hasFilters ? "filtré" : "trié par pertinence"}
          </p>
        ) : null}

        {/* Liste */}
        {jobs.length === 0 ? (
          <div className="px-5 sm:px-8">
            <EmptyState
              emoji="💼"
              kicker="Jobs"
              title={
                hasFilters
                  ? "Aucune offre avec ces filtres"
                  : "Pas encore d'offres d'emploi"
              }
              body={
                hasFilters
                  ? "Modifie tes filtres ou publie ta propre offre."
                  : "Sois le premier à publier une offre sur DIVARC."
              }
              ctaHref="/jobs/new"
              ctaLabel="Publier une offre"
              size="lg"
            />
          </div>
        ) : (
          <ul className="px-4 sm:px-7 flex flex-col gap-2.5">
            {jobs.map((job) => (
              <li key={job.id}>
                <JobCard job={job} />
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

