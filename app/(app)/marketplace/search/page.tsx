import { ArrowLeft, Search } from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { EmptyState } from "@/components/ui/EmptyState";
import { ListingCard } from "@/components/marketplace/ListingCard";
import { SearchFilters } from "@/components/marketplace/SearchFilters";
import { listListings } from "@/lib/queries/listings";
import { CATEGORY_META } from "@/lib/utils/categories";
import { createClient } from "@/lib/supabase/server";
import type { ListingCategory, ListingCondition } from "@/lib/database.types";
import { Container } from "@/components/primitives/Container";

export const metadata = {
  title: "Recherche — Marketplace",
};

type SearchParams = Promise<{
  q?: string;
  c?: string;
  cd?: string;
  pmin?: string;
  pmax?: string;
  s?: string;
}>;

const ALL_CATEGORIES = Object.keys(CATEGORY_META) as ListingCategory[];
const ALL_CONDITIONS: ListingCondition[] = [
  "new",
  "like_new",
  "used",
  "fair",
  "new_with_tags",
  "new_without_tags",
  "very_good",
  "good",
  "satisfactory",
  "damaged",
];
const ALL_SORTS = new Set([
  "recent",
  "trending",
  "price_asc",
  "price_desc",
] as const);

function parseList<T extends string>(
  raw: string | undefined,
  allowed: readonly T[],
): T[] {
  if (!raw) return [];
  const set = new Set(allowed);
  return raw
    .split(",")
    .map((s) => s.trim())
    .filter((s): s is T => set.has(s as T));
}

function parseNumber(raw: string | undefined): number | undefined {
  if (!raw) return undefined;
  const n = Number(raw);
  return Number.isFinite(n) && n > 0 ? n : undefined;
}

export default async function MarketplaceSearchPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const sp = await searchParams;

  const q = (sp.q ?? "").trim();
  const categories = parseList(sp.c, ALL_CATEGORIES);
  const conditions = parseList(sp.cd, ALL_CONDITIONS);
  const priceMin = parseNumber(sp.pmin);
  const priceMax = parseNumber(sp.pmax);
  const sort = ALL_SORTS.has(sp.s as never)
    ? (sp.s as "recent" | "trending" | "price_asc" | "price_desc")
    : "recent";

  const listings = await listListings(user.id, {
    query: q || undefined,
    categories: categories.length > 0 ? categories : undefined,
    conditions: conditions.length > 0 ? conditions : undefined,
    priceMin,
    priceMax,
    sort,
    limit: 60,
  });

  const hasAnyFilter =
    !!q ||
    categories.length > 0 ||
    conditions.length > 0 ||
    !!priceMin ||
    !!priceMax;

  /* Reconstruit la query string en préservant tous les filtres sauf `q`
   * (pour le bouton "effacer la recherche") + les inputs hidden du form. */
  const hiddenParams: Array<[string, string]> = [];
  if (categories.length > 0) hiddenParams.push(["c", categories.join(",")]);
  if (conditions.length > 0) hiddenParams.push(["cd", conditions.join(",")]);
  if (priceMin) hiddenParams.push(["pmin", String(priceMin)]);
  if (priceMax) hiddenParams.push(["pmax", String(priceMax)]);
  if (sort !== "recent") hiddenParams.push(["s", sort]);

  const clearQs = new URLSearchParams(hiddenParams).toString();
  const clearQueryHref = clearQs
    ? `/marketplace/search?${clearQs}`
    : "/marketplace/search";

  return (
    <div className="bg-bg-soft min-h-[calc(100dvh-56px)]">
      <Container maxWidth={{ mobile: "text", desktop: "wide" }} paddingX="none">
        {/* Header avec retour + search bar */}
        <header className="px-4 sm:px-8 pt-6 sm:pt-10 pb-3">
          <div className="flex items-center gap-3 mb-4">
            <Link
              href="/marketplace"
              aria-label="Retour au marché"
              className="flex h-9 w-9 items-center justify-center rounded-full bg-white border border-line text-night hover:border-gold/40 transition-colors shrink-0"
            >
              <ArrowLeft className="w-4 h-4" aria-hidden />
            </Link>
            <div className="min-w-0">
              <span className="text-[11px] font-extrabold uppercase tracking-[0.18em] text-gold-deep">
                · Recherche
              </span>
              <h1 className="font-display text-[22px] sm:text-[28px] text-night leading-tight font-normal tracking-[-0.02em]">
                <em className="italic">
                  {q ? `« ${q} »` : "Explore le marché"}
                </em>
              </h1>
            </div>
          </div>

          {/* Barre de recherche (GET sur la même page, conserve les autres
              filtres via hidden inputs). */}
          <form action="/marketplace/search" method="GET">
            {hiddenParams.map(([name, value]) => (
              <input key={name} type="hidden" name={name} value={value} />
            ))}
            <label className="flex h-[42px] items-center gap-2.5 rounded-[21px] bg-white border border-line px-3.5 focus-within:border-gold/40 transition-colors">
              <Search
                className="w-[15px] h-[15px] text-night-dim"
                aria-hidden
              />
              <input
                type="search"
                name="q"
                defaultValue={q}
                placeholder="Rechercher un objet, une marque…"
                autoFocus={!q}
                className="flex-1 bg-transparent text-[13px] text-night placeholder:text-night-dim focus:outline-none"
              />
              {q ? (
                <Link
                  href={clearQueryHref}
                  aria-label="Effacer la recherche"
                  className="text-night-dim hover:text-night text-xs font-bold"
                >
                  ×
                </Link>
              ) : null}
            </label>
          </form>
        </header>

        {/* Filtres (client) */}
        <SearchFilters
          initial={{
            q,
            categories,
            conditions,
            priceMin: priceMin ? String(priceMin) : "",
            priceMax: priceMax ? String(priceMax) : "",
            sort,
          }}
          resultsCount={listings.length}
        />

        {/* Résultats */}
        {listings.length === 0 ? (
          <div className="px-5 sm:px-8 pt-2">
            <EmptyState
              emoji="🔎"
              kicker="Aucun résultat"
              title={
                hasAnyFilter
                  ? "Aucune annonce ne correspond à ces filtres"
                  : "Commence ta recherche"
              }
              body={
                hasAnyFilter
                  ? "Élargis tes critères, retire un filtre ou modifie ton mot-clé."
                  : "Tape un mot-clé ou applique des filtres pour explorer le marché DIVARC."
              }
              ctaHref={hasAnyFilter ? "/marketplace/search" : "/marketplace"}
              ctaLabel={hasAnyFilter ? "Réinitialiser" : "Voir le marché"}
              size="lg"
            />
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2.5 px-4 sm:px-7 pt-1 pb-8">
            {listings.map((listing) => (
              <ListingCard key={listing.id} listing={listing} />
            ))}
          </div>
        )}
      </Container>
    </div>
  );
}
