import { Compass, Eye } from "lucide-react";
import Link from "next/link";
import { Fragment } from "react";
import { redirect } from "next/navigation";
import { EmptyState } from "@/components/ui/EmptyState";
import { loadDiscoverPosts } from "@/lib/queries/feed";
import { createClient } from "@/lib/supabase/server";
import { DiscoverReasonChip } from "../feed/_components/DiscoverReasonChip";
import { PostCard } from "../feed/_components/PostCard";
import { PostViewTracker } from "../feed/_components/PostViewTracker";
import { Container } from "@/components/primitives/Container";
import { Stack } from "@/components/primitives/Stack";

export const metadata = {
  title: "Découvrir — DIVARC",
  description:
    "Posts à découvrir, choisis avec des raisons explicites. Pas d'algorithme opaque.",
};

export default async function DiscoverPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { posts, reasonByPostId } = await loadDiscoverPosts(user.id, 30);

  return (
    <div className="min-h-[100dvh] bg-bg-soft pb-[max(calc(64px+env(safe-area-inset-bottom)),96px)]">
      <Container maxWidth="text" paddingX="lg" paddingY="2xl">
        <Stack gap="2xl">
        <header className="space-y-3">
          <p className="text-[11px] font-extrabold uppercase tracking-[0.18em] text-gold-deep flex items-center gap-1.5">
            <Compass className="w-3 h-3" aria-hidden />
            · Découvrir
          </p>
          <h1 className="font-display text-[36px] sm:text-[48px] leading-[1] tracking-[-0.02em] text-night text-balance">
            Des voix à <em className="italic text-gold-deep">entendre</em>.
          </h1>
          <p className="text-[14px] leading-relaxed text-night-soft max-w-[480px]">
            Chaque post ci-dessous est surfacé pour une raison précise, écrite
            noir sur blanc. Pas de boîte noire. Pas d&apos;algorithme opaque.
          </p>
          <Link
            href="/about/feed-algorithm"
            target="_blank"
            rel="noopener"
            className="inline-flex items-center gap-1.5 text-[11px] font-extrabold text-night-dim hover:text-gold-deep transition-colors"
          >
            <Eye className="w-3 h-3" aria-hidden />
            Voir les formules complètes
          </Link>
        </header>

        {posts.length === 0 ? (
          <EmptyState
            icon={Compass}
            kicker="Patience"
            title={
              <>
                Pas encore de <em className="italic text-gold-deep">découvertes</em>
              </>
            }
            body="Les posts apparaissent ici dès que la communauté commence à discuter et réagir. Reviens dans quelques heures."
            ctaHref="/feed"
            ctaLabel="Aller au feed"
          />
        ) : (
          <ul className="flex flex-col gap-4">
            {posts.map((post, index) => {
              const reason = reasonByPostId.get(post.id);
              return (
                <Fragment key={post.id}>
                  <li>
                    {reason ? (
                      <div className="mb-1.5">
                        <DiscoverReasonChip
                          reasonType={reason.type}
                          reasonData={reason.data}
                        />
                      </div>
                    ) : null}
                    <PostViewTracker postId={post.id} />
                    <PostCard
                      post={post}
                      currentUserId={user.id}
                      hero={index === 0}
                    />
                  </li>
                </Fragment>
              );
            })}
          </ul>
        )}
        </Stack>
      </Container>
    </div>
  );
}
