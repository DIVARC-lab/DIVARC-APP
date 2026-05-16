/* Étape 8 — Carrousel "En direct maintenant" pour le feed home.
 *
 * Composant server (lit la RPC). Affiche un scroll horizontal de lives
 * actifs avec design DIVARC navy/gold + badge LIVE pulsé.
 *
 * Caché si aucun live actif (pas d'empty state, juste pas rendu). */

import { CircleDot, Radio, Users } from "lucide-react";
import Link from "next/link";
import { Avatar } from "@/components/ui/Avatar";
import { listLiveNow } from "@/lib/queries/liveStreams";

const CATEGORY_LABELS: Record<string, string> = {
  just_chatting: "Conversations",
  gaming: "Gaming",
  music: "Musique",
  art: "Art",
  cooking: "Cuisine",
  sports: "Sport",
  education: "Apprentissage",
  news: "Actu",
  tech: "Tech",
  business: "Business",
  lifestyle: "Lifestyle",
  beauty: "Beauté",
  fashion: "Mode",
  travel: "Voyage",
  fitness: "Fitness",
  asmr: "ASMR",
  podcast: "Podcast",
  interview: "Interview",
  event: "Événement",
  q_and_a: "Q&R",
};

type Props = {
  userId: string;
};

export async function LivesNowCarousel({ userId }: Props) {
  const lives = await listLiveNow(userId, { limit: 12 });
  if (lives.length === 0) return null;

  return (
    <section
      aria-label="Lives en cours"
      className="px-4 sm:px-6 mb-4"
    >
      <header className="flex items-baseline justify-between mb-3">
        <div>
          <p className="text-[10px] font-extrabold uppercase tracking-[0.18em] text-rose-600">
            · EN DIRECT
          </p>
          <h2 className="mt-0.5 font-display italic text-[20px] sm:text-[24px] text-night leading-tight">
            Vivez l&apos;instant
          </h2>
        </div>
        <Link
          href="/lives"
          className="text-[12px] font-bold text-night-dim hover:text-night transition-colors"
        >
          Voir tout →
        </Link>
      </header>

      <div className="overflow-x-auto scrollbar-none [-webkit-overflow-scrolling:touch] -mx-4 sm:-mx-6 px-4 sm:px-6 pb-1">
        <ul className="flex items-stretch gap-3 min-w-max">
          {lives.map((live) => (
            <li key={live.id} className="w-56 sm:w-60 shrink-0">
              <Link
                href={`/lives/${live.id}`}
                className="group block h-full rounded-2xl bg-white border border-line overflow-hidden hover:border-gold/40 transition-colors"
              >
                {/* Thumbnail compact */}
                <div className="relative aspect-video bg-gradient-to-br from-night to-night/80">
                  {live.thumbnail_url ? (
                    /* eslint-disable-next-line @next/next/no-img-element */
                    <img
                      src={live.thumbnail_url}
                      alt={live.title}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="absolute inset-0 flex items-center justify-center">
                      <Radio className="w-8 h-8 text-cream/30" aria-hidden />
                    </div>
                  )}
                  {/* Badge LIVE */}
                  <span className="absolute top-2 left-2 inline-flex items-center gap-1 px-1.5 h-5 rounded-full bg-rose-600 text-white text-[9px] font-bold uppercase tracking-wider">
                    <CircleDot
                      className="w-2.5 h-2.5 animate-pulse"
                      aria-hidden
                    />
                    Live
                  </span>
                  {/* Viewers */}
                  <span className="absolute top-2 right-2 inline-flex items-center gap-0.5 px-1.5 h-5 rounded-full bg-night/80 text-cream text-[10px] font-bold backdrop-blur">
                    <Users className="w-2.5 h-2.5" aria-hidden />
                    {live.participants_count}
                  </span>
                </div>

                <div className="p-2.5">
                  <div className="flex items-center gap-2 mb-1">
                    <Avatar
                      src={live.host?.avatar_url ?? null}
                      fullName={
                        live.host?.full_name ??
                        live.host?.username ??
                        "Streamer"
                      }
                      size="sm"
                    />
                    <p className="text-[10.5px] text-night-dim truncate flex-1">
                      {live.host?.full_name ??
                        live.host?.username ??
                        "Streamer"}
                    </p>
                  </div>
                  <h3 className="text-[12.5px] font-bold text-night leading-snug line-clamp-2 group-hover:text-gold-deep transition-colors">
                    {live.title}
                  </h3>
                  {live.category ? (
                    <p className="mt-1 text-[10px] font-bold uppercase tracking-wider text-gold-deep">
                      #{CATEGORY_LABELS[live.category] ?? live.category}
                    </p>
                  ) : null}
                </div>
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
