import { ArrowLeft, ListPlus, Plus, Store } from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { ListingCard } from "@/components/marketplace/ListingCard";
import { listMyListings } from "@/lib/queries/listings";
import { createClient } from "@/lib/supabase/server";
import { ManageListingActions } from "./_components/ManageListingActions";

export const metadata = {
  title: "Mes annonces",
};

export default async function MyListingsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const listings = await listMyListings(user.id);
  const active = listings.filter((l) => l.status === "active");
  const sold = listings.filter((l) => l.status === "sold");

  return (
    <div className="px-6 sm:px-10 py-10 max-w-6xl mx-auto w-full space-y-8">
      <header className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
        <div>
          <Link
            href="/marketplace"
            className="inline-flex items-center gap-2 text-sm text-night-muted hover:text-night mb-3"
          >
            <ArrowLeft className="w-4 h-4" aria-hidden />
            Marketplace
          </Link>
          <span className="text-xs font-semibold tracking-widest uppercase text-gold-deep">
            Mes annonces
          </span>
          <h1 className="mt-2 font-display text-4xl text-night text-balance">
            Tes <em className="italic">annonces</em>.
          </h1>
          <p className="mt-1 text-muted-strong">
            {listings.length} annonce{listings.length > 1 ? "s" : ""} ·{" "}
            {active.length} active{active.length > 1 ? "s" : ""} · {sold.length}{" "}
            vendue{sold.length > 1 ? "s" : ""}
          </p>
        </div>
        <Button asChild size="lg">
          <Link href="/marketplace/new">
            <Plus className="w-4 h-4" aria-hidden />
            Nouvelle annonce
          </Link>
        </Button>
      </header>

      {listings.length === 0 ? (
        <div className="text-center py-20 px-6 rounded-3xl bg-white border border-line">
          <div
            aria-hidden
            className="w-20 h-20 mx-auto rounded-3xl bg-gradient-to-br from-cream via-bg to-gold/15 border border-gold/30 flex items-center justify-center mb-5"
          >
            <Store className="w-8 h-8 text-night-muted" aria-hidden />
          </div>
          <h2 className="font-display text-2xl text-night">
            Aucune annonce pour l&apos;instant
          </h2>
          <p className="mt-2 text-muted max-w-sm mx-auto">
            Publie ta première annonce et démarre tes ventes sur DIVARC.
          </p>
          <Button asChild className="mt-6">
            <Link href="/marketplace/new">
              <ListPlus className="w-4 h-4" aria-hidden />
              Publier ma première annonce
            </Link>
          </Button>
        </div>
      ) : (
        <div className="space-y-10">
          {active.length > 0 ? (
            <Section title="Actives" count={active.length}>
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
                {active.map((listing) => (
                  <div key={listing.id} className="space-y-2">
                    <ListingCard listing={listing} showFavorite={false} />
                    <ManageListingActions
                      listingId={listing.id}
                      status={listing.status}
                    />
                  </div>
                ))}
              </div>
            </Section>
          ) : null}

          {sold.length > 0 ? (
            <Section title="Vendues" count={sold.length}>
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
                {sold.map((listing) => (
                  <div key={listing.id} className="space-y-2">
                    <ListingCard listing={listing} showFavorite={false} />
                    <ManageListingActions
                      listingId={listing.id}
                      status={listing.status}
                    />
                  </div>
                ))}
              </div>
            </Section>
          ) : null}
        </div>
      )}
    </div>
  );
}

function Section({
  title,
  count,
  children,
}: {
  title: string;
  count: number;
  children: React.ReactNode;
}) {
  return (
    <section>
      <h2 className="font-display text-2xl text-night mb-4">
        {title} <span className="text-muted text-base">· {count}</span>
      </h2>
      {children}
    </section>
  );
}
