import { GraduationCap } from "lucide-react";
import type { ProfileEducation } from "@/lib/database.types";

type Props = {
  education: ProfileEducation[];
};

export function EducationTimeline({ education }: Props) {
  if (education.length === 0) {
    return (
      <div className="rounded-2xl bg-white border border-line p-6 text-center">
        <GraduationCap className="w-6 h-6 text-night-dim mx-auto mb-2" aria-hidden />
        <p className="text-[13px] text-night-muted">Aucune formation renseignée.</p>
      </div>
    );
  }

  return (
    <section className="rounded-2xl bg-white border border-line overflow-hidden">
      <header className="px-5 py-4 border-b border-line flex items-center gap-2">
        <GraduationCap className="w-4 h-4 text-gold-deep" aria-hidden />
        <h2 className="text-[14px] font-bold text-night">Formation</h2>
        <span className="text-[12px] text-night-muted">
          · {education.length}
        </span>
      </header>
      <ul className="divide-y divide-line">
        {education.map((edu) => (
          <li key={edu.id} className="px-5 py-4 flex gap-4">
            <div className="shrink-0 w-12 h-12 rounded-xl bg-bg-soft border border-line flex items-center justify-center text-night-muted font-bold text-[16px]">
              {edu.school.charAt(0).toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="text-[14px] font-semibold text-night">{edu.school}</h3>
              {(edu.degree || edu.field_of_study) && (
                <p className="text-[13px] text-night-soft">
                  {[edu.degree, edu.field_of_study].filter(Boolean).join(" · ")}
                </p>
              )}
              <p className="mt-0.5 text-[12px] text-night-muted">
                {edu.start_year ?? "?"} – {edu.end_year ?? "?"}
              </p>
              {edu.description ? (
                <p className="mt-2 text-[13px] text-night-soft whitespace-pre-wrap line-clamp-4">
                  {edu.description}
                </p>
              ) : null}
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}
