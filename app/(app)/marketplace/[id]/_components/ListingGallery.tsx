"use client";

import Image from "next/image";
import { useState } from "react";
import { cn } from "@/lib/utils/cn";
import type { ListingPhoto } from "@/lib/database.types";

type ListingGalleryProps = {
  photos: ListingPhoto[];
  emojiFallback: string;
  alt: string;
};

/* Refonte audit /marketplace/[id] (handoff feed-marketplace MarketplaceDetail
 * Screen L106-122) :
 * - Hero gallery full-width 380px (au lieu de aspect-[4/5] avec thumbnails)
 * - Dots indicators bottom : actif w-4 cream / autres w-1.5 cream/40
 * - Swipe horizontal touch (snap CSS — pas de chevrons par défaut)
 * - Plus de thumbnails grid (le proto Bold ne les montre pas) */
export function ListingGallery({
  photos,
  emojiFallback,
  alt,
}: ListingGalleryProps) {
  const [activeIndex, setActiveIndex] = useState(0);

  if (photos.length === 0) {
    return (
      <div className="relative h-[380px] bg-night/5 flex items-center justify-center text-7xl">
        {emojiFallback}
      </div>
    );
  }

  return (
    <div className="relative h-[380px] overflow-hidden bg-night/5">
      <div
        className="flex h-full w-full overflow-x-auto snap-x snap-mandatory scroll-smooth scrollbar-none"
        onScroll={(e) => {
          const el = e.currentTarget;
          const i = Math.round(el.scrollLeft / el.clientWidth);
          if (i !== activeIndex) setActiveIndex(i);
        }}
      >
        {photos.map((photo, idx) => (
          <div
            key={photo.id}
            className="relative h-full w-full flex-shrink-0 snap-center"
          >
            <Image
              src={photo.url}
              alt={idx === 0 ? alt : ""}
              fill
              priority={idx === 0}
              sizes="100vw"
              className="object-cover"
              unoptimized={photo.url.includes("?")}
            />
          </div>
        ))}
      </div>

      {photos.length > 1 ? (
        <div className="absolute bottom-3.5 left-1/2 -translate-x-1/2 flex gap-1 z-10 pointer-events-none">
          {photos.map((photo, idx) => (
            <span
              key={photo.id}
              aria-hidden
              className={cn(
                "h-1.5 rounded-[3px] transition-all duration-200",
                idx === activeIndex
                  ? "w-4 bg-cream"
                  : "w-1.5 bg-cream/40",
              )}
            />
          ))}
        </div>
      ) : null}
    </div>
  );
}
