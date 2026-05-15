import { Compass, Eye, Lock, Plus, Search, Sparkles } from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { ArcDeco } from "@/components/marketing/ArcDeco";
import { EmptyState } from "@/components/ui/EmptyState";
import { KickerLabel } from "@/components/ui/KickerLabel";
import {
  discoverCircles,
  listLocalCircles,
  listMyCirclesWithUnread,
  listNewCircles,
  listTrendingCircles,
  type DiscoverSort,
  type MyCircleSummary,
} from "@/lib/queries/circles";
import { createClient } from "@/lib/supabase/server";
import type { CircleColor, CircleWithMembership } from "@/lib/database.types";
import { cn } from "@/lib/utils/cn";
import { CircleDiscoverCard } from "./_components/CircleDiscoverCard";
import { CircleDiscoverFilters } from "./_components/CircleDiscoverFilters";
import { CircleMiniCard } from "./_components/CircleMiniCard";

export const metadata = {
  title: "Cercles — Trouve ta tribu",
  description:
    "Sors de ton cercle, trouve ta tribu. Sélection par fraîcheur et engagement, jamais par algorithme opaque.",
};

/* Refonte audit (handoff feed-circles.jsx CirclesListScreen L28-118) :
 * - Container bg-white pb-24 mobile-first
 * - Header : kicker · Cercles + H1 Instrument Serif italic 38 "Tes <em>5
 *   cercles</em>"
 * - Search bar h-[42px] r-full bg-bg-soft border line
 * - Filter chips h-7 padding 7/14 navy/cream actif, bg-soft/night-muted inactif
 * - CircleCard : icone 56×56 r-14 avec ArcDeco filigrane 18% interne, title
 *   14.5 weight 800, desc 12 muted, meta "X membres" 11 muted
 * - Discover banner gradient navy + ArcDeco gold + button "Explorer →" gold
 * - Bouton "+" en header right (gold gradient) au lieu de FAB (le bottom nav
 *   floating prend déjà cet espace) */
type SearchParamsP = Promise<{
  cat?: string;
  sort?: string;
  q?: string;
}>;

const VALID_SORTS = new Set<DiscoverSort>([
  "active",
  "recent",
  "largest",
  "nearby",
  "recommended",
]);

export default async function CirclesPage({
  searchParams,
}: {
  searchParams: SearchParamsP;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const sp = await searchParams;
  const category = sp.cat ?? null;
  const sort: DiscoverSort = VALID_SORTS.has(sp.sort as DiscoverSort)
    ? (sp.sort as DiscoverSort)
    : "active";
  const query = sp.q?.trim() || undefined;

  /* Pour le tri 'nearby', on lit le pays de l'user. */
  const { data: profile } = await supabase
    .from("profiles")
    .select("location")
    .eq("id", user.id)
    .maybeSingle();
  /* TODO migration profile country code — pour V1 on accepte que location_country
   * dans circles soit FR par défaut. */
  const nearbyCountry = profile?.location ? "FR" : null;

  const isFiltered = !!category || sort !== "active" || !!query;

  const [mine, discoverable, trending, local, fresh] = await Promise.all([
    listMyCirclesWithUnread(user.id),
    discoverCircles(user.id, {
      sort,
      category: category ?? undefined,
      nearbyCountry,
      query,
      limit: 24,
    }),
    /* Sections thématiques uniquement quand pas de filtres actifs : focus
     * sur la grille filtrée sinon. */
    !isFiltered ? listTrendingCircles(user.id, 8) : Promise.resolve([]),
    !isFiltered
      ? listLocalCircles(user.id, nearbyCountry, 8)
      : Promise.resolve([]),
    !isFiltered ? listNewCircles(user.id, 8) : Promise.resolve([]),
  ]);

  /* Dédoublonne : les cercles déjà affichés dans la grille principale ne
   * sont pas répétés dans les carrousels. */
  const discoverableIds = new Set(discoverable.map((c) => c.id));
  const trendingDeduped = trending.filter((c) => !discoverableIds.has(c.id));
  const trendingIds = new Set(trendingDeduped.map((c) => c.id));
  const localDeduped = local.filter(
    (c) => !discoverableIds.has(c.id) && !trendingIds.has(c.id),
  );
  const localIds = new Set(localDeduped.map((c) => c.id));
  const freshDeduped = fresh.filter(
    (c) =>
      !discoverableIds.has(c.id) &&
      !trendingIds.has(c.id) &&
      !localIds.has(c.id),
  );

  return (
    <div className="bg-white min-h-[calc(100dvh-56px)] pb-24">
      <div className="mx-auto w-full max-w-2xl lg:max-w-5xl">
        {/* HERO V2 — promesse-produit "trouve ta tribu" + manifeste anti-algo.
            Le titre Cormorant + sous-titre + 2 CTAs (Créer / Rechercher) +
            ArcDeco signature DIVARC en background. */}
        <header className="relative overflow-hidden px-5 sm:px-8 pt-8 sm:pt-12 pb-6 sm:pb-10">
          <div
            aria-hidden
            className="absolute -right-12 -top-8 sm:-right-20 sm:-top-12 opacity-30 pointer-events-none select-none"
          >
            <ArcDeco size={280} tone="gold" opacity={1} stroke={1.25} />
          </div>
          <div
            aria-hidden
            className="absolute -left-16 -bottom-16 opacity-15 pointer-events-none select-none hidden sm:block"
          >
            <ArcDeco size={200} tone="navy" opacity={1} stroke={1} />
          </div>

          <div className="relative max-w-2xl">
            <KickerLabel className="inline-flex items-center gap-1.5">
              <Sparkles className="w-3 h-3" aria-hidden />
              Les Cercles
            </KickerLabel>
            <h1 className="mt-3 font-display text-[34px] sm:text-[52px] lg:text-[60px] text-night leading-[0.98] font-normal tracking-[-0.025em] text-balance">
              Sors de ton cercle,{" "}
              <em className="italic bg-gradient-to-br from-gold to-gold-deep bg-clip-text text-transparent">
                trouve ta tribu.
              </em>
            </h1>
            <p className="mt-4 text-[15px] sm:text-[17px] text-night-soft leading-[1.55] max-w-xl text-pretty">
              Des personnes, des posts, des annonces, des jobs. Sélection par{" "}
              <strong className="text-night">fraîcheur</strong> et{" "}
              <strong className="text-night">engagement</strong>,{" "}
              <span className="text-gold-deep font-bold">
                jamais par algorithme opaque.
              </span>
            </p>

            <div className="mt-5 sm:mt-7 flex flex-col sm:flex-row gap-2.5 sm:gap-3">
              <Link
                href="/circles/new"
                className="inline-flex items-center justify-center gap-2 h-12 px-5 sm:px-6 rounded-full bg-gradient-to-br from-gold to-gold-deep text-night font-extrabold text-[14px] shadow-[0_10px_28px_-10px_rgba(244,185,66,0.55)] hover:opacity-95 transition-opacity"
              >
                <Plus className="w-4 h-4" aria-hidden strokeWidth={2.5} />
                Créer un cercle
              </Link>
              <Link
                href="/circles?q="
                className="inline-flex items-center justify-center gap-2 h-12 px-5 sm:px-6 rounded-full bg-white border border-line text-night font-bold text-[14px] hover:border-night/30 hover:bg-bg-soft transition-colors"
              >
                <Search className="w-4 h-4" aria-hidden />
                Rechercher un cercle
              </Link>
              <Link
                href="/about/no-algorithm"
                className="hidden sm:inline-flex items-center justify-center gap-1.5 h-12 px-4 rounded-full text-night-dim font-semibold text-[12px] hover:text-night transition-colors"
              >
                <Eye className="w-3.5 h-3.5" aria-hidden />
                Comment on trie
              </Link>
              <Link
                href="/circles/hubs"
                className="inline-flex items-center justify-center gap-1.5 h-12 px-4 rounded-full bg-gold/10 text-gold-deep font-bold text-[12px] hover:bg-gold/20 transition-colors"
              >
                <Sparkles className="w-3.5 h-3.5" aria-hidden />
                Hubs
              </Link>
            </div>
          </div>
        </header>

        {/* SECTION "MES CERCLES" — carrousel horizontal avec badges
            "X nouveaux posts". Permet d'aller direct à ses cercles favoris
            sans scroll. Masqué si aucun cercle (empty state à la place). */}
        {mine.length === 0 ? (
          <div className="px-4 sm:px-6 pb-6">
            <EmptyState
              emoji="🏘️"
              kicker="Aucun cercle"
              title={
                <>
                  Pas encore de <em className="italic text-gold-deep">cercle</em>
                </>
              }
              body="Rejoins-en un public ou crée le tien — autour de ton quartier, ta passion, ton métier."
              ctaHref="/circles/new"
              ctaLabel="Créer le mien"
              tone="soft"
            />
          </div>
        ) : (
          <section className="pb-5" aria-labelledby="my-circles-heading">
            <header className="px-5 sm:px-8 pb-2.5 flex items-baseline justify-between">
              <h2
                id="my-circles-heading"
                className="text-[13px] font-bold text-night"
              >
                Mes cercles{" "}
                <span className="text-night-dim font-semibold">
                  ({mine.length})
                </span>
              </h2>
              <span className="text-[10px] font-extrabold uppercase tracking-[0.14em] text-night-dim">
                · récents
              </span>
            </header>
            <div className="overflow-x-auto scrollbar-none [-webkit-overflow-scrolling:touch]">
              <ul className="flex gap-2.5 px-4 sm:px-7 pb-2 snap-x snap-mandatory">
                {mine.map((circle) => (
                  <li
                    key={circle.id}
                    className="shrink-0 w-[180px] sm:w-[210px] snap-start"
                  >
                    <MyCircleCard circle={circle} />
                  </li>
                ))}
              </ul>
            </div>
          </section>
        )}

        {/* SECTION "DÉCOUVRIR" V2 — filtres catégorie + sort transparent +
            grille riche. URL-driven (bookmarkable). */}
        <section className="px-5 sm:px-8 pt-2 pb-8" aria-labelledby="discover-heading">
          <header className="pb-3">
            <h2
              id="discover-heading"
              className="inline-flex items-center gap-2 text-[15px] sm:text-[17px] font-bold text-night"
            >
              <Compass className="w-4 h-4 text-gold-deep" aria-hidden />
              Découvrir
            </h2>
            <p className="mt-1 text-[12px] text-night-dim max-w-prose">
              {discoverable.length > 0
                ? `${discoverable.length} cercle${discoverable.length > 1 ? "s" : ""} qui pourraient te plaire. Tu choisis comment trier.`
                : "Aucun cercle ne correspond à ces filtres. Élargis ta recherche."}
            </p>
          </header>

          <CircleDiscoverFilters
            initialCategory={category}
            initialSort={sort}
          />

          {/* Grille */}
          {discoverable.length > 0 ? (
            <div className="mt-5 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
              {discoverable.map((circle) => (
                <CircleDiscoverCard key={circle.id} circle={circle} />
              ))}
            </div>
          ) : (
            <div className="mt-6">
              <EmptyState
                emoji="🔭"
                kicker="Pas de résultat"
                title="Aucun cercle ne correspond"
                body="Essaie d'élargir tes filtres ou crée ton propre cercle."
                ctaHref="/circles/new"
                ctaLabel="Créer un cercle"
                size="lg"
              />
            </div>
          )}
        </section>

        {/* SECTIONS THÉMATIQUES — masquées si filtres actifs (focus sur la grille).
            3 carrousels horizontaux : Populaires / Locaux / Nouveaux. */}
        {!isFiltered ? (
          <>
            {trendingDeduped.length > 0 ? (
              <ThemedCarousel
                id="trending"
                title="Populaires ce mois-ci"
                subtitle="· en pleine vitalité"
                circles={trendingDeduped}
              />
            ) : null}
            {localDeduped.length > 0 ? (
              <ThemedCarousel
                id="local"
                title="Communautés locales près de toi"
                subtitle="· dans ton pays"
                circles={localDeduped}
              />
            ) : null}
            {freshDeduped.length > 0 ? (
              <ThemedCarousel
                id="fresh"
                title="Nouveaux à découvrir"
                subtitle="· créés cette semaine"
                circles={freshDeduped}
              />
            ) : null}
          </>
        ) : null}

        {/* MANIFESTE ANTI-ALGO — bloc fermeture qui rappelle la promesse-produit */}
        <section
          className="mx-4 sm:mx-7 mb-8 mt-2 relative overflow-hidden rounded-[20px] bg-gradient-to-br from-night via-night-soft to-night-muted text-cream p-6 sm:p-8"
          aria-labelledby="manifesto-heading"
        >
          <div
            aria-hidden
            className="absolute -right-12 -top-12 opacity-25 pointer-events-none"
          >
            <ArcDeco size={220} tone="gold" opacity={1} stroke={1.3} />
          </div>
          <div className="relative max-w-xl">
            <span className="inline-flex items-center gap-1.5 text-[11px] font-extrabold uppercase tracking-[0.18em] text-gold">
              <Eye className="w-3 h-3" aria-hidden />
              · Manifeste
            </span>
            <h3
              id="manifesto-heading"
              className="mt-2 font-display text-[24px] sm:text-[30px] leading-[1.05] tracking-[-0.02em] text-balance"
            >
              Pourquoi pas d&apos;algorithme opaque ?
            </h3>
            <p className="mt-3 text-[14px] sm:text-[15px] leading-[1.55] text-cream/85">
              Les réseaux classiques décident pour toi ce que tu vois, sans te
              dire comment. Nous, on te montre <strong className="text-cream">exactement comment on trie</strong> :
              par fraîcheur, par engagement humain. Pas de mystère, pas de
              manipulation.
            </p>
            <p className="mt-2 text-[13px] leading-[1.55] text-cream/70">
              Tu choisis ton tri. Tu vois pourquoi chaque cercle apparaît. Et
              tu peux désactiver les recommandations à tout moment.
            </p>
            <Link
              href="/about/no-algorithm"
              className="mt-5 inline-flex items-center gap-1.5 px-3.5 h-9 rounded-full bg-gold text-night text-[12px] font-extrabold hover:bg-gold-soft transition-colors"
            >
              En savoir plus sur notre approche →
            </Link>
          </div>
        </section>
      </div>
    </div>
  );
}

function ThemedCarousel({
  id,
  title,
  subtitle,
  circles,
}: {
  id: string;
  title: string;
  subtitle: string;
  circles: import("@/lib/database.types").CircleWithMembership[];
}) {
  return (
    <section className="pb-6" aria-labelledby={`carousel-${id}-heading`}>
      <header className="px-5 sm:px-8 pb-2.5 flex items-baseline justify-between gap-2">
        <h2
          id={`carousel-${id}-heading`}
          className="text-[14px] sm:text-[15px] font-bold text-night"
        >
          {title}
        </h2>
        <span className="text-[10px] font-extrabold uppercase tracking-[0.14em] text-night-dim shrink-0">
          {subtitle}
        </span>
      </header>
      <div className="overflow-x-auto scrollbar-none [-webkit-overflow-scrolling:touch]">
        <ul className="flex gap-2.5 px-4 sm:px-7 pb-2 snap-x snap-mandatory">
          {circles.map((circle) => (
            <li
              key={circle.id}
              className="shrink-0 w-[170px] sm:w-[200px] snap-start"
            >
              <CircleMiniCard circle={circle} />
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}

const COLOR_BG: Record<CircleColor, string> = {
  gold: "bg-gradient-to-br from-gold via-gold-soft to-gold-deep text-night",
  navy: "bg-gradient-to-br from-night via-night-soft to-night-muted text-cream",
  emerald: "bg-gradient-to-br from-emerald-500 to-emerald-800 text-cream",
  rose: "bg-gradient-to-br from-rose-400 to-rose-700 text-cream",
  violet: "bg-gradient-to-br from-violet-400 to-violet-700 text-cream",
  cream: "bg-gradient-to-br from-cream via-bg to-gold/30 text-night",
};

function MyCircleCard({ circle }: { circle: MyCircleSummary }) {
  const tone = COLOR_BG[circle.color ?? "gold"];
  const hasUnread = circle.unread_posts_count > 0;
  const unreadLabel =
    circle.unread_posts_count >= 99
      ? "99+"
      : String(circle.unread_posts_count);

  return (
    <Link
      href={`/circles/${circle.slug}`}
      className="group block h-full p-3 rounded-[16px] bg-white border border-line hover:border-gold/50 hover:shadow-[0_8px_22px_-12px_rgba(10,31,68,0.18)] transition-all"
    >
      <div className="flex items-start gap-2.5">
        <span
          aria-hidden
          className={cn(
            "relative shrink-0 w-12 h-12 rounded-[12px] flex items-center justify-center text-[22px] overflow-hidden",
            tone,
          )}
        >
          <span
            aria-hidden
            className="absolute inset-0 opacity-[0.18] pointer-events-none"
          >
            <ArcDeco size={48} tone="gold" opacity={1} stroke={1} />
          </span>
          <span className="relative">
            {circle.emoji ?? circle.name.charAt(0).toUpperCase()}
          </span>
        </span>
        {hasUnread ? (
          <span
            aria-label={`${circle.unread_posts_count} nouveau${circle.unread_posts_count > 1 ? "x" : ""} post${circle.unread_posts_count > 1 ? "s" : ""}`}
            className="ml-auto inline-flex items-center justify-center min-w-[20px] h-[20px] px-1.5 rounded-full bg-gold text-night text-[10px] font-extrabold"
          >
            {unreadLabel}
          </span>
        ) : null}
      </div>

      <p className="mt-2.5 text-[13px] font-extrabold text-night truncate">
        {circle.name}
      </p>

      <div className="mt-1 flex items-center gap-1.5 text-[11px] text-night-dim">
        <span aria-hidden className="w-1.5 h-1.5 rounded-full bg-online" />
        <span className="font-semibold tabular-nums">
          {circle.members_count.toLocaleString("fr-FR")} membre
          {circle.members_count > 1 ? "s" : ""}
        </span>
        {circle.is_private ? (
          <Lock className="w-[11px] h-[11px] shrink-0" aria-hidden />
        ) : null}
      </div>

      <p
        className={cn(
          "mt-1.5 text-[11px] truncate font-semibold",
          hasUnread ? "text-gold-deep" : "text-night-dim",
        )}
      >
        {hasUnread
          ? `${circle.unread_posts_count >= 99 ? "99+" : circle.unread_posts_count} nouveau${circle.unread_posts_count > 1 ? "x" : ""} post${circle.unread_posts_count > 1 ? "s" : ""}`
          : "À jour"}
      </p>
    </Link>
  );
}

function CircleCard({ circle }: { circle: CircleWithMembership }) {
  const tone = COLOR_BG[circle.color ?? "gold"];

  return (
    <Link
      href={`/circles/${circle.slug}`}
      className="flex items-center gap-3 p-3 rounded-[14px] bg-white border border-line hover:border-gold/40 transition-colors"
    >
      <span
        aria-hidden
        className={cn(
          "relative shrink-0 w-14 h-14 rounded-[14px] flex items-center justify-center text-[26px] overflow-hidden",
          tone,
        )}
      >
        {/* ArcDeco filigrane 18% (proto L77) */}
        <span
          aria-hidden
          className="absolute inset-0 opacity-[0.18] pointer-events-none"
        >
          <ArcDeco size={56} tone="gold" opacity={1} stroke={1} />
        </span>
        <span className="relative">
          {circle.emoji ?? circle.name.charAt(0).toUpperCase()}
        </span>
      </span>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5">
          <p className="text-[14.5px] font-extrabold text-night truncate">
            {circle.name}
          </p>
          {circle.is_private ? (
            <Lock
              className="w-[11px] h-[11px] text-muted shrink-0"
              aria-hidden
            />
          ) : null}
        </div>
        {circle.description ? (
          <p className="mt-0.5 text-[12px] text-night-soft truncate">
            {circle.description}
          </p>
        ) : null}
        <p className="mt-1.5 text-[11px] text-muted font-semibold">
          {circle.members_count.toLocaleString("fr-FR")} membre
          {circle.members_count > 1 ? "s" : ""}
        </p>
      </div>
      {circle.my_role && circle.my_role !== "member" ? (
        <span
          className={cn(
            "shrink-0 inline-flex items-center px-1.5 py-[3px] rounded-full text-[9.5px] font-extrabold tracking-[0.04em] uppercase",
            circle.my_role === "admin"
              ? "bg-night text-cream"
              : "bg-gold text-night",
          )}
        >
          {circle.my_role === "admin" ? "Admin" : "Mod"}
        </span>
      ) : null}
    </Link>
  );
}
