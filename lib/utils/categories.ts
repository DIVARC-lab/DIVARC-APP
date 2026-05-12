import type { ListingCategory, ListingCondition } from "@/lib/database.types";

export const CATEGORY_META: Record<
  ListingCategory,
  { label: string; emoji: string; description: string }
> = {
  mode: {
    label: "Mode & beauté",
    emoji: "👗",
    description: "Vêtements, chaussures, sacs, beauté.",
  },
  mobilier: {
    label: "Mobilier & maison",
    emoji: "🛋️",
    description: "Meubles, déco, électroménager.",
  },
  electronique: {
    label: "Électronique",
    emoji: "📱",
    description: "Téléphones, ordinateurs, audio.",
  },
  vehicules: {
    label: "Véhicules",
    emoji: "🚗",
    description: "Voitures, motos, vélos.",
  },
  livres: {
    label: "Livres & loisirs",
    emoji: "📚",
    description: "Livres, BD, jeux, films.",
  },
  sport: {
    label: "Sport",
    emoji: "⚽",
    description: "Équipement, vêtements de sport.",
  },
  musique: {
    label: "Musique",
    emoji: "🎸",
    description: "Instruments, vinyles, matériel.",
  },
  enfants: {
    label: "Bébé & enfants",
    emoji: "🧸",
    description: "Jouets, vêtements, puériculture.",
  },
  jardinage: {
    label: "Jardin & bricolage",
    emoji: "🌱",
    description: "Outils, plantes, matériaux.",
  },
  alimentation: {
    label: "Alimentation",
    emoji: "🍎",
    description: "Produits frais, épicerie, artisanat.",
  },
  artisanat: {
    label: "Artisanat",
    emoji: "🎨",
    description: "Créations faites main.",
  },
  services: {
    label: "Services",
    emoji: "🛠️",
    description: "Cours, dépannage, garde, etc.",
  },
  autre: {
    label: "Autre",
    emoji: "📦",
    description: "Tout le reste.",
  },
};

export const CATEGORY_LIST = Object.entries(CATEGORY_META).map(
  ([id, meta]) => ({ id: id as ListingCategory, ...meta }),
);

export const CONDITION_META: Record<ListingCondition, string> = {
  /* Legacy FR values (rows existantes). */
  new: "Neuf",
  like_new: "Comme neuf",
  used: "Bon état",
  fair: "État correct",
  /* Nouvelles valeurs Vinted-style (Chantier 1.1). */
  new_with_tags: "Neuf avec étiquettes",
  new_without_tags: "Neuf sans étiquettes",
  very_good: "Très bon état",
  good: "Bon état",
  satisfactory: "État satisfaisant",
  damaged: "Abîmé / pour pièces",
};
