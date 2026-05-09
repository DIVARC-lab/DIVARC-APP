import { CheckCircle2, MapPin, Tag } from "lucide-react";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { Avatar } from "@/components/ui/Avatar";
import { CATEGORY_META, CONDITION_META } from "@/lib/utils/categories";
import { getListingById, listListings } from "@/lib/queries/listings";
import { formatRelative } from "@/lib/utils/relativeTime";
import { createClient } from "@/lib/supabase/server";
import { ContactSellerButton } from "./_components/ContactSellerButton";
import { ListingGallery } from "./_components/ListingGallery";
import { ListingTopBar } from "./_components/ListingTopBar";
import { MakeOfferDialog } from "./_components/MakeOfferDialog";

type Params = Promise<{ id: string }>;

export async function generateMetadata({ params }: { params: Params }) {
  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const listing = await getListingById(id, user?.id ?? null);
  if (!listing) {
    return { title: "Annonce introuvable" };
  }
  return { title: listing.title };
}

/* Refonte audit /marketplace/[id] (handoff feed-marketplace.jsx
 * MarketplaceDetailScreen L101-211) :
 * - Hero gallery 380px full-width avec dots + glass top bar (back/share/fav)
 * - Container bg-bg-soft mobile-first pb-28 (sticky CTA)
 * - Header : kicker tag + title italic 28 + meta MapPin location · {x km}
 *   à gauche, prix Instrument Serif italic 32 right
 * - Facts grid 3 cols (État · Année · Photos)
 * - Description avec kicker · Description gold-deep weight 800
 * - Seller card : avatar 48 + name weight 700 + verified ✓ + rating·sales·response
 * - Similar listings horizontal scroll : cards w-[140px] r-[14px] avec prix italic 14
 * - Sticky CTA bottom : message 48 + Contacter pill gold gradient */
export default async function ListingPage({ params }: { params: Params }) {
  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const listing = await getListingById(id, user.id);
  if (!listing) notFound();

  const isOwn = listing.seller_id === user.id;
  const category = CATEGORY_META[listing.category];
  const isSold = listing.status === "sold";
  const sellerName =
    listing.seller?.full_name ?? listing.seller?.username ?? "Vendeur";
  const sellerHref = listing.seller?.username
    ? `/u/${listing.seller.username}`
    : "/marketplace";

  /* Similar listings : même catégorie, exclu l'annonce courante. */
  const allSameCat = await listListings(user.id, {
    category: listing.category,
    limit: 8,
  });
  const similar = allSameCat.filter((l) => l.id !== listing.id).slice(0, 6);

  const priceFormatted = formatPrice(
    Number(listing.price_amount),
    listing.price_currency,
  );

  /* URL de partage (canonical). */
  const shareUrl =
    typeof process !== "undefined" && process.env.NEXT_PUBLIC_SITE_URL
      ? `${process.env.NEXT_PUBLIC_SITE_URL}/marketplace/${listing.id}`
      : `/marketplace/${listing.id}`;

  return (
    <div className="bg-bg-soft min-h-screen pb-28 relative">
      {/* Hero gallery + glass top bar */}
      <div className="relative">
        <ListingGallery
          photos={listing.photos}
          emojiFallback={category.emoji}
          alt={listing.title}
        />
        <ListingTopBar
          listingId={listing.id}
          initialFavorited={listing.is_favorited}
          shareUrl={shareUrl}
          shareTitle={listing.title}
        />
      </div>

      <div className="px-5 pt-5 max-w-2xl mx-auto">
        {/* Header : title left + price right */}
        <div className="flex items-start gap-4">
          <div className="flex-1 min-w-0">
            <Link
              href={`/marketplace?category=${listing.category}`}
              className="text-[11px] font-extrabold uppercase tracking-[0.16em] text-gold-deep hover:text-night transition-colors"
            >
              · {category.label}
            </Link>
            <h1 className="mt-1.5 font-display text-[28px] sm:text-[32px] text-night leading-[1.05] font-normal tracking-[-0.01em] text-balance">
              {listing.title}
            </h1>
            {listing.location ? (
              <p className="mt-1.5 inline-flex items-center gap-1.5 text-[12px] text-[#8696B0]">
                <MapPin className="w-3 h-3" aria-hidden />
                {listing.location}
              </p>
            ) : null}
          </div>
          <div className="text-right shrink-0">
            <p className="font-display italic text-[32px] text-night leading-none">
              {priceFormatted}
            </p>
            {!isSold ? (
              <p className="mt-0.5 text-[11px] font-bold text-emerald-600">
                Négociable
              </p>
            ) : (
              <p className="mt-0.5 inline-flex items-center gap-1 text-[10px] font-extrabold uppercase tracking-widest text-night">
                <CheckCircle2 className="w-3 h-3" aria-hidden />
                Vendu
              </p>
            )}
          </div>
        </div>

        {/* Facts grid 3 cols */}
        <div className="mt-4 grid grid-cols-3 gap-2">
          <Fact
            label="État"
            value={CONDITION_META[listing.condition] ?? "—"}
          />
          <Fact
            label="Publié"
            value={formatRelative(listing.created_at)}
          />
          <Fact
            label="Photos"
            value={listing.photos.length.toString()}
          />
        </div>

        {/* Description */}
        {listing.description ? (
          <section className="mt-5">
            <span className="text-[11px] font-extrabold uppercase tracking-[0.16em] text-gold-deep">
              · Description
            </span>
            <p className="mt-1.5 text-[14px] text-night-soft leading-[1.55] whitespace-pre-wrap text-pretty">
              {listing.description}
            </p>
          </section>
        ) : null}

        {/* Seller card */}
        {listing.seller ? (
          <Link
            href={sellerHref}
            className="mt-5 flex items-center gap-3 p-3.5 rounded-[18px] bg-white border border-line hover:border-gold/40 transition-colors"
          >
            <Avatar
              src={listing.seller.avatar_url}
              fullName={sellerName}
              size="md"
            />
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1.5">
                <p className="text-[14px] font-bold text-night truncate">
                  {sellerName}
                </p>
                {listing.seller.username ? (
                  <span
                    aria-label="Profil vérifié"
                    className="inline-flex h-[14px] w-[14px] items-center justify-center rounded-full bg-gold text-night text-[8px] font-extrabold"
                  >
                    ✓
                  </span>
                ) : null}
              </div>
              <p className="mt-0.5 text-[11px] text-[#8696B0]">
                {listing.seller.location
                  ? `${listing.seller.location} · `
                  : ""}
                {listing.favorites_count > 0
                  ? `${listing.favorites_count} favori${listing.favorites_count > 1 ? "s" : ""}`
                  : "Membre DIVARC"}
              </p>
            </div>
            <span
              aria-hidden
              className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-bg-soft text-night-soft text-sm font-extrabold"
            >
              →
            </span>
          </Link>
        ) : null}

        {/* Similar listings horizontal scroll */}
        {similar.length > 0 ? (
          <section className="mt-6">
            <span className="text-[11px] font-extrabold uppercase tracking-[0.16em] text-gold-deep">
              · Similaires
            </span>
            <ul className="mt-2 -mx-5 px-5 flex gap-2.5 overflow-x-auto scrollbar-none">
              {similar.map((l) => {
                const lCat = CATEGORY_META[l.category];
                const cover = l.photos[0]?.url ?? null;
                return (
                  <li key={l.id} className="shrink-0 w-[140px]">
                    <Link
                      href={`/marketplace/${l.id}`}
                      className="block rounded-[14px] bg-white border border-line overflow-hidden hover:border-gold/40 transition-colors"
                    >
                      <div className="relative aspect-square bg-night/5">
                        {cover ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={cover}
                            alt=""
                            className="absolute inset-0 h-full w-full object-cover"
                            loading="lazy"
                          />
                        ) : (
                          <div className="absolute inset-0 flex items-center justify-center text-3xl">
                            {lCat.emoji}
                          </div>
                        )}
                      </div>
                      <div className="p-2.5">
                        <p className="font-display italic text-[14px] text-night leading-tight">
                          {formatPrice(
                            Number(l.price_amount),
                            l.price_currency,
                          )}
                        </p>
                        <p className="mt-0.5 text-[11px] font-semibold text-night truncate">
                          {l.title}
                        </p>
                      </div>
                    </Link>
                  </li>
                );
              })}
            </ul>
          </section>
        ) : null}
      </div>

      {/* Sticky CTA bottom */}
      <div
        className="fixed inset-x-0 bottom-0 z-30 px-4 pt-3 pb-[max(env(safe-area-inset-bottom,0px),16px)] bg-[rgba(248,249,251,0.92)] backdrop-blur-md border-t border-line"
        style={{
          paddingBottom: "max(env(safe-area-inset-bottom, 16px), 16px)",
        }}
      >
        <div className="max-w-2xl mx-auto flex items-center gap-2.5">
          <Link
            href="/messages"
            aria-label="Mes messages"
            className="flex h-12 w-12 items-center justify-center rounded-full bg-white border border-line text-night hover:border-gold/40 transition-colors shrink-0"
          >
            <Tag className="w-[18px] h-[18px]" aria-hidden />
          </Link>
          {isOwn ? (
            <Link
              href="/marketplace/mine"
              className="flex-1 inline-flex items-center justify-center gap-2 h-12 px-5 rounded-full bg-night text-cream font-bold text-[14px] hover:bg-night-soft transition-colors"
            >
              Gérer mon annonce
            </Link>
          ) : (
            <>
              <MakeOfferDialog
                listingId={listing.id}
                listingTitle={listing.title}
                askingAmount={listing.price_amount}
                currency={listing.price_currency}
              />
              <ContactSellerButton
                listingId={listing.id}
                sellerName={sellerName}
              />
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function Fact({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-[12px] bg-white border border-line p-2.5">
      <p className="text-[10px] font-extrabold uppercase tracking-[0.08em] text-[#8696B0]">
        {label}
      </p>
      <p className="mt-1 text-[13px] font-semibold text-night truncate">
        {value}
      </p>
    </div>
  );
}

function formatPrice(amount: number, currency: string): string {
  if (!Number.isFinite(amount)) return "—";
  const formatted = Number.isInteger(amount)
    ? amount.toLocaleString("fr-FR")
    : amount.toFixed(2).replace(".", ",");
  const symbol =
    currency === "EUR" ? "€" : currency === "USD" ? "$" : currency;
  return `${formatted} ${symbol}`;
}
