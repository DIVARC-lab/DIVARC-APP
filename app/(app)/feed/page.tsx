import { Compass, Plus, Sparkles, UserPlus } from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { ArcDeco } from "@/components/marketing/ArcDeco";
import { EmptyState } from "@/components/ui/EmptyState";
import { listFeedPosts } from "@/lib/queries/posts";
import {
  listFriendsOnlyFeed,
  listRankedFeed,
} from "@/lib/queries/feed";
import { suggestPeople } from "@/lib/queries/explore";
import { listTrendingHashtags } from "@/lib/queries/hashtags";
import { getCurrentProfile } from "@/lib/queries/profile";
import {
  groupStoriesByAuthor,
  listVisibleStories,
} from "@/lib/queries/stories";
import { createClient } from "@/lib/supabase/server";
import { FeedRightRail } from "./_components/FeedRightRail";
import { PostCard } from "./_components/PostCard";
import { PostComposer } from "./_components/PostComposer";
import { PostViewTracker } from "./_components/PostViewTracker";
import { StoriesRow } from "./_components/StoriesRow";
import type { PostWithDetails } from "@/lib/database.types";

export const metadata = {
  title: "Feed",
};

const VALID_TABS = ["for-you", "friends", "latest"] as const;
type FeedTabId = (typeof VALID_TABS)[number];

type SearchParams = Promise<{ tab?: string }>;

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

  const { tab: tabParam } = await searchParams;
  const tab: FeedTabId = (VALID_TABS.find((t) => t === tabParam) ??
    "latest") as FeedTabId;

  const profile = await getCurrentProfile();
  const fullName = profile?.full_name ?? user.email?.split("@")[0] ?? null;

  let posts: PostWithDetails[] = [];
  if (tab === "for-you") {
    posts = await listRankedFeed(user.id, 40);
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
  const newPostsCount = posts.filter(
    (p) => Date.now() - new Date(p.created_at).getTime() < dayMs,
  ).length;

  return (
    <div className="relative bg-[#F1F3F8] min-h-screen pb-[86px]">
      <div className="mx-auto w-full max-w-6xl">
        <div className="grid lg:grid-cols-[minmax(0,1fr)_320px] gap-0 lg:gap-10">
          <div className="mx-auto w-full max-w-2xl lg:mx-0">
            {/* Hero header — gradient cream → bg-soft, ArcDeco gold visible */}
            <header className="relative overflow-hidden bg-gradient-to-b from-cream to-[#F1F3F8] pt-16 pb-7 px-[22px] sm:pt-20 sm:px-7">
              <div
                aria-hidden
                className="absolute -top-10 -right-14 opacity-55 pointer-events-none"
              >
                <ArcDeco size={260} tone="gold" opacity={1} stroke={1.25} />
              </div>
              <div className="relative">
                <p className="text-[11px] font-extrabold uppercase tracking-[0.18em] text-[#B88A2A]">
                  · Le feed · {todayKicker}
                </p>
                <h1 className="mt-2.5 font-display text-[40px] sm:text-[56px] lg:text-[64px] font-normal leading-[1] tracking-[-0.025em] text-[#0A1F44]">
                  Ce que tes proches{" "}
                  <em className="italic bg-gradient-to-br from-[#F4B942] to-[#B88A2A] bg-clip-text text-transparent">
                    racontent
                  </em>{" "}
                  aujourd&apos;hui.
                </h1>
                <p className="mt-3 max-w-[420px] lg:max-w-[480px] text-[13px] sm:text-[14px] lg:text-[15px] leading-[1.45] lg:leading-relaxed text-[#2A3D6B]">
                  Ordre chronologique strict. Pas d&apos;algorithme, pas de pub.
                  {newPostsCount > 0 ? (
                    <>
                      {" "}
                      <span className="font-semibold text-[#0A1F44]">
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

            {/* Composer chip teaser → modal */}
            <div className="px-4 sm:px-6 pb-3.5">
              <PostComposer
                userId={user.id}
                authorName={fullName}
                authorAvatarUrl={profile?.avatar_url ?? null}
              />
            </div>

            {/* Trending hashtags : déplacés en right rail desktop seulement
                (proto BoldFeedScreen mobile n'a pas cette section). */}

            {/* Posts */}
            {posts.length === 0 ? (
              <div className="px-4 sm:px-6 pb-10">
                <FeedEmptyState tab={tab} />
              </div>
            ) : (
              <ul className="flex flex-col gap-4 px-4 sm:px-6 pb-10">
                {posts.map((post, index) => (
                  <li key={post.id}>
                    <PostViewTracker postId={post.id} />
                    <PostCard
                      post={post}
                      currentUserId={user.id}
                      hero={index === 0}
                    />
                  </li>
                ))}
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
        className="lg:hidden fixed right-[18px] bottom-[100px] z-30 flex h-14 w-14 items-center justify-center rounded-full bg-[#0A1F44] text-[#FFF8E8] border-2 border-[#F4B942] shadow-[0_12px_32px_-8px_rgba(244,185,66,0.6),0_4px_12px_rgba(10,31,68,0.4)] hover:scale-105 transition-transform"
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
