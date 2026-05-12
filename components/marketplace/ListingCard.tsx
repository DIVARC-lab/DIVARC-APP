import { Flame, MapPin, MessageCircle } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { Avatar } from "@/components/ui/Avatar";
import type { ListingWithDetails } from "@/lib/database.types";
import { getTopCategory, getUiMode } from "@/lib/marketplace/taxonomy";
import { CATEGORY_META, CONDITION_META } from "@/lib/utils/categories";
import { cn } from "@/lib/utils/cn";
import { formatRelative } from "@/lib/utils/relativeTime";
import { FavoriteButton } from "./FavoriteButton";

type Variant = "grid" | "list" | "compact";

type ListingCardProps = {
  listing: ListingWithDetails;
  /* grid (default) = card verticale 1 col mobile / 4-5 cols desktop
   * list = horizontale photo + infos (mode "leboncoin liste")
   * compact = pour carrousels (trending, recos) — taille réduite */
  variant?: Variant;
  showFavorite?: boolean;
  /* Affiche la ligne vendeur (avatar + nom + rating). Activé par défaut
   * sur grid, désactivé en compact (gain de place). */
  showSeller?: boolean;
  /* Distance en mètres si géoloc activée côté caller. Affichée à côté
   * de la localisation. */
  distance_m?: number | null;
  className?: string;
};

/* Card de listing marketplace adaptative.
 *
 * Brief Chantier 2.3 : photo + badges (boost/super_seller/négociable) +
 * favori + prix (+ original_price si promo) + titre + attribut line
 * selon ui_mode (fashion → size/brand/condition, vehicles → year/km/fuel,
 * real_estate → m²/rooms/DPE) + seller row.
 *
 * Compat : si listing.attributes vide (rows pré-Chantier 1.1), fallback
 * sur la ligne "location · time" historique. */
export function ListingCard({
  listing,
  variant = "grid",
  showFavorite = true,
  showSeller = true,
  distance_m = null,
  className,
}: ListingCardProps) {
  const photos = listing.photos ?? [];
  const cover = pickCover(photos);
  const isSold = listing.status === "sold";
  const isReserved = listing.status === "reserved";

  /* UI mode dérivé de la nouvelle taxonomie (category_path) si présente,
   * sinon fallback sur le legacy CATEGORY_META. */
  const topCategory = getTopCategory(listing.category_path ?? []);
  const uiMode = getUiMode(listing.category_path ?? []);
  const categoryLabel =
    topCategory?.label ?? CATEGORY_META[listing.category]?.label ?? "";
  const categoryEmoji = CATEGORY_META[listing.category]?.emoji ?? "🏷️";

  const attrLine = buildAttributeLine(listing, uiMode);
  const sellerName =
    listing.seller?.full_name ?? listing.seller?.username ?? "Vendeur";

  /* Mode list : horizontal (photo + infos). */
  if (variant === "list") {
    return (
      <Link
        href={`/marketplace/${listing.id}`}
        className={cn(
          "group relative flex gap-3 sm:gap-4 rounded-2xl overflow-hidden bg-white border border-line p-2 hover:border-night/30 transition-colors",
          className,
        )}
      >
        <div className="relative w-24 h-24 sm:w-32 sm:h-32 shrink-0 rounded-xl overflow-hidden bg-night/5">
          {renderCover(cover, listing.title, isSold, categoryEmoji)}
          {showFavorite ? (
            <div className="absolute top-1 right-1">
              <FavoriteButton
                listingId={listing.id}
                initialFavorited={listing.is_favorited}
                size="sm"
              />
            </div>
          ) : null}
        </div>
        <div className="flex-1 min-w-0 py-1 flex flex-col">
          <div className="flex items-baseline justify-between gap-2 min-w-0">
            <p className="font-display italic text-[18px] text-night leading-[1.1] shrink-0">
              {formatPrice(listing.price_amount, listing.price_currency)}
            </p>
            {listing.original_price && listing.original_price > listing.price_amount ? (
              <span className="text-[11px] text-muted line-through">
                {formatPrice(listing.original_price, listing.price_currency)}
              </span>
            ) : null}
          </div>
          <h3 className="mt-0.5 text-sm font-semibold text-night line-clamp-2">
            {listing.title}
          </h3>
          {attrLine ? (
            <p className="mt-1 text-xs text-night-muted truncate">{attrLine}</p>
          ) : null}
          <SellerDistanceRow
            listing={listing}
            distance_m={distance_m}
            sellerName={sellerName}
            showSeller={showSeller}
          />
        </div>
      </Link>
    );
  }

  /* Mode compact (carrousels) ou grid (default). */
  const aspectRatioClass =
    variant === "compact" ? "aspect-[4/5]" : "aspect-[4/5]";
  const pad = variant === "compact" ? "p-2" : "p-3";

  return (
    <Link
      href={`/marketplace/${listing.id}`}
      className={cn(
        "group relative flex flex-col rounded-2xl overflow-hidden bg-white border border-line hover:border-night/30 transition-all",
        className,
      )}
    >
      <div className={cn("relative w-full overflow-hidden bg-night/5", aspectRatioClass)}>
        {renderCover(cover, listing.title, isSold, categoryEmoji)}

        {/* Badges top-left : empilés verticalement si plusieurs. */}
        <div className="absolute top-2 left-2 flex flex-col gap-1 items-start max-w-[calc(100%-44px)]">
          {listing.is_boosted ? (
            <span className="inline-flex items-center gap-1 px-2 h-[18px] rounded-md bg-gold/95 text-night text-[9px] font-extrabold uppercase tracking-[0.06em] shadow-sm">
              <Flame className="w-2.5 h-2.5" aria-hidden />
              Boosté
            </span>
          ) : null}
          {categoryLabel ? (
            <span className="inline-flex items-center px-2 h-[18px] rounded-md bg-night/60 backdrop-blur-md text-[9px] font-bold uppercase tracking-[0.04em] text-cream">
              {categoryLabel}
            </span>
          ) : null}
          {listing.is_negotiable ? (
            <span className="inline-flex items-center gap-1 px-2 h-[18px] rounded-md bg-white/95 backdrop-blur-md text-[9px] font-bold uppercase tracking-[0.04em] text-night-soft">
              <MessageCircle className="w-2.5 h-2.5" aria-hidden />
              Négociable
            </span>
          ) : null}
        </div>

        {/* Favori top-right. */}
        {showFavorite ? (
          <div className="absolute top-2 right-2">
            <FavoriteButton
              listingId={listing.id}
              initialFavorited={listing.is_favorited}
              size="sm"
            />
          </div>
        ) : null}

        {/* Dots indicateur photos multiples (V1 visuel only, pas de carousel). */}
        {photos.length > 1 ? (
          <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex gap-1">
            {photos.slice(0, 5).map((p, i) => (
              <span
                key={p.id}
                aria-hidden
                className={cn(
                  "w-1 h-1 rounded-full",
                  i === 0 ? "bg-white" : "bg-white/50",
                )}
              />
            ))}
          </div>
        ) : null}

        {/* États vendu / réservé. */}
        {isSold ? (
          <div className="absolute inset-0 flex items-center justify-center bg-night/35 backdrop-blur-[2px]">
            <span className="px-3 py-1 rounded-full bg-night text-cream text-[10px] font-extrabold uppercase tracking-[0.18em] shadow-soft">
              Vendu
            </span>
          </div>
        ) : isReserved ? (
          <div className="absolute bottom-2 right-2">
            <span className="px-2 py-0.5 rounded-md bg-amber-500/95 text-white text-[10px] font-bold uppercase tracking-wider">
              Réservé
            </span>
          </div>
        ) : null}
      </div>

      <div className={cn("flex-1 flex flex-col gap-1", pad)}>
        {/* Prix + original_price barré (promo). */}
        <div className="flex items-baseline gap-2 min-w-0">
          <p className="font-display italic text-[16px] text-night leading-[1.1] shrink-0">
            {formatPrice(listing.price_amount, listing.price_currency)}
          </p>
          {listing.original_price && listing.original_price > listing.price_amount ? (
            <span className="text-[11px] text-muted line-through truncate">
              {formatPrice(listing.original_price, listing.price_currency)}
            </span>
          ) : null}
        </div>

        <h3
          className={cn(
            "text-[12.5px] font-semibold text-night line-clamp-2 leading-[1.3]",
            variant === "compact" && "text-[11.5px] line-clamp-1",
          )}
        >
          {listing.title}
        </h3>

        {/* Ligne d'attributs spécifiques selon ui_mode. */}
        {attrLine && variant !== "compact" ? (
          <p className="text-[11px] text-night-muted truncate">{attrLine}</p>
        ) : null}

        {/* Seller + distance + temps. */}
        <SellerDistanceRow
          listing={listing}
          distance_m={distance_m}
          sellerName={sellerName}
          showSeller={showSeller && variant !== "compact"}
        />
      </div>
    </Link>
  );
}

/* ---------------------------------------------------------------------------
 * Helpers
 * --------------------------------------------------------------------------- */

function pickCover(photos: ListingWithDetails["photos"]): string | null {
  /* Priorité à la photo flagged is_primary (Chantier 1.1). Fallback sur
   * la première par position. */
  const primary = photos.find((p) => p.is_primary);
  if (primary) return primary.url;
  const sorted = [...photos].sort((a, b) => a.position - b.position);
  return sorted[0]?.url ?? null;
}

function renderCover(
  cover: string | null,
  alt: string,
  isSold: boolean,
  fallbackEmoji: string,
) {
  if (cover) {
    return (
      <Image
        src={cover}
        alt={alt}
        fill
        sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
        className={cn(
          "object-cover transition-transform duration-500 group-hover:scale-[1.03]",
          isSold && "grayscale opacity-70",
        )}
        unoptimized={cover.includes("?")}
      />
    );
  }
  return (
    <div className="absolute inset-0 flex items-center justify-center text-5xl">
      {fallbackEmoji}
    </div>
  );
}

/* Construit la ligne d'attributs selon ui_mode. Renvoie null si pas
 * d'attributs renseignés (compat avec listings legacy). */
function buildAttributeLine(
  listing: ListingWithDetails,
  uiMode: ReturnType<typeof getUiMode>,
): string | null {
  const a = (listing.attributes ?? {}) as Record<string, unknown>;
  const parts: string[] = [];

  if (uiMode === "vinted") {
    /* Mode fashion : size · brand · état */
    if (a.size) parts.push(`Taille ${a.size}`);
    if (a.brand) parts.push(String(a.brand));
    if (a.condition_v2 || listing.condition) {
      const cond = (a.condition_v2 as string) || listing.condition;
      parts.push(CONDITION_META[cond as keyof typeof CONDITION_META] ?? cond);
    }
  } else if (uiMode === "vehicle_specialized") {
    /* Mode véhicule : année · km · carburant */
    if (a.year) parts.push(String(a.year));
    if (a.mileage_km != null) {
      const km = Number(a.mileage_km);
      parts.push(`${km.toLocaleString("fr-FR")} km`);
    }
    if (a.fuel_type) parts.push(formatFuel(String(a.fuel_type)));
  } else if (uiMode === "real_estate_specialized") {
    /* Mode immo : m² · pièces · DPE */
    if (a.surface_m2) parts.push(`${a.surface_m2} m²`);
    if (a.rooms) parts.push(`${a.rooms} pièce${Number(a.rooms) > 1 ? "s" : ""}`);
    if (a.dpe_class) parts.push(`DPE ${a.dpe_class}`);
  } else {
    /* Mode leboncoin/services/jobs : juste l'état si dispo. */
    if (listing.condition && listing.condition !== "used") {
      parts.push(
        CONDITION_META[listing.condition as keyof typeof CONDITION_META] ??
          listing.condition,
      );
    }
  }

  return parts.length > 0 ? parts.join(" · ") : null;
}

function formatFuel(fuel: string): string {
  const map: Record<string, string> = {
    essence: "Essence",
    diesel: "Diesel",
    electrique: "Élec.",
    hybride: "Hybride",
    hybride_rechargeable: "Hyb. rech.",
    gpl: "GPL",
    ethanol: "Éthanol",
  };
  return map[fuel] ?? fuel;
}

function formatPrice(amount: number | string, currency: string): string {
  const value = typeof amount === "number" ? amount : Number(amount);
  if (!Number.isFinite(value)) return "—";
  const formatted = Number.isInteger(value)
    ? value.toLocaleString("fr-FR")
    : value.toFixed(2).replace(".", ",");
  const symbol = currency === "EUR" ? "€" : currency === "USD" ? "$" : currency;
  return `${formatted} ${symbol}`;
}

function formatDistance(m: number): string {
  if (m < 1000) return `${Math.round(m)} m`;
  const km = m / 1000;
  return km < 10 ? `${km.toFixed(1)} km` : `${Math.round(km)} km`;
}

/* Sous-composant : ligne vendeur + distance + temps (réutilisée grid + list). */
function SellerDistanceRow({
  listing,
  distance_m,
  sellerName,
  showSeller,
}: {
  listing: ListingWithDetails;
  distance_m: number | null;
  sellerName: string;
  showSeller: boolean;
}) {
  if (!showSeller) {
    /* Fallback minimal : juste location · time */
    return (
      <div className="mt-auto pt-1 text-[10px] text-night-dim leading-tight truncate flex items-center gap-1">
        {listing.location ? (
          <>
            <MapPin className="w-2.5 h-2.5 shrink-0" aria-hidden />
            <span className="truncate">{listing.location}</span>
            <span className="opacity-60">·</span>
          </>
        ) : null}
        <time dateTime={listing.created_at} className="shrink-0">
          {formatRelative(listing.created_at)}
        </time>
      </div>
    );
  }
  return (
    <div className="mt-auto pt-1.5 flex items-center gap-1.5 min-w-0">
      <Avatar
        src={listing.seller?.avatar_url ?? null}
        fullName={sellerName}
        size="sm"
        className="!w-5 !h-5 shrink-0"
      />
      <span className="text-[11px] font-semibold text-night-soft truncate flex-1 min-w-0">
        {sellerName}
      </span>
      {distance_m !== null && distance_m !== undefined ? (
        <span className="inline-flex items-center gap-0.5 text-[10px] text-night-dim shrink-0">
          <MapPin className="w-2.5 h-2.5" aria-hidden />
          {formatDistance(distance_m)}
        </span>
      ) : listing.location ? (
        <span className="inline-flex items-center gap-0.5 text-[10px] text-night-dim shrink-0 max-w-[80px] truncate">
          <MapPin className="w-2.5 h-2.5 shrink-0" aria-hidden />
          <span className="truncate">{listing.location}</span>
        </span>
      ) : null}
    </div>
  );
}
