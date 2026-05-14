import { ArrowLeft, GraduationCap, Star } from "lucide-react";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { Avatar } from "@/components/ui/Avatar";
import { getMentorOfferByUsername } from "@/lib/queries/mentors";
import { createClient } from "@/lib/supabase/server";
import { BookSessionForm } from "../_components/BookSessionForm";
import { Container } from "@/components/primitives/Container";
import { Stack } from "@/components/primitives/Stack";

type Params = Promise<{ slug: string }>;

export async function generateMetadata({ params }: { params: Params }) {
  const { slug } = await params;
  const offer = await getMentorOfferByUsername(slug);
  if (!offer) return { title: "Mentor introuvable" };
  return {
    title: `Mentorat avec ${offer.profile?.full_name ?? slug}`,
    description: offer.bio.slice(0, 160),
  };
}

export default async function MentorDetailPage({
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

  const offer = await getMentorOfferByUsername(slug);
  if (!offer || !offer.profile) notFound();

  const profile = offer.profile;
  const isSelf = profile.id === user.id;
  const displayName = profile.full_name ?? profile.username ?? "Mentor";

  return (
    <Container maxWidth="default" paddingX="page" paddingY="3xl">
      <Stack gap="3xl">
      <Link
        href="/mentors"
        className="inline-flex items-center gap-2 text-sm text-night-muted hover:text-night"
      >
        <ArrowLeft className="w-4 h-4" aria-hidden />
        Mentors
      </Link>

      <article className="rounded-3xl bg-white border border-line shadow-soft p-6 sm:p-8">
        <div className="flex flex-col sm:flex-row gap-5">
          <Avatar src={profile.avatar_url} fullName={displayName} size="xl" priority />
          <div className="flex-1 min-w-0">
            <span className="text-[10px] font-bold uppercase tracking-widest text-gold-deep">
              Mentor
            </span>
            <h1 className="mt-1 font-display text-3xl sm:text-4xl text-night">
              {displayName}
            </h1>
            {profile.headline ? (
              <p className="mt-1 text-night-muted">{profile.headline}</p>
            ) : null}
            <div className="mt-3 flex flex-wrap items-center gap-3 text-xs text-muted">
              <span className="inline-flex items-center gap-1">
                <Star className="w-3 h-3 text-gold-deep" aria-hidden />
                {offer.sessions_count > 0
                  ? `${offer.sessions_count} session${offer.sessions_count > 1 ? "s" : ""}`
                  : "Nouveau mentor"}
              </span>
              {offer.hourly_rate ? (
                <span className="font-semibold text-night">
                  {Number(offer.hourly_rate).toFixed(0)}{" "}
                  {offer.rate_currency}
                  <span className="text-muted">/h</span>
                </span>
              ) : (
                <span className="font-semibold text-success">Gratuit</span>
              )}
              {offer.languages.length > 0 ? (
                <span>· Langues : {offer.languages.join(", ")}</span>
              ) : null}
            </div>
            {offer.topics.length > 0 ? (
              <div className="mt-3 flex flex-wrap gap-1.5">
                {offer.topics.map((topic) => (
                  <span
                    key={topic}
                    className="inline-flex items-center px-2 py-0.5 rounded-full bg-night/5 text-[10px] font-bold uppercase tracking-widest text-night-muted"
                  >
                    {topic}
                  </span>
                ))}
              </div>
            ) : null}
          </div>
        </div>

        <p className="mt-6 text-night-muted whitespace-pre-wrap leading-relaxed">
          {offer.bio}
        </p>
      </article>

      {isSelf ? (
        <div className="text-center py-10 px-6 rounded-3xl bg-night/[0.03] border border-line">
          <GraduationCap
            className="w-8 h-8 mx-auto text-gold-deep mb-3"
            aria-hidden
          />
          <p className="text-sm text-muted">
            C&apos;est ton offre.{" "}
            <Link
              href="/mentors/offer"
              className="font-semibold text-night hover:underline"
            >
              Modifier
            </Link>
          </p>
        </div>
      ) : (
        <article className="rounded-3xl bg-gradient-to-br from-cream via-bg to-gold/10 border-2 border-gold/30 shadow-soft p-6 sm:p-8">
          <h2 className="font-display text-2xl text-night mb-1">
            Réserver une session
          </h2>
          <p className="text-sm text-muted mb-5">
            Précise un sujet et un message. Le mentor recevra une notif et
            pourra accepter ou décliner.
          </p>
          <BookSessionForm mentorId={profile.id} />
        </article>
      )}
      </Stack>
    </Container>
  );
}
