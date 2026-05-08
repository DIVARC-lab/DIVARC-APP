import { Lock, Search } from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { ArcDeco } from "@/components/marketing/ArcDeco";
import { DisplayHeading } from "@/components/ui/DisplayHeading";
import { EmptyState } from "@/components/ui/EmptyState";
import { KickerLabel } from "@/components/ui/KickerLabel";
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
    <div className="px-4 sm:px-10 py-8 sm:py-10 max-w-3xl mx-auto w-full">
      <header className="mb-6">
        <KickerLabel>· Cercles</KickerLabel>
        <DisplayHeading
          size="xl"
          italicAll
          className="mt-3 !leading-[1.05] !text-[40px] sm:!text-[54px]"
        >
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
        </DisplayHeading>
        <p className="mt-3 text-night-muted text-sm leading-relaxed max-w-md">
          Des espaces plus calmes que le feed. Discussions, événements,
          entraide.
        </p>
      </header>

      {/* Search (visual only for V1, no client logic yet) */}
      <div className="mb-4">
        <div className="h-11 rounded-full bg-white border border-line flex items-center gap-2.5 px-4 text-sm text-muted-strong">
          <Search className="w-4 h-4 text-night-muted" aria-hidden />
          <span>Chercher un cercle…</span>
        </div>
      </div>

      {/* Filter chips (visual scaffolding — links toggle nothing yet, V2). */}
      <nav
        aria-label="Filtres cercles"
        className="mb-6 -mx-1 px-1 flex gap-2 overflow-x-auto scrollbar-none"
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
              "shrink-0 px-3.5 h-8 rounded-full text-xs font-semibold inline-flex items-center transition-colors",
              f.active
                ? "bg-night text-cream"
                : "bg-white border border-line text-night-muted",
            )}
          >
            {f.l}
          </span>
        ))}
      </nav>

      {mine.length === 0 ? (
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
      ) : (
        <ul className="space-y-3 mb-8">
          {mine.map((circle) => (
            <li key={circle.id}>
              <CircleCard circle={circle} />
            </li>
          ))}
        </ul>
      )}

      {/* Discover banner — navy with ArcDeco watermark */}
      {discoverable.length > 0 ? (
        <Link
          href="/explore"
          className="relative block rounded-3xl bg-night text-cream p-5 sm:p-6 overflow-hidden hover:bg-night-soft transition-colors"
        >
          <div
            aria-hidden
            className="absolute -right-12 -bottom-16 pointer-events-none"
          >
            <ArcDeco size={240} tone="gold" opacity={0.45} stroke={1.25} />
          </div>
          <div className="relative">
            <span className="text-[11px] font-extrabold uppercase tracking-[0.18em] text-gold">
              · Découvrir
            </span>
            <p className="mt-1 font-display italic text-2xl sm:text-3xl leading-tight">
              {discoverable.length} cercles près de chez toi
            </p>
            <span className="mt-3 inline-flex items-center gap-1.5 px-3 h-9 rounded-full bg-gold text-night text-xs font-extrabold">
              Explorer →
            </span>
          </div>
        </Link>
      ) : null}
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
      className="flex items-center gap-3.5 p-3 rounded-2xl bg-white border border-line hover:border-gold/40 hover:bg-gold/[0.02] transition-colors"
    >
      <span
        aria-hidden
        className={cn(
          "shrink-0 w-14 h-14 rounded-2xl flex items-center justify-center text-2xl shadow-soft",
          tone,
        )}
      >
        {circle.emoji ?? circle.name.charAt(0).toUpperCase()}
      </span>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5">
          <p className="font-semibold text-night truncate">{circle.name}</p>
          {circle.is_private ? (
            <Lock className="w-3 h-3 text-muted shrink-0" aria-hidden />
          ) : null}
        </div>
        {circle.description ? (
          <p className="text-xs text-muted-strong truncate mt-0.5">
            {circle.description}
          </p>
        ) : null}
        <p className="mt-1 text-[11px] text-muted">
          {circle.members_count.toLocaleString("fr-FR")} membre
          {circle.members_count > 1 ? "s" : ""}
        </p>
      </div>
      {circle.my_role && circle.my_role !== "member" ? (
        <span
          className={cn(
            "shrink-0 text-[10px] font-extrabold tracking-[0.06em] uppercase px-2 py-1 rounded-full",
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
