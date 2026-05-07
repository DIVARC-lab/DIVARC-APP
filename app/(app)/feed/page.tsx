import { Sparkles } from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { listFeedPosts, listPostsByAuthor } from "@/lib/queries/posts";
import {
  listFriendsOnlyFeed,
  listRankedFeed,
} from "@/lib/queries/feed";
import { getCurrentProfile } from "@/lib/queries/profile";
import {
  groupStoriesByAuthor,
  listVisibleStories,
} from "@/lib/queries/stories";
import { createClient } from "@/lib/supabase/server";
import { PostCard } from "./_components/PostCard";
import { PostComposer } from "./_components/PostComposer";
import { PostViewTracker } from "./_components/PostViewTracker";
import { StoriesRow } from "./_components/StoriesRow";
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

  const stories = await listVisibleStories(user.id);
  const storyGroups = groupStoriesByAuthor(stories, user.id);

  return (
    <div className="px-4 sm:px-10 py-10 max-w-2xl mx-auto w-full space-y-6">
      <header>
        <span className="text-xs font-semibold tracking-widest uppercase text-gold-deep">
          Feed
        </span>
        <h1 className="mt-2 font-display text-4xl text-night text-balance leading-[1.05]">
          {tab === "for-you" ? (
            <>
              Pour <em className="italic">toi</em>.
            </>
          ) : tab === "friends" ? (
            <>
              Tes <em className="italic">proches</em>.
            </>
          ) : (
            <>
              Ce qui se <em className="italic">passe</em>.
            </>
          )}
        </h1>
        <p className="mt-1 text-muted-strong text-sm">
          {tab === "for-you"
            ? "Algorithme transparent : engagement × récence × proximité, sans pub."
            : tab === "friends"
              ? "Tes amis uniquement, ordre chronologique."
              : "Tous les posts publics, par date."}
        </p>
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

      {posts.length === 0 ? (
        <EmptyState tab={tab} />
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
  );
}

function EmptyState({ tab }: { tab: FeedTabId }) {
  const cta =
    tab === "friends" ? (
      <Button asChild variant="secondary">
        <Link href="/messages/new">
          <Sparkles className="w-4 h-4" aria-hidden />
          Trouver des amis
        </Link>
      </Button>
    ) : (
      <Button asChild variant="secondary">
        <Link href="/explore">
          <Sparkles className="w-4 h-4" aria-hidden />
          Découvrir
        </Link>
      </Button>
    );

  const title =
    tab === "friends"
      ? "Aucun post de tes amis"
      : tab === "for-you"
        ? "Le feed va se construire"
        : "Pas encore de posts publics";
  const body =
    tab === "friends"
      ? "Ajoute des amis pour voir leurs posts ici."
      : tab === "for-you"
        ? "Plus tu interagis, plus l'algorithme te connaît. Publie un post, ajoute des amis, like ce qui te plaît."
        : "Les posts publics apparaîtront ici dès que la communauté en publiera.";

  return (
    <div className="text-center py-16 px-6 rounded-3xl bg-white border border-line">
      <div
        aria-hidden
        className="w-20 h-20 mx-auto rounded-3xl bg-gradient-to-br from-cream via-bg to-gold/15 border border-gold/30 flex items-center justify-center mb-5 text-4xl leading-none"
      >
        ✨
      </div>
      <h2 className="font-display text-2xl text-night">{title}</h2>
      <p className="mt-2 text-muted max-w-sm mx-auto">{body}</p>
      <div className="mt-6 flex justify-center gap-2">{cta}</div>
    </div>
  );
}
