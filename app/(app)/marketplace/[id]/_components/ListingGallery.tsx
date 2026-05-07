"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import Image from "next/image";
import { useState } from "react";
import { cn } from "@/lib/utils/cn";
import type { ListingPhoto } from "@/lib/database.types";

type ListingGalleryProps = {
  photos: ListingPhoto[];
  emojiFallback: string;
  alt: string;
};

export function ListingGallery({
  photos,
  emojiFallback,
  alt,
}: ListingGalleryProps) {
  const [activeIndex, setActiveIndex] = useState(0);

  if (photos.length === 0) {
    return (
      <div className="aspect-[4/5] sm:aspect-square rounded-3xl bg-night/5 border border-line flex items-center justify-center text-7xl">
        {emojiFallback}
      </div>
    );
  }

  const active = photos[activeIndex] ?? photos[0]!;

  function go(direction: 1 | -1) {
    setActiveIndex((prev) => {
      const next = prev + direction;
      if (next < 0) return photos.length - 1;
      if (next >= photos.length) return 0;
      return next;
    });
  }

  return (
    <div className="space-y-3">
      <div className="relative aspect-[4/5] sm:aspect-square rounded-3xl overflow-hidden bg-night/5 border border-line">
        <Image
          key={active.id}
          src={active.url}
          alt={alt}
          fill
          priority
          sizes="(max-width: 1024px) 100vw, 50vw"
          className="object-cover"
          unoptimized={active.url.includes("?")}
        />
        {photos.length > 1 ? (
          <>
            <button
              type="button"
              onClick={() => go(-1)}
              aria-label="Précédent"
              className="absolute left-3 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-white/95 backdrop-blur-sm border border-line text-night flex items-center justify-center hover:bg-white shadow-soft"
            >
              <ChevronLeft className="w-5 h-5" aria-hidden />
            </button>
            <button
              type="button"
              onClick={() => go(1)}
              aria-label="Suivant"
              className="absolute right-3 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-white/95 backdrop-blur-sm border border-line text-night flex items-center justify-center hover:bg-white shadow-soft"
            >
              <ChevronRight className="w-5 h-5" aria-hidden />
            </button>
            <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-1.5">
              {photos.map((photo, idx) => (
                <button
                  key={photo.id}
                  type="button"
                  onClick={() => setActiveIndex(idx)}
                  aria-label={`Photo ${idx + 1}`}
                  className={cn(
                    "h-1.5 rounded-full transition-all",
                    idx === activeIndex
                      ? "w-6 bg-white"
                      : "w-1.5 bg-white/50 hover:bg-white/80",
                  )}
                />
              ))}
            </div>
          </>
        ) : null}
      </div>

      {photos.length > 1 ? (
        <div className="grid grid-cols-5 sm:grid-cols-6 gap-2">
          {photos.map((photo, idx) => (
            <button
              key={photo.id}
              type="button"
              onClick={() => setActiveIndex(idx)}
              aria-label={`Voir photo ${idx + 1}`}
              className={cn(
                "relative aspect-square rounded-xl overflow-hidden border-2 transition-all",
                idx === activeIndex
                  ? "border-night shadow-soft scale-100"
                  : "border-line opacity-70 hover:opacity-100",
              )}
            >
              <Image
                src={photo.url}
                alt=""
                fill
                sizes="120px"
                className="object-cover"
                unoptimized={photo.url.includes("?")}
              />
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}
