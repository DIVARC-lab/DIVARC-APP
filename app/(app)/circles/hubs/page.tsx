import { redirect } from "next/navigation";
import Link from "next/link";
import { Plus, Sparkles, Users } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { listDiscoverableHubs } from "@/lib/queries/circleHubs";

/* Page liste des Hubs (méta-cercles) — Chantier Cercles v3 Sprint 4. */

export const metadata = {
  title: "Hubs — Méta-cercles",
};

export default async function HubsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login?next=/circles/hubs");

  const hubs = await listDiscoverableHubs({ limit: 50 });

  return (
    <div className="space-y-6 p-4 sm:p-6 max-w-4xl mx-auto">
      <header className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="font-display italic text-3xl text-night flex items-center gap-2">
            <Sparkles className="w-7 h-7 text-gold-deep" aria-hidden />
            Hubs
          </h1>
          <p className="text-[13px] text-night-muted mt-1 max-w-md">
            Les méta-cercles : des agrégateurs qui rassemblent plusieurs
            cercles autour d&apos;une thématique commune.
          </p>
        </div>
        <Link
          href="/circles/hubs/new"
          className="inline-flex items-center gap-1.5 h-10 px-4 rounded-full bg-gold text-night text-[13px] font-bold hover:bg-gold-soft"
        >
          <Plus className="w-4 h-4" aria-hidden />
          Créer un hub
        </Link>
      </header>

      {hubs.length === 0 ? (
        <div className="text-center py-16">
          <Sparkles className="w-12 h-12 text-night-muted/30 mx-auto mb-3" aria-hidden />
          <p className="text-[14px] text-night-muted">
            Aucun hub pour l&apos;instant.
          </p>
          <p className="text-[12px] text-night-muted/70 mt-1">
            Sois le premier à créer un hub thématique sur DIVARC.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {hubs.map((hub) => (
            <Link
              key={hub.id}
              href={`/circles/hubs/${hub.slug}`}
              className="block bg-white border border-line rounded-3xl p-5 hover:border-night/30 transition-colors group"
            >
              <div className="flex items-start gap-3 mb-3">
                <div
                  className="w-12 h-12 rounded-2xl flex items-center justify-center text-2xl"
                  style={{
                    background: `${hub.color_accent}15`,
                    color: hub.color_accent,
                  }}
                >
                  {hub.emoji ?? hub.name[0]?.toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <h2 className="text-[16px] font-bold text-night group-hover:text-gold-deep transition-colors truncate">
                    {hub.name}
                  </h2>
                  {hub.tagline ? (
                    <p className="text-[12px] text-night-muted line-clamp-2 mt-0.5">
                      {hub.tagline}
                    </p>
                  ) : null}
                </div>
              </div>
              <div className="flex items-center gap-3 text-[11px] text-night-muted pt-3 border-t border-line">
                <span className="inline-flex items-center gap-1">
                  <Sparkles className="w-3 h-3" aria-hidden />
                  {hub.circles_count} cercle{hub.circles_count > 1 ? "s" : ""}
                </span>
                <span className="inline-flex items-center gap-1">
                  <Users className="w-3 h-3" aria-hidden />
                  {hub.members_aggregate.toLocaleString("fr-FR")} membres
                </span>
                {hub.primary_category ? (
                  <span className="ml-auto px-2 h-4 inline-flex items-center rounded-full bg-night/5 text-[9px] font-bold uppercase tracking-[0.08em]">
                    {hub.primary_category}
                  </span>
                ) : null}
              </div>
            </Link>
          ))}
        </div>
      )}

      {/* Info reputation portable */}
      <section className="bg-gradient-to-br from-gold/5 via-white to-white border border-gold/20 rounded-3xl p-5">
        <h2 className="text-sm font-bold text-night uppercase tracking-wider mb-2 flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-gold-deep" aria-hidden />
          Réputation portable
        </h2>
        <p className="text-[13px] text-night/80 leading-relaxed">
          Ton karma gagné dans chaque cercle s&apos;accumule en{" "}
          <strong>réputation globale</strong> visible sur ton profil
          DIVARC. Plus tu contribues, plus tu rayonnes à travers toute
          la plateforme.
        </p>
        <Link
          href="/profile"
          className="mt-3 inline-flex items-center gap-1 text-[12px] font-bold text-gold-deep hover:underline"
        >
          Voir mon profil →
        </Link>
      </section>
    </div>
  );
}
