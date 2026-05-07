import {
  ArrowLeft,
  CheckCircle2,
  Clock,
  Heart,
  MapPin,
  Tag,
} from "lucide-react";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { Avatar } from "@/components/ui/Avatar";
import { FavoriteButton } from "@/components/marketplace/FavoriteButton";
import { PriceTag } from "@/components/marketplace/PriceTag";
import { CATEGORY_META, CONDITION_META } from "@/lib/utils/categories";
import { getListingById } from "@/lib/queries/listings";
import { formatRelative } from "@/lib/utils/relativeTime";
import { createClient } from "@/lib/supabase/server";
import { ContactSellerButton } from "./_components/ContactSellerButton";
import { ListingGallery } from "./_components/ListingGallery";

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

  return (
    <div className="px-6 sm:px-10 py-10 max-w-6xl mx-auto w-full">
      <Link
        href="/marketplace"
        className="inline-flex items-center gap-2 text-sm text-night-muted hover:text-night mb-6"
      >
        <ArrowLeft className="w-4 h-4" aria-hidden />
        Retour aux annonces
      </Link>

      <div className="grid lg:grid-cols-2 gap-8 lg:gap-12">
        <ListingGallery
          photos={listing.photos}
          emojiFallback={category.emoji}
          alt={listing.title}
        />

        <div className="space-y-6">
          <header>
            <div className="flex items-center gap-2 flex-wrap">
              <Link
                href={`/marketplace?category=${listing.category}`}
                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-night/5 text-night-muted text-xs font-semibold hover:bg-night/10"
              >
                <span aria-hidden>{category.emoji}</span>
                {category.label}
              </Link>
              {isSold ? (
                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-night text-cream text-[10px] font-bold uppercase tracking-widest">
                  <CheckCircle2 className="w-3 h-3" aria-hidden />
                  Vendu
                </span>
              ) : null}
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-cream text-night-muted text-xs font-semibold">
                <Tag className="w-3 h-3" aria-hidden />
                {CONDITION_META[listing.condition]}
              </span>
            </div>

            <h1 className="mt-4 font-display text-3xl sm:text-4xl text-night text-balance leading-tight">
              {listing.title}
            </h1>
            <div className="mt-4 flex items-center justify-between gap-4">
              <PriceTag
                amount={Number(listing.price_amount)}
                currency={listing.price_currency}
                size="xl"
              />
              <FavoriteButton
                listingId={listing.id}
                initialFavorited={listing.is_favorited}
                size="md"
                className="bg-white"
              />
            </div>

            <ul className="mt-5 flex flex-wrap items-center gap-4 text-sm text-muted">
              {listing.location ? (
                <li className="flex items-center gap-1.5">
                  <MapPin className="w-3.5 h-3.5" aria-hidden />
                  {listing.location}
                </li>
              ) : null}
              <li className="flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5" aria-hidden />
                Publiée {formatRelative(listing.created_at)}
              </li>
              {listing.favorites_count > 0 ? (
                <li className="flex items-center gap-1.5">
                  <Heart className="w-3.5 h-3.5" aria-hidden />
                  {listing.favorites_count} favori
                  {listing.favorites_count > 1 ? "s" : ""}
                </li>
              ) : null}
            </ul>
          </header>

          {listing.description ? (
            <section className="p-6 rounded-3xl bg-white border border-line">
              <h2 className="text-xs font-semibold uppercase tracking-widest text-muted mb-3">
                Description
              </h2>
              <p className="text-night-muted whitespace-pre-wrap leading-relaxed">
                {listing.description}
              </p>
            </section>
          ) : null}

          {listing.seller ? (
            <section className="p-6 rounded-3xl bg-gradient-to-br from-cream to-bg border border-gold/30">
              <h2 className="text-xs font-semibold uppercase tracking-widest text-muted mb-4">
                Vendu par
              </h2>
              <div className="flex items-center gap-4">
                <Avatar
                  src={listing.seller.avatar_url}
                  fullName={sellerName}
                  size="lg"
                />
                <div className="flex-1 min-w-0">
                  <p className="font-display text-xl text-night">
                    {sellerName}
                  </p>
                  {listing.seller.username ? (
                    <p className="text-sm text-muted">
                      @{listing.seller.username}
                    </p>
                  ) : null}
                  {listing.seller.location ? (
                    <p className="text-xs text-muted mt-1 flex items-center gap-1">
                      <MapPin className="w-3 h-3" aria-hidden />
                      {listing.seller.location}
                    </p>
                  ) : null}
                </div>
              </div>
            </section>
          ) : null}

          <div className="flex flex-wrap gap-3 pt-2">
            {isOwn ? (
              <>
                <Link
                  href="/marketplace/mine"
                  className="px-6 py-3 rounded-full bg-night text-cream font-semibold text-sm hover:bg-night-soft transition"
                >
                  Gérer mon annonce
                </Link>
              </>
            ) : (
              <ContactSellerButton listingId={listing.id} />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
