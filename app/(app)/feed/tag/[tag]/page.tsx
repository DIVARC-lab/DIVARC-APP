import { ArrowLeft, Hash } from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { listPostsByHashtag } from "@/lib/queries/posts";
import { createClient } from "@/lib/supabase/server";
import { PostCard } from "../../_components/PostCard";

type Params = Promise<{ tag: string }>;

export async function generateMetadata({ params }: { params: Params }) {
  const { tag } = await params;
  const decoded = decodeURIComponent(tag).toLowerCase();
  return {
    title: `#${decoded}`,
    description: `Les posts marqués #${decoded} sur DIVARC.`,
  };
}

export default async function HashtagPage({ params }: { params: Params }) {
  const { tag } = await params;
  const decoded = decodeURIComponent(tag).toLowerCase();

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const posts = await listPostsByHashtag(decoded, user.id, 60);

  return (
    <div className="px-6 sm:px-10 py-10 max-w-3xl mx-auto w-full space-y-8">
      <header>
        <Link
          href="/feed"
          className="inline-flex items-center gap-2 text-sm text-night-muted hover:text-night mb-3"
        >
          <ArrowLeft className="w-4 h-4" aria-hidden />
          Feed
        </Link>
        <span className="text-xs font-semibold tracking-widest uppercase text-gold-deep">
          Hashtag
        </span>
        <h1 className="mt-2 font-display text-5xl text-night flex items-center gap-2 leading-none">
          <Hash className="w-10 h-10 text-gold-deep" aria-hidden />
          <span>{decoded}</span>
        </h1>
        <p className="mt-2 text-muted-strong">
          {posts.length} post{posts.length > 1 ? "s" : ""} public
          {posts.length > 1 ? "s" : ""}.
        </p>
      </header>

      {posts.length === 0 ? (
        <div className="text-center py-16 px-6 rounded-3xl bg-white border border-line">
          <div
            aria-hidden
            className="w-20 h-20 mx-auto rounded-3xl bg-gradient-to-br from-cream via-bg to-gold/15 border border-gold/30 flex items-center justify-center mb-5"
          >
            <Hash className="w-7 h-7 text-gold-deep" aria-hidden />
          </div>
          <h2 className="font-display text-2xl text-night">
            Pas encore de post sur #{decoded}
          </h2>
          <p className="mt-2 text-muted max-w-sm mx-auto">
            Sois le premier à publier sur ce sujet.
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
