import { Building2, MapPin } from "lucide-react";
import Link from "next/link";
import { SalaryRange } from "@/components/jobs/SalaryRange";
import { JOB_TYPE_META, WORK_MODE_META } from "@/lib/utils/jobs";
import type { ExploreJob } from "@/lib/queries/explore";

type MiniJobCardProps = {
  job: ExploreJob;
};

export function MiniJobCard({ job }: MiniJobCardProps) {
  const typeMeta = JOB_TYPE_META[job.job_type];
  const modeMeta = WORK_MODE_META[job.work_mode];

  return (
    <Link
      href={`/jobs/${job.id}`}
      className="group flex flex-col gap-3 p-5 rounded-3xl bg-white border border-line hover:border-night/30 hover:shadow-soft transition-all"
    >
      <header className="flex items-start gap-3">
        <div className="w-10 h-10 rounded-xl bg-night/5 flex items-center justify-center text-xl shrink-0">
          {typeMeta.emoji}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1 flex-wrap text-[10px] font-bold uppercase tracking-widest text-night-muted">
            <span className="px-1.5 py-0.5 rounded-md bg-night/5">
              {typeMeta.label}
            </span>
            <span className="px-1.5 py-0.5 rounded-md bg-cream">
              {modeMeta.label}
            </span>
          </div>
          <h3 className="mt-1 font-semibold text-night line-clamp-2 leading-tight">
            {job.title}
          </h3>
          {job.company_name ? (
            <p className="mt-0.5 text-xs text-muted flex items-center gap-1 truncate">
              <Building2 className="w-3 h-3" aria-hidden />
              {job.company_name}
            </p>
          ) : null}
        </div>
      </header>

      <footer className="flex items-center justify-between gap-2 pt-2 border-t border-line text-xs">
        <SalaryRange
          min={job.salary_min}
          max={job.salary_max}
          currency={job.salary_currency}
          period={job.salary_period}
          className="text-xs font-semibold text-night truncate"
        />
        {job.location ? (
          <span className="flex items-center gap-1 text-muted truncate">
            <MapPin className="w-3 h-3" aria-hidden />
            {job.location}
          </span>
        ) : null}
      </footer>
    </Link>
  );
}
