/* Catalogue de sentiments et activités pour le plugin "Moment".
 *
 * Sentiments : 60 valeurs Facebook-style (emoji + label FR).
 * Activités : 8 types (regarde, écoute…) avec ou sans détail libre.
 *
 * Ordre = ordre d'apparition dans le picker (les plus fréquents d'abord).
 */

import type { PostActivityType } from "@/lib/database.types";

export type SentimentOption = {
  emoji: string;
  /** Label affiché : "heureux", "triste"… (lowercase pour fluidité dans
      la phrase "Pepe se sent heureux"). */
  label: string;
  /** Mots-clés de recherche additionnels (synonymes). */
  keywords?: string[];
};

export const SENTIMENTS: SentimentOption[] = [
  { emoji: "😊", label: "heureux", keywords: ["content", "joie"] },
  { emoji: "😍", label: "amoureux", keywords: ["amour", "passionné"] },
  { emoji: "🥰", label: "comblé", keywords: ["heureux", "amour"] },
  { emoji: "😎", label: "cool" },
  { emoji: "🤩", label: "émerveillé", keywords: ["wow", "stars"] },
  { emoji: "🥳", label: "en fête", keywords: ["party", "anniversaire"] },
  { emoji: "💪", label: "motivé", keywords: ["puissant", "fort"] },
  { emoji: "🚀", label: "ambitieux", keywords: ["lancé", "go"] },
  { emoji: "🎯", label: "déterminé", keywords: ["focus", "but"] },
  { emoji: "🔥", label: "en feu", keywords: ["chaud", "fire"] },
  { emoji: "✨", label: "inspiré", keywords: ["créatif", "magique"] },
  { emoji: "🙏", label: "reconnaissant", keywords: ["merci", "gratitude"] },
  { emoji: "❤️", label: "aimant" },
  { emoji: "😌", label: "serein", keywords: ["calme", "zen"] },
  { emoji: "🧘", label: "zen", keywords: ["méditation"] },
  { emoji: "😴", label: "fatigué", keywords: ["sommeil", "épuisé"] },
  { emoji: "😪", label: "épuisé" },
  { emoji: "🥱", label: "ennuyé", keywords: ["bored"] },
  { emoji: "🤔", label: "pensif", keywords: ["réflexion"] },
  { emoji: "🤓", label: "studieux", keywords: ["nerd", "apprend"] },
  { emoji: "📚", label: "concentré", keywords: ["focus", "travail"] },
  { emoji: "💼", label: "au boulot", keywords: ["travail"] },
  { emoji: "✅", label: "productif" },
  { emoji: "🎉", label: "fier" },
  { emoji: "😢", label: "triste" },
  { emoji: "😭", label: "en larmes", keywords: ["pleure", "ému"] },
  { emoji: "😔", label: "déçu" },
  { emoji: "😞", label: "abattu", keywords: ["démoralisé"] },
  { emoji: "🥺", label: "ému" },
  { emoji: "😤", label: "frustré", keywords: ["enervé"] },
  { emoji: "😡", label: "en colère", keywords: ["fâché"] },
  { emoji: "🤯", label: "soufflé", keywords: ["wow", "incroyable"] },
  { emoji: "😱", label: "stupéfait" },
  { emoji: "🤗", label: "câlin", keywords: ["affection"] },
  { emoji: "🥹", label: "touché" },
  { emoji: "😅", label: "soulagé" },
  { emoji: "🎶", label: "musical", keywords: ["musique"] },
  { emoji: "🎨", label: "créatif", keywords: ["art"] },
  { emoji: "📷", label: "photographe", keywords: ["photo"] },
  { emoji: "🍳", label: "gourmand", keywords: ["cuisine", "manger"] },
  { emoji: "🌍", label: "voyageur", keywords: ["voyage"] },
  { emoji: "🏃", label: "sportif", keywords: ["sport", "running"] },
  { emoji: "🧗", label: "aventureux", keywords: ["adventure", "outdoor"] },
  { emoji: "🌱", label: "en croissance", keywords: ["évolution"] },
  { emoji: "🌟", label: "rayonnant" },
  { emoji: "💡", label: "éclairé", keywords: ["idée"] },
  { emoji: "🤝", label: "collaboratif", keywords: ["équipe"] },
  { emoji: "💼", label: "entrepreneur" },
  { emoji: "🎓", label: "diplômé", keywords: ["graduation"] },
  { emoji: "🤒", label: "malade" },
  { emoji: "🤧", label: "enrhumé" },
  { emoji: "🥶", label: "frigorifié", keywords: ["froid"] },
  { emoji: "🥵", label: "en surchauffe", keywords: ["chaud"] },
  { emoji: "☕", label: "caféiné", keywords: ["café"] },
  { emoji: "🍷", label: "détendu", keywords: ["chill"] },
  { emoji: "🌧️", label: "mélancolique", keywords: ["pluie", "morose"] },
  { emoji: "☀️", label: "ensoleillé", keywords: ["soleil"] },
  { emoji: "💔", label: "le cœur brisé" },
  { emoji: "🎂", label: "en anniversaire", keywords: ["birthday"] },
  { emoji: "🍾", label: "en célébration" },
  { emoji: "👶", label: "tout neuf", keywords: ["bébé"] },
];

export type ActivityKind = {
  type: PostActivityType;
  /** Verbe affiché dans la phrase : "regarde", "écoute"… */
  verb: string;
  /** Emoji par défaut affiché s'il n'y en a pas dans le détail. */
  emoji: string;
  /** Placeholder du champ détail (titre du film, plat mangé, ville…). */
  detailPlaceholder: string;
  /** Le détail est-il obligatoire ? */
  detailRequired?: boolean;
};

export const ACTIVITIES: ActivityKind[] = [
  {
    type: "watching",
    verb: "regarde",
    emoji: "🎬",
    detailPlaceholder: "ex: Inception, un coucher de soleil…",
    detailRequired: true,
  },
  {
    type: "listening",
    verb: "écoute",
    emoji: "🎧",
    detailPlaceholder: "ex: Daft Punk, un podcast…",
    detailRequired: true,
  },
  {
    type: "playing",
    verb: "joue à",
    emoji: "🎮",
    detailPlaceholder: "ex: Elden Ring, du tennis…",
    detailRequired: true,
  },
  {
    type: "reading",
    verb: "lit",
    emoji: "📖",
    detailPlaceholder: "ex: 1984, Le Petit Prince…",
    detailRequired: true,
  },
  {
    type: "eating",
    verb: "mange",
    emoji: "🍽️",
    detailPlaceholder: "ex: une pizza, des sushis…",
    detailRequired: true,
  },
  {
    type: "traveling",
    verb: "voyage à",
    emoji: "✈️",
    detailPlaceholder: "ex: Paris, Tokyo, Marrakech…",
    detailRequired: true,
  },
  {
    type: "celebrating",
    verb: "célèbre",
    emoji: "🎉",
    detailPlaceholder: "ex: un anniversaire, une promo…",
    detailRequired: true,
  },
  {
    type: "feeling",
    verb: "ressent",
    emoji: "💭",
    detailPlaceholder: "ex: l'envie d'avancer…",
    detailRequired: false,
  },
];

export type SentimentSelection = {
  emoji: string;
  label: string;
};

export type ActivitySelection = {
  type: PostActivityType;
  detail: string;
};

/** Phrase introductive style Facebook : "Pepe se sent heureux 😊"
 *  ou "Pepe regarde Inception 🎬". */
export function formatMomentLine(args: {
  firstName: string;
  sentiment: SentimentSelection | null;
  activity: ActivitySelection | null;
}): string | null {
  const { firstName, sentiment, activity } = args;
  if (activity) {
    const kind = ACTIVITIES.find((a) => a.type === activity.type);
    if (!kind) return null;
    return `${firstName} ${kind.verb} ${activity.detail}`.trim();
  }
  if (sentiment) {
    return `${firstName} se sent ${sentiment.label} ${sentiment.emoji}`;
  }
  return null;
}
