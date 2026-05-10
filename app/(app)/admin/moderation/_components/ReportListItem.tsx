import Link from "next/link";
import { CATEGORY_BY_ID } from "@/lib/moderation/categories";
import type { ReportListItem as TItem } from "@/lib/queries/moderation";

/* Card individuelle de la file (colonne gauche).
 *
 * Server component pur — la sélection passe par href Link, pas par
 * client state, pour préserver l'historique navigateur (back/forward
 * fonctionnel) et simplifier le SSR. */
export function ReportListItem({
  report,
  isSelected,
  categoryParam,
}: {
  report: TItem;
  isSelected: boolean;
  categoryParam?: string;
}) {
  const cat = CATEGORY_BY_ID[report.category];
  const params = new URLSearchParams();
  params.set("id", report.id);
  if (categoryParam) params.set("category", categoryParam);
  const href = `/admin/moderation?${params.toString()}`;

  const priorityColor =
    report.priority_score >= 80
      ? "bg-red-500"
      : report.priority_score >= 50
        ? "bg-amber-500"
        : "bg-night-dim";

  const ageMin = Math.floor(
    (Date.now() - new Date(report.created_at).getTime()) / 60_000,
  );
  const ageStr =
    ageMin < 1
      ? "à l'instant"
      : ageMin < 60
        ? `${ageMin} min`
        : ageMin < 1440
          ? `${Math.floor(ageMin / 60)} h`
          : `${Math.floor(ageMin / 1440)} j`;

  return (
    <Link
      href={href}
      scroll={false}
      className={`block px-4 py-3 transition-colors ${
        isSelected ? "bg-gold/[0.07] border-l-[3px] border-gold-deep pl-[13px]" : "hover:bg-bg-soft"
      }`}
    >
      <div className="flex items-start gap-2">
        <span
          aria-hidden
          className={`mt-1.5 w-2 h-2 rounded-full shrink-0 ${priorityColor}`}
          title={`Priorité ${report.priority_score}/100`}
        />
        <div className="min-w-0 flex-1">
          <div className="flex items-baseline justify-between gap-2">
            <p className="text-[12.5px] font-semibold text-night truncate">
              {cat?.label ?? report.category}
            </p>
            <span className="text-[10px] text-night-muted shrink-0 font-mono">
              {ageStr}
            </span>
          </div>
          <div className="flex items-center gap-2 mt-0.5">
            <span className="text-[10px] uppercase tracking-wider text-night-muted font-mono">
              {report.target_type}
            </span>
            {report.duplicate_count > 1 ? (
              <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-100 text-amber-800 font-semibold">
                ×{report.duplicate_count}
              </span>
            ) : null}
            {cat?.critical ? (
              <span className="text-[10px] px-1.5 py-0.5 rounded bg-red-100 text-red-700 font-semibold uppercase">
                urgent
              </span>
            ) : null}
          </div>
        </div>
      </div>
    </Link>
  );
}
