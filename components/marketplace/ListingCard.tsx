import Image from "next/image";
import Link from "next/link";
import { cn } from "@/lib/utils/cn";
import { CATEGORY_META } from "@/lib/utils/categories";
import { formatRelative } from "@/lib/utils/relativeTime";
import type { ListingWithDetails } from "@/lib/database.types";
import { FavoriteButton } from "./FavoriteButton";

type ListingCardProps = {
  listing: ListingWithDetails;
  showFavorite?: boolean;
  className?: string;
};

/* Refonte Bold (handoff feed-marketplace.jsx L78-93) :
 * - r-[18px] white border line overflow hidden
 * - Photo aspect 1/1
 * - Tag badge top-left : font 9 padding 3/8 r-2 bg navy/60 backdrop-blur cream
 *   weight 700 letter-spacing 0.04em UPPERCASE
 * - Fav heart top-right : w-[30px] h-[30px] r-[15px] bg cream/92 backdrop-blur
 *   color navy (red filled si fav)
 * - Content padding 12 :
 *   - prix Instrument Serif italic 16 navy line-height 1.1
 *   - title 12 navy weight 600 mt 4 line-clamp 2
 *   - place·time 10 #8696B0 mt 6 */
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
        "group relative flex flex-col rounded-[18px] overflow-hidden bg-white border border-line transition-all hover:border-night/30",
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
              "object-cover transition-transform duration-500 group-hover:scale-[1.03]",
              isSold && "grayscale opacity-70",
            )}
            unoptimized={cover.includes("?")}
          />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center text-5xl">
            {categoryMeta.emoji}
          </div>
        )}

        {/* Tag badge top-left — proto navy/60 backdrop-blur cream weight 700 */}
        <span className="absolute top-2 left-2 inline-flex items-center px-2 py-0.5 rounded-lg bg-night/60 backdrop-blur-md text-[9px] font-bold uppercase tracking-[0.04em] text-cream">
          {categoryMeta.label}
        </span>

        {showFavorite ? (
          <div className="absolute top-2 right-2">
            <FavoriteButton
              listingId={listing.id}
              initialFavorited={listing.is_favorited}
              size="sm"
            />
          </div>
        ) : null}

        {isSold ? (
          <div className="absolute bottom-2 left-2 px-2.5 py-0.5 rounded-full bg-night text-cream text-[10px] font-bold uppercase tracking-widest">
            Vendu
          </div>
        ) : null}
      </div>

      <div className="p-3 flex-1 flex flex-col">
        {/* Prix Instrument Serif italic 16 navy line-height 1.1 */}
        <p className="font-display italic text-[16px] text-night leading-[1.1]">
          {formatPrice(listing.price_amount, listing.price_currency)}
        </p>
        <h3 className="mt-1 text-[12px] font-semibold text-night line-clamp-2 leading-[1.3]">
          {listing.title}
        </h3>
        <div className="mt-1.5 text-[10px] text-night-dim leading-tight truncate">
          {listing.location ? (
            <>
              {listing.location}
              <span className="opacity-60"> · </span>
            </>
          ) : null}
          <time dateTime={listing.created_at}>
            {formatRelative(listing.created_at)}
          </time>
        </div>
      </div>
    </Link>
  );
}

function formatPrice(amount: number | string, currency: string): string {
  const value = typeof amount === "number" ? amount : Number(amount);
  if (!Number.isFinite(value)) return "—";
  /* Format compact : 80 € (sans décimales si entier) */
  const formatted = Number.isInteger(value)
    ? value.toLocaleString("fr-FR")
    : value.toFixed(2).replace(".", ",");
  const symbol =
    currency === "EUR" ? "€" : currency === "USD" ? "$" : currency;
  return `${formatted} ${symbol}`;
}
