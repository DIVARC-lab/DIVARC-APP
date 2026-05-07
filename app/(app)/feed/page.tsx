import { Sparkles } from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { listFeedPosts } from "@/lib/queries/posts";
import { getCurrentProfile } from "@/lib/queries/profile";
import { createClient } from "@/lib/supabase/server";
import { PostCard } from "./_components/PostCard";
import { PostComposer } from "./_components/PostComposer";

export const metadata = {
  title: "Feed",
};

export default async function FeedPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const profile = await getCurrentProfile();
  const fullName = profile?.full_name ?? user.email?.split("@")[0] ?? null;

  const posts = await listFeedPosts(user.id, 30);

  return (
    <div className="px-4 sm:px-10 py-10 max-w-2xl mx-auto w-full space-y-6">
      <header>
        <span className="text-xs font-semibold tracking-widest uppercase text-gold-deep">
          Feed
        </span>
        <h1 className="mt-2 font-display text-4xl text-night text-balance leading-[1.05]">
          Ce que tes proches <em className="italic">racontent</em>.
        </h1>
        <p className="mt-1 text-muted-strong text-sm">
          Ordre chronologique strict. Pas d&apos;algorithme, pas de pub.
        </p>
      </header>

      <PostComposer
        userId={user.id}
        authorName={fullName}
        authorAvatarUrl={profile?.avatar_url ?? null}
      />

      {posts.length === 0 ? (
        <div className="text-center py-16 px-6 rounded-3xl bg-white border border-line">
          <div
            aria-hidden
            className="w-20 h-20 mx-auto rounded-3xl bg-gradient-to-br from-cream via-bg to-gold/15 border border-gold/30 flex items-center justify-center mb-5 text-4xl leading-none"
          >
            ✨
          </div>
          <h2 className="font-display text-2xl text-night">Pas encore de post</h2>
          <p className="mt-2 text-muted max-w-sm mx-auto">
            Publie ton premier post, ou ajoute des amis pour voir ce qu&apos;ils
            partagent.
          </p>
          <div className="mt-6 flex justify-center gap-2">
            <Button asChild variant="secondary">
              <Link href="/messages/new">
                <Sparkles className="w-4 h-4" aria-hidden />
                Trouver des amis
              </Link>
            </Button>
          </div>
        </div>
      ) : (
        <ul className="space-y-4">
          {posts.map((post) => (
            <li key={post.id}>
              <PostCard post={post} currentUserId={user.id} />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
