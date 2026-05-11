import { Bookmark, Plus } from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils/cn";
import type { StoryHighlight } from "@/lib/database.types";

/* HighlightsRow — scroll horizontal des highlights style Instagram.
 *
 * Cercles 80px (mobile) / 88px (desktop) avec ring gold + cover image.
 * Tap → /u/[username]/highlights/[id] (V4 viewer modal).
 * Si own profile, premier item = "+ Ajouter" → /profile?tab=avance.
 *
 * V1 : pas de viewer fullscreen — juste l'aperçu et le lien. */

type Props = {
  highlights: StoryHighlight[];
  username: string;
  isOwn?: boolean;
};

export function HighlightsRow({ highlights, username, isOwn = false }: Props) {
  if (highlights.length === 0 && !isOwn) return null;

  return (
    <section
      aria-label="Highlights"
      className="rounded-2xl bg-white border border-line p-4"
    >
      <header className="flex items-center gap-2 mb-3 px-1">
        <Bookmark className="w-4 h-4 text-gold-deep" aria-hidden />
        <h2 className="text-[14px] font-bold text-night">Highlights</h2>
        <span className="text-[12px] text-night-muted">
          · {highlights.length}
        </span>
      </header>
      <div className="flex gap-3 overflow-x-auto scrollbar-hide -mx-1 px-1">
        {isOwn ? (
          <Link
            href="/profile?tab=avance#highlights"
            className="shrink-0 flex flex-col items-center gap-1.5 group"
          >
            <span className="w-20 h-20 sm:w-[88px] sm:h-[88px] rounded-full bg-bg-soft border-2 border-dashed border-line group-hover:border-gold-deep flex items-center justify-center text-night-muted transition-colors">
              <Plus className="w-6 h-6" aria-hidden />
            </span>
            <span className="text-[11.5px] font-semibold text-night-muted group-hover:text-night text-center max-w-[88px] truncate">
              Nouveau
            </span>
          </Link>
        ) : null}

        {highlights.map((h) => (
          <Link
            key={h.id}
            href={`/u/${username}/highlights/${h.id}`}
            className="shrink-0 flex flex-col items-center gap-1.5 group"
          >
            <span
              className={cn(
                "relative w-20 h-20 sm:w-[88px] sm:h-[88px] rounded-full p-[3px]",
                "bg-gradient-to-br from-gold via-gold-deep to-gold-deep",
              )}
            >
              <span className="block w-full h-full rounded-full bg-white p-[2px]">
                <span
                  className="block w-full h-full rounded-full bg-night/5 overflow-hidden"
                  style={{
                    backgroundImage: `url(${h.cover_image_url})`,
                    backgroundSize: "cover",
                    backgroundPosition: "center",
                  }}
                />
              </span>
            </span>
            <span className="text-[11.5px] font-semibold text-night text-center max-w-[88px] truncate">
              {h.title}
            </span>
          </Link>
        ))}
      </div>
    </section>
  );
}
