import { Lock, Plus, Search } from "lucide-react";
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
  title: "Cercles",
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
    <div className="bg-white min-h-screen pb-24">
      <div className="mx-auto w-full max-w-2xl">
        {/* Header */}
        <header className="px-5 sm:px-7 pt-6 sm:pt-8 pb-3.5 flex items-end justify-between gap-3">
          <div className="min-w-0">
            <span className="text-[11px] font-extrabold uppercase tracking-[0.18em] text-gold-deep">
              · Cercles
            </span>
            <h1 className="mt-1 font-display italic text-[38px] sm:text-[44px] text-night leading-[1.05] tracking-[-0.01em] text-balance">
              {mine.length > 0 ? (
                <>
                  Tes{" "}
                  <span className="text-gold-deep">
                    {mine.length} cercle{mine.length > 1 ? "s" : ""}
                  </span>
                </>
              ) : (
                <>
                  Trouve ton <span className="text-gold-deep">quartier</span>
                </>
              )}
            </h1>
            <p className="mt-1.5 text-[13px] text-night-soft leading-relaxed max-w-md">
              Des espaces plus calmes que le feed. Discussions, événements,
              entraide.
            </p>
          </div>
          <Link
            href="/circles/new"
            aria-label="Créer un cercle"
            className="shrink-0 flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br from-gold to-gold-deep text-night shadow-[0_8px_22px_-8px_rgba(244,185,66,0.55)] hover:opacity-95 transition-opacity"
          >
            <Plus className="w-4 h-4" aria-hidden strokeWidth={2.5} />
          </Link>
        </header>

        {/* Search */}
        <div className="px-4 sm:px-6 pb-3.5">
          <div className="flex h-[42px] items-center gap-2.5 rounded-full bg-bg-soft border border-line px-3.5 text-[13px] text-[#8993A8]">
            <Search className="w-[14px] h-[14px]" aria-hidden />
            <span>Chercher un cercle…</span>
          </div>
        </div>

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
