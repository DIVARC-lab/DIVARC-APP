import { ArrowLeft, Bookmark } from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { listBookmarkedPosts } from "@/lib/queries/posts";
import { createClient } from "@/lib/supabase/server";
import { PostCard } from "../_components/PostCard";
import { KickerLabel } from "@/components/ui/KickerLabel";

export const metadata = {
  title: "Posts sauvegardés",
};

export default async function SavedFeedPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const posts = await listBookmarkedPosts(user.id, 80);

  return (
    <div className="px-4 sm:px-10 py-10 max-w-2xl mx-auto w-full space-y-6">
      <header>
        <Link
          href="/feed"
          className="inline-flex items-center gap-2 text-sm text-night-muted hover:text-night mb-3"
        >
          <ArrowLeft className="w-4 h-4" aria-hidden />
          Feed
        </Link>
        <KickerLabel>Sauvegardés</KickerLabel>
        <h1 className="mt-2 font-display text-4xl text-night text-balance leading-[1.05]">
          Tes <em className="italic text-gold-deep">favoris</em>.
        </h1>
        <p className="mt-1 text-muted-strong text-sm">
          {posts.length} post{posts.length > 1 ? "s" : ""} sauvegardé
          {posts.length > 1 ? "s" : ""}. Privé — visible par toi uniquement.
        </p>
      </header>

      {posts.length === 0 ? (
        <div className="text-center py-16 px-6 rounded-3xl bg-white border border-line">
          <div
            aria-hidden
            className="w-20 h-20 mx-auto rounded-3xl bg-gradient-to-br from-cream via-bg to-gold/15 border border-gold/30 flex items-center justify-center mb-5"
          >
            <Bookmark className="w-7 h-7 text-gold-deep" aria-hidden />
          </div>
          <h2 className="font-display text-2xl text-night">
            Aucun post sauvegardé
          </h2>
          <p className="mt-2 text-muted max-w-sm mx-auto">
            Sur un post, clique sur l&apos;icône bookmark pour le retrouver
            ici.
          </p>
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
