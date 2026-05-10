/* Stickers — types + helpers partagés entre composer et player.
 *
 * Stockés dans reels.stickers (jsonb array, migration 0061). 2 kinds :
 * "emoji" (content = caractère unicode) et "image" (content = URL).
 *
 * V3.9 limitations :
 *   - max 10 stickers/reel
 *   - pas d'animation entre keyframes (statique entre start_s et end_s)
 *   - rotate via CSS transform, scale via CSS transform
 *   - drag/resize/rotate via pointer events (touch + mouse) */

export type Sticker = {
  id: string;
  kind: "emoji" | "image";
  /** Pour emoji : le caractère. Pour image : URL HTTPS. */
  content: string;
  start_s: number;
  end_s: number;
  /** Position du centre du sticker en % du frame. */
  x_pct: number;
  y_pct: number;
  /** Échelle [0.2 .. 3.0]. Base size = 60px à scale=1. */
  scale: number;
  /** Rotation en degrés [-180 .. 180]. */
  rotation_deg: number;
};

export const MAX_STICKERS = 10;
export const MIN_SCALE = 0.2;
export const MAX_SCALE = 3.0;
export const STICKER_BASE_SIZE_PX = 60;

/* Palette emoji pour picker rapide (V3.9). */
export const STICKER_EMOJI_PRESETS = [
  "🔥", "✨", "💎", "👑", "❤️", "😂", "😍", "🤩",
  "👀", "💯", "🎉", "🎊", "🌟", "⭐", "💫", "🌈",
  "🤘", "👌", "👏", "🙏", "💪", "✌️", "🤝", "👋",
  "🎵", "🎶", "🎬", "📸", "🎨", "🎭", "🚀", "💥",
] as const;

export const DEFAULT_STICKER: Omit<Sticker, "id"> = {
  kind: "emoji",
  content: "🔥",
  start_s: 0,
  end_s: 3,
  x_pct: 50,
  y_pct: 50,
  scale: 1.0,
  rotation_deg: 0,
};

export function parseStickers(raw: unknown): Sticker[] {
  if (!Array.isArray(raw)) return [];
  const out: Sticker[] = [];
  for (const item of raw) {
    if (typeof item !== "object" || item === null) continue;
    const obj = item as Record<string, unknown>;
    const kind = obj.kind === "image" ? "image" : "emoji";
    const content = typeof obj.content === "string" ? obj.content.slice(0, 500) : "";
    if (content.length === 0) continue;
    if (kind === "image" && !/^https?:\/\//i.test(content)) continue;

    const start = Number(obj.start_s);
    const end = Number(obj.end_s);
    if (!Number.isFinite(start) || !Number.isFinite(end) || end <= start) continue;

    out.push({
      id: typeof obj.id === "string" ? obj.id : crypto.randomUUID(),
      kind,
      content,
      start_s: Math.max(0, start),
      end_s: end,
      x_pct: clamp(Number(obj.x_pct), 0, 100, 50),
      y_pct: clamp(Number(obj.y_pct), 0, 100, 50),
      scale: clamp(Number(obj.scale), MIN_SCALE, MAX_SCALE, 1),
      rotation_deg: clamp(Number(obj.rotation_deg), -180, 180, 0),
    });
    if (out.length >= MAX_STICKERS) break;
  }
  return out;
}

export function getActiveStickers(
  stickers: Sticker[],
  t: number,
): Sticker[] {
  return stickers.filter((s) => t >= s.start_s && t <= s.end_s);
}

function clamp(value: number, min: number, max: number, fallback: number): number {
  if (!Number.isFinite(value)) return fallback;
  return Math.max(min, Math.min(max, value));
}
