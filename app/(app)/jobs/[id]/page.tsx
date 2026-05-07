import {
  ArrowLeft,
  Building2,
  Calendar,
  CheckCircle2,
  Clock,
  MapPin,
  Tag,
  Users,
} from "lucide-react";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { Avatar } from "@/components/ui/Avatar";
import { SaveJobButton } from "@/components/jobs/SaveJobButton";
import { SalaryRange } from "@/components/jobs/SalaryRange";
import {
  APPLICATION_STATUS_META,
  EXPERIENCE_META,
  JOB_CATEGORY_META,
  JOB_TYPE_META,
  WORK_MODE_META,
} from "@/lib/utils/jobs";
import { formatRelative } from "@/lib/utils/relativeTime";
import { getJobById } from "@/lib/queries/jobs";
import { createClient } from "@/lib/supabase/server";
import { ApplyDialog } from "./_components/ApplyDialog";

type Params = Promise<{ id: string }>;

export async function generateMetadata({ params }: { params: Params }) {
  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { title: "Offre" };
  const job = await getJobById(id, user.id);
  if (!job) return { title: "Offre introuvable" };
  return {
    title: job.title,
    description: job.description.slice(0, 160),
  };
}

export default async function JobDetailPage({
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
  if (!job) notFound();

  const isOwn = job.poster_id === user.id;
  const isClosed = job.status === "closed";
  const typeMeta = JOB_TYPE_META[job.job_type];
  const modeMeta = WORK_MODE_META[job.work_mode];
  const categoryMeta = JOB_CATEGORY_META[job.category];
  const posterName =
    job.poster?.full_name ?? job.poster?.username ?? "Recruteur";

  const myApplication = job.my_application;

  return (
    <div className="px-4 sm:px-10 py-10 max-w-4xl mx-auto w-full">
      <Link
        href="/jobs"
        className="inline-flex items-center gap-2 text-sm text-night-muted hover:text-night mb-6"
      >
        <ArrowLeft className="w-4 h-4" aria-hidden />
        Retour aux offres
      </Link>

      <div className="grid lg:grid-cols-[1fr_320px] gap-8">
        <div className="space-y-6">
          <header className="p-6 sm:p-8 rounded-3xl bg-white border border-line shadow-soft">
            <div className="flex items-start gap-4">
              <div className="w-14 h-14 rounded-2xl bg-night/5 border border-line flex items-center justify-center text-2xl shrink-0">
                {typeMeta.emoji}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-night/5 text-night-muted text-[10px] font-bold uppercase tracking-widest">
                    {typeMeta.label}
                  </span>
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-cream text-night-muted text-[10px] font-bold uppercase tracking-widest">
                    <span aria-hidden>{modeMeta.emoji}</span>
                    {modeMeta.label}
                  </span>
                  <Link
                    href={`/jobs?category=${job.category}`}
                    className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-night/5 text-night-muted text-[10px] font-bold uppercase tracking-widest hover:bg-night/10"
                  >
                    <span aria-hidden>{categoryMeta.emoji}</span>
                    {categoryMeta.label}
                  </Link>
                  {isClosed ? (
                    <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-night text-cream text-[10px] font-bold uppercase tracking-widest">
                      Clôturée
                    </span>
                  ) : null}
                </div>
                <h1 className="mt-3 font-display text-3xl sm:text-4xl text-night text-balance leading-tight">
                  {job.title}
                </h1>
                {job.company_name ? (
                  <p className="mt-1 text-night-muted flex items-center gap-1.5">
                    <Building2 className="w-4 h-4" aria-hidden />
                    {job.company_name}
                  </p>
                ) : null}
              </div>
              <SaveJobButton
                jobId={job.id}
                initialSaved={job.is_saved}
                size="md"
              />
            </div>

            <ul className="mt-6 grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm">
              {job.location ? (
                <Stat
                  icon={MapPin}
                  label="Localisation"
                  value={job.location}
                />
              ) : null}
              <Stat
                icon={Tag}
                label="Niveau"
                value={EXPERIENCE_META[job.experience_level]}
              />
              <Stat
                icon={Users}
                label="Candidatures"
                value={String(job.applications_count)}
              />
              <Stat
                icon={Clock}
                label="Publiée"
                value={formatRelative(job.created_at)}
              />
            </ul>

            <div className="mt-6 p-4 rounded-2xl bg-cream/50 border border-gold/30 flex items-center justify-between gap-4">
              <SalaryRange
                min={job.salary_min}
                max={job.salary_max}
                currency={job.salary_currency}
                period={job.salary_period}
                className="font-display text-xl text-night"
              />
              {!isOwn && !isClosed ? (
                myApplication && myApplication.status !== "withdrawn" ? (
                  <span className="inline-flex items-center gap-1.5 px-3 h-9 rounded-full bg-emerald-50 text-emerald-700 text-xs font-semibold">
                    <CheckCircle2 className="w-4 h-4" aria-hidden />
                    {APPLICATION_STATUS_META[myApplication.status].label}
                  </span>
                ) : (
                  <ApplyDialog jobId={job.id} jobTitle={job.title} />
                )
              ) : null}
              {isOwn ? (
                <Link
                  href={`/jobs/${job.id}/applicants`}
                  className="inline-flex items-center gap-1.5 px-4 h-10 rounded-full bg-night text-cream text-sm font-semibold hover:bg-night-soft"
                >
                  <Users className="w-4 h-4" aria-hidden />
                  Voir les candidats
                </Link>
              ) : null}
            </div>
          </header>

          <article className="p-6 sm:p-8 rounded-3xl bg-white border border-line shadow-soft">
            <h2 className="text-xs font-bold uppercase tracking-widest text-muted mb-3">
              Description
            </h2>
            <div className="text-night-muted whitespace-pre-wrap leading-relaxed">
              {job.description}
            </div>
          </article>
        </div>

        <aside className="space-y-4">
          {job.poster ? (
            <article className="p-6 rounded-3xl bg-white border border-line shadow-soft">
              <h2 className="text-xs font-bold uppercase tracking-widest text-muted mb-4">
                Publié par
              </h2>
              <Link
                href={`/u/${job.poster.username ?? ""}`}
                className="flex items-center gap-3 group"
              >
                <Avatar
                  src={job.poster.avatar_url}
                  fullName={posterName}
                  size="lg"
                />
                <div className="min-w-0">
                  <p className="font-display text-lg text-night group-hover:text-night-soft truncate">
                    {posterName}
                  </p>
                  {job.poster.username ? (
                    <p className="text-sm text-muted">@{job.poster.username}</p>
                  ) : null}
                </div>
              </Link>
            </article>
          ) : null}

          {myApplication ? (
            <article className="p-6 rounded-3xl bg-gradient-to-br from-cream to-bg border border-gold/30">
              <h2 className="text-xs font-bold uppercase tracking-widest text-gold-deep mb-3">
                Ta candidature
              </h2>
              <p className="text-sm text-night-muted leading-relaxed line-clamp-4">
                « {myApplication.message ?? ""} »
              </p>
              <p className="mt-3 text-xs text-muted flex items-center gap-1.5">
                <Calendar className="w-3 h-3" aria-hidden />
                Envoyée {formatRelative(myApplication.created_at)}
              </p>
            </article>
          ) : null}
        </aside>
      </div>
    </div>
  );
}

function Stat({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof MapPin;
  label: string;
  value: string;
}) {
  return (
    <li className="p-3 rounded-2xl bg-night/[0.02] border border-line">
      <div className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-widest text-muted">
        <Icon className="w-3 h-3" aria-hidden />
        {label}
      </div>
      <p className="mt-1 text-sm font-medium text-night truncate" title={value}>
        {value}
      </p>
    </li>
  );
}
