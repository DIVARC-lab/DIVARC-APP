import { Hash, TrendingUp } from "lucide-react";
import Link from "next/link";
import type { Hashtag } from "@/lib/database.types";

type Props = {
  tags: Hashtag[];
};

export function TrendingHashtagsRow({ tags }: Props) {
  return (
    <section
      aria-label="Hashtags tendances"
      className="rounded-3xl border border-line bg-white p-4 shadow-soft"
    >
      <div className="flex items-center gap-2 px-1 pb-2 text-xs font-bold uppercase tracking-widest text-gold-deep">
        <TrendingUp className="w-3.5 h-3.5" aria-hidden />
        Tendances
      </div>
      <div className="flex gap-2 overflow-x-auto pb-1 -mx-1 px-1 scrollbar-thin">
        {tags.map((t) => (
          <Link
            key={t.id}
            href={`/feed/tag/${encodeURIComponent(t.tag)}`}
            className="shrink-0 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-gradient-to-br from-cream to-gold/15 border border-gold/30 text-sm font-semibold text-night hover:border-gold/60 transition-colors"
          >
            <Hash className="w-3.5 h-3.5 text-gold-deep" aria-hidden />
            <span>{t.tag}</span>
            <span className="text-[10px] font-bold text-night-muted">
              {t.posts_count}
            </span>
          </Link>
        ))}
      </div>
    </section>
  );
}
