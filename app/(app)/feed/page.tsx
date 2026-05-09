import { Bookmark, Compass, Sparkles, UserPlus } from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { ArcDeco } from "@/components/marketing/ArcDeco";
import { DisplayHeading } from "@/components/ui/DisplayHeading";
import { EmptyState } from "@/components/ui/EmptyState";
import { KickerLabel } from "@/components/ui/KickerLabel";
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
import { TrendingHashtagsRow } from "./_components/TrendingHashtagsRow";
import type { PostWithDetails } from "@/lib/database.types";

export const metadata = {
  title: "Feed",
};

const VALID_TABS = ["for-you", "friends", "latest"] as const;
type FeedTabId = (typeof VALID_TABS)[number];

type SearchParams = Promise<{ tab?: string }>;

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

  /* Default flow = chronological (matches handoff Sage screenshot:
     "Ordre chronologique strict. Pas d'algo, pas de pub."). The
     ?tab= param still works (deeplink-friendly) but no UI to switch. */
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

  /* "X nouveaux posts depuis ta dernière visite" — proxy : posts <24h.
     Quand on aura un last_seen_at sur le profil, on basculera dessus. */
  const dayMs = 24 * 60 * 60 * 1000;
  const newPostsCount = posts.filter(
    (p) => Date.now() - new Date(p.created_at).getTime() < dayMs,
  ).length;

  /* Date du jour façon "7 mai" pour le kicker (handoff desktop). */
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

  /* Orchestration Session 5 — brief user :
     - Container max-w-2xl mx-auto
     - Padding latéral 0 sur mobile (cards full-bleed)
     - Liste PostCard en gap-3 (au lieu de space-y-4)
     - Pas de bg gris entre cards : le feed est aéré
     - StoriesRow tout en haut, PostComposer juste après
     - Right rail desktop préservé via grid lg externe (max-w-6xl
       wrapper englobe le grid pour permettre la 2ème colonne)
     - Server actions et queries Supabase intacts */
  const visiblePosts = posts;
  return (
    <div className="mx-auto w-full max-w-6xl">
      <div className="grid lg:grid-cols-[minmax(0,1fr)_320px] gap-0 lg:gap-10">
        {/* Main column — max-w-2xl mx-auto sur mobile,
            collée à gauche dans le grid lg+ */}
        <div className="mx-auto w-full max-w-2xl lg:mx-0">
          {/* Hero header — bandeau gradient cream + ArcDeco gold visible.
              Padding aligné avec le container : px-5 sm:px-6 (au lieu
              de px-5 sm:px-10 qui débordait du max-w-2xl) */}
          <header className="relative overflow-hidden bg-gradient-to-b from-cream via-bg-deep to-bg px-5 sm:px-6 pt-12 sm:pt-14 pb-8">
            <div
              aria-hidden
              className="pointer-events-none absolute -right-20 -top-24 opacity-55"
            >
              <ArcDeco size={320} tone="gold" opacity={1} stroke={1.25} />
            </div>
            <div className="relative flex items-start justify-between gap-3">
              <div className="min-w-0 flex-1">
                <KickerLabel>· Le feed · {todayKicker}</KickerLabel>
                <DisplayHeading
                  size="xl"
                  className="mt-3 !leading-[1] !text-[44px] sm:!text-[60px] tracking-[-0.025em]"
                >
                  Ce que tes proches{" "}
                  <em className="italic bg-gradient-to-br from-gold to-[#B88A2A] bg-clip-text text-transparent">
                    racontent
                  </em>{" "}
                  aujourd&apos;hui.
                </DisplayHeading>
                <p className="mt-3 max-w-xl text-[15px] leading-relaxed text-night-muted">
                  Ordre chronologique strict. Pas d&apos;algorithme, pas de pub.
                  {newPostsCount > 0 ? (
                    <>
                      {" "}
                      <span className="font-semibold text-night">
                        {newPostsCount} nouveau{newPostsCount > 1 ? "x" : ""}{" "}
                        post{newPostsCount > 1 ? "s" : ""}
                      </span>{" "}
                      depuis ta dernière visite.
                    </>
                  ) : null}
                </p>
              </div>
              <Link
                href="/feed/saved"
                className="shrink-0 inline-flex items-center gap-1.5 h-9 px-3 rounded-full bg-white border border-line text-sm font-semibold text-night-muted hover:border-gold/40 hover:text-gold-deep transition-colors"
                title="Mes posts sauvegardés"
                aria-label="Mes posts sauvegardés"
              >
                <Bookmark className="w-4 h-4" aria-hidden />
                <span>Sauvegardés</span>
              </Link>
            </div>
          </header>

          {/* Stories rail — full-bleed (StoriesRow gère son -mx-4 interne) */}
          <div className="pt-4 pb-3">
            <StoriesRow
              groups={storyGroups}
              currentUserId={user.id}
              currentUserAvatarUrl={profile?.avatar_url ?? null}
              currentUserName={fullName}
            />
          </div>

          {/* Composer — px-0 mobile (full-bleed), px-6 desktop */}
          <div className="px-0 sm:px-6 pb-3">
            <PostComposer
              userId={user.id}
              authorName={fullName}
              authorAvatarUrl={profile?.avatar_url ?? null}
            />
          </div>

          {/* Trending hashtags row — un peu de padding latéral */}
          {trendingTags.length > 0 ? (
            <div className="px-4 sm:px-6 pb-3">
              <TrendingHashtagsRow tags={trendingTags} />
            </div>
          ) : null}

          {/* Liste posts — gap-3 (brief), full-bleed mobile, pas de bg gris
              entre les cards (chaque card a sa propre shadow soft) */}
          {visiblePosts.length === 0 ? (
            <div className="px-4 sm:px-6 pb-10">
              <FeedEmptyState tab={tab} />
            </div>
          ) : (
            <ul className="flex flex-col gap-3 px-0 sm:px-6 pb-10">
              {visiblePosts.map((post, index) => (
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

        {/* Right rail (lg+) — préservé pour suggestions/tendances/TON ARC */}
        <div className="hidden lg:block py-10 pr-4">
          <FeedRightRail
            suggestions={suggestions}
            trendingTags={trendingTags}
            recentFriends={storyGroups}
          />
        </div>
      </div>
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
