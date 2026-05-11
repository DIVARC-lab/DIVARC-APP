/* Presets de thèmes par-conversation (Chantier 3).
 *
 * Chaque preset définit :
 *  - accent : couleur primaire (bulles "moi" envoyées)
 *  - accentText : couleur du texte sur l'accent
 *  - bubbleOther : couleur des bulles "autre" reçues
 *  - bubbleOtherText : couleur texte des bulles "autre"
 *  - bgFrom / bgTo : dégradé du fond de chat
 *  - watermark : tonalité du wallpaper (cream/gold/none)
 *
 * Toutes les couleurs sont des valeurs CSS prêtes à l'emploi (utilisées
 * comme CSS variables via style inline sur le container chat). */

export type ThemePreset =
  | "default"
  | "gold"
  | "sunset"
  | "ocean"
  | "forest"
  | "midnight"
  | "rose"
  | "lavender";

export type WallpaperId =
  | "none"
  | "arcs"
  | "dots"
  | "waves"
  | "gradient"
  | "stars";

export type ConversationTheme = {
  id: ThemePreset;
  name: string;
  emoji: string;
  /* CSS-ready values pour injection en style inline. */
  accent: string;
  accentSoft: string;
  accentText: string;
  bubbleOther: string;
  bubbleOtherText: string;
  bgFrom: string;
  bgTo: string;
  /* Préview pastille (couleur visible dans le picker). */
  previewColor: string;
};

export const CONVERSATION_THEMES: Record<ThemePreset, ConversationTheme> = {
  default: {
    id: "default",
    name: "DIVARC",
    emoji: "✨",
    accent: "#0a1f44", // night
    accentSoft: "#142b54",
    accentText: "#f5f0e1", // cream
    bubbleOther: "#ffffff",
    bubbleOtherText: "#0a1f44",
    bgFrom: "#fbf9f4", // bg-soft
    bgTo: "#f8f5ec", // bg
    previewColor: "#f4b942", // gold
  },
  gold: {
    id: "gold",
    name: "Or",
    emoji: "🟡",
    accent: "#c89c3d", // gold-deep
    accentSoft: "#d7ab48",
    accentText: "#0a1f44",
    bubbleOther: "#fff8e5",
    bubbleOtherText: "#0a1f44",
    bgFrom: "#fffcf2",
    bgTo: "#fef7e0",
    previewColor: "#f4b942",
  },
  sunset: {
    id: "sunset",
    name: "Coucher de soleil",
    emoji: "🌅",
    accent: "#e85d3f",
    accentSoft: "#ef7e63",
    accentText: "#ffffff",
    bubbleOther: "#fff0ec",
    bubbleOtherText: "#5c2d23",
    bgFrom: "#fff7f3",
    bgTo: "#ffe8df",
    previewColor: "#e85d3f",
  },
  ocean: {
    id: "ocean",
    name: "Océan",
    emoji: "🌊",
    accent: "#0c6e8a",
    accentSoft: "#1187a8",
    accentText: "#ffffff",
    bubbleOther: "#e6f4f9",
    bubbleOtherText: "#06384a",
    bgFrom: "#f0f9fc",
    bgTo: "#dbeef5",
    previewColor: "#1187a8",
  },
  forest: {
    id: "forest",
    name: "Forêt",
    emoji: "🌲",
    accent: "#1f5d3a",
    accentSoft: "#2a7349",
    accentText: "#ffffff",
    bubbleOther: "#e9f4ed",
    bubbleOtherText: "#0d3a23",
    bgFrom: "#f3faf6",
    bgTo: "#dff0e6",
    previewColor: "#2a7349",
  },
  midnight: {
    id: "midnight",
    name: "Minuit",
    emoji: "🌌",
    accent: "#1a1d2e",
    accentSoft: "#252a45",
    accentText: "#f5f0e1",
    bubbleOther: "#2a2e4a",
    bubbleOtherText: "#e0e0f0",
    bgFrom: "#0d0f1a",
    bgTo: "#161929",
    previewColor: "#2a2e4a",
  },
  rose: {
    id: "rose",
    name: "Rose",
    emoji: "🌸",
    accent: "#c4376a",
    accentSoft: "#d24f7e",
    accentText: "#ffffff",
    bubbleOther: "#fde8f0",
    bubbleOtherText: "#5c1a32",
    bgFrom: "#fff5f9",
    bgTo: "#fcdce8",
    previewColor: "#d24f7e",
  },
  lavender: {
    id: "lavender",
    name: "Lavande",
    emoji: "💜",
    accent: "#6e4d9c",
    accentSoft: "#8160b3",
    accentText: "#ffffff",
    bubbleOther: "#f0eafa",
    bubbleOtherText: "#332359",
    bgFrom: "#faf7ff",
    bgTo: "#ede4fa",
    previewColor: "#8160b3",
  },
};

export const WALLPAPERS: Record<
  WallpaperId,
  { id: WallpaperId; name: string; emoji: string }
> = {
  none: { id: "none", name: "Aucun", emoji: "🚫" },
  arcs: { id: "arcs", name: "Arcs", emoji: "◐" },
  dots: { id: "dots", name: "Pointillés", emoji: "⠿" },
  waves: { id: "waves", name: "Vagues", emoji: "〰️" },
  gradient: { id: "gradient", name: "Dégradé", emoji: "🎨" },
  stars: { id: "stars", name: "Étoiles", emoji: "✨" },
};

export function getTheme(preset: string | null | undefined): ConversationTheme {
  if (preset && preset in CONVERSATION_THEMES) {
    return CONVERSATION_THEMES[preset as ThemePreset];
  }
  return CONVERSATION_THEMES.default;
}

export function getWallpaper(id: string | null | undefined): WallpaperId {
  if (id && id in WALLPAPERS) return id as WallpaperId;
  return "none";
}

/* Génère le SVG du wallpaper sous forme de data URL pour utiliser en
 * background-image. Couleurs basées sur le thème courant. */
export function wallpaperBackgroundImage(
  wallpaper: WallpaperId,
  theme: ConversationTheme,
): string | null {
  if (wallpaper === "none") return null;
  const tint = theme.accent;
  const enc = (svg: string) =>
    `url("data:image/svg+xml;utf8,${encodeURIComponent(svg)}")`;

  switch (wallpaper) {
    case "arcs": {
      /* Quart d'arc répété en motif diagonal. */
      const svg = `<svg xmlns='http://www.w3.org/2000/svg' width='160' height='160' viewBox='0 0 160 160'><g fill='none' stroke='${tint}' stroke-opacity='0.06' stroke-width='1'><path d='M 0 80 A 80 80 0 0 1 80 0'/><path d='M 80 160 A 80 80 0 0 1 160 80'/></g></svg>`;
      return enc(svg);
    }
    case "dots": {
      const svg = `<svg xmlns='http://www.w3.org/2000/svg' width='24' height='24' viewBox='0 0 24 24'><circle cx='12' cy='12' r='1.2' fill='${tint}' fill-opacity='0.12'/></svg>`;
      return enc(svg);
    }
    case "waves": {
      const svg = `<svg xmlns='http://www.w3.org/2000/svg' width='200' height='40' viewBox='0 0 200 40'><path d='M 0 20 Q 50 0 100 20 T 200 20' fill='none' stroke='${tint}' stroke-opacity='0.08' stroke-width='1.5'/></svg>`;
      return enc(svg);
    }
    case "gradient": {
      /* Pas une image — sera handled en CSS gradient via la fonction
       * wallpaperCSS plus bas. */
      return null;
    }
    case "stars": {
      const svg = `<svg xmlns='http://www.w3.org/2000/svg' width='100' height='100' viewBox='0 0 100 100'><g fill='${tint}' fill-opacity='0.1'><circle cx='15' cy='20' r='1'/><circle cx='70' cy='35' r='1.3'/><circle cx='40' cy='65' r='0.9'/><circle cx='85' cy='80' r='1'/><circle cx='25' cy='90' r='1.2'/></g></svg>`;
      return enc(svg);
    }
  }
}

/* Renvoie l'object style à passer à un container chat pour appliquer
 * le thème (background + CSS vars). */
export function themeContainerStyle(
  preset: string | null | undefined,
  wallpaper: string | null | undefined,
): React.CSSProperties {
  const theme = getTheme(preset);
  const wp = getWallpaper(wallpaper);
  const bgImage = wallpaperBackgroundImage(wp, theme);

  const style: React.CSSProperties & Record<string, string> = {
    "--theme-accent": theme.accent,
    "--theme-accent-soft": theme.accentSoft,
    "--theme-accent-text": theme.accentText,
    "--theme-bubble-other": theme.bubbleOther,
    "--theme-bubble-other-text": theme.bubbleOtherText,
    background: `linear-gradient(180deg, ${theme.bgFrom} 0%, ${theme.bgTo} 100%)`,
  };

  if (wp === "gradient") {
    /* Gradient overlay subtil en plus du fond de base. */
    style.background = `linear-gradient(135deg, ${theme.bgFrom} 0%, ${theme.bgTo} 100%), radial-gradient(circle at 20% 30%, ${theme.accentSoft}15 0%, transparent 50%)`;
  } else if (bgImage) {
    style.backgroundImage = `${bgImage}, linear-gradient(180deg, ${theme.bgFrom} 0%, ${theme.bgTo} 100%)`;
    style.backgroundRepeat = "repeat, no-repeat";
  }

  return style;
}
