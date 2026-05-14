import { ArrowLeft, Hash } from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { listPostsByHashtag } from "@/lib/queries/posts";
import { createClient } from "@/lib/supabase/server";
import { PostCard } from "../../_components/PostCard";
import { KickerLabel } from "@/components/ui/KickerLabel";
import { EmptyState } from "@/components/ui/EmptyState";
import { Container } from "@/components/primitives/Container";
import { Stack } from "@/components/primitives/Stack";

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
    <Container maxWidth="default" paddingX="page" paddingY="3xl">
      <Stack gap="3xl">
        <header>
          <Link
            href="/feed"
            className="inline-flex items-center gap-2 text-sm text-night-muted hover:text-night mb-3"
          >
            <ArrowLeft className="w-4 h-4" aria-hidden />
            Feed
          </Link>
          <KickerLabel>Hashtag</KickerLabel>
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
          <EmptyState
            icon={Hash}
            title={`Pas encore de post sur #${decoded}`}
            body="Sois le premier à publier sur ce sujet."
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
