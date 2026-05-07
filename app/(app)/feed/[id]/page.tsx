import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import {
  getPostById,
  listCommentsForPost,
} from "@/lib/queries/posts";
import { getCurrentProfile } from "@/lib/queries/profile";
import { createClient } from "@/lib/supabase/server";
import { CommentForm } from "../_components/CommentForm";
import { CommentList } from "../_components/CommentList";
import { PostCard } from "../_components/PostCard";

type Params = Promise<{ id: string }>;

export async function generateMetadata({ params }: { params: Params }) {
  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { title: "Post" };
  const post = await getPostById(id, user.id);
  if (!post) return { title: "Post introuvable" };
  const author = post.author?.full_name ?? post.author?.username ?? "Post";
  return { title: `Post de ${author}` };
}

export default async function PostPage({ params }: { params: Params }) {
  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const [post, comments, profile] = await Promise.all([
    getPostById(id, user.id),
    listCommentsForPost(id),
    getCurrentProfile(),
  ]);

  if (!post) notFound();

  const fullName = profile?.full_name ?? user.email?.split("@")[0] ?? null;

  return (
    <div className="px-4 sm:px-10 py-10 max-w-2xl mx-auto w-full space-y-6">
      <Link
        href="/feed"
        className="inline-flex items-center gap-2 text-sm text-night-muted hover:text-night"
      >
        <ArrowLeft className="w-4 h-4" aria-hidden />
        Retour au feed
      </Link>

      <PostCard post={post} currentUserId={user.id} />

      <section className="rounded-3xl bg-white border border-line shadow-soft p-5 sm:p-6 space-y-6">
        <header>
          <h2 className="font-display text-xl text-night">
            Commentaires
            {post.comments_count > 0 ? (
              <span className="ml-2 text-base text-muted">
                · {post.comments_count}
              </span>
            ) : null}
          </h2>
        </header>

        <CommentForm
          postId={post.id}
          authorAvatarUrl={profile?.avatar_url ?? null}
          authorName={fullName}
        />

        <CommentList
          comments={comments}
          postId={post.id}
          currentUserId={user.id}
        />
      </section>
    </div>
  );
}
