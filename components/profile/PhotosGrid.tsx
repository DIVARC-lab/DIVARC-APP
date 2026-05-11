import { Camera, Heart, MessageCircle } from "lucide-react";
import Image from "next/image";
import Link from "next/link";

/* PhotosGrid — grid 3/4/5 cols des posts récents contenant des photos.
 * Inspiration Instagram. Hover desktop → overlay sombre avec compteurs.
 *
 * V1 : 1 photo affichée par post (la première). Lightbox V4. */

export type GridPhotoItem = {
  post_id: string;
  url: string;
  alt: string;
  likes_count: number;
  comments_count: number;
};

type Props = {
  photos: GridPhotoItem[];
  emptyHint?: string;
};

export function PhotosGrid({ photos, emptyHint }: Props) {
  if (photos.length === 0) {
    return (
      <div className="rounded-2xl bg-white border border-line p-6 text-center">
        <Camera className="w-6 h-6 text-night-dim mx-auto mb-2" aria-hidden />
        <p className="text-[13px] text-night-muted">
          {emptyHint ?? "Aucune photo publiée."}
        </p>
      </div>
    );
  }

  return (
    <section
      aria-label="Photos"
      className="rounded-2xl bg-white border border-line overflow-hidden"
    >
      <header className="px-5 py-4 border-b border-line flex items-center gap-2">
        <Camera className="w-4 h-4 text-gold-deep" aria-hidden />
        <h2 className="text-[14px] font-bold text-night">Photos</h2>
        <span className="text-[12px] text-night-muted">· {photos.length}</span>
      </header>
      <div className="grid grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-px bg-line">
        {photos.map((p) => (
          <Link
            key={`${p.post_id}-${p.url}`}
            href={`/feed/${p.post_id}`}
            className="relative aspect-square bg-night/5 group overflow-hidden"
          >
            <Image
              src={p.url}
              alt={p.alt}
              fill
              sizes="(max-width: 768px) 33vw, (max-width: 1024px) 25vw, 20vw"
              className="object-cover transition-transform group-hover:scale-105"
              unoptimized={p.url.includes("?")}
            />
            <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-colors flex items-center justify-center gap-4 text-cream opacity-0 group-hover:opacity-100 pointer-events-none">
              <span className="inline-flex items-center gap-1 text-[13px] font-bold">
                <Heart className="w-4 h-4 fill-cream" aria-hidden />
                {p.likes_count}
              </span>
              <span className="inline-flex items-center gap-1 text-[13px] font-bold">
                <MessageCircle className="w-4 h-4 fill-cream" aria-hidden />
                {p.comments_count}
              </span>
            </div>
          </Link>
        ))}
      </div>
    </section>
  );
}
