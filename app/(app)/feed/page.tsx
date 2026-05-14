import { Compass, Plus, Sparkles, UserPlus } from "lucide-react";
import { Fragment } from "react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { ArcDeco } from "@/components/marketing/ArcDeco";
import { EmptyState } from "@/components/ui/EmptyState";
import { listFeedPosts } from "@/lib/queries/posts";
import {
  listFriendsOnlyFeed,
  listPersonalizedFeed,
  listRankedFeed,
  loadFeedV2,
} from "@/lib/queries/feed";
import { suggestPeople } from "@/lib/queries/explore";
import { listTrendingHashtags } from "@/lib/queries/hashtags";
import { getCurrentProfile } from "@/lib/queries/profile";
import { getExperimentVariant } from "@/lib/experiments";
import { trackExperimentExposure } from "@/lib/experiments/track";
import {
  groupStoriesByAuthor,
  listVisibleStories,
} from "@/lib/queries/stories";
import { createClient } from "@/lib/supabase/server";
import { FeedRightRail } from "./_components/FeedRightRail";
import { PostCard } from "./_components/PostCard";
import { PostChipTrigger } from "@/components/creator/PostChipTrigger";
import { PostViewTracker } from "./_components/PostViewTracker";
import { StoriesRow } from "./_components/StoriesRow";
import { AdSlot } from "@/components/ads/AdSlot";
import type { FeedMode, PostWithDetails } from "@/lib/database.types";
import { AntiDoomscrollPause } from "./_components/AntiDoomscrollPause";
import { FeedModeSelector } from "./_components/FeedModeSelector";
import { FeedReasonChip } from "./_components/FeedReasonChip";

export const metadata = {
  title: "Feed",
};

const VALID_TABS = ["for-you", "friends", "latest", "transparent"] as const;
type FeedTabId = (typeof VALID_TABS)[number];

const VALID_FEED_MODES: FeedMode[] = [
  "fresh",
  "conversations",
  "rising_voices",
  "inner_circle",
  "raw",
];

type SearchParams = Promise<{ tab?: string; mode?: string }>;

/* Implémentation directe des valeurs de design Bold (handoff
 * feed-mobile-bold.jsx) :
 *
 * Hero — gradient cream → bg-soft (#F1F3F8), padding 64/22/28
 *   ArcDeco gold filigrane visible top-right (opacity 0.55, size 320)
 *   Kicker · Le feed gold-deep weight 700
 *   H1 Instrument Serif 44 weight 400 leading-[1] tracking [-0.025em]
 *     « Ce que tes proches <em italic gradient gold→#B88A2A>racontent</em>. »
 *   Subtitle 13 navy-soft max-w-[280px]
 *
 * Stories rail full-bleed (StoriesRow gère son padding interne).
 * Composer chip teaser (PostComposer rend le chip ; click → modal).
 * Posts liste full-bleed mobile, hero={i===0} pour la première card.
 *
 * FAB navy 56×56 r-full border 2 gold avec shadow gold+navy double
 * (proto L88-91), positionné right-[18px] bottom-[100px] absolute.
 */
export default async function FeedPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { tab: tabParam, mode: modeParam } = await searchParams;
  const feedMode: FeedMode = (VALID_FEED_MODES.find((m) => m === modeParam) ??
    "fresh") as FeedMode;

  /* A/B test "feed-ranking-v2026" : le variant détermine le tab par
     défaut quand l'utilisateur n'a pas explicité de tab dans l'URL.
     - chronological → /feed ouvre sur "latest" (ordre temporel strict)
     - algorithmic   → /feed ouvre sur "for-you" (ranker recsys)
     L'user peut toujours basculer manuellement via les onglets — on
     mesure l'effet du défaut, pas du choix. */
  const experimentVariant = getExperimentVariant(
    "feed-ranking-v2026",
    user.id,
  );
  const defaultTab: FeedTabId =
    experimentVariant === "algorithmic" ? "for-you" : "latest";
  const tab: FeedTabId = (VALID_TABS.find((t) => t === tabParam) ??
    defaultTab) as FeedTabId;

  /* Track exposure uniquement au premier render (sans tabParam) pour
     mesurer l'effet net du variant. Les navigations ultérieures
     (?tab=friends, etc.) ne ré-exposent pas. */
  if (!tabParam) {
    await trackExperimentExposure({
      userId: user.id,
      experimentId: "feed-ranking-v2026",
      variant: experimentVariant,
      surface: "feed_home",
    });
  }

  const profile = await getCurrentProfile();
  const fullName = profile?.full_name ?? user.email?.split("@")[0] ?? null;

  let posts: PostWithDetails[] = [];
  /* Map post_id → ranking_metadata pour le tab "for-you", utilisé par
     <WhyThisPost /> dans chaque PostCard. NULL pour les autres tabs
     (legacy queries SQL sans signaux explicites). */
  let rankingByPostId: Awaited<
    ReturnType<typeof listPersonalizedFeed>
  >["rankingByPostId"] = new Map();
  /* Chantier Feed v2.3 — reasons par post quand tab=transparent. */
  let reasonByPostId = new Map<string, string>();
  if (tab === "transparent") {
    const v2 = await loadFeedV2(user.id, feedMode, 40);
    posts = v2.posts;
    reasonByPostId = v2.reasonByPostId;
  } else if (tab === "for-you") {
    /* Utilise le ranker recsys (lib/recsys/ranker) qui produit posts
       ordonnés + ranking_metadata.primary_signals par post pour la
       transparence DSA. Fallback sur listRankedFeed (RPC SQL legacy)
       si le ranker ne retourne rien (cold start, pas de profil). */
    const personalized = await listPersonalizedFeed(user.id, 30);
    if (personalized.posts.length > 0) {
      posts = personalized.posts;
      rankingByPostId = personalized.rankingByPostId;
    } else {
      posts = await listRankedFeed(user.id, 40);
    }
  } else if (tab === "friends") {
    posts = await listFriendsOnlyFeed(user.id, 30);
  } else {
    posts = await listFeedPosts(user.id, 40);
  }

  const [stories, trendingTags, suggestions] = await Promise.all([
    listVisibleStories(user.id),
    listTrendingHashtags(10),
    suggestPeople(user.id, 6),
  ]);
  const storyGroups = groupStoriesByAuthor(stories, user.id);

  /* Données pour les enrichissements desktop : date du jour façon
     "7 MAI" pour le kicker + count des posts < 24h pour le subtitle. */
  const today = new Date();
  const todayKicker = `${today.getDate()} ${
    [
      "JANV.",
      "FÉVR.",
      "MARS",
      "AVR.",
      "MAI",
      "JUIN",
      "JUIL.",
      "AOÛT",
      "SEPT.",
      "OCT.",
      "NOV.",
      "DÉC.",
    ][today.getMonth()]
  }`;
  const dayMs = 24 * 60 * 60 * 1000;
  const nowMs = today.getTime();
  const newPostsCount = posts.filter(
    (p) => nowMs - new Date(p.created_at).getTime() < dayMs,
  ).length;

  return (
    <div className="relative bg-bg-soft min-h-[calc(100dvh-56px)]">
      <div className="mx-auto w-full max-w-6xl">
        <div className="grid lg:grid-cols-[minmax(0,1fr)_320px] gap-0 lg:gap-10">
          <div className="mx-auto w-full max-w-2xl min-w-0 lg:mx-0">
            {/* Hero header — gradient cream → bg-soft, ArcDeco gold visible */}
            <header className="relative overflow-hidden bg-gradient-to-b from-cream to-bg-soft pt-16 pb-7 px-[22px] sm:pt-20 sm:px-7">
              <div
                aria-hidden
                className="absolute -top-10 -right-14 opacity-55 pointer-events-none"
              >
                <ArcDeco size={260} tone="gold" opacity={1} stroke={1.25} />
              </div>
              <div className="relative">
                <p className="text-[11px] font-extrabold uppercase tracking-[0.18em] text-gold-deep">
                  · Le feed · {todayKicker}
                </p>
                <h1 className="mt-2.5 font-display text-[30px] sm:text-[44px] lg:text-[64px] font-normal leading-[1] tracking-[-0.025em] text-night">
                  Ce que tes proches{" "}
                  <em className="italic bg-gradient-to-br from-gold to-gold-deep bg-clip-text text-transparent">
                    racontent
                  </em>{" "}
                  aujourd&apos;hui.
                </h1>
                <p className="mt-3 max-w-[420px] lg:max-w-[480px] text-[13px] sm:text-[14px] lg:text-[15px] leading-[1.45] lg:leading-relaxed text-night-muted">
                  Ordre chronologique strict. Pas d&apos;algorithme, pas de pub.
                  {newPostsCount > 0 ? (
                    <>
                      {" "}
                      <span className="font-semibold text-night">
                        {newPostsCount} nouveau
                        {newPostsCount > 1 ? "x" : ""} post
                        {newPostsCount > 1 ? "s" : ""}
                      </span>{" "}
                      depuis ta dernière visite.
                    </>
                  ) : null}
                </p>
              </div>
            </header>

            {/* Stories rail */}
            <StoriesRow
              groups={storyGroups}
              currentUserId={user.id}
              currentUserAvatarUrl={profile?.avatar_url ?? null}
              currentUserName={fullName}
            />

            {/* Composer chip — trigger du ContentCreatorModal global. */}
            <div className="px-4 sm:px-6 pb-3.5">
              <PostChipTrigger
                authorName={fullName}
                authorAvatarUrl={profile?.avatar_url ?? null}
              />
            </div>

            {/* Chantier Feed v2.3 — sélecteur de mode si tab=transparent. */}
            {tab === "transparent" ? (
              <div className="px-4 sm:px-6 pb-4">
                <FeedModeSelector current={feedMode} />
              </div>
            ) : null}

            {/* Trending hashtags : déplacés en right rail desktop seulement
                (proto BoldFeedScreen mobile n'a pas cette section). */}

            {/* Posts */}
            {posts.length === 0 ? (
              <div className="px-4 sm:px-6 pb-10">
                <FeedEmptyState tab={tab} />
              </div>
            ) : (
              <ul className="flex flex-col gap-4 px-4 sm:px-6 pb-10 min-w-0">
                {posts.map((post, index) => {
                  const reason = reasonByPostId.get(post.id);
                  return (
                  <Fragment key={post.id}>
                    <li>
                      {reason ? (
                        <div className="mb-1.5">
                          <FeedReasonChip reason={reason} />
                        </div>
                      ) : null}
                      <PostViewTracker postId={post.id} />
                      <PostCard
                        post={post}
                        currentUserId={user.id}
                        hero={index === 0}
                        rankingSignals={
                          rankingByPostId.get(post.id)?.primary_signals
                        }
                      />
                    </li>
                    {/* Densité publicitaire DIVARC : 1 ad tous les 6
                        posts (entre les positions 5/11/17/...).
                        Conformité DSA art. 26 — chaque ad affiche
                        "Sponsorisé" + lien Why this ad. */}
                    {index > 0 && (index + 1) % 6 === 0 ? (
                      <li aria-label="Publicité sponsorisée">
                        <AdSlot
                          surface="feed_home"
                          slotIndex={Math.floor((index + 1) / 6)}
                        />
                      </li>
                    ) : null}
                    {/* Chantier Feed 6.1 — pause anti-doomscroll toutes les
                        20 positions. Affichée APRÈS l'item index 19, 39, ... */}
                    {index > 0 && (index + 1) % 20 === 0 ? (
                      <li>
                        <AntiDoomscrollPause
                          pauseIndex={Math.floor((index + 1) / 20)}
                        />
                      </li>
                    ) : null}
                  </Fragment>
                  );
                })}
              </ul>
            )}
          </div>

          {/* Right rail desktop */}
          <div className="hidden lg:block py-10 pr-4">
            <FeedRightRail
              suggestions={suggestions}
              trendingTags={trendingTags}
              recentFriends={storyGroups}
            />
          </div>
        </div>
      </div>

      {/* FAB Créer — navy 56 r-full border-2 gold, double shadow gold+navy.
          lg:hidden car la sidebar desktop a déjà un bouton + (et le bottom
          nav floating mobile a son propre FAB +). Ce FAB-ci est spécifique
          à la page feed selon le proto. */}
      <Link
        href="/create"
        aria-label="Créer un post"
        className="lg:hidden fixed right-[18px] bottom-[100px] z-30 flex h-14 w-14 items-center justify-center rounded-full bg-night text-cream border-2 border-gold shadow-[0_12px_32px_-8px_rgba(244,185,66,0.6),0_4px_12px_rgba(10,31,68,0.4)] hover:scale-105 transition-transform"
      >
        <Plus className="w-[22px] h-[22px]" strokeWidth={2.6} aria-hidden />
      </Link>
    </div>
  );
}

function FeedEmptyState({ tab }: { tab: FeedTabId }) {
  if (tab === "friends") {
    return (
      <EmptyState
        icon={UserPlus}
        kicker="Bienvenue"
        title={
          <>
            Aucun post de tes <em className="italic text-gold-deep">proches</em>
          </>
        }
        body="Ajoute des amis pour voir leurs posts ici."
        ctaHref="/messages/new"
        ctaLabel="Trouver des amis"
      />
    );
  }
  if (tab === "for-you") {
    return (
      <EmptyState
        icon={Sparkles}
        kicker="Le feed va se construire"
        title={
          <>
            L&apos;algo te <em className="italic text-gold-deep">apprend</em>
          </>
        }
        body="Plus tu interagis, plus l'algorithme te connaît. Publie un post, ajoute des amis, like ce qui te plaît."
        ctaHref="/explore"
        ctaLabel="Découvrir"
        secondaryHref="/messages/new"
        secondaryLabel="Trouver des amis"
        tone="soft"
      />
    );
  }
  return (
    <EmptyState
      icon={Compass}
      kicker="Premier coup d'œil"
      title={
        <>
          Pas encore de posts <em className="italic text-gold-deep">publics</em>
        </>
      }
      body="Les posts apparaîtront ici dès que tes amis ou la communauté publient."
      ctaHref="/explore"
      ctaLabel="Découvrir"
    />
  );
}
