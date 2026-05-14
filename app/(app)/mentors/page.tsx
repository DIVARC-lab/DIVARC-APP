import { GraduationCap, MessageSquareText, Star } from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Avatar } from "@/components/ui/Avatar";
import { Button } from "@/components/ui/Button";
import {
  getMyMentorOffer,
  listMentorOffers,
} from "@/lib/queries/mentors";
import { createClient } from "@/lib/supabase/server";
import { KickerLabel } from "@/components/ui/KickerLabel";

export const metadata = {
  title: "Mentors",
};

export default async function MentorsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const [offers, myOffer] = await Promise.all([
    listMentorOffers({ limit: 60 }),
    getMyMentorOffer(user.id),
  ]);

  return (
    <div className="px-6 sm:px-10 py-10 max-w-6xl mx-auto w-full space-y-8">
      <header className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
        <div>
          <KickerLabel>Mentorat</KickerLabel>
          <h1 className="mt-2 font-display text-4xl sm:text-5xl text-night text-balance leading-[1.05]">
            Apprends de <em className="italic text-gold-deep">vrais experts</em>.
          </h1>
          <p className="mt-2 text-muted-strong max-w-xl">
            Sessions one-to-one avec des seniors francophones du monde entier.
            Carrière, code, business, mode d&apos;emploi.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="secondary" asChild>
            <Link href="/mentors/sessions">
              <MessageSquareText className="w-4 h-4" aria-hidden />
              Mes sessions
            </Link>
          </Button>
          <Button asChild>
            <Link href="/mentors/offer">
              <GraduationCap className="w-4 h-4" aria-hidden />
              {myOffer ? "Modifier mon offre" : "Devenir mentor"}
            </Link>
          </Button>
        </div>
      </header>

      {offers.length === 0 ? (
        <div className="text-center py-20 px-6 rounded-3xl bg-white border border-line">
          <div
            aria-hidden
            className="w-20 h-20 mx-auto rounded-3xl bg-gradient-to-br from-cream via-bg to-gold/15 border border-gold/30 flex items-center justify-center mb-5"
          >
            <GraduationCap className="w-7 h-7 text-gold-deep" aria-hidden />
          </div>
          <h2 className="font-display text-2xl text-night">
            Aucun mentor pour l&apos;instant
          </h2>
          <p className="mt-2 text-muted max-w-sm mx-auto">
            Sois le premier à proposer une offre de mentorat sur DIVARC.
          </p>
          <Button asChild className="mt-6">
            <Link href="/mentors/offer">Devenir mentor</Link>
          </Button>
        </div>
      ) : (
        <ul className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {offers.map((offer) => (
            <li key={offer.id}>
              <MentorCard offer={offer} />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function MentorCard({
  offer,
}: {
  offer: Awaited<ReturnType<typeof listMentorOffers>>[number];
}) {
  const profile = offer.profile;
  if (!profile) return null;
  const displayName = profile.full_name ?? profile.username ?? "Mentor";

  return (
    <Link
      href={`/mentors/${profile.username ?? profile.id}`}
      className="block p-5 rounded-3xl bg-white border border-line hover:border-night/30 hover:shadow-[0_30px_60px_-30px_rgba(10,31,68,0.25)] transition-all"
    >
      <div className="flex items-start gap-3">
        <Avatar src={profile.avatar_url} fullName={displayName} size="lg" />
        <div className="flex-1 min-w-0">
          <p className="font-display text-lg text-night truncate">
            {displayName}
          </p>
          {profile.headline ? (
            <p className="text-sm text-night-muted line-clamp-2">
              {profile.headline}
            </p>
          ) : null}
        </div>
      </div>
      <p className="mt-3 text-sm text-night-muted line-clamp-3 leading-relaxed">
        {offer.bio}
      </p>
      {offer.topics.length > 0 ? (
        <div className="mt-3 flex flex-wrap gap-1.5">
          {offer.topics.slice(0, 4).map((topic) => (
            <span
              key={topic}
              className="inline-flex items-center px-2 py-0.5 rounded-full bg-night/5 text-[10px] font-bold uppercase tracking-widest text-night-muted"
            >
              {topic}
            </span>
          ))}
        </div>
      ) : null}
      <footer className="mt-4 flex items-center justify-between text-xs text-muted">
        <span className="inline-flex items-center gap-1">
          <Star className="w-3 h-3 text-gold-deep" aria-hidden />
          {offer.sessions_count > 0
            ? `${offer.sessions_count} session${offer.sessions_count > 1 ? "s" : ""}`
            : "Nouveau"}
        </span>
        {offer.hourly_rate ? (
          <span className="font-semibold text-night">
            {Number(offer.hourly_rate).toFixed(0)} {offer.rate_currency}
            <span className="text-muted">/h</span>
          </span>
        ) : (
          <span className="font-semibold text-success">Gratuit</span>
        )}
      </footer>
    </Link>
  );
}
