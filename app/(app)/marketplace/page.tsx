import {
  Bookmark,
  Flame,
  Handshake,
  MessageCircle,
  Plus,
  Search,
  SlidersHorizontal,
  Sparkles,
  Store,
} from "lucide-react";
import { Fragment } from "react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { ArcDeco } from "@/components/marketing/ArcDeco";
import { EmptyState } from "@/components/ui/EmptyState";
import { ListingCard } from "@/components/marketplace/ListingCard";
import { CategoryChips } from "@/components/marketplace/CategoryChips";
import { AdSlot } from "@/components/ads/AdSlot";
import { listListings, listRecommendedListings } from "@/lib/queries/listings";
import { countPendingReceivedOffers } from "@/lib/queries/listingOffers";
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

  const [
    listings,
    pendingOffersCount,
    trendingListings,
    recommendedListings,
  ] = await Promise.all([
    listListings(user.id, {
      category: validCategory,
      query: q,
      limit: 60,
    }),
    countPendingReceivedOffers(user.id),
    /* Tendances : pas de filtre catégorie/query → snapshot global.
     * On masque cette section si l'user est sur une recherche/catégorie
     * filtrée (focus sur les résultats). */
    !validCategory && !q
      ? listListings(user.id, { sort: "trending", limit: 10 })
      : Promise.resolve([]),
    /* Chantier 2.5 — Recos perso : RPC server-side qui croise favoris
     * × catégories × popularité. Masqué si filtres actifs. */
    !validCategory && !q
      ? listRecommendedListings(user.id, 12)
      : Promise.resolve([]),
  ]);

  const showHero = !validCategory && !q && listings.length > 0;
  const showTrending =
    !validCategory && !q && trendingListings.length >= 4;
  const showRecommended =
    !validCategory && !q && recommendedListings.length >= 4;

  return (
    <div className="bg-bg-soft min-h-[calc(100dvh-56px)]">
      <div className="mx-auto w-full max-w-2xl lg:max-w-5xl">
        {/* Header */}
        <header className="px-4 sm:px-8 pt-6 sm:pt-10 pb-3 flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3">
          <div className="min-w-0">
            <span className="text-[11px] font-extrabold uppercase tracking-[0.18em] text-gold-deep">
              · Le marché
            </span>
            <h1 className="mt-1 font-display text-[28px] sm:text-[48px] text-night leading-[1] font-normal tracking-[-0.02em] text-balance">
              <em className="italic bg-gradient-to-br from-gold to-gold-deep bg-clip-text text-transparent">
                Près de toi
              </em>
              , aujourd&apos;hui.
            </h1>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <Link
              href="/marketplace/messages"
              aria-label="Messages marketplace"
              className="flex h-9 w-9 items-center justify-center rounded-full bg-white border border-line text-night hover:border-gold/40 transition-colors"
            >
              <MessageCircle className="w-[15px] h-[15px]" aria-hidden />
            </Link>
            <Link
              href="/marketplace/offers"
              aria-label={
                pendingOffersCount > 0
                  ? `Mes offres — ${pendingOffersCount} en attente`
                  : "Mes offres"
              }
              className="relative flex h-9 w-9 items-center justify-center rounded-full bg-white border border-line text-night hover:border-gold/40 transition-colors"
            >
              <Handshake className="w-[15px] h-[15px]" aria-hidden />
              {pendingOffersCount > 0 ? (
                <span
                  aria-hidden
                  className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 rounded-full bg-gold text-night text-[10px] font-extrabold flex items-center justify-center"
                >
                  {pendingOffersCount}
                </span>
              ) : null}
            </Link>
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
              className="flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br from-gold to-gold-deep text-night shadow-[0_8px_22px_-8px_rgba(244,185,66,0.55)] hover:opacity-95 transition-opacity"
            >
              <Plus className="w-4 h-4" aria-hidden strokeWidth={2.5} />
            </Link>
          </div>
        </header>

        {/* Search bar fonctionnelle — submit GET sur la même page, le `q`
            arrive dans searchParams et est bookmarkable / shareable.
            Le filtre catégorie est préservé via hidden input.
            Bouton "filtres avancés" → /marketplace/search (Chantier 2.2). */}
        <div className="px-5 sm:px-8 pt-1 pb-3.5 flex items-center gap-2">
          <form action="/marketplace" method="GET" className="flex-1 min-w-0">
            {validCategory ? (
              <input type="hidden" name="category" value={validCategory} />
            ) : null}
            <label className="flex h-[42px] items-center gap-2.5 rounded-[21px] bg-white border border-line px-3.5 focus-within:border-gold/40 transition-colors">
              <Search
                className="w-[15px] h-[15px] text-night-dim"
                aria-hidden
              />
              <input
                type="search"
                name="q"
                defaultValue={q ?? ""}
                placeholder="Rechercher dans le marché…"
                className="flex-1 bg-transparent text-[13px] text-night placeholder:text-night-dim focus:outline-none"
              />
              {q ? (
                <Link
                  href={
                    validCategory
                      ? `/marketplace?category=${validCategory}`
                      : "/marketplace"
                  }
                  aria-label="Effacer la recherche"
                  className="text-night-dim hover:text-night text-xs font-bold"
                >
                  ×
                </Link>
              ) : (
                <span className="ml-auto inline-flex items-center px-2 py-0.5 rounded-md bg-bg-deep text-[10px] font-bold text-night-dim">
                  5 km
                </span>
              )}
            </label>
          </form>
          <Link
            href={
              q
                ? `/marketplace/search?q=${encodeURIComponent(q)}`
                : "/marketplace/search"
            }
            aria-label="Recherche avancée"
            className="flex h-[42px] w-[42px] shrink-0 items-center justify-center rounded-[21px] bg-white border border-line text-night hover:border-gold/40 transition-colors"
          >
            <SlidersHorizontal className="w-4 h-4" aria-hidden />
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

        {/* Section "📈 Tendances" — carrousel horizontal scroll des
            listings les plus vus + boostés. Masquée si filtres actifs. */}
        {showTrending ? (
          <section className="pb-3" aria-labelledby="trending-heading">
            <header className="px-5 sm:px-8 pb-2.5 flex items-center justify-between">
              <h2
                id="trending-heading"
                className="inline-flex items-center gap-1.5 text-sm font-bold text-night"
              >
                <Flame className="w-4 h-4 text-gold-deep" aria-hidden />
                Tendances
              </h2>
              <span className="text-[11px] text-night-dim font-semibold uppercase tracking-wider">
                · maintenant
              </span>
            </header>
            <div className="overflow-x-auto scrollbar-none [-webkit-overflow-scrolling:touch]">
              <div className="flex gap-2.5 px-4 sm:px-7 pb-3 snap-x snap-mandatory">
                {trendingListings.map((listing) => (
                  <div
                    key={listing.id}
                    className="shrink-0 w-[150px] sm:w-[170px] snap-start"
                  >
                    <ListingCard listing={listing} variant="compact" />
                  </div>
                ))}
              </div>
            </div>
          </section>
        ) : null}

        {/* Section "✨ Pour toi" — recos basées sur les catégories des
            favoris user. Cold-start (pas de favoris) : poids 0 → ranking
            fallback popularité + récence. Masqué si <4 résultats ou
            filtres actifs (focus sur la grille principale). */}
        {showRecommended ? (
          <section
            className="pb-3"
            aria-labelledby="recommended-heading"
          >
            <header className="px-5 sm:px-8 pb-2.5 flex items-center justify-between">
              <h2
                id="recommended-heading"
                className="inline-flex items-center gap-1.5 text-sm font-bold text-night"
              >
                <Sparkles className="w-4 h-4 text-gold-deep" aria-hidden />
                Pour toi
              </h2>
              <span className="text-[11px] text-night-dim font-semibold uppercase tracking-wider">
                · sur mesure
              </span>
            </header>
            <div className="overflow-x-auto scrollbar-none [-webkit-overflow-scrolling:touch]">
              <div className="flex gap-2.5 px-4 sm:px-7 pb-3 snap-x snap-mandatory">
                {recommendedListings.map((listing) => (
                  <div
                    key={listing.id}
                    className="shrink-0 w-[150px] sm:w-[170px] snap-start"
                  >
                    <ListingCard listing={listing} variant="compact" />
                  </div>
                ))}
              </div>
            </div>
          </section>
        ) : null}

        {/* Liste principale */}
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
              {listings.map((listing, index) => (
                <Fragment key={listing.id}>
                  <ListingCard listing={listing} />
                  {/* Densité ads marketplace : 1 sponsored / 12 listings.
                      AdSlot prend toute la largeur de la grid (col-span-full)
                      pour ne pas casser le layout 2-3-4 colonnes. */}
                  {index > 0 && (index + 1) % 12 === 0 ? (
                    <div
                      className="col-span-full"
                      aria-label="Publicité sponsorisée"
                    >
                      <AdSlot
                        surface="marketplace_feed"
                        slotIndex={Math.floor((index + 1) / 12)}
                      />
                    </div>
                  ) : null}
                </Fragment>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
