/* Étape 24 — Banner compact des lives en cours/à venir du cercle.
 *
 * Affiché sur la page principale du cercle, sous le header. Liste les
 * 1-3 lives status='live' (en cours) ou 'scheduled' (programmés), avec
 * lien "Voir tous les lives" vers /circles/[slug]/live.
 *
 * Si l'user est membre actif, affiche aussi un bouton "Démarrer un live"
 * qui ouvre /lives/new?circle={id} avec pré-remplissage. */

import { CircleDot, Plus, Radio } from "lucide-react";
import Link from "next/link";
import { Avatar } from "@/components/ui/Avatar";
import { listCircleLiveRooms } from "@/lib/queries/circleLiveRooms";

type Props = {
  circleId: string;
  circleSlug: string;
  canCreate: boolean;
};

export async function CircleActiveLivesBanner({
  circleId,
  circleSlug,
  canCreate,
}: Props) {
  const rooms = await listCircleLiveRooms(circleId, {
    statuses: ["live", "scheduled"],
    limit: 3,
  });

  if (rooms.length === 0 && !canCreate) return null;

  return (
    <section
      aria-label="Lives du cercle"
      className="mb-4 rounded-2xl bg-night text-cream p-4"
    >
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Radio className="w-3.5 h-3.5 text-rose-300" aria-hidden />
          <p className="text-[10px] font-extrabold uppercase tracking-[0.16em] text-rose-300">
            Lives du cercle
          </p>
        </div>
        <div className="flex items-center gap-2">
          {canCreate ? (
            <Link
              href={`/lives/new?circle=${circleId}`}
              className="inline-flex items-center gap-1 h-7 px-2.5 rounded-full bg-rose-500 text-cream hover:bg-rose-600 text-[10.5px] font-bold transition-colors"
            >
              <Plus className="w-3 h-3" aria-hidden />
              Démarrer
            </Link>
          ) : null}
          <Link
            href={`/circles/${circleSlug}/live`}
            className="text-[10.5px] font-bold text-gold hover:underline"
          >
            Voir tout →
          </Link>
        </div>
      </div>

      {rooms.length === 0 ? (
        <p className="text-[12px] text-cream/60">
          Aucun live programmé. Crée-en un pour ta communauté.
        </p>
      ) : (
        <ul className="space-y-2">
          {rooms.map((r) => {
            const isLive = r.status === "live";
            return (
              <li key={r.id}>
                <Link
                  href={`/lives/${r.id}`}
                  className="flex items-center gap-3 rounded-xl bg-cream/5 hover:bg-cream/10 border border-cream/10 hover:border-cream/20 p-2.5 transition-colors"
                >
                  <div className="relative shrink-0">
                    <Avatar
                      src={r.host?.avatar_url ?? null}
                      fullName={
                        r.host?.full_name ?? r.host?.username ?? "Streamer"
                      }
                      size="sm"
                    />
                    {isLive ? (
                      <span
                        aria-hidden
                        className="absolute -inset-0.5 rounded-full ring-2 ring-rose-500 animate-pulse pointer-events-none"
                      />
                    ) : null}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5">
                      <p className="text-[12px] font-bold text-cream truncate">
                        {r.title}
                      </p>
                      {isLive ? (
                        <span className="inline-flex items-center gap-0.5 px-1.5 h-4 rounded-full bg-rose-600 text-white text-[9px] font-extrabold uppercase tracking-wider">
                          <CircleDot
                            className="w-2 h-2 animate-pulse"
                            aria-hidden
                          />
                          Live
                        </span>
                      ) : (
                        <span className="inline-flex items-center px-1.5 h-4 rounded-full bg-cream/10 text-cream/70 text-[9px] font-extrabold uppercase tracking-wider">
                          Programmé
                        </span>
                      )}
                    </div>
                    <p className="text-[10.5px] text-cream/60 truncate">
                      {r.host?.full_name ?? r.host?.username ?? "Streamer"}
                      {isLive ? ` · ${r.participants_count} en écoute` : ""}
                    </p>
                  </div>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
