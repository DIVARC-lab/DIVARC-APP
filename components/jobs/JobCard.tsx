import { Building2, MapPin } from "lucide-react";
import Link from "next/link";
import { Avatar } from "@/components/ui/Avatar";
import { cn } from "@/lib/utils/cn";
import { JOB_TYPE_META, WORK_MODE_META } from "@/lib/utils/jobs";
import { formatRelative } from "@/lib/utils/relativeTime";
import type { JobWithDetails } from "@/lib/database.types";
import { SaveJobButton } from "./SaveJobButton";
import { SalaryRange } from "./SalaryRange";

type JobCardProps = {
  job: JobWithDetails;
  showSave?: boolean;
  className?: string;
};

export function JobCard({ job, showSave = true, className }: JobCardProps) {
  const typeMeta = JOB_TYPE_META[job.job_type];
  const modeMeta = WORK_MODE_META[job.work_mode];
  const isClosed = job.status === "closed";
  const posterName =
    job.poster?.full_name ?? job.poster?.username ?? "Recruteur";

  return (
    <Link
      href={`/jobs/${job.id}`}
      className={cn(
        "group relative flex flex-col gap-4 p-5 sm:p-6 rounded-3xl bg-white border border-line hover:border-night/30 hover:shadow-soft transition-all",
        isClosed && "opacity-75",
        className,
      )}
    >
      <header className="flex items-start gap-3">
        <div className="w-11 h-11 rounded-2xl bg-night/5 border border-line flex items-center justify-center text-xl shrink-0">
          {typeMeta.emoji}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-night/5 text-night-muted text-[10px] font-bold uppercase tracking-widest">
              {typeMeta.label}
            </span>
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-cream text-night-muted text-[10px] font-bold uppercase tracking-widest">
              <span aria-hidden>{modeMeta.emoji}</span>
              {modeMeta.label}
            </span>
            {isClosed ? (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-night text-cream text-[10px] font-bold uppercase tracking-widest">
                Clôturée
              </span>
            ) : null}
          </div>
          <h3 className="mt-2 font-display text-lg sm:text-xl text-night text-balance leading-tight">
            {job.title}
          </h3>
          {job.company_name ? (
            <p className="mt-0.5 text-sm text-night-muted flex items-center gap-1">
              <Building2 className="w-3.5 h-3.5" aria-hidden />
              {job.company_name}
            </p>
          ) : null}
        </div>
        {showSave ? (
          <SaveJobButton
            jobId={job.id}
            initialSaved={job.is_saved}
            size="sm"
          />
        ) : null}
      </header>

      <p className="text-sm text-night-muted line-clamp-2">{job.description}</p>

      <footer className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-line text-xs text-muted">
        <div className="flex items-center gap-3 flex-wrap">
          {job.location ? (
            <span className="flex items-center gap-1">
              <MapPin className="w-3 h-3" aria-hidden />
              {job.location}
            </span>
          ) : null}
          <SalaryRange
            min={job.salary_min}
            max={job.salary_max}
            currency={job.salary_currency}
            period={job.salary_period}
            className="text-xs font-semibold text-night"
          />
        </div>
        <div className="flex items-center gap-2">
          {job.poster ? (
            <span className="flex items-center gap-1.5">
              <Avatar
                src={job.poster.avatar_url}
                fullName={posterName}
                size="sm"
                className="!w-5 !h-5"
              />
              <span className="truncate max-w-32">{posterName}</span>
            </span>
          ) : null}
          <span>·</span>
          <time dateTime={job.created_at}>
            {formatRelative(job.created_at)}
          </time>
        </div>
      </footer>
    </Link>
  );
}
