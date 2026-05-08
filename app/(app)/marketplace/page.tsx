import { Heart, ListPlus, Plus, Sparkles, Store } from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { ArcDeco } from "@/components/marketing/ArcDeco";
import { Button } from "@/components/ui/Button";
import { DisplayHeading } from "@/components/ui/DisplayHeading";
import { ListingCard } from "@/components/marketplace/ListingCard";
import { CategoryChips } from "@/components/marketplace/CategoryChips";
import { listListings } from "@/lib/queries/listings";
import { CATEGORY_META } from "@/lib/utils/categories";
import { createClient } from "@/lib/supabase/server";
import type { ListingCategory } from "@/lib/database.types";
import { KickerLabel } from "@/components/ui/KickerLabel";

export const metadata = {
  title: "Marketplace",
};

const ALL_CATEGORIES = Object.keys(CATEGORY_META) as ListingCategory[];

type SearchParams = Promise<{ category?: string; q?: string }>;

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
  const validCategory = (
    category && ALL_CATEGORIES.includes(category as ListingCategory)
      ? (category as ListingCategory)
      : undefined
  );

  const listings = await listListings(user.id, {
    category: validCategory,
    query: q,
    limit: 60,
  });

  return (
    <div className="px-6 sm:px-10 py-10 max-w-7xl mx-auto w-full space-y-8">
      <header className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-5">
        <div>
          <KickerLabel>· Le marché</KickerLabel>
          <DisplayHeading
            size="xl"
            className="mt-3 !leading-[1.02] !text-[40px] sm:!text-[56px]"
          >
            <em className="italic text-gold-deep">Près de toi</em>,
            aujourd&apos;hui.
          </DisplayHeading>
          <p className="mt-3 text-night-muted text-base max-w-xl leading-relaxed">
            La marketplace francophone de DIVARC. Multi-devise, contact direct
            via la messagerie, sans frais cachés.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button variant="secondary" size="md" asChild>
            <Link href="/marketplace/favorites">
              <Heart className="w-4 h-4" aria-hidden />
              Favoris
            </Link>
          </Button>
          <Button variant="secondary" size="md" asChild>
            <Link href="/marketplace/mine">
              <Store className="w-4 h-4" aria-hidden />
              Mes annonces
            </Link>
          </Button>
          <Button size="md" asChild>
            <Link href="/marketplace/new">
              <Plus className="w-4 h-4" aria-hidden />
              Vendre quelque chose
            </Link>
          </Button>
        </div>
      </header>

      <CategoryChips />

      {listings.length === 0 ? (
        <EmptyState category={validCategory} query={q} />
      ) : (
        <>
          {!validCategory && !q ? (
            <article className="relative overflow-hidden rounded-3xl bg-night text-cream p-6 sm:p-7 shadow-[0_24px_60px_-28px_rgba(10,31,68,0.5)]">
              <div
                aria-hidden
                className="absolute -right-16 -bottom-20 pointer-events-none"
              >
                <ArcDeco
                  size={300}
                  tone="gold"
                  opacity={0.5}
                  stroke={1.25}
                />
              </div>
              <div className="relative">
                <span className="text-[11px] font-extrabold uppercase tracking-[0.18em] text-gold">
                  · Coup de cœur
                </span>
                <p className="mt-2 font-display italic text-2xl sm:text-3xl leading-tight text-cream max-w-md">
                  {listings.length} nouveaux objets près de toi cette semaine
                </p>
                <Link
                  href="/marketplace/favorites"
                  className="mt-4 inline-flex items-center gap-1.5 px-4 h-9 rounded-full bg-gold text-night text-xs font-extrabold hover:bg-gold-soft transition-colors"
                >
                  Découvrir mes favoris →
                </Link>
              </div>
            </article>
          ) : null}

          <div className="flex items-center justify-between">
            <p className="text-sm text-muted">
              {listings.length} annonce{listings.length > 1 ? "s" : ""}
              {validCategory ? ` · ${CATEGORY_META[validCategory].label}` : ""}
              {q ? ` · « ${q} »` : ""}
            </p>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
            {listings.map((listing) => (
              <ListingCard key={listing.id} listing={listing} />
            ))}
          </div>
        </>
      )}
    </div>
  );
}

function EmptyState({
  category,
  query,
}: {
  category: ListingCategory | undefined;
  query: string | undefined;
}) {
  return (
    <div className="text-center py-20 px-6 rounded-3xl bg-white border border-line">
      <div
        aria-hidden
        className="w-20 h-20 mx-auto rounded-3xl bg-gradient-to-br from-cream via-bg to-gold/15 border border-gold/30 flex items-center justify-center mb-5 text-4xl leading-none"
      >
        {category ? CATEGORY_META[category].emoji : "🛍️"}
      </div>
      <h2 className="font-display text-2xl text-night">
        {query
          ? `Aucune annonce pour « ${query} »`
          : category
            ? `Pas encore d'annonces ${CATEGORY_META[category].label.toLowerCase()}`
            : "La marketplace démarre"}
      </h2>
      <p className="mt-2 text-muted max-w-sm mx-auto">
        {query || category
          ? "Modifie tes filtres ou publie ta propre annonce."
          : "Sois le premier à publier une annonce sur DIVARC."}
      </p>
      <Button asChild className="mt-6">
        <Link href="/marketplace/new">
          <ListPlus className="w-4 h-4" aria-hidden />
          Publier une annonce
        </Link>
      </Button>
    </div>
  );
}
