import { MessageSquareText } from "lucide-react";
import { notFound, redirect } from "next/navigation";
import { KickerLabel } from "@/components/ui/KickerLabel";
import { getCircleBySlug } from "@/lib/queries/circles";
import {
  listCirclePinnedPosts,
  listCirclePosts,
} from "@/lib/queries/posts";
import { getCurrentProfile } from "@/lib/queries/profile";
import { createClient } from "@/lib/supabase/server";
import { PostCard } from "@/app/(app)/feed/_components/PostCard";
import { CircleModeratablePost } from "./CircleModeratablePost";
import { CirclePostComposer } from "./CirclePostComposer";

type Params = Promise<{ slug: string }>;

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

/* Onglet "Posts" du cercle (route racine /circles/[slug]). Le hero, les
 * tabs et les actions sont rendus par le layout parent. */
export default async function CirclePostsTab({
  params,
}: {
  params: Params;
}) {
  const { slug } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const circle = await getCircleBySlug(slug, user.id);
  if (!circle) notFound();

  const isOwner = circle.owner_id === user.id;
  const canModerate =
    isOwner ||
    circle.my_role === "admin" ||
    circle.my_role === "moderator" ||
    circle.my_role === "mod";

  const [profile, posts, pinnedPosts] = await Promise.all([
    getCurrentProfile(),
    circle.is_member
      ? listCirclePosts(circle.id, user.id, 30)
      : Promise.resolve([]),
    circle.is_member
      ? listCirclePinnedPosts(circle.id, user.id, 5)
      : Promise.resolve([]),
  ]);

  const fullName = profile?.full_name ?? user.email?.split("@")[0] ?? null;

  if (!circle.is_member) {
    return (
      <div className="px-5 sm:px-8 py-8 text-center">
        <p className="text-[14px] text-night-dim leading-relaxed max-w-md mx-auto">
          Rejoins ce cercle pour voir les discussions et participer.
        </p>
      </div>
    );
  }

  return (
    <section className="px-5 sm:px-8" aria-label="Discussions">
      <div className="flex items-center gap-2 mb-4">
        <MessageSquareText className="w-4 h-4 text-gold-deep" aria-hidden />
        <KickerLabel>Discussions</KickerLabel>
      </div>

      <CirclePostComposer
        circleId={circle.id}
        authorName={fullName}
        authorAvatarUrl={profile?.avatar_url ?? null}
      />

      {pinnedPosts.length > 0 ? (
        <ul className="mt-6 space-y-5">
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
      ) : null}

      {posts.length === 0 && pinnedPosts.length === 0 ? (
        <p className="mt-6 text-sm text-night-dim text-center py-8 rounded-2xl border border-dashed border-line">
          Aucun message pour l&apos;instant.{" "}
          <span className="italic font-display text-night">
            Lance la conversation.
          </span>
        </p>
      ) : null}

      {posts.length > 0 ? (
        <ul className="mt-4 space-y-4">
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
      ) : null}
    </section>
  );
}
