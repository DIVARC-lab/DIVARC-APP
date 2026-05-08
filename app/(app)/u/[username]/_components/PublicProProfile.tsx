"use client";

import {
  Award,
  Building2,
  GraduationCap,
  Languages,
  MapPin,
  Sparkles,
  ThumbsUp,
} from "lucide-react";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import { cn } from "@/lib/utils/cn";
import type {
  ProfileCertification,
  ProfileEducation,
  ProfileExperience,
  ProfileLanguage,
  ProfileSkill,
} from "@/lib/database.types";
import { endorseSkill, unendorseSkill } from "@/app/(app)/profile/pro-actions";

const EMPLOYMENT_LABELS: Record<string, string> = {
  cdi: "CDI",
  cdd: "CDD",
  freelance: "Freelance",
  mission: "Mission",
  alternance: "Alternance",
  stage: "Stage",
  benevolat: "Bénévolat",
};

const WORK_MODE_LABELS: Record<string, string> = {
  on_site: "Sur site",
  remote: "Télétravail",
  hybrid: "Hybride",
};

const SKILL_LEVEL_LABELS: Record<string, string> = {
  beginner: "Débutant",
  intermediate: "Intermédiaire",
  advanced: "Avancé",
  expert: "Expert",
};

type Props = {
  experiences: ProfileExperience[];
  education: ProfileEducation[];
  skills: ProfileSkill[];
  languages: ProfileLanguage[];
  certifications: ProfileCertification[];
  isOwner: boolean;
  endorsedSkillIds: string[];
};

export function PublicProProfile(props: Props) {
  const hasAny =
    props.experiences.length > 0 ||
    props.education.length > 0 ||
    props.skills.length > 0 ||
    props.languages.length > 0 ||
    props.certifications.length > 0;

  if (!hasAny) {
    return (
      <div className="text-center py-12 px-6 rounded-3xl bg-white border border-line">
        <div
          aria-hidden
          className="w-16 h-16 mx-auto rounded-2xl bg-gradient-to-br from-cream to-gold/15 border border-gold/30 flex items-center justify-center mb-4 text-3xl leading-none"
        >
          📋
        </div>
        <h3 className="font-display text-xl text-night">
          Profil pro pas encore renseigné
        </h3>
        <p className="mt-2 text-sm text-muted">
          {props.isOwner
            ? "Va dans Profil → Pro pour ajouter expériences, formations, compétences."
            : "Cet utilisateur n'a pas encore complété son profil pro."}
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {props.experiences.length > 0 ? (
        <Section title="Expériences" icon={Building2}>
          <div className="space-y-4">
            {props.experiences.map((exp) => (
              <ExperienceItem key={exp.id} experience={exp} />
            ))}
          </div>
        </Section>
      ) : null}

      {props.education.length > 0 ? (
        <Section title="Formations" icon={GraduationCap}>
          <div className="space-y-4">
            {props.education.map((ed) => (
              <EducationItem key={ed.id} education={ed} />
            ))}
          </div>
        </Section>
      ) : null}

      {props.skills.length > 0 ? (
        <Section title="Compétences" icon={Sparkles}>
          <div className="flex flex-wrap gap-2">
            {props.skills.map((skill) => (
              <SkillChip
                key={skill.id}
                skill={skill}
                isOwner={props.isOwner}
                alreadyEndorsed={props.endorsedSkillIds.includes(skill.id)}
              />
            ))}
          </div>
        </Section>
      ) : null}

      {props.languages.length > 0 ? (
        <Section title="Langues" icon={Languages}>
          <div className="flex flex-wrap gap-2">
            {props.languages.map((lang) => (
              <span
                key={lang.id}
                className={cn(
                  "inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-sm border",
                  lang.level === "native"
                    ? "bg-gold/15 border-gold/40 text-night"
                    : "bg-night/5 border-line text-night",
                )}
              >
                <span className="font-medium">{lang.name}</span>
                <span className="text-[10px] font-bold uppercase tracking-widest text-gold-deep">
                  {lang.level === "native" ? "Native" : lang.level}
                </span>
              </span>
            ))}
          </div>
        </Section>
      ) : null}

      {props.certifications.length > 0 ? (
        <Section title="Certifications" icon={Award}>
          <div className="space-y-3">
            {props.certifications.map((c) => (
              <CertificationItem key={c.id} certification={c} />
            ))}
          </div>
        </Section>
      ) : null}
    </div>
  );
}

function Section({
  title,
  icon: Icon,
  children,
}: {
  title: string;
  icon: typeof Sparkles;
  children: React.ReactNode;
}) {
  return (
    <article className="rounded-3xl border border-line bg-white p-6 sm:p-7 shadow-soft">
      <header className="flex items-center gap-3 mb-5">
        <span className="w-10 h-10 rounded-2xl bg-gradient-to-br from-cream to-gold/15 border border-gold/30 flex items-center justify-center shrink-0">
          <Icon className="w-4 h-4 text-gold-deep" aria-hidden />
        </span>
        <h3 className="font-display text-xl text-night">{title}</h3>
      </header>
      {children}
    </article>
  );
}

function ExperienceItem({ experience }: { experience: ProfileExperience }) {
  return (
    <div>
      <p className="font-semibold text-night">{experience.title}</p>
      <p className="text-sm text-night-muted">
        {experience.company_name}
        {experience.employment_type
          ? ` · ${EMPLOYMENT_LABELS[experience.employment_type]}`
          : ""}
      </p>
      <p className="text-xs text-muted mt-1 flex flex-wrap items-center gap-x-2 gap-y-0.5">
        <span>
          {formatDateRange(
            experience.start_month,
            experience.end_month,
            experience.is_current,
          )}
        </span>
        {experience.location ? (
          <span className="inline-flex items-center gap-0.5">
            <MapPin className="w-3 h-3" aria-hidden />
            {experience.location}
          </span>
        ) : null}
        {experience.work_mode ? (
          <span>· {WORK_MODE_LABELS[experience.work_mode]}</span>
        ) : null}
      </p>
      {experience.description ? (
        <p className="mt-2 text-sm text-night-muted whitespace-pre-wrap leading-relaxed">
          {experience.description}
        </p>
      ) : null}
    </div>
  );
}

function EducationItem({ education }: { education: ProfileEducation }) {
  return (
    <div>
      <p className="font-semibold text-night">{education.school}</p>
      <p className="text-sm text-night-muted">
        {[education.degree, education.field_of_study].filter(Boolean).join(" · ") ||
          "—"}
      </p>
      <p className="text-xs text-muted mt-1">
        {formatYearRange(education.start_year, education.end_year)}
      </p>
      {education.description ? (
        <p className="mt-2 text-sm text-night-muted whitespace-pre-wrap leading-relaxed">
          {education.description}
        </p>
      ) : null}
    </div>
  );
}

function SkillChip({
  skill,
  isOwner,
  alreadyEndorsed,
}: {
  skill: ProfileSkill;
  isOwner: boolean;
  alreadyEndorsed: boolean;
}) {
  const [pending, startTransition] = useTransition();
  const [endorsed, setEndorsed] = useState(alreadyEndorsed);
  const [count, setCount] = useState(skill.endorsements_count);

  function toggle() {
    if (isOwner) return;
    startTransition(async () => {
      if (endorsed) {
        const result = await unendorseSkill(skill.id);
        if (!result.ok) {
          toast.error(result.error);
          return;
        }
        setEndorsed(false);
        setCount((c) => Math.max(c - 1, 0));
      } else {
        const result = await endorseSkill(skill.id);
        if (!result.ok) {
          toast.error(result.error);
          return;
        }
        setEndorsed(true);
        setCount((c) => c + 1);
      }
    });
  }

  return (
    <span
      className={cn(
        "inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-sm border transition-colors",
        endorsed
          ? "bg-gold/15 border-gold/40 text-night"
          : "bg-night/5 border-line text-night",
      )}
    >
      <span className="font-medium">{skill.name}</span>
      {skill.level ? (
        <span className="text-[10px] font-bold uppercase tracking-widest text-gold-deep">
          {SKILL_LEVEL_LABELS[skill.level]}
        </span>
      ) : null}
      {!isOwner ? (
        <button
          type="button"
          onClick={toggle}
          disabled={pending}
          aria-pressed={endorsed}
          aria-label={endorsed ? "Retirer l'endorsement" : "Endorser cette compétence"}
          className={cn(
            "inline-flex items-center gap-1 pl-2 pr-1 py-0.5 rounded-full text-xs font-semibold transition-colors",
            endorsed
              ? "bg-gold/30 text-night"
              : "bg-white/80 text-night-muted hover:bg-white border border-line",
          )}
        >
          <ThumbsUp className="w-3 h-3" aria-hidden />
          <span>{count}</span>
        </button>
      ) : count > 0 ? (
        <span className="text-xs text-night-muted">· {count} 👏</span>
      ) : null}
    </span>
  );
}

function CertificationItem({
  certification,
}: {
  certification: ProfileCertification;
}) {
  return (
    <div>
      <p className="font-semibold text-night">{certification.name}</p>
      <p className="text-sm text-night-muted">{certification.issuer}</p>
      <p className="text-xs text-muted mt-1">
        {certification.issued_month
          ? `Délivrée ${formatMonth(certification.issued_month)}`
          : ""}
        {certification.expires_month
          ? ` · Expire ${formatMonth(certification.expires_month)}`
          : ""}
      </p>
      {certification.credential_url ? (
        <a
          href={certification.credential_url}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-2 inline-block text-xs font-semibold text-gold-deep hover:underline"
        >
          Voir le certificat ↗
        </a>
      ) : null}
    </div>
  );
}

function formatMonth(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso;
  return date.toLocaleDateString("fr-FR", { month: "long", year: "numeric" });
}

function formatDateRange(
  start: string,
  end: string | null,
  isCurrent: boolean,
): string {
  const startTxt = formatMonth(start);
  if (isCurrent) return `${startTxt} → aujourd'hui`;
  if (!end) return startTxt;
  return `${startTxt} → ${formatMonth(end)}`;
}

function formatYearRange(start: number | null, end: number | null): string {
  if (start && end) return `${start} → ${end}`;
  if (start) return `${start} → aujourd'hui`;
  if (end) return `${end}`;
  return "—";
}
