import type { StoryFilter } from "@/lib/database.types";

export type StoryFilterOption = {
  id: StoryFilter;
  label: string;
  /** CSS `filter` declaration. Empty string = aucun filtre. */
  css: string;
  /** Aperçu mini-tile : couleur de fond suggestive. */
  swatch: string;
};

export const STORY_FILTERS: StoryFilterOption[] = [
  { id: "original", label: "Original", css: "", swatch: "from-night via-night-soft to-night" },
  { id: "dore", label: "Doré", css: "saturate(1.15) sepia(0.18) brightness(1.04)", swatch: "from-gold via-gold-soft to-gold-deep" },
  { id: "creme", label: "Crème", css: "sepia(0.3) saturate(0.9)", swatch: "from-cream via-bg to-gold/30" },
  { id: "nuit", label: "Nuit", css: "brightness(0.78) contrast(1.18) saturate(0.85)", swatch: "from-night via-night to-black" },
  { id: "pellicule", label: "Pellicule", css: "saturate(0.7) hue-rotate(8deg) contrast(1.05)", swatch: "from-night-muted via-night-soft to-gold-deep" },
  { id: "argent", label: "Argent", css: "grayscale(1) contrast(1.12)", swatch: "from-night-muted via-line to-night" },
];

export function getFilterCss(id: StoryFilter | null | undefined): string {
  if (!id || id === "original") return "";
  return STORY_FILTERS.find((f) => f.id === id)?.css ?? "";
}
