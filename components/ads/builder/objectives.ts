import {
  Briefcase,
  Eye,
  FileText,
  Globe,
  Heart,
  MessageCircle,
  Megaphone,
  ShoppingBag,
  Sparkles,
  Target,
  TrendingUp,
  Users,
  Video,
} from "lucide-react";

/* Catalogue d'objectifs inspiré Meta Ads Manager + LinkedIn Campaign
 * Manager. 3 catégories : Notoriété / Considération / Conversion.
 *
 * Chaque objectif :
 *   - id (matche l'enum DB)
 *   - label court
 *   - icon + couleur
 *   - description value-prop concrète pour aider l'annonceur
 *   - exemple ("À utiliser quand...")
 *   - default optimization_goal + billing_event (le wizard les
 *     présélectionne)
 */
export type ObjectiveCategory = {
  id: "awareness" | "consideration" | "conversion";
  label: string;
  description: string;
  items: ObjectiveDef[];
};

export type ObjectiveDef = {
  id: string;
  label: string;
  description: string;
  example: string;
  icon: typeof Megaphone;
  color: string;
  defaultOptimizationGoal: string;
  defaultBillingEvent: string;
};

export const OBJECTIVE_CATALOG: readonly ObjectiveCategory[] = [
  {
    id: "awareness",
    label: "Notoriété",
    description:
      "Faire connaître ta marque ou un nouveau produit au plus grand nombre.",
    items: [
      {
        id: "brand_awareness",
        label: "Notoriété de marque",
        description:
          "Touche les utilisateurs les plus susceptibles de mémoriser ton message.",
        example: "Lancement d'une nouvelle marque, mémorisation d'un slogan.",
        icon: Megaphone,
        color: "text-violet-600 bg-violet-50",
        defaultOptimizationGoal: "reach",
        defaultBillingEvent: "impressions",
      },
      {
        id: "reach",
        label: "Portée maximale",
        description:
          "Atteins le plus grand nombre d'utilisateurs uniques avec ton budget.",
        example: "Annonce d'un événement, communication large.",
        icon: Globe,
        color: "text-blue-600 bg-blue-50",
        defaultOptimizationGoal: "reach",
        defaultBillingEvent: "impressions",
      },
    ],
  },
  {
    id: "consideration",
    label: "Considération",
    description: "Inciter les utilisateurs à interagir avec ta marque.",
    items: [
      {
        id: "traffic",
        label: "Trafic vers ton site",
        description:
          "Génère des clics vers une page externe (site, app, fiche produit).",
        example: "E-commerce, lecture d'article, téléchargement.",
        icon: TrendingUp,
        color: "text-emerald-600 bg-emerald-50",
        defaultOptimizationGoal: "link_clicks",
        defaultBillingEvent: "clicks",
      },
      {
        id: "engagement",
        label: "Engagement sur la pub",
        description:
          "Maximise les likes, commentaires, partages, sauvegardes.",
        example: "Publication produit, contenu viral, communauté.",
        icon: Heart,
        color: "text-rose-600 bg-rose-50",
        defaultOptimizationGoal: "post_engagement",
        defaultBillingEvent: "impressions",
      },
      {
        id: "video_views",
        label: "Vues vidéo",
        description:
          "Optimise pour les utilisateurs qui regardent ta vidéo plus longtemps.",
        example: "Vidéo de marque, démo produit, témoignage.",
        icon: Video,
        color: "text-indigo-600 bg-indigo-50",
        defaultOptimizationGoal: "thruplay",
        defaultBillingEvent: "video_views",
      },
      {
        id: "lead_generation",
        label: "Génération de leads",
        description:
          "Collecte des coordonnées via un formulaire natif DIVARC.",
        example: "Newsletter, demande de devis, livre blanc.",
        icon: FileText,
        color: "text-amber-600 bg-amber-50",
        defaultOptimizationGoal: "lead_generation",
        defaultBillingEvent: "impressions",
      },
      {
        id: "messages",
        label: "Conversations",
        description: "Pousse les utilisateurs à t'envoyer un message direct.",
        example: "Service client, prise de rendez-vous, commande directe.",
        icon: MessageCircle,
        color: "text-cyan-600 bg-cyan-50",
        defaultOptimizationGoal: "messages_initiated",
        defaultBillingEvent: "impressions",
      },
    ],
  },
  {
    id: "conversion",
    label: "Conversion",
    description: "Pousser à des actions mesurables sur ton site ou DIVARC.",
    items: [
      {
        id: "conversions",
        label: "Conversions sur ton site",
        description:
          "Optimise pour des actions trackées via le DIVARC Pixel (achat, inscription).",
        example: "Vente e-commerce, inscription SaaS, demande de devis.",
        icon: Target,
        color: "text-gold-deep bg-gold/15",
        defaultOptimizationGoal: "conversions",
        defaultBillingEvent: "conversions",
      },
      {
        id: "marketplace_listing_boost",
        label: "Booster une annonce Marketplace",
        description:
          "Mets en avant l'une de tes annonces Marketplace pour la vendre plus vite.",
        example: "Vinted-like, vente d'objets d'occasion, déstockage.",
        icon: ShoppingBag,
        color: "text-fuchsia-600 bg-fuchsia-50",
        defaultOptimizationGoal: "link_clicks",
        defaultBillingEvent: "clicks",
      },
      {
        id: "job_applications",
        label: "Candidatures à une offre",
        description:
          "Atteins les bons profils pour ton offre d'emploi DIVARC.",
        example: "Recrutement tech, métiers en tension, alternance.",
        icon: Briefcase,
        color: "text-sky-600 bg-sky-50",
        defaultOptimizationGoal: "lead_generation",
        defaultBillingEvent: "clicks",
      },
      {
        id: "circle_growth",
        label: "Croissance d'un cercle",
        description:
          "Augmente le nombre de membres d'un cercle thématique DIVARC.",
        example: "Communauté locale, club d'experts, association.",
        icon: Users,
        color: "text-teal-600 bg-teal-50",
        defaultOptimizationGoal: "post_engagement",
        defaultBillingEvent: "impressions",
      },
    ],
  },
] as const;

/* Index helper. */
export const OBJECTIVE_BY_ID: Record<string, ObjectiveDef> =
  OBJECTIVE_CATALOG.flatMap((c) => c.items).reduce(
    (acc, o) => {
      acc[o.id] = o;
      return acc;
    },
    {} as Record<string, ObjectiveDef>,
  );

/* Tag minimaliste pour grouper visuellement. */
export const PRIMARY_OBJECTIVES = [
  "traffic",
  "engagement",
  "conversions",
  "lead_generation",
];

export type { Megaphone };
