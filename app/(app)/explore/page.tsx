import {
  ArrowRight,
  Briefcase,
  Compass,
  ShoppingBag,
  Sparkles,
  Users,
} from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";
import {
  featuredJobs,
  featuredListings,
  suggestPeople,
  trendingPosts,
} from "@/lib/queries/explore";
import { createClient } from "@/lib/supabase/server";
import { MiniJobCard } from "./_components/MiniJobCard";
import { MiniListingCard } from "./_components/MiniListingCard";
import { PersonCard } from "./_components/PersonCard";
import { TrendingPostCard } from "./_components/TrendingPostCard";
import { KickerLabel } from "@/components/ui/KickerLabel";
import { Container } from "@/components/primitives/Container";
import { Stack } from "@/components/primitives/Stack";

export const metadata = {
  title: "Découvrir",
};

export default async function ExplorePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const [people, posts, listings, jobs] = await Promise.all([
    suggestPeople(user.id, 12),
    trendingPosts(6),
    featuredListings(8),
    featuredJobs(4),
  ]);

  const isEmpty =
    people.length === 0 &&
    posts.length === 0 &&
    listings.length === 0 &&
    jobs.length === 0;

  return (
    <Container maxWidth="wide" paddingX="page" paddingY="3xl">
      <Stack gap="4xl">
      <header>
        <KickerLabel>Découvrir</KickerLabel>
        <h1 className="mt-2 font-display text-4xl sm:text-5xl text-night text-balance leading-[1.05]">
          Sors de ton cercle, <em className="italic text-gold-deep">trouve ta tribu</em>.
        </h1>
        <p className="mt-2 text-muted-strong max-w-xl">
          Des personnes, des posts, des annonces, des jobs. Sélection par
          fraîcheur et engagement, jamais par algorithme opaque.
        </p>
      </header>

      {isEmpty ? (
        <div className="text-center py-20 px-6 rounded-3xl bg-white border border-line">
          <div
            aria-hidden
            className="w-20 h-20 mx-auto rounded-3xl bg-gradient-to-br from-cream via-bg to-gold/15 border border-gold/30 flex items-center justify-center mb-5"
          >
            <Compass className="w-8 h-8 text-night-muted" aria-hidden />
          </div>
          <h2 className="font-display text-2xl text-night">
            DIVARC démarre tout juste
          </h2>
          <p className="mt-2 text-muted max-w-sm mx-auto">
            Reviens bientôt pour découvrir d&apos;autres fondateurs, posts
            publics, annonces et offres.
          </p>
        </div>
      ) : null}

      {people.length > 0 ? (
        <Section
          icon={Users}
          title="Personnes à découvrir"
          subtitle="De nouveaux fondateurs DIVARC arrivent chaque jour."
        >
          <div className="flex gap-4 overflow-x-auto pb-2 -mx-2 px-2">
            {people.map((person) => (
              <PersonCard key={person.id} person={person} />
            ))}
          </div>
        </Section>
      ) : null}

      {posts.length > 0 ? (
        <Section
          icon={Sparkles}
          title="Posts en tendance"
          subtitle="Les posts publics qui font le plus parler ces 7 derniers jours."
          link={{ href: "/feed", label: "Voir le feed" }}
        >
          <div className="grid sm:grid-cols-2 gap-4">
            {posts.map((post) => (
              <TrendingPostCard key={post.id} post={post} />
            ))}
          </div>
        </Section>
      ) : null}

      {listings.length > 0 ? (
        <Section
          icon={ShoppingBag}
          title="Marketplace"
          subtitle="Les dernières annonces publiées sur DIVARC."
          link={{ href: "/marketplace", label: "Voir tout" }}
        >
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
            {listings.map((listing) => (
              <MiniListingCard key={listing.id} listing={listing} />
            ))}
          </div>
        </Section>
      ) : null}

      {jobs.length > 0 ? (
        <Section
          icon={Briefcase}
          title="Emploi"
          subtitle="Les offres récentes publiées par la communauté."
          link={{ href: "/jobs", label: "Voir toutes les offres" }}
        >
          <div className="grid sm:grid-cols-2 gap-4">
            {jobs.map((job) => (
              <MiniJobCard key={job.id} job={job} />
            ))}
          </div>
        </Section>
      ) : null}
      </Stack>
    </Container>
  );
}

function Section({
  icon: Icon,
  title,
  subtitle,
  link,
  children,
}: {
  icon: typeof Users;
  title: string;
  subtitle: string;
  link?: { href: string; label: string };
  children: React.ReactNode;
}) {
  return (
    <section>
      <header className="flex items-end justify-between gap-4 mb-5">
        <div>
          <h2 className="flex items-center gap-2 font-display text-2xl sm:text-3xl text-night">
            <Icon className="w-5 h-5 text-gold-deep" aria-hidden />
            {title}
          </h2>
          <p className="mt-0.5 text-sm text-muted">{subtitle}</p>
        </div>
        {link ? (
          <Link
            href={link.href}
            className="inline-flex items-center gap-1 text-xs font-semibold text-night-muted hover:text-night shrink-0"
          >
            {link.label}
            <ArrowRight className="w-3 h-3" aria-hidden />
          </Link>
        ) : null}
      </header>
      {children}
    </section>
  );
}
