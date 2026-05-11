import { Briefcase, MapPin } from "lucide-react";
import Link from "next/link";
import { safeFormatDate } from "@/lib/utils/date";
import type { ProfileExperience } from "@/lib/database.types";

/* ExperienceTimeline — affichage chronologique des expériences pro
 * style LinkedIn. Items triés par position_order + start_month desc.
 *
 * Pour chaque expérience :
 *   - Logo entreprise (placeholder si pas de company_id)
 *   - Titre + entreprise + type (CDI/CDD/freelance/…)
 *   - Dates (mois/année) + durée approximative
 *   - Localisation + mode (remote/hybrid/on_site)
 *   - Description en markdown léger
 *
 * V4 : skills tags associées + médias attachés. */

type Props = {
  experiences: ProfileExperience[];
};

const EMPLOYMENT_LABELS: Record<NonNullable<ProfileExperience["employment_type"]>, string> = {
  cdi: "CDI",
  cdd: "CDD",
  freelance: "Freelance",
  mission: "Mission",
  alternance: "Alternance",
  stage: "Stage",
  benevolat: "Bénévolat",
};

const WORK_MODE_LABELS: Record<NonNullable<ProfileExperience["work_mode"]>, string> = {
  on_site: "Sur place",
  remote: "Télétravail",
  hybrid: "Hybride",
};

export function ExperienceTimeline({ experiences }: Props) {
  if (experiences.length === 0) {
    return (
      <div className="rounded-2xl bg-white border border-line p-6 text-center">
        <Briefcase className="w-6 h-6 text-night-dim mx-auto mb-2" aria-hidden />
        <p className="text-[13px] text-night-muted">
          Aucune expérience renseignée.
        </p>
      </div>
    );
  }

  return (
    <section className="rounded-2xl bg-white border border-line overflow-hidden">
      <header className="px-5 py-4 border-b border-line flex items-center gap-2">
        <Briefcase className="w-4 h-4 text-gold-deep" aria-hidden />
        <h2 className="text-[14px] font-bold text-night">Expérience</h2>
        <span className="text-[12px] text-night-muted">
          · {experiences.length}
        </span>
      </header>
      <ul className="divide-y divide-line">
        {experiences.map((exp) => (
          <li key={exp.id} className="px-5 py-4 flex gap-4">
            {/* Logo / placeholder */}
            <div className="shrink-0 w-12 h-12 rounded-xl bg-bg-soft border border-line flex items-center justify-center text-night-muted font-bold text-[16px]">
              {exp.company_name.charAt(0).toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="text-[14px] font-semibold text-night">
                {exp.title}
              </h3>
              <p className="text-[13px] text-night-soft">
                {exp.company_id ? (
                  <Link
                    href={`/c/${exp.company_id}`}
                    className="hover:text-gold-deep transition-colors"
                  >
                    {exp.company_name}
                  </Link>
                ) : (
                  exp.company_name
                )}
                {exp.employment_type ? (
                  <>
                    <span className="text-night-dim"> · </span>
                    <span>{EMPLOYMENT_LABELS[exp.employment_type]}</span>
                  </>
                ) : null}
              </p>
              <p className="mt-0.5 text-[12px] text-night-muted">
                {safeFormatDate(exp.start_month, { month: "short", year: "numeric" })}
                {" – "}
                {exp.is_current
                  ? "Présent"
                  : exp.end_month
                    ? safeFormatDate(exp.end_month, { month: "short", year: "numeric" })
                    : "Présent"}
              </p>
              {(exp.location || exp.work_mode) && (
                <p className="mt-0.5 text-[12px] text-night-muted inline-flex items-center gap-1">
                  <MapPin className="w-3 h-3" aria-hidden />
                  {exp.location ?? "—"}
                  {exp.work_mode ? ` · ${WORK_MODE_LABELS[exp.work_mode]}` : ""}
                </p>
              )}
              {exp.description ? (
                <p className="mt-2 text-[13px] text-night-soft whitespace-pre-wrap line-clamp-5">
                  {exp.description}
                </p>
              ) : null}
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}
