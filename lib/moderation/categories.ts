import type { ModerationCategory } from "@/lib/database.types";

/* Catégories DSA art. 16 — alignées avec la migration 0046.
 *
 * Source unique de vérité côté frontend (modal de signalement) et côté
 * backend (validation Zod). Les libellés FR sont conçus pour être clairs
 * pour des non-juristes. Les sous-catégories aident à orienter la
 * priorisation et le routing modérateur.
 */
export type ModerationCategoryMeta = {
  id: ModerationCategory;
  label: string;
  helper: string;
  /** Cas concret pour aider l'utilisateur à choisir. */
  example: string;
  /** Mineur/éligibilité : certaines catégories ne s'appliquent qu'à certains targets. */
  applicable_to: ReadonlyArray<
    "post" | "comment" | "user" | "message" | "listing" | "story" | "job"
  >;
  subcategories?: ReadonlyArray<{ id: string; label: string }>;
  /** True = traitement prioritaire absolu (CSAM, self-harm) — escalade équipe T&S. */
  critical?: boolean;
};

export const REPORT_CATEGORIES: readonly ModerationCategoryMeta[] = [
  {
    id: "child_safety",
    label: "Sécurité des mineurs",
    helper: "Contenu mettant en danger un mineur — traitement immédiat.",
    example:
      "Image suspecte d'un enfant, sollicitation, exploitation. Sera escaladé sans délai aux autorités.",
    applicable_to: ["post", "comment", "user", "message", "listing", "story"],
    critical: true,
  },
  {
    id: "self_harm",
    label: "Automutilation ou suicide",
    helper: "Promotion de l'automutilation, du suicide, des troubles alimentaires.",
    example:
      "Glorification du suicide, méthodes détaillées, défi dangereux. L'auteur recevra le numéro 3114.",
    applicable_to: ["post", "comment", "user", "message", "story"],
    critical: true,
    subcategories: [
      { id: "suicide_promotion", label: "Promotion du suicide" },
      { id: "self_injury", label: "Automutilation" },
      { id: "eating_disorder", label: "Troubles alimentaires" },
    ],
  },
  {
    id: "violence",
    label: "Violence ou menaces",
    helper: "Menaces de violence, contenu violent gratuit, incitation au crime.",
    example: "« Je vais te frapper », vidéo de bagarre humiliante, apologie d'un attentat.",
    applicable_to: ["post", "comment", "user", "message", "story"],
    subcategories: [
      { id: "death_threats", label: "Menaces de mort" },
      { id: "physical_threats", label: "Menaces physiques" },
      { id: "graphic_violence", label: "Violence graphique" },
      { id: "terrorism", label: "Apologie du terrorisme" },
    ],
  },
  {
    id: "hate_speech",
    label: "Discours de haine",
    helper: "Attaque visant l'origine, la religion, l'orientation, le handicap, le genre.",
    example: "Insultes racistes, propos antisémites, transphobie, homophobie.",
    applicable_to: ["post", "comment", "user", "message", "story"],
    subcategories: [
      { id: "racism", label: "Racisme" },
      { id: "antisemitism", label: "Antisémitisme" },
      { id: "islamophobia", label: "Islamophobie" },
      { id: "lgbtq", label: "Homophobie / transphobie" },
      { id: "ableism", label: "Validisme / handicap" },
      { id: "sexism", label: "Sexisme" },
      { id: "religious", label: "Discrimination religieuse" },
    ],
  },
  {
    id: "harassment",
    label: "Harcèlement",
    helper: "Cyberharcèlement caractérisé, intimidation répétée, raid coordonné.",
    example: "Plusieurs messages d'insultes, mention en série, dox.",
    applicable_to: ["post", "comment", "user", "message"],
    subcategories: [
      { id: "personal", label: "Harcèlement personnel" },
      { id: "raid", label: "Harcèlement coordonné" },
      { id: "doxxing", label: "Diffusion d'infos personnelles" },
    ],
  },
  {
    id: "nudity_sexual",
    label: "Nudité ou contenu sexuel",
    helper: "Nudité non consentie, pornographie non flaggée, sollicitation sexuelle.",
    example: "Photo intime sans consentement, vidéo pornographique sans avertissement, drague insistante.",
    applicable_to: ["post", "comment", "message", "listing", "story"],
    subcategories: [
      { id: "non_consensual", label: "Diffusion non consentie (revenge porn)" },
      { id: "unmarked_adult", label: "Contenu adulte non flaggué" },
      { id: "unsolicited", label: "Sollicitation non sollicitée" },
    ],
  },
  {
    id: "scam_fraud",
    label: "Arnaque ou fraude",
    helper: "Tentative d'escroquerie, phishing, faux profil, vente trompeuse.",
    example: "Faux site bancaire, demande de virement, marchandise inexistante.",
    applicable_to: ["post", "comment", "user", "message", "listing", "job"],
    subcategories: [
      { id: "phishing", label: "Phishing / hameçonnage" },
      { id: "fake_listing", label: "Annonce frauduleuse" },
      { id: "fake_job", label: "Fausse offre d'emploi" },
      { id: "investment_scam", label: "Arnaque crypto / investissement" },
    ],
  },
  {
    id: "impersonation",
    label: "Usurpation d'identité",
    helper: "Compte se faisant passer pour quelqu'un d'autre.",
    example: "Faux compte d'une personnalité, copie d'un ami, marque contrefaite.",
    applicable_to: ["user", "post", "message"],
  },
  {
    id: "intellectual_property",
    label: "Propriété intellectuelle",
    helper: "Contenu protégé utilisé sans autorisation, contrefaçon.",
    example: "Photo dont je suis l'auteur, marque déposée copiée, vidéo piratée.",
    applicable_to: ["post", "comment", "listing", "story"],
    subcategories: [
      { id: "copyright", label: "Droit d'auteur" },
      { id: "trademark", label: "Marque déposée" },
      { id: "counterfeit", label: "Contrefaçon (marketplace)" },
    ],
  },
  {
    id: "privacy",
    label: "Atteinte à la vie privée",
    helper: "Diffusion de données personnelles d'autrui sans consentement.",
    example: "Mon adresse, mon numéro, ma photo publiée sans accord.",
    applicable_to: ["post", "comment", "user", "message", "story"],
  },
  {
    id: "spam",
    label: "Spam",
    helper: "Pollution massive, contenu répétitif, comportement automatisé.",
    example: "Même message en boucle, faux likes, propagation de liens douteux.",
    applicable_to: ["post", "comment", "user", "message", "listing"],
  },
  {
    id: "illegal_activity",
    label: "Activité illégale",
    helper: "Vente ou promotion de produits/services interdits.",
    example: "Drogues, armes, médicaments sur ordonnance, documents administratifs.",
    applicable_to: ["post", "comment", "user", "message", "listing"],
    subcategories: [
      { id: "drugs", label: "Drogues" },
      { id: "weapons", label: "Armes prohibées" },
      { id: "pharma", label: "Médicaments illicites" },
      { id: "documents", label: "Faux documents" },
      { id: "wildlife", label: "Espèces protégées (CITES)" },
    ],
  },
  {
    id: "other",
    label: "Autre",
    helper: "Mon problème ne correspond à aucune des catégories ci-dessus.",
    example: "Dans ce cas, décris-le précisément à l'étape suivante.",
    applicable_to: ["post", "comment", "user", "message", "listing", "story", "job"],
  },
] as const;

export const CATEGORY_BY_ID: Record<ModerationCategory, ModerationCategoryMeta> =
  REPORT_CATEGORIES.reduce(
    (acc, c) => {
      acc[c.id] = c;
      return acc;
    },
    {} as Record<ModerationCategory, ModerationCategoryMeta>,
  );
