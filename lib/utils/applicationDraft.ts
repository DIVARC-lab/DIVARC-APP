import type {
  Job,
  Profile,
  ProfileExperience,
  ProfileSkill,
} from "@/lib/database.types";

const EXPERIENCE_LEVEL_LABELS: Record<string, string> = {
  debutant: "débutant",
  junior: "junior",
  intermediaire: "intermédiaire",
  senior: "senior",
  expert: "expert",
};

/** Construit un brouillon de lettre de motivation FR à partir des
 * données de profil pro. Pas d'IA externe — recettage manuel : titre +
 * accroche + 1-2 expériences clés + top compétences + clôture. */
export function buildApplicationDraft(args: {
  profile: Pick<Profile, "full_name" | "headline" | "location"> | null;
  job: Pick<Job, "title" | "company_name" | "location" | "experience_level">;
  experiences: ProfileExperience[];
  skills: ProfileSkill[];
}): string {
  const { profile, job, experiences, skills } = args;
  const firstName = profile?.full_name?.split(" ")[0] ?? "";
  const company = job.company_name ?? "votre équipe";
  const expLabel = EXPERIENCE_LEVEL_LABELS[job.experience_level] ?? job.experience_level;

  const lines: string[] = [];

  // Salutation + accroche
  lines.push(`Bonjour,`);
  lines.push("");
  lines.push(
    `Le poste « ${job.title} » chez ${company} retient mon attention. Voici en quelques lignes pourquoi je pense pouvoir y apporter de la valeur.`,
  );
  lines.push("");

  // Profil court
  if (profile?.headline) {
    lines.push(`En quelques mots : ${profile.headline}.`);
    lines.push("");
  }

  // Expériences clés (les 2 plus récentes)
  const top = experiences.slice(0, 2);
  if (top.length > 0) {
    lines.push("Expériences récentes :");
    for (const e of top) {
      const period = formatPeriod(e.start_month, e.end_month, e.is_current);
      lines.push(`• ${e.title} chez ${e.company_name}${period ? ` (${period})` : ""}.`);
    }
    lines.push("");
  }

  // Compétences clés (top 6 par endorsements)
  const topSkills = skills.slice(0, 6).map((s) => s.name);
  if (topSkills.length > 0) {
    lines.push(`Compétences clés : ${topSkills.join(", ")}.`);
    lines.push("");
  }

  // Adéquation niveau / lieu
  if (expLabel) {
    lines.push(
      `Le niveau ${expLabel} demandé correspond à mon parcours actuel.`,
    );
  }
  if (profile?.location && job.location) {
    lines.push(`Je suis basé à ${profile.location}.`);
  }
  lines.push("");

  // Disponibilité + clôture
  lines.push(
    "Je serais ravi d'échanger sur le poste et vos enjeux.",
  );
  lines.push(
    `Très bonne journée,${firstName ? "\n" + firstName : ""}`,
  );

  return lines.join("\n");
}

function formatPeriod(
  start: string,
  end: string | null,
  isCurrent: boolean,
): string {
  const sy = year(start);
  if (isCurrent) return `${sy} → aujourd'hui`;
  if (!end) return sy;
  const ey = year(end);
  if (sy === ey) return sy;
  return `${sy} → ${ey}`;
}

function year(iso: string): string {
  const m = iso.match(/^(\d{4})/);
  return m ? m[1]! : "";
}
