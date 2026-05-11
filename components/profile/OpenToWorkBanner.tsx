import { Briefcase, MapPin } from "lucide-react";
import type { ProfileOpenToWork } from "@/lib/database.types";

/* OpenToWorkBanner — bandeau gold style LinkedIn pour signaler qu'on
 * cherche des opportunités. Affiché au top du profil si le row existe
 * avec visibility != hidden. */

const WORK_TYPE_LABELS: Record<string, string> = {
  fulltime: "Temps plein",
  parttime: "Temps partiel",
  contract: "Contrat",
  temporary: "Temporaire",
  volunteer: "Bénévolat",
  internship: "Stage",
  remote: "Remote",
};

const START_PREF_LABELS: Record<NonNullable<ProfileOpenToWork["start_date_preference"]>, string> = {
  immediately: "Immédiatement",
  within_1_month: "Sous 1 mois",
  within_3_months: "Sous 3 mois",
  flexible: "Flexible",
};

type Props = {
  data: ProfileOpenToWork;
};

export function OpenToWorkBanner({ data }: Props) {
  if (data.visibility === "hidden") return null;

  const jobs = data.job_titles.slice(0, 3);
  const locations = data.locations.slice(0, 2);
  const types = data.work_types.slice(0, 3);

  return (
    <aside
      role="status"
      aria-label="Ouvert à de nouvelles opportunités"
      className="rounded-2xl border border-gold/40 bg-gradient-to-br from-gold/10 via-gold/5 to-transparent p-4 sm:p-5"
    >
      <div className="flex flex-col sm:flex-row sm:items-center gap-3">
        <span className="w-10 h-10 rounded-xl bg-gold-deep text-white flex items-center justify-center shrink-0">
          <Briefcase className="w-5 h-5" aria-hidden />
        </span>
        <div className="flex-1 min-w-0">
          <p className="text-[11.5px] font-bold uppercase tracking-wider text-gold-deep">
            Ouvert à de nouvelles opportunités
          </p>
          <p className="mt-0.5 text-[13.5px] text-night">
            {jobs.length > 0
              ? jobs.join(" · ")
              : "Postes ouverts"}
            {types.length > 0 ? (
              <>
                <span className="text-night-dim"> · </span>
                <span className="text-night-soft">
                  {types.map((t) => WORK_TYPE_LABELS[t] ?? t).join(", ")}
                </span>
              </>
            ) : null}
          </p>
          {locations.length > 0 ? (
            <p className="mt-1 text-[12px] text-night-muted inline-flex items-center gap-1">
              <MapPin className="w-3 h-3" aria-hidden />
              {locations.join(", ")}
            </p>
          ) : null}
          {data.start_date_preference ? (
            <p className="mt-0.5 text-[12px] text-night-muted">
              Disponibilité : {START_PREF_LABELS[data.start_date_preference]}
            </p>
          ) : null}
          {data.note ? (
            <p className="mt-2 text-[12.5px] text-night-soft italic">
              &laquo; {data.note} &raquo;
            </p>
          ) : null}
        </div>
      </div>
    </aside>
  );
}
