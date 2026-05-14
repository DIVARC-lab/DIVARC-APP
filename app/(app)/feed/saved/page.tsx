import { ArrowLeft, Bookmark } from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { listBookmarkedPosts } from "@/lib/queries/posts";
import { createClient } from "@/lib/supabase/server";
import { PostCard } from "../_components/PostCard";
import { KickerLabel } from "@/components/ui/KickerLabel";
import { EmptyState } from "@/components/ui/EmptyState";
import { Container } from "@/components/primitives/Container";
import { Stack } from "@/components/primitives/Stack";

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
    <Container maxWidth="default" paddingX="page" paddingY="3xl">
      <Stack gap="2xl">
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
        <EmptyState
          icon={Bookmark}
          title="Aucun post sauvegardé"
          body="Sur un post, clique sur l'icône bookmark pour le retrouver ici."
          tone="default"
        />
      ) : (
        <ul className="space-y-4">
          {posts.map((post) => (
            <li key={post.id}>
              <PostCard post={post} currentUserId={user.id} />
            </li>
          ))}
        </ul>
      )}
      </Stack>
    </Container>
  );
}
