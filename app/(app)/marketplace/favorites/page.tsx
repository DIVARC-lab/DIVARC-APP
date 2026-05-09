import { ArrowLeft, Heart } from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { ArcDeco } from "@/components/marketing/ArcDeco";
import { EmptyState } from "@/components/ui/EmptyState";
import { ListingCard } from "@/components/marketplace/ListingCard";
import { listFavoriteListings } from "@/lib/queries/listings";
import { createClient } from "@/lib/supabase/server";

export const metadata = {
  title: "Mes favoris",
};

export default async function FavoritesPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const listings = await listFavoriteListings(user.id);

  return (
    <div className="bg-bg-soft min-h-screen pb-24">
      <div className="mx-auto w-full max-w-2xl lg:max-w-5xl">
        {/* Hero header — grammaire Bold cohérente avec /marketplace */}
        <header className="relative overflow-hidden bg-gradient-to-b from-cream to-bg-soft px-5 sm:px-8 pt-8 sm:pt-10 pb-7">
          <div
            aria-hidden
            className="absolute -right-12 -top-14 opacity-45 pointer-events-none"
          >
            <ArcDeco size={220} tone="gold" opacity={1} stroke={1.25} />
          </div>
          <div className="relative">
            <Link
              href="/marketplace"
              className="inline-flex items-center gap-1.5 text-[12px] font-bold text-night-muted hover:text-night transition-colors mb-4"
            >
              <ArrowLeft className="w-[14px] h-[14px]" aria-hidden />
              Marketplace
            </Link>
            <p className="text-[11px] font-extrabold uppercase tracking-[0.18em] text-gold-deep">
              · Favoris
            </p>
            <h1 className="mt-2 font-display text-[36px] sm:text-[48px] font-normal leading-[1.05] tracking-[-0.02em] text-night text-balance">
              Tes{" "}
              <em className="italic bg-gradient-to-br from-gold to-gold-deep bg-clip-text text-transparent">
                coups de cœur
              </em>
              .
            </h1>
            <p className="mt-3 text-[14px] text-night-soft leading-relaxed">
              {listings.length} annonce{listings.length > 1 ? "s" : ""}{" "}
              sauvegardée{listings.length > 1 ? "s" : ""}
            </p>
          </div>
        </header>

        {/* Liste */}
        {listings.length === 0 ? (
          <div className="px-5 sm:px-8 pt-6">
            <EmptyState
              icon={Heart}
              kicker="Marketplace"
              title="Aucun favori pour l'instant"
              body="Tape sur le ❤️ d'une annonce pour la garder ici. Pratique pour comparer ou décider plus tard."
              ctaHref="/marketplace"
              ctaLabel="Parcourir la marketplace"
              size="lg"
            />
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2.5 px-4 sm:px-7 pt-3">
            {listings.map((listing) => (
              <ListingCard key={listing.id} listing={listing} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
