/* Cercles DIVARC — Taxonomie des catégories (Chantier 1.4).
 *
 * 18 catégories top-level + flags `sensitive` qui déclenchent modération
 * renforcée (Chantier 4.3). Chaque catégorie a :
 *   - id : slug stable utilisé en DB (circles.primary_category)
 *   - label : libellé FR affiché à l'user
 *   - icon : nom d'icône Lucide (importée dynamiquement côté UI)
 *   - description : 1 ligne pour aider à choisir au moment de la création
 *   - sensitive : modération renforcée (Chantier 4)
 *   - disabled : catégorie temporairement désactivée (NSFW V1)
 */

export type CircleCategoryId =
  | "tech"
  | "business"
  | "lifestyle"
  | "culture"
  | "education"
  | "parenting"
  | "local"
  | "support"
  | "gaming"
  | "creators"
  | "hobbies"
  | "spirituality"
  | "activism"
  | "lgbtq"
  | "identity"
  | "pro_communities"
  | "dating"
  | "nsfw";

export type CircleCategory = {
  id: CircleCategoryId;
  label: string;
  icon: string;
  description: string;
  /* Modération renforcée requise (anti-harcèlement, anti-désinformation, etc.). */
  sensitive?: boolean;
  /* Vérification d'âge obligatoire (18+). */
  age_gated?: boolean;
  /* Désactivé en V1 (conformité). */
  disabled?: boolean;
};

export const CIRCLE_CATEGORIES: ReadonlyArray<CircleCategory> = [
  {
    id: "tech",
    label: "Tech & Numérique",
    icon: "Code",
    description: "Devs, startups, AI, hardware, cybersécurité.",
  },
  {
    id: "business",
    label: "Business & Carrière",
    icon: "Briefcase",
    description: "Entrepreneurs, finance, marketing, ventes.",
  },
  {
    id: "lifestyle",
    label: "Lifestyle & Bien-être",
    icon: "Heart",
    description: "Sport, santé, cuisine, voyage, mode.",
  },
  {
    id: "culture",
    label: "Culture & Arts",
    icon: "Palette",
    description: "Musique, cinéma, lecture, photo, théâtre.",
  },
  {
    id: "education",
    label: "Apprentissage & Éducation",
    icon: "GraduationCap",
    description: "Étudiants, formations, langues, tutorat.",
  },
  {
    id: "parenting",
    label: "Famille & Parentalité",
    icon: "Baby",
    description: "Parents, futurs parents, éducation des enfants.",
  },
  {
    id: "local",
    label: "Local & Proximité",
    icon: "MapPin",
    description: "Communautés géographiques (quartier, ville, région).",
  },
  {
    id: "support",
    label: "Entraide & Soutien",
    icon: "HandHelping",
    description: "Maladies, aidants, deuil, addictions, situations difficiles.",
    sensitive: true,
  },
  {
    id: "gaming",
    label: "Gaming",
    icon: "Gamepad2",
    description: "Jeux vidéo, esports, modding, communautés MMO.",
  },
  {
    id: "creators",
    label: "Créateurs de contenu",
    icon: "Sparkles",
    description: "Influenceurs, YouTubeurs, podcasters, streamers.",
  },
  {
    id: "hobbies",
    label: "Loisirs créatifs",
    icon: "Brush",
    description: "DIY, bricolage, jardinage, modélisme, couture.",
  },
  {
    id: "spirituality",
    label: "Spiritualité & Philosophie",
    icon: "Sun",
    description: "Yoga, méditation, religion, philosophie de vie.",
    sensitive: true,
  },
  {
    id: "activism",
    label: "Engagement & Causes",
    icon: "Megaphone",
    description: "Écologie, solidarité, droits humains, citoyenneté.",
    sensitive: true,
  },
  {
    id: "lgbtq",
    label: "LGBTQ+ & Diversité",
    icon: "Rainbow",
    description: "Espaces safe pour communautés LGBTQ+.",
    sensitive: true,
  },
  {
    id: "identity",
    label: "Identité & Origines",
    icon: "Globe",
    description: "Diasporas, cultures, langues, traditions.",
  },
  {
    id: "pro_communities",
    label: "Communautés Pro",
    icon: "Building2",
    description: "Métiers, secteurs, syndicats professionnels.",
  },
  {
    id: "dating",
    label: "Rencontres",
    icon: "Heart",
    description: "Rencontres amicales, amoureuses, entre célibataires.",
    age_gated: true,
  },
  {
    id: "nsfw",
    label: "NSFW (18+)",
    icon: "AlertCircle",
    description: "Contenu adulte (catégorie indisponible en V1).",
    age_gated: true,
    disabled: true,
  },
];

const _byId = new Map(CIRCLE_CATEGORIES.map((c) => [c.id, c]));

export function getCircleCategory(
  id: string | null | undefined,
): CircleCategory | null {
  if (!id) return null;
  return _byId.get(id as CircleCategoryId) ?? null;
}

/* Liste des catégories disponibles à la création (exclut disabled). */
export function listAvailableCircleCategories(): ReadonlyArray<CircleCategory> {
  return CIRCLE_CATEGORIES.filter((c) => !c.disabled);
}

/* Vérifie si une catégorie nécessite l'âge 18+. */
export function isAgeGatedCategory(id: string | null | undefined): boolean {
  return !!getCircleCategory(id)?.age_gated;
}

/* Vérifie si une catégorie demande modération renforcée. */
export function isSensitiveCategory(id: string | null | undefined): boolean {
  return !!getCircleCategory(id)?.sensitive;
}
