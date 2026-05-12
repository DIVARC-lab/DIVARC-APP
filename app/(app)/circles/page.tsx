import { Eye, Lock, Plus, Search, Sparkles } from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { ArcDeco } from "@/components/marketing/ArcDeco";
import { EmptyState } from "@/components/ui/EmptyState";
import {
  listDiscoverableCircles,
  listMyCircles,
} from "@/lib/queries/circles";
import { createClient } from "@/lib/supabase/server";
import type { CircleColor, CircleWithMembership } from "@/lib/database.types";
import { cn } from "@/lib/utils/cn";

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
export default async function CirclesPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const [mine, discoverable] = await Promise.all([
    listMyCircles(user.id),
    listDiscoverableCircles(user.id, 14),
  ]);

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
            <span className="inline-flex items-center gap-1.5 text-[11px] font-extrabold uppercase tracking-[0.18em] text-gold-deep">
              <Sparkles className="w-3 h-3" aria-hidden />
              · Les Cercles
            </span>
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
            </div>
          </div>
        </header>

        {/* Filter chips */}
        <nav
          aria-label="Filtres cercles"
          className="px-4 sm:px-6 pb-4 flex gap-2 overflow-x-auto scrollbar-none"
        >
          {[
            { l: "Tous", active: true },
            { l: "Modéré par toi" },
            { l: "Privés" },
            { l: "Publics" },
          ].map((f) => (
            <span
              key={f.l}
              className={cn(
                "shrink-0 inline-flex items-center h-7 px-3.5 rounded-full text-[12px] font-bold transition-colors",
                f.active
                  ? "bg-night text-cream"
                  : "bg-bg-soft border border-line text-night-dim",
              )}
            >
              {f.l}
            </span>
          ))}
        </nav>

        {/* Circle list */}
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
          <ul className="px-4 sm:px-6 flex flex-col gap-2.5 mb-5">
            {mine.map((circle) => (
              <li key={circle.id}>
                <CircleCard circle={circle} />
              </li>
            ))}
          </ul>
        )}

        {/* Discover banner */}
        {discoverable.length > 0 ? (
          <div className="mx-4 sm:mx-6">
            <Link
              href="/explore"
              className="relative block rounded-[14px] bg-gradient-to-br from-night to-[#1F3563] text-cream p-4 overflow-hidden hover:opacity-95 transition-opacity"
            >
              <div
                aria-hidden
                className="absolute -right-10 -bottom-10 opacity-25 pointer-events-none"
              >
                <ArcDeco size={200} tone="gold" opacity={1} stroke={1.25} />
              </div>
              <div className="relative">
                <span className="text-[11px] font-extrabold uppercase tracking-[0.16em] text-gold">
                  · Découvrir
                </span>
                <p className="mt-1 font-display italic text-[22px] leading-tight">
                  {discoverable.length} cercles près de chez toi
                </p>
                <span className="mt-3 inline-flex items-center gap-1.5 px-3.5 h-[30px] rounded-full bg-gold text-night text-[12.5px] font-extrabold">
                  Explorer →
                </span>
              </div>
            </Link>
          </div>
        ) : null}
      </div>
    </div>
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
              className="w-[11px] h-[11px] text-[#8993A8] shrink-0"
              aria-hidden
            />
          ) : null}
        </div>
        {circle.description ? (
          <p className="mt-0.5 text-[12px] text-night-soft truncate">
            {circle.description}
          </p>
        ) : null}
        <p className="mt-1.5 text-[11px] text-[#8993A8] font-semibold">
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
