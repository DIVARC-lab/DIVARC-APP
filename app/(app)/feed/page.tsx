import { Bookmark, Compass, Sparkles, UserPlus } from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";
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
import { FeedTabs, type FeedTabId } from "./_components/FeedTabs";
import type { PostWithDetails } from "@/lib/database.types";

export const metadata = {
  title: "Feed",
};

const VALID_TABS: FeedTabId[] = ["for-you", "friends", "latest"];

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

  const { tab: tabParam } = await searchParams;
  const tab: FeedTabId = (VALID_TABS.find((t) => t === tabParam) ??
    "for-you") as FeedTabId;

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

  return (
    <div className="px-4 sm:px-10 py-10 max-w-6xl mx-auto w-full">
      <div className="grid lg:grid-cols-[minmax(0,1fr)_320px] gap-6 lg:gap-10">
        {/* Main column */}
        <div className="space-y-6 max-w-2xl mx-auto w-full lg:mx-0">
          <header className="flex items-end justify-between gap-3">
            <div>
              <KickerLabel>Feed</KickerLabel>
              <DisplayHeading size="lg" className="mt-2">
                {tab === "for-you" ? (
                  <>
                    Pour <em className="italic text-gold-deep">toi</em>.
                  </>
                ) : tab === "friends" ? (
                  <>
                    Tes <em className="italic text-gold-deep">proches</em>.
                  </>
                ) : (
                  <>
                    Ce qui se <em className="italic text-gold-deep">passe</em>.
                  </>
                )}
              </DisplayHeading>
              <p className="mt-2 text-muted-strong text-sm leading-relaxed max-w-md">
                {tab === "for-you"
                  ? "Algorithme transparent : engagement × récence × proximité, sans pub."
                  : tab === "friends"
                    ? "Tes amis uniquement, ordre chronologique."
                    : "Tous les posts publics, par date."}
              </p>
            </div>
            <Link
              href="/feed/saved"
              className="shrink-0 inline-flex items-center gap-1.5 px-3 h-9 rounded-full bg-white border border-line text-sm font-semibold text-night-muted hover:border-gold/40 hover:text-gold-deep transition-colors"
              title="Mes posts sauvegardés"
            >
              <Bookmark className="w-4 h-4" aria-hidden />
              Sauvegardés
            </Link>
          </header>

          <StoriesRow
            groups={storyGroups}
            currentUserId={user.id}
            currentUserAvatarUrl={profile?.avatar_url ?? null}
            currentUserName={fullName}
          />

          <PostComposer
            userId={user.id}
            authorName={fullName}
            authorAvatarUrl={profile?.avatar_url ?? null}
          />

          <FeedTabs active={tab} />

          {trendingTags.length > 0 ? (
            <TrendingHashtagsRow tags={trendingTags} />
          ) : null}

          {posts.length === 0 ? (
            <FeedEmptyState tab={tab} />
          ) : (
            <ul className="space-y-4">
              {posts.map((post) => (
                <li key={post.id}>
                  <PostViewTracker postId={post.id} />
                  <PostCard post={post} currentUserId={user.id} />
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Right rail (lg+) */}
        <FeedRightRail
          suggestions={suggestions}
          trendingTags={trendingTags}
        />
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
            L'algo te <em className="italic text-gold-deep">apprend</em>
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
      kicker="Récents"
      title={
        <>
          Pas encore de posts <em className="italic text-gold-deep">publics</em>
        </>
      }
      body="Les posts publics apparaîtront ici dès que la communauté en publiera."
      ctaHref="/explore"
      ctaLabel="Découvrir"
    />
  );
}
