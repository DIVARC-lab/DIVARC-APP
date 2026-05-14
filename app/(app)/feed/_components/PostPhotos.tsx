"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import Image from "next/image";
import { useState } from "react";
import { cn } from "@/lib/utils/cn";
import type { PostPhoto } from "@/lib/database.types";

type PostPhotosProps = {
  photos: PostPhoto[];
  alt: string;
  rounded?: boolean;
};

export function PostPhotos({ photos, alt, rounded = true }: PostPhotosProps) {
  const [activeIndex, setActiveIndex] = useState(0);

  if (photos.length === 0) return null;

  const active = photos[activeIndex] ?? photos[0]!;
  const single = photos.length === 1;

  return (
    <div
      className={cn(
        "relative w-full bg-night/5 overflow-hidden",
        rounded && "rounded-2xl",
      )}
    >
      <div className="relative w-full aspect-[4/5] sm:aspect-[16/10]">
        <Image
          key={active.id}
          src={active.url}
          alt={alt}
          fill
          sizes="(max-width: 640px) 100vw, 600px"
          className="object-cover"
          unoptimized={active.url.includes("?")}
        />
      </div>
      {!single ? (
        <>
          <button
            type="button"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              setActiveIndex((prev) =>
                prev === 0 ? photos.length - 1 : prev - 1,
              );
            }}
            aria-label="Précédent"
            className="absolute left-3 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full bg-white/95 backdrop-blur-sm border border-line text-night flex items-center justify-center hover:bg-white shadow-soft"
          >
            <ChevronLeft className="w-4 h-4" aria-hidden />
          </button>
          <button
            type="button"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              setActiveIndex((prev) =>
                prev === photos.length - 1 ? 0 : prev + 1,
              );
            }}
            aria-label="Suivant"
            className="absolute right-3 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full bg-white/95 backdrop-blur-sm border border-line text-night flex items-center justify-center hover:bg-white shadow-soft"
          >
            <ChevronRight className="w-4 h-4" aria-hidden />
          </button>
          <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-1.5">
            {photos.map((photo, idx) => (
              <button
                key={photo.id}
                type="button"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  setActiveIndex(idx);
                }}
                aria-label={`Photo ${idx + 1}`}
                className={cn(
                  "h-1.5 rounded-full transition-all",
                  idx === activeIndex
                    ? "w-6 bg-white"
                    : "w-1.5 bg-white/60 hover:bg-white/80",
                )}
              />
            ))}
          </div>
        </>
      ) : null}
    </div>
  );
}
