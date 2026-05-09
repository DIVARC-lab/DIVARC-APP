import { Bookmark, Plus, Search, Store } from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { ArcDeco } from "@/components/marketing/ArcDeco";
import { EmptyState } from "@/components/ui/EmptyState";
import { ListingCard } from "@/components/marketplace/ListingCard";
import { CategoryChips } from "@/components/marketplace/CategoryChips";
import { listListings } from "@/lib/queries/listings";
import { CATEGORY_META } from "@/lib/utils/categories";
import { createClient } from "@/lib/supabase/server";
import type { ListingCategory } from "@/lib/database.types";

export const metadata = {
  title: "Marketplace",
};

const ALL_CATEGORIES = Object.keys(CATEGORY_META) as ListingCategory[];

type SearchParams = Promise<{ category?: string; q?: string }>;

/* Refonte Bold (handoff feed-marketplace.jsx MarketplaceListScreen L18-95).
 *
 * Pixel-match :
 * - Header padding 60/20/12 desktop reduit à pt-8 px-5 sur mobile
 * - Kicker "· Le marché" gold-deep + H1 Instrument Serif 38px italic
 * - Right rail : Bookmark icon white border + Plus gradient gold
 * - Search bar h-[42px] r-[21px] avec chip "5 km"
 * - Categories chips Bold (refonte CategoryChips.tsx)
 * - Hero "Coup de cœur" : navy gradient r-[22px] + ArcDeco gold + Découvrir pill
 * - Grid 2-col (mobile) → 3/4 col (desktop), gap 10
 *
 * Server queries (listListings + filtres + favorites) intactes. */
export default async function MarketplacePage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { category, q } = await searchParams;
  const validCategory =
    category && ALL_CATEGORIES.includes(category as ListingCategory)
      ? (category as ListingCategory)
      : undefined;

  const listings = await listListings(user.id, {
    category: validCategory,
    query: q,
    limit: 60,
  });

  const showHero = !validCategory && !q && listings.length > 0;

  return (
    <div className="bg-bg-soft min-h-screen pb-24">
      <div className="mx-auto w-full max-w-2xl lg:max-w-5xl">
        {/* Header */}
        <header className="px-5 sm:px-8 pt-8 sm:pt-10 pb-3 flex items-end justify-between gap-3">
          <div className="min-w-0">
            <span className="text-[11px] font-extrabold uppercase tracking-[0.18em] text-gold-deep">
              · Le marché
            </span>
            <h1 className="mt-1 font-display text-[38px] sm:text-[48px] text-night leading-[1] font-normal tracking-[-0.02em] text-balance">
              <em className="italic bg-gradient-to-br from-gold to-[#B88A2A] bg-clip-text text-transparent">
                Près de toi
              </em>
              , aujourd&apos;hui.
            </h1>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <Link
              href="/marketplace/favorites"
              aria-label="Mes favoris"
              className="flex h-9 w-9 items-center justify-center rounded-full bg-white border border-line text-night hover:border-gold/40 transition-colors"
            >
              <Bookmark className="w-[15px] h-[15px]" aria-hidden />
            </Link>
            <Link
              href="/marketplace/mine"
              aria-label="Mes annonces"
              className="hidden sm:flex h-9 w-9 items-center justify-center rounded-full bg-white border border-line text-night hover:border-gold/40 transition-colors"
            >
              <Store className="w-[15px] h-[15px]" aria-hidden />
            </Link>
            <Link
              href="/marketplace/new"
              aria-label="Vendre quelque chose"
              className="flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br from-gold to-[#B88A2A] text-night shadow-[0_8px_22px_-8px_rgba(244,185,66,0.55)] hover:opacity-95 transition-opacity"
            >
              <Plus className="w-4 h-4" aria-hidden strokeWidth={2.5} />
            </Link>
          </div>
        </header>

        {/* Search bar (visual placeholder, lien vers /search avec scope marketplace) */}
        <div className="px-5 sm:px-8 pt-1 pb-3.5">
          <Link
            href="/search?scope=marketplace"
            className="flex h-[42px] items-center gap-2.5 rounded-[21px] bg-white border border-line px-3.5 text-[13px] text-night-dim hover:border-gold/40 transition-colors"
          >
            <Search className="w-[15px] h-[15px]" aria-hidden />
            <span className="truncate">Rechercher dans le marché…</span>
            <span className="ml-auto inline-flex items-center px-2 py-0.5 rounded-md bg-bg-deep text-[10px] font-bold text-night-dim">
              5 km
            </span>
          </Link>
        </div>

        {/* Categories chips */}
        <div className="px-4 sm:px-7 pb-3.5">
          <CategoryChips />
        </div>

        {/* Hero "Coup de cœur" */}
        {showHero ? (
          <div className="px-5 sm:px-8 pb-3.5">
            <article className="relative overflow-hidden rounded-[22px] bg-gradient-to-br from-night to-night-soft text-cream p-[18px]">
              <div
                aria-hidden
                className="absolute -right-[50px] -bottom-[50px] opacity-40 pointer-events-none"
              >
                <ArcDeco size={180} tone="gold" opacity={1} stroke={1.25} />
              </div>
              <div className="relative">
                <span className="text-[11px] font-extrabold uppercase tracking-[0.18em] text-gold">
                  · Coup de cœur
                </span>
                <p className="mt-1 font-display italic text-[22px] leading-tight text-cream max-w-md">
                  {listings.length} nouveaux objets près de chez toi cette
                  semaine
                </p>
                <Link
                  href="/marketplace/favorites"
                  className="mt-3.5 inline-flex items-center h-[30px] px-3.5 rounded-[15px] bg-gold text-night text-[12px] font-extrabold hover:bg-gold-soft transition-colors"
                >
                  Découvrir
                </Link>
              </div>
            </article>
          </div>
        ) : null}

        {/* Liste */}
        {listings.length === 0 ? (
          <div className="px-5 sm:px-8">
            <EmptyState
              emoji={validCategory ? CATEGORY_META[validCategory].emoji : "🛍️"}
              kicker="Marketplace"
              title={
                q
                  ? `Aucune annonce pour « ${q} »`
                  : validCategory
                    ? `Pas encore d'annonces ${CATEGORY_META[validCategory].label.toLowerCase()}`
                    : "La marketplace démarre"
              }
              body={
                q || validCategory
                  ? "Modifie tes filtres ou publie ta propre annonce."
                  : "Sois le premier à publier une annonce sur DIVARC."
              }
              ctaHref="/marketplace/new"
              ctaLabel="Publier une annonce"
              size="lg"
            />
          </div>
        ) : (
          <>
            <p className="px-5 sm:px-8 pt-1 pb-3 text-[12px] text-night-dim">
              {listings.length} annonce{listings.length > 1 ? "s" : ""}
              {validCategory ? ` · ${CATEGORY_META[validCategory].label}` : ""}
              {q ? ` · « ${q} »` : ""}
            </p>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2.5 px-4 sm:px-7">
              {listings.map((listing) => (
                <ListingCard key={listing.id} listing={listing} />
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
