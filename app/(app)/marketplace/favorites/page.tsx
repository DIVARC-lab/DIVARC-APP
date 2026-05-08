import { ArrowLeft, Heart } from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { ListingCard } from "@/components/marketplace/ListingCard";
import { listFavoriteListings } from "@/lib/queries/listings";
import { createClient } from "@/lib/supabase/server";
import { KickerLabel } from "@/components/ui/KickerLabel";

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
    <div className="px-6 sm:px-10 py-10 max-w-6xl mx-auto w-full space-y-8">
      <header>
        <Link
          href="/marketplace"
          className="inline-flex items-center gap-2 text-sm text-night-muted hover:text-night mb-3"
        >
          <ArrowLeft className="w-4 h-4" aria-hidden />
          Marketplace
        </Link>
        <KickerLabel>Favoris</KickerLabel>
        <h1 className="mt-2 font-display text-4xl text-night text-balance">
          Tes <em className="italic text-gold-deep">coups de cœur</em>.
        </h1>
        <p className="mt-1 text-muted-strong">
          {listings.length} annonce{listings.length > 1 ? "s" : ""} sauvegardée
          {listings.length > 1 ? "s" : ""}
        </p>
      </header>

      {listings.length === 0 ? (
        <div className="text-center py-20 px-6 rounded-3xl bg-white border border-line">
          <div
            aria-hidden
            className="w-20 h-20 mx-auto rounded-3xl bg-gradient-to-br from-cream via-bg to-gold/15 border border-gold/30 flex items-center justify-center mb-5"
          >
            <Heart className="w-8 h-8 text-night-muted" aria-hidden />
          </div>
          <h2 className="font-display text-2xl text-night">
            Aucun favori pour l&apos;instant
          </h2>
          <p className="mt-2 text-muted max-w-sm mx-auto">
            Tape sur le ❤️ d&apos;une annonce pour la garder ici.
          </p>
          <Button asChild className="mt-6">
            <Link href="/marketplace">Parcourir la marketplace</Link>
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
          {listings.map((listing) => (
            <ListingCard key={listing.id} listing={listing} />
          ))}
        </div>
      )}
    </div>
  );
}
