import { MapPin } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { cn } from "@/lib/utils/cn";
import { CATEGORY_META } from "@/lib/utils/categories";
import { formatRelative } from "@/lib/utils/relativeTime";
import type { ListingWithDetails } from "@/lib/database.types";
import { FavoriteButton } from "./FavoriteButton";
import { PriceTag } from "./PriceTag";

type ListingCardProps = {
  listing: ListingWithDetails;
  showFavorite?: boolean;
  className?: string;
};

export function ListingCard({
  listing,
  showFavorite = true,
  className,
}: ListingCardProps) {
  const cover = listing.photos[0]?.url ?? null;
  const isSold = listing.status === "sold";
  const categoryMeta = CATEGORY_META[listing.category];

  return (
    <Link
      href={`/marketplace/${listing.id}`}
      className={cn(
        "group relative flex flex-col rounded-3xl overflow-hidden bg-white border border-line hover:border-night/30 hover:shadow-soft transition-all",
        className,
      )}
    >
      <div className="relative aspect-square w-full overflow-hidden bg-night/5">
        {cover ? (
          <Image
            src={cover}
            alt={listing.title}
            fill
            sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
            className={cn(
              "object-cover transition-transform duration-500 group-hover:scale-105",
              isSold && "grayscale opacity-70",
            )}
            unoptimized={cover.includes("?")}
          />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center text-5xl">
            {categoryMeta.emoji}
          </div>
        )}

        {showFavorite ? (
          <div className="absolute top-2.5 right-2.5">
            <FavoriteButton
              listingId={listing.id}
              initialFavorited={listing.is_favorited}
              size="sm"
            />
          </div>
        ) : null}

        {isSold ? (
          <div className="absolute top-2.5 left-2.5 px-2.5 py-1 rounded-full bg-night text-cream text-[10px] font-bold uppercase tracking-widest">
            Vendu
          </div>
        ) : null}

        <span className="absolute bottom-2.5 left-2.5 inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-white/90 backdrop-blur-sm text-[10px] font-semibold text-night-muted">
          <span aria-hidden>{categoryMeta.emoji}</span>
          {categoryMeta.label}
        </span>
      </div>

      <div className="p-4 flex-1 flex flex-col">
        <PriceTag
          amount={Number(listing.price_amount)}
          currency={listing.price_currency}
          size="md"
        />
        <h3 className="mt-1 text-sm font-semibold text-night line-clamp-2 flex-1">
          {listing.title}
        </h3>
        <div className="mt-2 flex items-center justify-between gap-2 text-[11px] text-muted">
          <span className="flex items-center gap-1 truncate">
            {listing.location ? (
              <>
                <MapPin className="w-3 h-3 shrink-0" aria-hidden />
                <span className="truncate">{listing.location}</span>
              </>
            ) : null}
          </span>
          <time
            dateTime={listing.created_at}
            className="shrink-0"
          >
            {formatRelative(listing.created_at)}
          </time>
        </div>
      </div>
    </Link>
  );
}
