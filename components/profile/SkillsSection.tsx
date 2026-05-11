import { Zap } from "lucide-react";
import type { ProfileSkill } from "@/lib/database.types";

type Props = {
  skills: ProfileSkill[];
  /** Top N skills mises en avant (par endorsements_count desc). */
  topN?: number;
};

const LEVEL_LABELS: Record<NonNullable<ProfileSkill["level"]>, string> = {
  beginner: "Débutant",
  intermediate: "Intermédiaire",
  advanced: "Avancé",
  expert: "Expert",
};

export function SkillsSection({ skills, topN = 3 }: Props) {
  if (skills.length === 0) {
    return (
      <div className="rounded-2xl bg-white border border-line p-6 text-center">
        <Zap className="w-6 h-6 text-night-dim mx-auto mb-2" aria-hidden />
        <p className="text-[13px] text-night-muted">Aucune compétence renseignée.</p>
      </div>
    );
  }

  const sorted = [...skills].sort(
    (a, b) => b.endorsements_count - a.endorsements_count,
  );
  const top = sorted.slice(0, topN);
  const rest = sorted.slice(topN);

  return (
    <section className="rounded-2xl bg-white border border-line overflow-hidden">
      <header className="px-5 py-4 border-b border-line flex items-center gap-2">
        <Zap className="w-4 h-4 text-gold-deep" aria-hidden />
        <h2 className="text-[14px] font-bold text-night">Compétences</h2>
        <span className="text-[12px] text-night-muted">· {skills.length}</span>
      </header>

      {/* Top skills */}
      {top.length > 0 ? (
        <div className="px-5 py-4 border-b border-line">
          <p className="text-[11px] font-bold uppercase tracking-wider text-night-muted mb-2.5">
            Top {Math.min(topN, top.length)}
          </p>
          <ul className="space-y-2.5">
            {top.map((skill) => (
              <li
                key={skill.id}
                className="flex items-center justify-between gap-3"
              >
                <div className="min-w-0 flex-1">
                  <p className="text-[13.5px] font-semibold text-night truncate">
                    {skill.name}
                  </p>
                  {skill.level ? (
                    <p className="text-[11.5px] text-night-muted">
                      {LEVEL_LABELS[skill.level]}
                    </p>
                  ) : null}
                </div>
                {skill.endorsements_count > 0 ? (
                  <span className="text-[11.5px] font-semibold text-gold-deep shrink-0">
                    {skill.endorsements_count} validation
                    {skill.endorsements_count > 1 ? "s" : ""}
                  </span>
                ) : null}
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      {/* Rest */}
      {rest.length > 0 ? (
        <div className="px-5 py-4">
          <p className="text-[11px] font-bold uppercase tracking-wider text-night-muted mb-2.5">
            Autres
          </p>
          <div className="flex flex-wrap gap-2">
            {rest.map((skill) => (
              <span
                key={skill.id}
                className="inline-flex items-center gap-1 px-3 py-1.5 rounded-full bg-bg-soft border border-line text-[12.5px] text-night-soft"
              >
                {skill.name}
                {skill.endorsements_count > 0 ? (
                  <span className="text-night-dim">
                    · {skill.endorsements_count}
                  </span>
                ) : null}
              </span>
            ))}
          </div>
        </div>
      ) : null}
    </section>
  );
}
