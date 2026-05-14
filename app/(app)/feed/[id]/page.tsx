import { ArrowLeft, Layers } from "lucide-react";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import {
  getPostById,
  getThreadCards,
  listCommentsForPost,
} from "@/lib/queries/posts";
import { getCurrentProfile } from "@/lib/queries/profile";
import { createClient } from "@/lib/supabase/server";
import { CommentForm } from "../_components/CommentForm";
import { CommentList } from "../_components/CommentList";
import { PostCard } from "../_components/PostCard";
import { Container } from "@/components/primitives/Container";
import { Stack } from "@/components/primitives/Stack";

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

  /* Chantier Feed 4.2 — si le post fait partie d'un thread, on charge toutes
   * les cartes (depuis le root) pour afficher la conversation complète. */
  const threadRootId =
    post.post_kind === "thread"
      ? post.thread_root_id ?? post.id
      : null;
  const threadCards = threadRootId
    ? await getThreadCards(threadRootId, user.id)
    : null;
  const cards =
    threadCards && threadCards.length > 0 ? threadCards : [post];

  return (
    <Container maxWidth="text" paddingX="page" paddingY="3xl">
      <Stack gap="2xl">
      <Link
        href="/feed"
        className="inline-flex items-center gap-2 text-sm text-night-muted hover:text-night"
      >
        <ArrowLeft className="w-4 h-4" aria-hidden />
        Retour au feed
      </Link>

      {threadRootId && threadCards && threadCards.length > 1 ? (
        <div className="rounded-2xl bg-violet-50 border border-violet-200 px-4 py-2.5 flex items-center gap-2">
          <Layers className="w-4 h-4 text-violet-700" aria-hidden />
          <p className="text-[12.5px] font-extrabold text-violet-800">
            Thread · {threadCards.length} cartes
          </p>
        </div>
      ) : null}

      <ol className="space-y-4">
        {cards.map((card, idx) => (
          <li key={card.id} className="relative">
            {threadRootId && cards.length > 1 ? (
              <span
                aria-hidden
                className="absolute left-4 -top-2 z-10 inline-flex w-6 h-6 rounded-full bg-violet-600 text-white text-[10px] font-extrabold items-center justify-center ring-2 ring-bg-soft"
              >
                {idx + 1}
              </span>
            ) : null}
            <PostCard post={card} currentUserId={user.id} />
          </li>
        ))}
      </ol>

      <section className="rounded-3xl bg-white border border-line shadow-soft p-5 sm:p-6 space-y-6">
        <header>
          <h2 className="font-display italic text-xl sm:text-2xl text-night leading-none">
            Commentaires
            {post.comments_count > 0 ? (
              <span className="ml-2 text-base text-muted not-italic font-sans">
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
      </Stack>
    </Container>
  );
}
