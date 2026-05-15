/* SubCirclesPanel — liste des sous-cercles d'un cercle parent.
 *
 * Server Component. Affiche les sous-cercles dans une grille avec
 * stats. Si l'user est admin/owner du parent, montre un bouton
 * "Créer un sous-cercle" qui pré-remplit parent_circle_id dans le
 * wizard /new. */

import Link from "next/link";
import { Calendar, Plus, Sparkles, Users } from "lucide-react";
import { listSubCircles } from "@/lib/queries/circles";
import type { CircleRole } from "@/lib/database.types";
import { cn } from "@/lib/utils/cn";

type Props = {
  parentCircleId: string;
  parentSlug: string;
  myRole: CircleRole | null;
};

export async function SubCirclesPanel({
  parentCircleId,
  parentSlug,
  myRole,
}: Props) {
  const subs = await listSubCircles(parentCircleId);
  const canCreate = myRole === "owner" || myRole === "admin";

  if (subs.length === 0 && !canCreate) return null;

  return (
    <section>
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-sm font-bold text-night uppercase tracking-wider flex items-center gap-1.5">
          <Sparkles className="w-3.5 h-3.5 text-gold-deep" aria-hidden />
          Sous-cercles
          {subs.length > 0 ? (
            <span className="text-night-muted tabular-nums">
              ({subs.length})
            </span>
          ) : null}
        </h2>
        {canCreate ? (
          <Link
            href={`/circles/new?parent=${parentSlug}`}
            className="inline-flex items-center gap-1 h-7 px-3 rounded-full bg-night text-cream text-[11px] font-bold hover:bg-night-soft"
          >
            <Plus className="w-3 h-3" aria-hidden />
            Créer
          </Link>
        ) : null}
      </div>

      {subs.length === 0 ? (
        <p className="text-[13px] text-night-muted italic">
          Aucun sous-cercle pour le moment. Crée le premier squad pour
          ce cercle.
        </p>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {subs.map((c) => {
            const isEphemeral = c.lifecycle === "ephemeral";
            const isArchived = c.lifecycle === "archived_ephemeral";
            return (
              <Link
                key={c.id}
                href={`/circles/${c.slug}`}
                className={cn(
                  "block p-4 rounded-2xl border bg-white hover:border-night/30 transition-colors",
                  isArchived
                    ? "border-line opacity-60"
                    : isEphemeral
                      ? "border-rose-300/40"
                      : "border-line",
                )}
              >
                <div className="flex items-start gap-3">
                  {c.emoji ? (
                    <span className="text-2xl">{c.emoji}</span>
                  ) : (
                    <div className="w-10 h-10 rounded-xl bg-night/5 flex items-center justify-center text-night-muted font-bold">
                      {c.name[0]?.toUpperCase() ?? "?"}
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <h3 className="text-[14px] font-bold text-night truncate">
                      {c.name}
                    </h3>
                    {c.tagline ? (
                      <p className="text-[11px] text-night-muted line-clamp-1">
                        {c.tagline}
                      </p>
                    ) : null}
                  </div>
                  {isEphemeral ? <EphemeralPill expiresAt={c.expires_at} /> : null}
                  {isArchived ? (
                    <span className="inline-flex items-center px-1.5 h-4 rounded-full bg-night-muted/15 text-night-muted text-[9px] font-bold uppercase tracking-[0.08em] shrink-0">
                      Archivé
                    </span>
                  ) : null}
                </div>
                <div className="flex items-center gap-3 mt-3 text-[11px] text-night-muted">
                  <span className="inline-flex items-center gap-1">
                    <Users className="w-3 h-3" aria-hidden />
                    {c.members_count}
                  </span>
                  <span className="inline-flex items-center gap-1">
                    <Sparkles className="w-3 h-3" aria-hidden />
                    Vitality {Math.round(c.vitality_score)}
                  </span>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </section>
  );
}

function EphemeralPill({ expiresAt }: { expiresAt: string | null }) {
  if (!expiresAt) return null;
  const expires = new Date(expiresAt);
  const now = new Date();
  const diffMs = expires.getTime() - now.getTime();
  if (diffMs <= 0) return null;
  const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
  const label =
    diffDays === 0
      ? "Termine aujourd'hui"
      : diffDays === 1
        ? "Termine demain"
        : `${diffDays} jours restants`;
  return (
    <span className="inline-flex items-center gap-1 px-1.5 h-4 rounded-full bg-rose-500/15 text-rose-700 text-[9px] font-bold uppercase tracking-[0.08em] shrink-0">
      <Calendar className="w-2.5 h-2.5" aria-hidden />
      {label}
    </span>
  );
}
