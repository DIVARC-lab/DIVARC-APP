import { MessageSquareText } from "lucide-react";
import { notFound, redirect } from "next/navigation";
import { KickerLabel } from "@/components/ui/KickerLabel";
import { getCircleBySlug, listCircleFlairs } from "@/lib/queries/circles";
import { listCircleChannels } from "@/lib/queries/circleChannels";
import {
  listCirclePinnedPosts,
  listCirclePosts,
  type CircleFeedSort,
} from "@/lib/queries/posts";
import { getCurrentProfile } from "@/lib/queries/profile";
import { createClient } from "@/lib/supabase/server";
import { PostCard } from "@/app/(app)/feed/_components/PostCard";
import { ChannelsBar } from "./_components/ChannelsBar";
import { CircleFeedSortFilters } from "./_components/CircleFeedSortFilters";
import { CircleWelcomeModal } from "./_components/CircleWelcomeModal";
import { CircleModeratablePost } from "./CircleModeratablePost";
import { CirclePostComposer } from "./CirclePostComposer";

type Params = Promise<{ slug: string }>;
type SearchParamsP = Promise<{ sort?: string; channel?: string }>;

const VALID_SORTS = new Set<CircleFeedSort>([
  "recent",
  "hot_24h",
  "hot_7d",
  "mine",
  "unread",
]);

export async function generateMetadata({ params }: { params: Params }) {
  const { slug } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { title: "Cercle" };
  const circle = await getCircleBySlug(slug, user.id);
  return { title: circle?.name ?? "Cercle" };
}

/* Onglet "Posts" v2 (route racine /circles/[slug]).
 * - composer avec FlairSelector
 * - tris transparents (recent/hot_24h/hot_7d/mine/unread)
 * - posts épinglés en haut
 * - le hero, les tabs et les actions sont rendus par le layout parent. */
export default async function CirclePostsTab({
  params,
  searchParams,
}: {
  params: Params;
  searchParams: SearchParamsP;
}) {
  const { slug } = await params;
  const sp = await searchParams;
  const sort: CircleFeedSort = VALID_SORTS.has(sp.sort as CircleFeedSort)
    ? (sp.sort as CircleFeedSort)
    : "recent";
  const channelSlugParam =
    typeof sp.channel === "string" && sp.channel.trim().length > 0
      ? sp.channel.trim().toLowerCase()
      : null;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const circle = await getCircleBySlug(slug, user.id);
  if (!circle) notFound();

  /* Sprint B.2 — récupère la liste des channels du cercle (ordonnés par
     position). Si le user a précisé ?channel=slug, on résout l'UUID. */
  const channels = circle.is_member
    ? await listCircleChannels(circle.id)
    : [];
  const activeChannel = channelSlugParam
    ? (channels.find((c) => c.slug === channelSlugParam) ?? null)
    : null;
  const activeChannelId = activeChannel?.id ?? null;

  const isOwner = circle.owner_id === user.id;
  const canModerate =
    isOwner ||
    circle.my_role === "admin" ||
    circle.my_role === "moderator" ||
    circle.my_role === "mod";

  /* Pour le tri "unread", on lit le last_active_at de l'user dans ce cercle. */
  let unreadSince: string | null = null;
  if (sort === "unread") {
    const { data: m } = await supabase
      .from("circle_members")
      .select("last_active_at, joined_at")
      .eq("circle_id", circle.id)
      .eq("user_id", user.id)
      .maybeSingle();
    unreadSince =
      (m as { last_active_at?: string | null; joined_at?: string } | null)
        ?.last_active_at ??
      (m as { joined_at?: string } | null)?.joined_at ??
      null;
  }

  const [profile, posts, pinnedPosts, flairs, ownMembership] =
    await Promise.all([
      getCurrentProfile(),
      circle.is_member
        ? listCirclePosts(
            circle.id,
            user.id,
            30,
            sort,
            unreadSince,
            activeChannelId,
          )
        : Promise.resolve([]),
      circle.is_member
        ? listCirclePinnedPosts(circle.id, user.id, 5, activeChannelId)
        : Promise.resolve([]),
      circle.is_member ? listCircleFlairs(circle.id) : Promise.resolve([]),
      /* Chantier 5.1 — récupère onboarding_completed_at pour décider du modal. */
      circle.is_member
        ? supabase
            .from("circle_members")
            .select("onboarding_completed_at")
            .eq("circle_id", circle.id)
            .eq("user_id", user.id)
            .maybeSingle()
            .then((r) => r.data)
        : Promise.resolve(null),
    ]);

  const fullName = profile?.full_name ?? user.email?.split("@")[0] ?? null;
  const showWelcome =
    circle.is_member &&
    !(ownMembership as { onboarding_completed_at?: string | null } | null)
      ?.onboarding_completed_at;

  if (!circle.is_member) {
    return (
      <div className="px-5 sm:px-8 py-8 text-center">
        <p className="text-[14px] text-night-dim leading-relaxed max-w-md mx-auto">
          Rejoins ce cercle pour voir les discussions et participer.
        </p>
      </div>
    );
  }

  /* Met à jour silencieusement last_active_at (best-effort, ne bloque pas
   * le render — pas async/await). */
  void supabase
    .from("circle_members")
    .update({ last_active_at: new Date().toISOString() })
    .eq("circle_id", circle.id)
    .eq("user_id", user.id)
    .then(() => undefined, () => undefined);

  return (
    <section className="px-5 sm:px-8" aria-label="Discussions">
      {showWelcome ? (
        <CircleWelcomeModal
          circleId={circle.id}
          circleSlug={slug}
          circleName={circle.name}
          emoji={circle.emoji}
          colorAccent={circle.color_accent}
          welcomeMessage={circle.welcome_message}
          hasPinnedPost={pinnedPosts.length > 0}
        />
      ) : null}
      <div className="flex items-center gap-2 mb-3">
        <MessageSquareText className="w-4 h-4 text-gold-deep" aria-hidden />
        <KickerLabel>
          {activeChannel ? `# ${activeChannel.name}` : "Discussions"}
        </KickerLabel>
      </div>

      {/* Sprint B.2 — barre channels (mobile + desktop, horizontale). */}
      <ChannelsBar
        circleSlug={slug}
        channels={channels}
        activeSlug={activeChannel?.slug ?? null}
      />

      <CirclePostComposer
        circleId={circle.id}
        authorName={fullName}
        authorAvatarUrl={profile?.avatar_url ?? null}
        flairs={flairs}
        channelId={activeChannelId}
        channelName={activeChannel?.name ?? null}
      />

      {/* Filtres tri transparents (URL-driven). */}
      <div className="mt-4 mb-2">
        <CircleFeedSortFilters
          basePath={`/circles/${slug}`}
          initialSort={sort}
        />
      </div>

      {/* Pinned (toujours visibles, indépendant du tri). */}
      {pinnedPosts.length > 0 ? (
        <>
          <p className="mt-3 text-[10px] font-extrabold uppercase tracking-[0.14em] text-gold-deep">
            · Épinglés
          </p>
          <ul className="mt-1.5 space-y-4">
            {pinnedPosts.map((post) => (
              <li key={post.id}>
                <CircleModeratablePost
                  post={post}
                  currentUserId={user.id}
                  canModerate={canModerate}
                />
              </li>
            ))}
          </ul>
        </>
      ) : null}

      {/* Feed principal selon le tri. */}
      {posts.length === 0 && pinnedPosts.length === 0 ? (
        <p className="mt-6 text-sm text-night-dim text-center py-8 rounded-2xl border border-dashed border-line">
          {sort === "mine"
            ? "Tu n'as encore rien posté dans ce cercle."
            : sort === "unread"
              ? "Aucun nouveau message depuis ta dernière visite. 🎉"
              : "Aucun message pour l'instant."}{" "}
          {sort === "recent" ? (
            <span className="italic font-display text-night">
              Lance la conversation.
            </span>
          ) : null}
        </p>
      ) : null}

      {posts.length > 0 ? (
        <>
          {pinnedPosts.length > 0 ? (
            <p className="mt-5 text-[10px] font-extrabold uppercase tracking-[0.14em] text-night-dim">
              · Récents
            </p>
          ) : null}
          <ul className="mt-1.5 space-y-4">
            {posts.map((post) =>
              canModerate ? (
                <li key={post.id}>
                  <CircleModeratablePost
                    post={post}
                    currentUserId={user.id}
                    canModerate
                  />
                </li>
              ) : (
                <li key={post.id}>
                  <PostCard post={post} currentUserId={user.id} />
                </li>
              ),
            )}
          </ul>
        </>
      ) : null}
    </section>
  );
}
