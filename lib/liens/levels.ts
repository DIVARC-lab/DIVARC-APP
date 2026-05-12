/* Système de Liens (Chantier 4) — seuils, niveaux, helpers.
 *
 * Le XP s'accumule par-conversation (côté DB via trigger sur messages).
 * Chaque level a un seuil (cumul XP requis pour l'atteindre).
 * Le niveau max V1 est 11 (50 000 XP). */

export const LINK_XP_THRESHOLDS: ReadonlyArray<number> = [
  0,      // niveau 1
  50,     // niveau 2
  150,    // niveau 3
  350,    // niveau 4
  750,    // niveau 5
  1500,   // niveau 6
  3000,   // niveau 7
  6000,   // niveau 8
  12000,  // niveau 9
  25000,  // niveau 10
  50000,  // niveau 11
];

export const MAX_LEVEL = LINK_XP_THRESHOLDS.length; // 11

/* Labels par niveau (vocabulaire DIVARC : signature). */
export const LEVEL_LABELS: ReadonlyArray<{
  label: string;
  emoji: string;
  description: string;
}> = [
  { label: "Étincelle", emoji: "✨", description: "Premier contact" },
  { label: "Connexion", emoji: "🔗", description: "Lien en formation" },
  { label: "Complicité", emoji: "🤝", description: "Échanges réguliers" },
  { label: "Alliance", emoji: "🤍", description: "Confiance établie" },
  { label: "Cercle", emoji: "⭕", description: "Lien profond" },
  { label: "Constellation", emoji: "🌌", description: "Présence quotidienne" },
  { label: "Forge", emoji: "🔥", description: "Lien forgé dans la durée" },
  { label: "Pacte d'or", emoji: "🏆", description: "Amitié rare" },
  { label: "Légende", emoji: "👑", description: "Lien légendaire" },
  { label: "Mythe", emoji: "💎", description: "Au-delà des mots" },
  { label: "Éternité", emoji: "♾️", description: "Lien éternel" },
];

export type LinkLevelInfo = {
  level: number;
  xp: number;
  label: string;
  emoji: string;
  description: string;
  /* XP requis pour atteindre le niveau actuel. */
  currentThreshold: number;
  /* XP requis pour le niveau suivant (null si max). */
  nextThreshold: number | null;
  /* XP dans le niveau actuel (xp - currentThreshold). */
  xpInLevel: number;
  /* XP requis dans le niveau actuel pour passer au suivant. */
  xpRequiredForNext: number | null;
  /* Progression 0-1 vers le niveau suivant (1 si max). */
  progressRatio: number;
};

export function getLinkLevelInfo(xp: number | null | undefined): LinkLevelInfo {
  const safeXp = Math.max(0, xp ?? 0);

  /* Trouve le niveau courant. */
  let level = 1;
  for (let i = LINK_XP_THRESHOLDS.length - 1; i >= 0; i--) {
    if (safeXp >= LINK_XP_THRESHOLDS[i]!) {
      level = i + 1;
      break;
    }
  }

  const idx = level - 1;
  const currentThreshold = LINK_XP_THRESHOLDS[idx] ?? 0;
  const nextThreshold =
    level < MAX_LEVEL ? (LINK_XP_THRESHOLDS[idx + 1] ?? null) : null;
  const labelInfo =
    LEVEL_LABELS[idx] ??
    ({
      label: "Niveau " + level,
      emoji: "✨",
      description: "",
    } as const);

  const xpInLevel = safeXp - currentThreshold;
  const xpRequiredForNext =
    nextThreshold !== null ? nextThreshold - currentThreshold : null;
  const progressRatio =
    xpRequiredForNext === null
      ? 1
      : Math.min(1, Math.max(0, xpInLevel / xpRequiredForNext));

  return {
    level,
    xp: safeXp,
    label: labelInfo.label,
    emoji: labelInfo.emoji,
    description: labelInfo.description,
    currentThreshold,
    nextThreshold,
    xpInLevel,
    xpRequiredForNext,
    progressRatio,
  };
}

/* Formate le streak en label court. */
export function formatStreak(streakDays: number | null | undefined): string {
  const n = streakDays ?? 0;
  if (n <= 0) return "";
  return `${n}j`;
}
