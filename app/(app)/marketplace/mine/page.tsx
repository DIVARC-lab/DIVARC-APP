import { ArrowLeft, Plus, Store } from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { ArcDeco } from "@/components/marketing/ArcDeco";
import { EmptyState } from "@/components/ui/EmptyState";
import { ListingCard } from "@/components/marketplace/ListingCard";
import { listMyListings } from "@/lib/queries/listings";
import { createClient } from "@/lib/supabase/server";
import { ManageListingActions } from "./_components/ManageListingActions";
import { Container } from "@/components/primitives/Container";

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
    <div className="bg-bg-soft min-h-[calc(100dvh-56px)] pb-24">
      <Container maxWidth={{ mobile: "text", desktop: "wide" }} paddingX="none">
        {/* Hero header — grammaire Bold cohérente avec /marketplace */}
        <header className="relative overflow-hidden bg-gradient-to-b from-cream to-bg-soft px-5 sm:px-8 pt-8 sm:pt-10 pb-7">
          <div
            aria-hidden
            className="absolute -right-12 -top-14 opacity-45 pointer-events-none"
          >
            <ArcDeco size={220} tone="gold" opacity={1} stroke={1.25} />
          </div>
          <div className="relative flex items-end justify-between gap-3">
            <div className="min-w-0 flex-1">
              <Link
                href="/marketplace"
                className="inline-flex items-center gap-1.5 text-[12px] font-bold text-night-muted hover:text-night transition-colors mb-4"
              >
                <ArrowLeft className="w-[14px] h-[14px]" aria-hidden />
                Marketplace
              </Link>
              <p className="text-[11px] font-extrabold uppercase tracking-[0.18em] text-gold-deep">
                · Mes annonces
              </p>
              <h1 className="mt-2 font-display text-[36px] sm:text-[48px] font-normal leading-[1.05] tracking-[-0.02em] text-night text-balance">
                Tes{" "}
                <em className="italic bg-gradient-to-br from-gold to-gold-deep bg-clip-text text-transparent">
                  annonces
                </em>
                .
              </h1>
              <p className="mt-3 text-[14px] text-night-soft leading-relaxed">
                {listings.length} annonce{listings.length > 1 ? "s" : ""} ·{" "}
                {active.length} active{active.length > 1 ? "s" : ""} ·{" "}
                {sold.length} vendue{sold.length > 1 ? "s" : ""}
              </p>
            </div>
            <Link
              href="/marketplace/new"
              aria-label="Nouvelle annonce"
              className="shrink-0 flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br from-gold to-gold-deep text-night shadow-[0_8px_22px_-8px_rgba(244,185,66,0.55)] hover:opacity-95 transition-opacity"
            >
              <Plus className="w-4 h-4" aria-hidden strokeWidth={2.5} />
            </Link>
          </div>
        </header>

        {/* Stats compactes : 3 cards en grille */}
        {listings.length > 0 ? (
          <section
            aria-label="Statistiques annonces"
            className="px-5 sm:px-8 pt-5 grid grid-cols-3 gap-2.5"
          >
            <StatTile
              label="Total"
              value={listings.length}
              tone="navy"
            />
            <StatTile
              label="Actives"
              value={active.length}
              tone="gold"
              highlight={active.length > 0}
            />
            <StatTile
              label="Vendues"
              value={sold.length}
              tone="muted"
            />
          </section>
        ) : null}

        {/* Liste */}
        {listings.length === 0 ? (
          <div className="px-5 sm:px-8 pt-6">
            <EmptyState
              icon={Store}
              kicker="Vendeur"
              title={
                <>
                  Aucune annonce pour <em className="italic text-gold-deep">l&apos;instant</em>
                </>
              }
              body="Publie ta première annonce et démarre tes ventes sur DIVARC."
              ctaHref="/marketplace/new"
              ctaLabel="Publier ma première annonce"
              size="lg"
            />
          </div>
        ) : (
          <div className="px-4 sm:px-7 pt-6 space-y-8">
            {active.length > 0 ? (
              <section>
                <Heading title="Actives" count={active.length} />
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2.5">
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
              </section>
            ) : null}

            {sold.length > 0 ? (
              <section>
                <Heading title="Vendues" count={sold.length} />
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2.5">
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
              </section>
            ) : null}
          </div>
        )}
      </Container>
    </div>
  );
}

function StatTile({
  label,
  value,
  tone,
  highlight,
}: {
  label: string;
  value: number;
  tone: "navy" | "gold" | "muted";
  highlight?: boolean;
}) {
  const valueColor =
    tone === "gold"
      ? "text-gold-deep"
      : tone === "muted"
        ? "text-night-muted"
        : "text-night";
  return (
    <div
      className={
        highlight
          ? "rounded-[14px] bg-gold/[0.08] border border-gold/30 p-3"
          : "rounded-[14px] bg-white border border-line p-3"
      }
    >
      <p className="text-[10px] font-extrabold uppercase tracking-[0.1em] text-night-dim">
        {label}
      </p>
      <p
        className={`mt-1 font-display italic text-[24px] sm:text-[28px] leading-none ${valueColor}`}
      >
        {value}
      </p>
    </div>
  );
}

function Heading({ title, count }: { title: string; count: number }) {
  return (
    <div className="mb-3">
      <p className="text-[11px] font-extrabold uppercase tracking-[0.16em] text-gold-deep">
        · {title}
      </p>
      <h2 className="mt-1 font-display italic text-[22px] sm:text-[26px] text-night leading-tight">
        {count} annonce{count > 1 ? "s" : ""}
      </h2>
    </div>
  );
}
