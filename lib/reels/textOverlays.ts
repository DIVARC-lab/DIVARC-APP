/* Text overlays — types + helpers partagés entre composer et player.
 *
 * Stockés dans reels.text_overlays (jsonb array, migration 0058). Le
 * client rend les overlays en surimpression de <video> en lisant
 * `currentTime` via timeUpdate event, puis filtre les overlays actifs
 * (start_s <= t <= end_s).
 *
 * V3.6 limitations volontaires :
 *  - pas de drag/resize/rotate (juste % positioning numérique)
 *  - pas d'animations entre frames (fade simple via CSS transition)
 *  - max 10 overlays par reel (UX cap, pas une limite DB) */

export type TextOverlay = {
  /** ID client (uuid v4 ou nanoid) pour les keys React. */
  id: string;
  text: string;
  /** Intervalle en secondes depuis le début. */
  start_s: number;
  end_s: number;
  /** Position du centre du texte en % du frame (0-100). */
  x_pct: number;
  y_pct: number;
  /** Taille en px à 1080p (scale automatique côté render). */
  font_size_px: number;
  /** Hex couleur sans alpha. */
  color: string;
  weight: "bold" | "regular";
  bg: "none" | "solid" | "outline";
  align: "left" | "center" | "right";
};

export const MAX_OVERLAYS = 10;
export const MAX_TEXT_LENGTH = 100;

export const DEFAULT_OVERLAY: Omit<TextOverlay, "id"> = {
  text: "Texte",
  start_s: 0,
  end_s: 3,
  x_pct: 50,
  y_pct: 50,
  font_size_px: 36,
  color: "#FFFFFF",
  weight: "bold",
  bg: "solid",
  align: "center",
};

/* Couleurs preset pour le color picker UX. */
export const OVERLAY_COLORS = [
  "#FFFFFF",
  "#000000",
  "#F4B942", // gold
  "#0A1F44", // night
  "#DC2626", // rouge
  "#16A34A", // vert
  "#3B82F6", // bleu
  "#A855F7", // violet
] as const;

/* Tailles preset (px à 1080p). */
export const OVERLAY_SIZES: Array<{ id: string; px: number; label: string }> = [
  { id: "sm", px: 24, label: "S" },
  { id: "md", px: 36, label: "M" },
  { id: "lg", px: 56, label: "L" },
  { id: "xl", px: 84, label: "XL" },
];

/* Parse + validate un blob jsonb venant de la DB. Tolérant aux schemas
 * partiels (fallback aux valeurs par défaut). */
export function parseOverlays(raw: unknown): TextOverlay[] {
  if (!Array.isArray(raw)) return [];
  const out: TextOverlay[] = [];
  for (const item of raw) {
    if (typeof item !== "object" || item === null) continue;
    const obj = item as Record<string, unknown>;
    const text = typeof obj.text === "string" ? obj.text.slice(0, MAX_TEXT_LENGTH) : "";
    if (text.length === 0) continue;
    const start = Number(obj.start_s);
    const end = Number(obj.end_s);
    if (!Number.isFinite(start) || !Number.isFinite(end) || end <= start) continue;
    out.push({
      id: typeof obj.id === "string" ? obj.id : crypto.randomUUID(),
      text,
      start_s: Math.max(0, start),
      end_s: end,
      x_pct: clampPct(Number(obj.x_pct), 50),
      y_pct: clampPct(Number(obj.y_pct), 50),
      font_size_px: clampSize(Number(obj.font_size_px), 36),
      color: typeof obj.color === "string" && /^#[0-9A-Fa-f]{6}$/.test(obj.color)
        ? obj.color
        : "#FFFFFF",
      weight: obj.weight === "regular" ? "regular" : "bold",
      bg:
        obj.bg === "solid" || obj.bg === "none" || obj.bg === "outline"
          ? obj.bg
          : "solid",
      align:
        obj.align === "left" || obj.align === "right"
          ? obj.align
          : "center",
    });
    if (out.length >= MAX_OVERLAYS) break;
  }
  return out;
}

/* Retourne les overlays actifs à un timestamp donné. */
export function getActiveOverlays(
  overlays: TextOverlay[],
  currentTimeSec: number,
): TextOverlay[] {
  return overlays.filter(
    (o) => currentTimeSec >= o.start_s && currentTimeSec <= o.end_s,
  );
}

function clampPct(value: number, fallback: number): number {
  if (!Number.isFinite(value)) return fallback;
  return Math.max(0, Math.min(100, value));
}

function clampSize(value: number, fallback: number): number {
  if (!Number.isFinite(value)) return fallback;
  return Math.max(12, Math.min(200, value));
}
