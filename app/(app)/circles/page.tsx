import { Compass, Lock, Plus, Users2 } from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Button } from "@/components/ui/Button";
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
    listDiscoverableCircles(user.id, 8),
  ]);

  return (
    <div className="px-4 sm:px-10 py-10 max-w-5xl mx-auto w-full">
      <header className="mb-8 flex items-end justify-between gap-4 flex-wrap">
        <div>
          <KickerLabel>Cercles</KickerLabel>
          <DisplayHeading size="lg" className="mt-2">
            {mine.length > 0 ? (
              <>
                Tes{" "}
                <em className="italic text-gold-deep">
                  {mine.length} cercle{mine.length > 1 ? "s" : ""}
                </em>
              </>
            ) : (
              <>
                Trouve ton <em className="italic text-gold-deep">quartier</em>
              </>
            )}
          </DisplayHeading>
          <p className="mt-2 text-muted-strong text-sm leading-relaxed max-w-md">
            Des espaces plus calmes que le feed. Discussions, entraide,
            voisinage.
          </p>
        </div>
        <Button asChild>
          <Link href="/circles/new">
            <Plus className="w-4 h-4" aria-hidden />
            Créer un cercle
          </Link>
        </Button>
      </header>

      {mine.length === 0 ? (
        <EmptyState
          icon={Users2}
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
        <section aria-label="Mes cercles" className="mb-12">
          <div className="grid sm:grid-cols-2 gap-3">
            {mine.map((circle) => (
              <CircleCard key={circle.id} circle={circle} />
            ))}
          </div>
        </section>
      )}

      {discoverable.length > 0 ? (
        <section aria-label="Découvrir" className="mt-8">
          <div className="flex items-center gap-2 mb-4">
            <Compass className="w-4 h-4 text-gold-deep" aria-hidden />
            <KickerLabel>Découvrir</KickerLabel>
          </div>
          <h2 className="font-display italic text-2xl text-night leading-tight mb-4">
            Près de chez toi
          </h2>
          <div className="grid sm:grid-cols-2 gap-3">
            {discoverable.map((circle) => (
              <CircleCard key={circle.id} circle={circle} discover />
            ))}
          </div>
        </section>
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

function CircleCard({
  circle,
  discover = false,
}: {
  circle: CircleWithMembership;
  discover?: boolean;
}) {
  const tone = COLOR_BG[circle.color ?? "gold"];

  return (
    <Link
      href={`/circles/${circle.slug}`}
      className="flex items-center gap-4 p-4 rounded-2xl bg-white border border-line hover:border-gold/40 hover:bg-gold/[0.02] transition-colors group"
    >
      <span
        aria-hidden
        className={cn(
          "shrink-0 w-14 h-14 rounded-2xl flex items-center justify-center text-2xl font-display italic shadow-soft",
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
          {circle.my_role && circle.my_role !== "member"
            ? ` · ${circle.my_role === "admin" ? "Admin" : "Mod"}`
            : ""}
        </p>
      </div>
      <span className="text-[11px] font-semibold text-gold-deep group-hover:text-night transition-colors whitespace-nowrap">
        {discover ? "Voir →" : "Ouvrir →"}
      </span>
    </Link>
  );
}
