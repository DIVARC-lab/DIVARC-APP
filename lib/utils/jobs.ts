import type {
  ExperienceLevel,
  JobCategory,
  JobType,
  SalaryPeriod,
  WorkMode,
  JobApplicationStatus,
} from "@/lib/database.types";

export const JOB_TYPE_META: Record<JobType, { label: string; emoji: string }> =
  {
    cdi: { label: "CDI", emoji: "💼" },
    cdd: { label: "CDD", emoji: "📝" },
    freelance: { label: "Freelance", emoji: "🚀" },
    mission: { label: "Mission ponctuelle", emoji: "⚡" },
    alternance: { label: "Alternance", emoji: "🎓" },
    stage: { label: "Stage", emoji: "🌱" },
    benevolat: { label: "Bénévolat", emoji: "💛" },
  };

export const JOB_TYPE_LIST = Object.entries(JOB_TYPE_META).map(
  ([id, meta]) => ({ id: id as JobType, ...meta }),
);

export const WORK_MODE_META: Record<WorkMode, { label: string; emoji: string }> =
  {
    on_site: { label: "Sur place", emoji: "🏢" },
    remote: { label: "Télétravail", emoji: "🏠" },
    hybrid: { label: "Hybride", emoji: "🔀" },
  };

export const EXPERIENCE_META: Record<ExperienceLevel, string> = {
  debutant: "Débutant·e",
  junior: "Junior",
  intermediaire: "Intermédiaire",
  senior: "Senior",
  expert: "Expert·e",
};

export const SALARY_PERIOD_META: Record<SalaryPeriod, string> = {
  hour: "/ heure",
  day: "/ jour",
  month: "/ mois",
  year: "/ an",
  project: "/ projet",
};

export const JOB_CATEGORY_META: Record<
  JobCategory,
  { label: string; emoji: string }
> = {
  tech: { label: "Tech & Dév", emoji: "💻" },
  design: { label: "Design", emoji: "🎨" },
  marketing: { label: "Marketing", emoji: "📣" },
  ventes: { label: "Ventes & Business", emoji: "📈" },
  rh: { label: "Ressources humaines", emoji: "🤝" },
  finance: { label: "Finance & Compta", emoji: "💰" },
  juridique: { label: "Juridique", emoji: "⚖️" },
  conseil: { label: "Conseil", emoji: "🧭" },
  enseignement: { label: "Enseignement", emoji: "📚" },
  sante: { label: "Santé", emoji: "🩺" },
  artisanat: { label: "Artisanat & Manuel", emoji: "🛠️" },
  restauration: { label: "Restauration & Hôtellerie", emoji: "🍽️" },
  transport: { label: "Transport & Logistique", emoji: "🚚" },
  service: { label: "Services à la personne", emoji: "🧹" },
  autre: { label: "Autre", emoji: "💫" },
};

export const JOB_CATEGORY_LIST = Object.entries(JOB_CATEGORY_META).map(
  ([id, meta]) => ({ id: id as JobCategory, ...meta }),
);

export const APPLICATION_STATUS_META: Record<
  JobApplicationStatus,
  { label: string; tone: "neutral" | "blue" | "green" | "red" | "muted" }
> = {
  pending: { label: "En attente", tone: "blue" },
  reviewed: { label: "Lue", tone: "neutral" },
  accepted: { label: "Acceptée", tone: "green" },
  rejected: { label: "Refusée", tone: "red" },
  withdrawn: { label: "Retirée", tone: "muted" },
};
