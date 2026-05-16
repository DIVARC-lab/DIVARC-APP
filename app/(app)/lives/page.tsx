/* Étape 7 — Page discovery /lives.
 *
 * SSR :
 *  - Auth
 *  - Lit list_live_now() RPC (filtré par RLS visibility)
 *  - Filtres optionnels : ?category=tech ou ?language=fr
 *  - Empty state intelligent + CTA "Démarrer un live"
 *
 * Style DIVARC navy/gold/Cormorant. */

import { CircleDot, Radio, Sparkles, Users } from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Avatar } from "@/components/ui/Avatar";
import { Container } from "@/components/primitives/Container";
import { createClient } from "@/lib/supabase/server";
import { listLiveNow } from "@/lib/queries/liveStreams";
import type { LiveCategory } from "@/lib/database.types";
import { cn } from "@/lib/utils/cn";

export const metadata = {
  title: "Lives — DIVARC",
  description: "Découvre les lives en direct sur DIVARC.",
};

const CATEGORY_LABELS: Record<LiveCategory, string> = {
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

const ALL_CATEGORIES: LiveCategory[] = [
  "just_chatting", "gaming", "music", "art", "cooking", "sports",
  "education", "news", "tech", "business", "lifestyle", "beauty",
  "fashion", "travel", "fitness", "asmr", "podcast", "interview",
  "event", "q_and_a",
];

type SearchParamsP = Promise<{ category?: string; language?: string }>;

export default async function LivesDiscoveryPage({
  searchParams,
}: {
  searchParams: SearchParamsP;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login?next=/lives");

  const sp = await searchParams;
  const activeCategory: LiveCategory | null =
    sp.category && ALL_CATEGORIES.includes(sp.category as LiveCategory)
      ? (sp.category as LiveCategory)
      : null;

  const lives = await listLiveNow(user.id, {
    limit: 50,
    category: activeCategory,
  });

  return (
    <div className="min-h-[100dvh] bg-bg-soft pb-24">
      <Container maxWidth="default" paddingX="page" paddingY="2xl">
        {/* Hero */}
        <header className="mb-8 flex items-start justify-between gap-4 flex-wrap">
          <div className="flex-1 min-w-0">
            <p className="text-[10px] font-extrabold uppercase tracking-[0.18em] text-rose-600">
              · EN DIRECT
            </p>
            <h1 className="mt-2 font-display text-[32px] sm:text-[48px] font-normal leading-[1.05] tracking-[-0.02em] text-night">
              Découvre les{" "}
              <em className="italic bg-gradient-to-br from-gold to-gold-deep bg-clip-text text-transparent">
                lives
              </em>{" "}
              du moment.
            </h1>
            <p className="mt-3 text-[14px] text-night-dim leading-relaxed max-w-xl">
              {lives.length > 0
                ? `${lives.length} live${lives.length > 1 ? "s" : ""} en cours${activeCategory ? ` dans ${CATEGORY_LABELS[activeCategory]}` : ""}.`
                : "Aucun live actif pour l'instant. Sois le premier à lancer le tien."}
            </p>
          </div>
          <Link
            href="/lives/new"
            className="inline-flex items-center gap-2 h-11 px-5 rounded-full bg-gradient-to-br from-rose-500 to-rose-600 text-white text-[13px] font-bold shadow-lg shadow-rose-500/20 hover:opacity-95 transition-opacity"
          >
            <Radio className="w-4 h-4" aria-hidden />
            Lancer un live
          </Link>
        </header>

        {/* Filtres catégorie (horizontal scroll mobile-friendly) */}
        <nav
          aria-label="Filtrer par catégorie"
          className="-mx-1 px-1 mb-6 overflow-x-auto scrollbar-none [-webkit-overflow-scrolling:touch]"
        >
          <ul className="flex items-center gap-1.5 min-w-max">
            <li>
              <Link
                href="/lives"
                scroll={false}
                className={cn(
                  "inline-flex items-center h-8 px-3 rounded-full text-[12px] font-bold transition-colors",
                  activeCategory === null
                    ? "bg-night text-bg"
                    : "bg-white border border-line text-night-dim hover:text-night hover:border-night/30",
                )}
              >
                Tous
              </Link>
            </li>
            {ALL_CATEGORIES.map((cat) => {
              const active = activeCategory === cat;
              return (
                <li key={cat}>
                  <Link
                    href={`/lives?category=${cat}`}
                    scroll={false}
                    className={cn(
                      "inline-flex items-center h-8 px-3 rounded-full text-[12px] font-bold whitespace-nowrap transition-colors",
                      active
                        ? "bg-night text-bg"
                        : "bg-white border border-line text-night-dim hover:text-night hover:border-night/30",
                    )}
                  >
                    {CATEGORY_LABELS[cat]}
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>

        {/* Grid lives */}
        {lives.length === 0 ? (
          <div className="rounded-3xl bg-white border border-line border-dashed p-10 text-center">
            <Sparkles
              className="w-8 h-8 text-gold mx-auto mb-3"
              aria-hidden
            />
            <p className="text-[14px] font-bold text-night mb-1">
              Personne en direct pour l&apos;instant
            </p>
            <p className="text-[12px] text-night-dim leading-relaxed max-w-md mx-auto">
              {activeCategory
                ? `Aucun live actif dans la catégorie ${CATEGORY_LABELS[activeCategory]}.`
                : "Sois le premier à lancer ton live aujourd'hui."}
            </p>
            <Link
              href="/lives/new"
              className="mt-5 inline-flex items-center gap-2 h-10 px-4 rounded-full bg-night text-bg text-[12px] font-bold hover:opacity-90 transition-opacity"
            >
              <Radio className="w-3.5 h-3.5" aria-hidden />
              Lancer un live
            </Link>
          </div>
        ) : (
          <ul className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {lives.map((live) => (
              <li key={live.id}>
                <Link
                  href={`/lives/${live.id}`}
                  className="group block rounded-3xl bg-white border border-line shadow-soft overflow-hidden hover:border-gold/40 transition-colors"
                >
                  {/* Thumbnail / placeholder */}
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
                        <Radio
                          className="w-10 h-10 text-cream/30"
                          aria-hidden
                        />
                      </div>
                    )}
                    {/* Badge LIVE en haut à gauche */}
                    <span className="absolute top-3 left-3 inline-flex items-center gap-1 px-2 h-6 rounded-full bg-rose-600 text-white text-[10px] font-bold uppercase tracking-wider">
                      <CircleDot
                        className="w-3 h-3 animate-pulse"
                        aria-hidden
                      />
                      Live
                    </span>
                    {/* Compteur viewers en haut à droite */}
                    <span className="absolute top-3 right-3 inline-flex items-center gap-1 px-2 h-6 rounded-full bg-night/80 text-cream text-[10px] font-bold backdrop-blur">
                      <Users className="w-3 h-3" aria-hidden />
                      {live.participants_count}
                    </span>
                    {/* Tag kind */}
                    <span className="absolute bottom-3 right-3 inline-flex items-center px-2 h-6 rounded-full bg-night/80 text-cream text-[10px] font-bold uppercase tracking-wider backdrop-blur">
                      {live.kind === "audio" ? "Audio" : "Vidéo"}
                    </span>
                  </div>

                  {/* Info */}
                  <div className="p-4">
                    <div className="flex items-start gap-3">
                      <Avatar
                        src={live.host?.avatar_url ?? null}
                        fullName={
                          live.host?.full_name ??
                          live.host?.username ??
                          "Streamer"
                        }
                        size="sm"
                      />
                      <div className="flex-1 min-w-0">
                        <h2 className="text-[13.5px] font-bold text-night line-clamp-2 leading-snug group-hover:text-gold-deep transition-colors">
                          {live.title}
                        </h2>
                        <p className="mt-1 text-[11.5px] text-night-dim truncate">
                          {live.host?.full_name ??
                            live.host?.username ??
                            "Streamer"}
                          {live.category
                            ? ` · ${CATEGORY_LABELS[live.category]}`
                            : ""}
                        </p>
                      </div>
                    </div>

                    {/* Tags */}
                    {live.tags && live.tags.length > 0 ? (
                      <div className="mt-2.5 flex flex-wrap gap-1">
                        {live.tags.slice(0, 4).map((tag) => (
                          <span
                            key={tag}
                            className="inline-flex items-center h-5 px-1.5 rounded-full bg-bg-soft text-night-dim text-[10px] font-bold"
                          >
                            #{tag}
                          </span>
                        ))}
                      </div>
                    ) : null}
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </Container>
    </div>
  );
}
