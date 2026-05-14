import { ImageOff, MapPin } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { CATEGORY_META } from "@/lib/utils/categories";
import { formatPrice } from "@/lib/utils/currency";
import type { Currency, ListingCategory } from "@/lib/database.types";
import type { ExploreListing } from "@/lib/queries/explore";

type MiniListingCardProps = {
  listing: ExploreListing;
};

export function MiniListingCard({ listing }: MiniListingCardProps) {
  const meta = CATEGORY_META[listing.category as ListingCategory];

  return (
    <Link
      href={`/marketplace/${listing.id}`}
      className="group flex flex-col rounded-3xl overflow-hidden bg-white border border-line hover:border-night/30 hover:shadow-soft transition-all"
    >
      <div className="relative aspect-square w-full overflow-hidden bg-night/5">
        {listing.cover_url ? (
          <Image
            src={listing.cover_url}
            alt={listing.title}
            fill
            sizes="(max-width: 640px) 50vw, 25vw"
            className="object-cover transition-transform duration-500 group-hover:scale-105"
            unoptimized={listing.cover_url.includes("?")}
          />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center">
            {meta?.emoji ? (
              <span className="text-4xl" aria-hidden>
                {meta.emoji}
              </span>
            ) : (
              <ImageOff
                className="w-9 h-9 text-night-dim/60"
                aria-hidden
              />
            )}
          </div>
        )}
      </div>
      <div className="p-3">
        <p className="font-display text-base text-night">
          {formatPrice(listing.price_amount, listing.price_currency as Currency)}
        </p>
        <p className="mt-0.5 text-xs text-night-muted line-clamp-1">
          {listing.title}
        </p>
        {listing.location ? (
          <p className="mt-1 text-[10px] text-muted flex items-center gap-1 truncate">
            <MapPin className="w-2.5 h-2.5 shrink-0" aria-hidden />
            {listing.location}
          </p>
        ) : null}
      </div>
    </Link>
  );
}
