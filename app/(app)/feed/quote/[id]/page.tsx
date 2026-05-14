import { ArrowLeft, Quote } from "lucide-react";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getPostById } from "@/lib/queries/posts";
import { getCurrentProfile } from "@/lib/queries/profile";
import { createClient } from "@/lib/supabase/server";
import { QuoteComposer } from "./_components/QuoteComposer";
import { QuotedPostCard } from "../../_components/QuotedPostCard";
import { Container } from "@/components/primitives/Container";
import { PageStickyHeader } from "@/components/patterns/PageLayout";
import { Stack } from "@/components/primitives/Stack";

type Params = Promise<{ id: string }>;

export const metadata = {
  title: "Citer un post — DIVARC",
  description:
    "Cite un post en ajoutant ton propre commentaire. Le post original reste visible.",
};

export default async function QuotePostPage({ params }: { params: Params }) {
  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const [quoted, profile] = await Promise.all([
    getPostById(id, user.id),
    getCurrentProfile(),
  ]);

  if (!quoted) notFound();

  return (
    <div className="min-h-[100dvh] bg-bg-soft">
      <PageStickyHeader variant="solid" maxWidth="text" paddingX="page">
        <div className="flex items-center gap-3 h-12">
          <Link
            href={`/feed/${id}`}
            aria-label="Retour"
            className="inline-flex items-center justify-center w-8 h-8 rounded-full text-night-dim hover:text-night hover:bg-bg-soft"
          >
            <ArrowLeft className="w-4 h-4" aria-hidden />
          </Link>
          <p className="text-[13px] font-extrabold text-night flex items-center gap-1.5">
            <Quote className="w-3.5 h-3.5 text-gold-deep" aria-hidden />
            Citer ce post
          </p>
        </div>
      </PageStickyHeader>

      <Container maxWidth="text" paddingX="page" as="main" className="pb-[max(calc(64px+env(safe-area-inset-bottom)),96px)]">
        <Stack gap="lg" className="py-6">
        <QuoteComposer
          authorId={user.id}
          authorProfile={
            profile
              ? {
                  full_name: profile.full_name,
                  username: profile.username,
                  avatar_url: profile.avatar_url,
                }
              : null
          }
          quotedPostId={quoted.id}
        />

        <div className="rounded-2xl bg-white border border-line p-2">
          <QuotedPostCard
            quoted={{
              id: quoted.id,
              body: quoted.body,
              created_at: quoted.created_at,
              author: quoted.author
                ? {
                    full_name: quoted.author.full_name,
                    username: quoted.author.username,
                    avatar_url: quoted.author.avatar_url,
                  }
                : null,
            }}
          />
        </div>
        </Stack>
      </Container>
    </div>
  );
}
