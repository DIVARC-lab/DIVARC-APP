"use client";

import {
  Award,
  Building2,
  GraduationCap,
  Languages,
  Loader2,
  MapPin,
  Plus,
  Sparkles,
  Trash2,
  X,
} from "lucide-react";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/Button";
import {
  Field,
  FieldHint,
  FieldLabel,
} from "@/components/ui/Field";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { cn } from "@/lib/utils/cn";
import type {
  ProfileCertification,
  ProfileEducation,
  ProfileExperience,
  ProfileLanguage,
  ProfileSkill,
} from "@/lib/database.types";
import {
  createCertification,
  createEducation,
  createExperience,
  createLanguage,
  createSkill,
  deleteCertification,
  deleteEducation,
  deleteExperience,
  deleteLanguage,
  deleteSkill,
} from "../pro-actions";

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

const LANGUAGE_LEVELS: Array<{ value: string; label: string }> = [
  { value: "A1", label: "A1 — Notions" },
  { value: "A2", label: "A2 — Élémentaire" },
  { value: "B1", label: "B1 — Pratique" },
  { value: "B2", label: "B2 — Avancé" },
  { value: "C1", label: "C1 — Autonome" },
  { value: "C2", label: "C2 — Maîtrise" },
  { value: "native", label: "Langue maternelle" },
];

type ProSectionsPanelProps = {
  experiences: ProfileExperience[];
  education: ProfileEducation[];
  skills: ProfileSkill[];
  languages: ProfileLanguage[];
  certifications: ProfileCertification[];
};

export function ProSectionsPanel(props: ProSectionsPanelProps) {
  return (
    <div className="space-y-6">
      <ExperiencesSection experiences={props.experiences} />
      <EducationSection education={props.education} />
      <SkillsSection skills={props.skills} />
      <LanguagesSection languages={props.languages} />
      <CertificationsSection certifications={props.certifications} />
    </div>
  );
}

// ============================================================
// Section générique
// ============================================================

function SectionShell({
  title,
  description,
  icon: Icon,
  count,
  children,
}: {
  title: string;
  description: string;
  icon: typeof Sparkles;
  count: number;
  children: React.ReactNode;
}) {
  return (
    <article className="rounded-3xl border border-line bg-white p-6 sm:p-7 shadow-soft">
      <header className="flex items-start justify-between gap-4 mb-5">
        <div className="flex items-start gap-3">
          <span className="w-10 h-10 rounded-2xl bg-gradient-to-br from-cream to-gold/15 border border-gold/30 flex items-center justify-center shrink-0">
            <Icon className="w-4 h-4 text-gold-deep" aria-hidden />
          </span>
          <div>
            <h3 className="font-display text-xl text-night">
              {title}
              {count > 0 ? (
                <span className="ml-2 text-sm text-muted font-normal">
                  · {count}
                </span>
              ) : null}
            </h3>
            <p className="mt-0.5 text-sm text-muted">{description}</p>
          </div>
        </div>
      </header>
      {children}
    </article>
  );
}

// ============================================================
// Expériences
// ============================================================

function ExperiencesSection({ experiences }: { experiences: ProfileExperience[] }) {
  const [adding, setAdding] = useState(false);
  return (
    <SectionShell
      title="Expériences"
      description="Postes, missions, freelances, bénévolat."
      icon={Building2}
      count={experiences.length}
    >
      <div className="space-y-3">
        {experiences.map((exp) => (
          <ExperienceRow key={exp.id} experience={exp} />
        ))}

        {adding ? (
          <ExperienceForm
            onClose={() => setAdding(false)}
            onSaved={() => setAdding(false)}
          />
        ) : (
          <button
            type="button"
            onClick={() => setAdding(true)}
            className="w-full h-12 rounded-2xl border-2 border-dashed border-line text-sm font-semibold text-night-muted hover:border-night/40 hover:text-night flex items-center justify-center gap-2 transition-colors"
          >
            <Plus className="w-4 h-4" aria-hidden /> Ajouter une expérience
          </button>
        )}
      </div>
    </SectionShell>
  );
}

function ExperienceRow({ experience }: { experience: ProfileExperience }) {
  const [pending, startTransition] = useTransition();

  function handleDelete() {
    if (!confirm(`Supprimer "${experience.title}" ?`)) return;
    startTransition(async () => {
      const result = await deleteExperience(experience.id);
      if (!result.ok) toast.error(result.error);
      else toast.success("Expérience supprimée.");
    });
  }

  return (
    <div className="p-4 rounded-2xl border border-line bg-bg/50 group">
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-night truncate">{experience.title}</p>
          <p className="text-sm text-night-muted truncate">
            {experience.company_name}
            {experience.employment_type
              ? ` · ${EMPLOYMENT_LABELS[experience.employment_type]}`
              : ""}
          </p>
          <p className="text-xs text-muted mt-1 flex flex-wrap items-center gap-x-2 gap-y-0.5">
            <span>{formatDateRange(experience.start_month, experience.end_month, experience.is_current)}</span>
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
            <p className="mt-2 text-sm text-night-muted whitespace-pre-wrap line-clamp-4">
              {experience.description}
            </p>
          ) : null}
        </div>
        <button
          type="button"
          onClick={handleDelete}
          disabled={pending}
          aria-label="Supprimer"
          className="opacity-0 group-hover:opacity-100 w-8 h-8 rounded-full text-red-500 hover:bg-red-50 flex items-center justify-center transition-opacity"
        >
          {pending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
        </button>
      </div>
    </div>
  );
}

function ExperienceForm({
  onClose,
  onSaved,
}: {
  onClose: () => void;
  onSaved: () => void;
}) {
  const [pending, startTransition] = useTransition();
  const [isCurrent, setIsCurrent] = useState(false);

  function handleSubmit(formData: FormData) {
    startTransition(async () => {
      const result = await createExperience(formData);
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      toast.success("Expérience ajoutée.");
      onSaved();
    });
  }

  return (
    <form
      action={handleSubmit}
      className="p-5 rounded-2xl border-2 border-night/20 bg-white space-y-4"
    >
      <div className="grid sm:grid-cols-2 gap-3">
        <Field>
          <FieldLabel htmlFor="exp_title" required>
            Intitulé du poste
          </FieldLabel>
          <Input id="exp_title" name="title" required maxLength={120} />
        </Field>
        <Field>
          <FieldLabel htmlFor="exp_company" required>
            Entreprise
          </FieldLabel>
          <Input id="exp_company" name="company_name" required maxLength={120} />
        </Field>
        <Field>
          <FieldLabel htmlFor="exp_employment">Type</FieldLabel>
          <Select id="exp_employment" name="employment_type" defaultValue="">
            <option value="">Non précisé</option>
            {Object.entries(EMPLOYMENT_LABELS).map(([v, l]) => (
              <option key={v} value={v}>
                {l}
              </option>
            ))}
          </Select>
        </Field>
        <Field>
          <FieldLabel htmlFor="exp_mode">Mode</FieldLabel>
          <Select id="exp_mode" name="work_mode" defaultValue="">
            <option value="">Non précisé</option>
            {Object.entries(WORK_MODE_LABELS).map(([v, l]) => (
              <option key={v} value={v}>
                {l}
              </option>
            ))}
          </Select>
        </Field>
        <Field>
          <FieldLabel htmlFor="exp_location">Lieu</FieldLabel>
          <Input id="exp_location" name="location" maxLength={120} />
        </Field>
        <Field>
          <FieldLabel htmlFor="exp_start" required>
            Début
          </FieldLabel>
          <Input id="exp_start" name="start_month" type="month" required />
        </Field>
        <Field>
          <FieldLabel htmlFor="exp_end">Fin</FieldLabel>
          <Input
            id="exp_end"
            name="end_month"
            type="month"
            disabled={isCurrent}
          />
        </Field>
        <Field className="sm:col-span-2">
          <label className="flex items-center gap-2 text-sm text-night cursor-pointer">
            <input
              type="checkbox"
              name="is_current"
              checked={isCurrent}
              onChange={(e) => setIsCurrent(e.currentTarget.checked)}
              className="w-4 h-4 rounded border-line"
            />
            <span>Poste actuel</span>
          </label>
        </Field>
        <Field className="sm:col-span-2">
          <FieldLabel htmlFor="exp_desc">Description</FieldLabel>
          <textarea
            id="exp_desc"
            name="description"
            rows={4}
            maxLength={4000}
            className="w-full rounded-xl border border-line bg-white px-4 py-3 text-sm focus:outline-none focus:border-night focus:ring-2 focus:ring-night/15"
            placeholder="Tes responsabilités, tes accomplissements..."
          />
          <FieldHint>4000 caractères max.</FieldHint>
        </Field>
      </div>
      <div className="flex justify-end gap-2 pt-2 border-t border-line">
        <Button type="button" variant="ghost" size="sm" onClick={onClose} disabled={pending}>
          <X className="w-4 h-4" />
          Annuler
        </Button>
        <Button type="submit" size="sm" loading={pending}>
          Ajouter
        </Button>
      </div>
    </form>
  );
}

// ============================================================
// Formations
// ============================================================

function EducationSection({ education }: { education: ProfileEducation[] }) {
  const [adding, setAdding] = useState(false);
  return (
    <SectionShell
      title="Formations"
      description="Diplômes, écoles, programmes, certifications longues."
      icon={GraduationCap}
      count={education.length}
    >
      <div className="space-y-3">
        {education.map((ed) => (
          <EducationRow key={ed.id} education={ed} />
        ))}
        {adding ? (
          <EducationForm
            onClose={() => setAdding(false)}
            onSaved={() => setAdding(false)}
          />
        ) : (
          <button
            type="button"
            onClick={() => setAdding(true)}
            className="w-full h-12 rounded-2xl border-2 border-dashed border-line text-sm font-semibold text-night-muted hover:border-night/40 hover:text-night flex items-center justify-center gap-2 transition-colors"
          >
            <Plus className="w-4 h-4" aria-hidden /> Ajouter une formation
          </button>
        )}
      </div>
    </SectionShell>
  );
}

function EducationRow({ education }: { education: ProfileEducation }) {
  const [pending, startTransition] = useTransition();
  function handleDelete() {
    if (!confirm(`Supprimer "${education.school}" ?`)) return;
    startTransition(async () => {
      const result = await deleteEducation(education.id);
      if (!result.ok) toast.error(result.error);
      else toast.success("Formation supprimée.");
    });
  }

  return (
    <div className="p-4 rounded-2xl border border-line bg-bg/50 group">
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-night truncate">{education.school}</p>
          <p className="text-sm text-night-muted truncate">
            {[education.degree, education.field_of_study].filter(Boolean).join(" · ") || "—"}
          </p>
          <p className="text-xs text-muted mt-1">
            {formatYearRange(education.start_year, education.end_year)}
          </p>
          {education.description ? (
            <p className="mt-2 text-sm text-night-muted whitespace-pre-wrap line-clamp-4">
              {education.description}
            </p>
          ) : null}
        </div>
        <button
          type="button"
          onClick={handleDelete}
          disabled={pending}
          aria-label="Supprimer"
          className="opacity-0 group-hover:opacity-100 w-8 h-8 rounded-full text-red-500 hover:bg-red-50 flex items-center justify-center transition-opacity"
        >
          {pending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
        </button>
      </div>
    </div>
  );
}

function EducationForm({
  onClose,
  onSaved,
}: {
  onClose: () => void;
  onSaved: () => void;
}) {
  const [pending, startTransition] = useTransition();

  function handleSubmit(formData: FormData) {
    startTransition(async () => {
      const result = await createEducation(formData);
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      toast.success("Formation ajoutée.");
      onSaved();
    });
  }

  return (
    <form
      action={handleSubmit}
      className="p-5 rounded-2xl border-2 border-night/20 bg-white space-y-4"
    >
      <div className="grid sm:grid-cols-2 gap-3">
        <Field className="sm:col-span-2">
          <FieldLabel htmlFor="ed_school" required>
            École / institution
          </FieldLabel>
          <Input id="ed_school" name="school" required maxLength={160} />
        </Field>
        <Field>
          <FieldLabel htmlFor="ed_degree">Diplôme</FieldLabel>
          <Input id="ed_degree" name="degree" maxLength={120} />
        </Field>
        <Field>
          <FieldLabel htmlFor="ed_field">Spécialité</FieldLabel>
          <Input id="ed_field" name="field_of_study" maxLength={120} />
        </Field>
        <Field>
          <FieldLabel htmlFor="ed_start">Année de début</FieldLabel>
          <Input id="ed_start" name="start_year" type="number" min={1900} max={2100} />
        </Field>
        <Field>
          <FieldLabel htmlFor="ed_end">Année de fin</FieldLabel>
          <Input id="ed_end" name="end_year" type="number" min={1900} max={2100} />
        </Field>
        <Field className="sm:col-span-2">
          <FieldLabel htmlFor="ed_desc">Description</FieldLabel>
          <textarea
            id="ed_desc"
            name="description"
            rows={3}
            maxLength={2000}
            className="w-full rounded-xl border border-line bg-white px-4 py-3 text-sm focus:outline-none focus:border-night focus:ring-2 focus:ring-night/15"
          />
        </Field>
      </div>
      <div className="flex justify-end gap-2 pt-2 border-t border-line">
        <Button type="button" variant="ghost" size="sm" onClick={onClose} disabled={pending}>
          <X className="w-4 h-4" />
          Annuler
        </Button>
        <Button type="submit" size="sm" loading={pending}>
          Ajouter
        </Button>
      </div>
    </form>
  );
}

// ============================================================
// Compétences
// ============================================================

function SkillsSection({ skills }: { skills: ProfileSkill[] }) {
  const [pending, startTransition] = useTransition();

  function handleAdd(formData: FormData) {
    startTransition(async () => {
      const result = await createSkill(formData);
      if (!result.ok) toast.error(result.error);
      else toast.success("Compétence ajoutée.");
    });
  }

  function handleDelete(skillId: string) {
    startTransition(async () => {
      const result = await deleteSkill(skillId);
      if (!result.ok) toast.error(result.error);
      else toast.success("Compétence supprimée.");
    });
  }

  return (
    <SectionShell
      title="Compétences"
      description="Tes compétences clés. Tes amis peuvent t'endorser ✨"
      icon={Sparkles}
      count={skills.length}
    >
      <div className="flex flex-wrap gap-2 mb-4">
        {skills.length === 0 ? (
          <p className="text-sm text-muted italic">
            Aucune compétence pour l&apos;instant.
          </p>
        ) : null}
        {skills.map((skill) => (
          <span
            key={skill.id}
            className="inline-flex items-center gap-2 pl-3 pr-1 py-1.5 rounded-full bg-night/5 border border-line text-sm text-night group"
          >
            <span className="font-medium">{skill.name}</span>
            {skill.level ? (
              <span className="text-[10px] font-bold uppercase tracking-widest text-gold-deep">
                {SKILL_LEVEL_LABELS[skill.level]}
              </span>
            ) : null}
            {skill.endorsements_count > 0 ? (
              <span className="text-xs text-night-muted">
                · {skill.endorsements_count} 👏
              </span>
            ) : null}
            <button
              type="button"
              onClick={() => handleDelete(skill.id)}
              disabled={pending}
              aria-label={`Supprimer ${skill.name}`}
              className="w-6 h-6 rounded-full text-red-500 hover:bg-red-50 flex items-center justify-center"
            >
              <X className="w-3 h-3" />
            </button>
          </span>
        ))}
      </div>

      <form
        action={handleAdd}
        className="flex flex-wrap items-end gap-2 pt-3 border-t border-line"
      >
        <Field className="flex-1 min-w-40">
          <FieldLabel htmlFor="sk_name">Compétence</FieldLabel>
          <Input
            id="sk_name"
            name="name"
            maxLength={60}
            placeholder="Ex. Figma, Postgres, Leadership..."
            required
          />
        </Field>
        <Field className="w-44">
          <FieldLabel htmlFor="sk_level">Niveau</FieldLabel>
          <Select id="sk_level" name="level" defaultValue="">
            <option value="">Non précisé</option>
            {Object.entries(SKILL_LEVEL_LABELS).map(([v, l]) => (
              <option key={v} value={v}>
                {l}
              </option>
            ))}
          </Select>
        </Field>
        <Button type="submit" size="md" loading={pending}>
          <Plus className="w-4 h-4" />
          Ajouter
        </Button>
      </form>
    </SectionShell>
  );
}

// ============================================================
// Langues
// ============================================================

function LanguagesSection({ languages }: { languages: ProfileLanguage[] }) {
  const [pending, startTransition] = useTransition();

  function handleAdd(formData: FormData) {
    startTransition(async () => {
      const result = await createLanguage(formData);
      if (!result.ok) toast.error(result.error);
      else toast.success("Langue ajoutée.");
    });
  }

  function handleDelete(id: string) {
    startTransition(async () => {
      const result = await deleteLanguage(id);
      if (!result.ok) toast.error(result.error);
    });
  }

  return (
    <SectionShell
      title="Langues"
      description="Niveaux CECRL (A1-C2) ou langue maternelle."
      icon={Languages}
      count={languages.length}
    >
      <div className="flex flex-wrap gap-2 mb-4">
        {languages.map((lang) => (
          <span
            key={lang.id}
            className={cn(
              "inline-flex items-center gap-2 pl-3 pr-1 py-1.5 rounded-full text-sm border",
              lang.level === "native"
                ? "bg-gold/15 border-gold/40 text-night"
                : "bg-night/5 border-line text-night",
            )}
          >
            <span className="font-medium">{lang.name}</span>
            <span className="text-[10px] font-bold uppercase tracking-widest text-gold-deep">
              {lang.level === "native" ? "Native" : lang.level}
            </span>
            <button
              type="button"
              onClick={() => handleDelete(lang.id)}
              disabled={pending}
              aria-label={`Supprimer ${lang.name}`}
              className="w-6 h-6 rounded-full text-red-500 hover:bg-red-50 flex items-center justify-center"
            >
              <X className="w-3 h-3" />
            </button>
          </span>
        ))}
      </div>

      <form
        action={handleAdd}
        className="flex flex-wrap items-end gap-2 pt-3 border-t border-line"
      >
        <Field className="flex-1 min-w-40">
          <FieldLabel htmlFor="lg_name">Langue</FieldLabel>
          <Input
            id="lg_name"
            name="name"
            maxLength={60}
            placeholder="Ex. Anglais, Espagnol, Wolof..."
            required
          />
        </Field>
        <Field className="w-56">
          <FieldLabel htmlFor="lg_level">Niveau</FieldLabel>
          <Select id="lg_level" name="level" defaultValue="B2">
            {LANGUAGE_LEVELS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </Select>
        </Field>
        <Button type="submit" size="md" loading={pending}>
          <Plus className="w-4 h-4" />
          Ajouter
        </Button>
      </form>
    </SectionShell>
  );
}

// ============================================================
// Certifications
// ============================================================

function CertificationsSection({
  certifications,
}: {
  certifications: ProfileCertification[];
}) {
  const [adding, setAdding] = useState(false);
  return (
    <SectionShell
      title="Certifications"
      description="AWS, Coursera, formations courtes vérifiables..."
      icon={Award}
      count={certifications.length}
    >
      <div className="space-y-3">
        {certifications.map((c) => (
          <CertificationRow key={c.id} certification={c} />
        ))}
        {adding ? (
          <CertificationForm
            onClose={() => setAdding(false)}
            onSaved={() => setAdding(false)}
          />
        ) : (
          <button
            type="button"
            onClick={() => setAdding(true)}
            className="w-full h-12 rounded-2xl border-2 border-dashed border-line text-sm font-semibold text-night-muted hover:border-night/40 hover:text-night flex items-center justify-center gap-2 transition-colors"
          >
            <Plus className="w-4 h-4" aria-hidden /> Ajouter une certification
          </button>
        )}
      </div>
    </SectionShell>
  );
}

function CertificationRow({
  certification,
}: {
  certification: ProfileCertification;
}) {
  const [pending, startTransition] = useTransition();
  function handleDelete() {
    if (!confirm(`Supprimer "${certification.name}" ?`)) return;
    startTransition(async () => {
      const result = await deleteCertification(certification.id);
      if (!result.ok) toast.error(result.error);
      else toast.success("Certification supprimée.");
    });
  }

  return (
    <div className="p-4 rounded-2xl border border-line bg-bg/50 group flex items-start justify-between gap-3">
      <div className="flex-1 min-w-0">
        <p className="font-semibold text-night truncate">{certification.name}</p>
        <p className="text-sm text-night-muted truncate">{certification.issuer}</p>
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
      <button
        type="button"
        onClick={handleDelete}
        disabled={pending}
        aria-label="Supprimer"
        className="opacity-0 group-hover:opacity-100 w-8 h-8 rounded-full text-red-500 hover:bg-red-50 flex items-center justify-center transition-opacity"
      >
        {pending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
      </button>
    </div>
  );
}

function CertificationForm({
  onClose,
  onSaved,
}: {
  onClose: () => void;
  onSaved: () => void;
}) {
  const [pending, startTransition] = useTransition();

  function handleSubmit(formData: FormData) {
    startTransition(async () => {
      const result = await createCertification(formData);
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      toast.success("Certification ajoutée.");
      onSaved();
    });
  }

  return (
    <form
      action={handleSubmit}
      className="p-5 rounded-2xl border-2 border-night/20 bg-white space-y-4"
    >
      <div className="grid sm:grid-cols-2 gap-3">
        <Field className="sm:col-span-2">
          <FieldLabel htmlFor="ct_name" required>
            Nom de la certification
          </FieldLabel>
          <Input id="ct_name" name="name" required maxLength={160} />
        </Field>
        <Field>
          <FieldLabel htmlFor="ct_issuer" required>
            Émetteur
          </FieldLabel>
          <Input id="ct_issuer" name="issuer" required maxLength={120} />
        </Field>
        <Field>
          <FieldLabel htmlFor="ct_url">URL du certificat</FieldLabel>
          <Input id="ct_url" name="credential_url" type="url" placeholder="https://..." />
        </Field>
        <Field>
          <FieldLabel htmlFor="ct_issued">Délivrée le</FieldLabel>
          <Input id="ct_issued" name="issued_month" type="month" />
        </Field>
        <Field>
          <FieldLabel htmlFor="ct_expires">Expire le</FieldLabel>
          <Input id="ct_expires" name="expires_month" type="month" />
        </Field>
      </div>
      <div className="flex justify-end gap-2 pt-2 border-t border-line">
        <Button type="button" variant="ghost" size="sm" onClick={onClose} disabled={pending}>
          <X className="w-4 h-4" />
          Annuler
        </Button>
        <Button type="submit" size="sm" loading={pending}>
          Ajouter
        </Button>
      </div>
    </form>
  );
}

// ============================================================
// Helpers d'affichage
// ============================================================

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

function formatYearRange(
  start: number | null,
  end: number | null,
): string {
  if (start && end) return `${start} → ${end}`;
  if (start) return `${start} → aujourd'hui`;
  if (end) return `${end}`;
  return "—";
}
