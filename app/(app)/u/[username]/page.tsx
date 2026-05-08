import {
  Award,
  Briefcase,
  Calendar,
  IdCard,
  MapPin,
  ShoppingBag,
  Sparkles,
} from "lucide-react";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { Avatar } from "@/components/ui/Avatar";
import { ListingCard } from "@/components/marketplace/ListingCard";
import { Tabs } from "@/components/ui/Tabs";
import { listListings } from "@/lib/queries/listings";
import { listPostsByAuthor } from "@/lib/queries/posts";
import {
  getPublicProfileByUsername,
  getPublicStatsByUserId,
} from "@/lib/queries/publicProfile";
import {
  getMyEndorsedSkillIds,
  getProProfile,
} from "@/lib/queries/profilePro";
import { lookupFriendshipState } from "@/lib/queries/friendships";
import { createClient } from "@/lib/supabase/server";
import { safeFormatDate } from "@/lib/utils/date";
import { PostCard } from "@/app/(app)/feed/_components/PostCard";
import {
  UserActionBar,
  type FriendshipState,
} from "./_components/UserActionBar";
import { PublicProProfile } from "./_components/PublicProProfile";

type Params = Promise<{ username: string }>;
type SearchParams = Promise<{ tab?: string }>;

export async function generateMetadata({ params }: { params: Params }) {
  const { username } = await params;
  const profile = await getPublicProfileByUsername(username);
  if (!profile) return { title: "Profil introuvable" };
  return {
    title: profile.full_name ?? `@${profile.username}`,
    description: profile.bio ?? `Profil de ${profile.full_name ?? username} sur DIVARC.`,
  };
}

const TABS = [
  { id: "posts", label: "Posts", icon: Sparkles },
  { id: "pro", label: "Profil pro", icon: Briefcase },
  { id: "annonces", label: "Annonces", icon: ShoppingBag },
  { id: "apropos", label: "À propos", icon: IdCard },
] as const;

type TabId = (typeof TABS)[number]["id"];

export default async function PublicProfilePage({
  params,
  searchParams,
}: {
  params: Params;
  searchParams: SearchParams;
}) {
  const { username } = await params;
  const { tab } = await searchParams;
  const activeTab: TabId =
    (TABS.find((t) => t.id === tab)?.id as TabId) ?? "posts";

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const profile = await getPublicProfileByUsername(username);
  if (!profile) notFound();

  // Block undiscoverable profiles unless it's the owner
  if (!profile.discoverable && profile.id !== user.id) {
    notFound();
  }

  const [stats, friendshipState] = await Promise.all([
    getPublicStatsByUserId(profile.id),
    lookupFriendshipState(user.id, profile.id),
  ]);

  const initialFriendState: FriendshipState =
    friendshipState.status === "self"
      ? { status: "self" }
      : friendshipState.status === "friends"
        ? { status: "friends", friendshipId: friendshipState.friendshipId }
        : friendshipState.status === "outgoing"
          ? { status: "outgoing", friendshipId: friendshipState.friendshipId }
          : friendshipState.status === "incoming"
            ? { status: "incoming", friendshipId: friendshipState.friendshipId }
            : { status: "none" };

  const isSelf = profile.id === user.id;
  const isFriend = initialFriendState.status === "friends";

  // Trace la vue (skip si soi-même ou si discrete_search activé côté viewer)
  if (!isSelf) {
    void supabase.rpc("record_profile_view", { target_user_id: profile.id });
  }

  // Posts visible : only fetched if owner or friend (and respecting RLS)
  const posts = isSelf || isFriend
    ? await listPostsByAuthor(profile.id, user.id, 20)
    : [];

  // Listings : public regardless of friendship
  const listings = await listListings(user.id, {
    sellerId: profile.id,
    limit: 12,
  });

  // Profil pro (public, géré par RLS) — chargé seulement sur l'onglet "pro"
  const proBundle =
    activeTab === "pro" ? await getProProfile(profile.id) : null;
  const endorsedSkillIds =
    proBundle && proBundle.skills.length > 0
      ? Array.from(
          await getMyEndorsedSkillIds(proBundle.skills.map((s) => s.id)),
        )
      : [];

  const memberSince = safeFormatDate(profile.created_at, {
    month: "long",
    year: "numeric",
  });

  return (
    <div className="px-4 sm:px-10 py-10 max-w-5xl mx-auto w-full space-y-8">
      <Hero
        profile={profile}
        memberSince={memberSince}
        stats={stats}
        actionBar={
          <UserActionBar
            targetUserId={profile.id}
            initialState={initialFriendState}
          />
        }
      />

      <Tabs
        tabs={[...TABS]}
        activeId={activeTab}
        pathname={`/u/${profile.username}`}
        defaultTab="posts"
        paramName="tab"
      />

      {activeTab === "posts" ? (
        posts.length === 0 ? (
          <EmptyState
            emoji="✨"
            title={
              isSelf
                ? "Tu n'as pas encore publié de post"
                : isFriend
                  ? `${profile.full_name?.split(" ")[0] ?? profile.username} n'a encore rien publié`
                  : "Posts visibles pour les amis"
            }
            body={
              isSelf
                ? "Va sur le feed pour publier ton premier post."
                : isFriend
                  ? "Reviens plus tard."
                  : "Demande à devenir ami pour voir ses posts."
            }
            ctaHref={isSelf ? "/feed" : undefined}
            ctaLabel={isSelf ? "Publier un post" : undefined}
          />
        ) : (
          <ul className="space-y-4">
            {posts.map((post) => (
              <li key={post.id}>
                <PostCard post={post} currentUserId={user.id} />
              </li>
            ))}
          </ul>
        )
      ) : null}

      {activeTab === "pro" && proBundle ? (
        <PublicProProfile
          experiences={proBundle.experiences}
          education={proBundle.education}
          skills={proBundle.skills}
          languages={proBundle.languages}
          certifications={proBundle.certifications}
          isOwner={isSelf}
          endorsedSkillIds={endorsedSkillIds}
        />
      ) : null}

      {activeTab === "annonces" ? (
        listings.length === 0 ? (
          <EmptyState
            emoji="🛍️"
            title="Aucune annonce active"
            body={
              isSelf
                ? "Publie une annonce sur la marketplace."
                : "Cet utilisateur n'a pas d'annonce active pour le moment."
            }
            ctaHref={isSelf ? "/marketplace/new" : undefined}
            ctaLabel={isSelf ? "Vendre quelque chose" : undefined}
          />
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
            {listings.map((listing) => (
              <ListingCard key={listing.id} listing={listing} />
            ))}
          </div>
        )
      ) : null}

      {activeTab === "apropos" ? (
        <div className="grid sm:grid-cols-2 gap-4">
          <InfoCard label="Membre depuis" value={memberSince} icon={Calendar} />
          {profile.show_location && profile.location ? (
            <InfoCard label="Ville" value={profile.location} icon={MapPin} />
          ) : null}
          {profile.founder_rank ? (
            <InfoCard
              label="Rang fondateur"
              value={`#${profile.founder_rank}`}
              icon={Award}
            />
          ) : null}
          <InfoCard
            label="Profil DIVARC"
            value={`@${profile.username}`}
            icon={IdCard}
          />
        </div>
      ) : null}
    </div>
  );
}

function Hero({
  profile,
  memberSince,
  stats,
  actionBar,
}: {
  profile: NonNullable<Awaited<ReturnType<typeof getPublicProfileByUsername>>>;
  memberSince: string;
  stats: Awaited<ReturnType<typeof getPublicStatsByUserId>>;
  actionBar: React.ReactNode;
}) {
  const fullName = profile.full_name ?? `@${profile.username}`;

  return (
    <section className="relative overflow-hidden rounded-3xl border border-line bg-white">
      <div className="h-32 sm:h-44 relative bg-gradient-to-br from-night via-night-soft to-night-muted grain">
        <svg
          className="absolute inset-0 w-full h-full opacity-15"
          viewBox="0 0 800 200"
          fill="none"
          aria-hidden
        >
          <defs>
            <pattern
              id="public-arc-pattern"
              x="0"
              y="0"
              width="80"
              height="80"
              patternUnits="userSpaceOnUse"
            >
              <path
                d="M 0 40 Q 40 0 80 40 Q 40 80 0 40 Z"
                stroke="#F4B942"
                strokeWidth="1"
                fill="none"
              />
            </pattern>
          </defs>
          <rect width="800" height="200" fill="url(#public-arc-pattern)" />
        </svg>
      </div>
      <div className="px-6 sm:px-10 pb-7 -mt-12 sm:-mt-14 flex flex-col sm:flex-row sm:items-end gap-5 sm:justify-between">
        <div className="flex items-end gap-5">
          <div className="rounded-full ring-4 ring-white p-1 bg-gradient-to-br from-gold via-gold-soft to-gold-deep">
            <div className="rounded-full bg-white">
              <Avatar
                src={profile.avatar_url}
                fullName={fullName}
                size="xl"
                priority
              />
            </div>
          </div>
          <div className="pb-2">
            <div className="flex flex-wrap items-center gap-1.5 mb-1">
              {profile.founder_rank ? (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-gold/20 text-gold-deep text-[10px] font-bold uppercase tracking-widest">
                  <Award className="w-3 h-3" aria-hidden />
                  Fondateur · #{profile.founder_rank}
                </span>
              ) : null}
              {profile.open_to_work ? (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 text-[10px] font-bold uppercase tracking-widest border border-emerald-200">
                  Ouvert aux opportunités
                </span>
              ) : null}
              {profile.open_to_hiring ? (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 text-[10px] font-bold uppercase tracking-widest border border-blue-200">
                  Recrute
                </span>
              ) : null}
            </div>
            <h1 className="font-display text-3xl sm:text-4xl text-night text-balance">
              {fullName}
            </h1>
            <p className="text-sm text-muted">@{profile.username}</p>
            {profile.headline ? (
              <p className="mt-1.5 text-sm text-night-muted max-w-md">
                {profile.headline}
              </p>
            ) : null}
          </div>
        </div>
        <div className="sm:pb-2">{actionBar}</div>
      </div>

      <div className="px-6 sm:px-10 pb-7 grid sm:grid-cols-3 gap-3 sm:gap-4 border-t border-line pt-6">
        <Stat label="Posts publics" value={stats.postsCount} />
        <Stat label="Annonces" value={stats.listingsCount} />
        <Stat label="Amis" value={stats.friendsCount} />
      </div>

      {profile.bio ? (
        <div className="px-6 sm:px-10 pb-7 -mt-2">
          <p className="text-night-muted leading-relaxed text-pretty max-w-2xl">
            {profile.bio}
          </p>
        </div>
      ) : null}

      {profile.show_location && profile.location ? (
        <div className="px-6 sm:px-10 pb-6 flex items-center gap-1.5 text-sm text-muted">
          <MapPin className="w-3.5 h-3.5" aria-hidden />
          {profile.location}
          <span className="text-night-muted">·</span>
          <span>Sur DIVARC depuis {memberSince}</span>
        </div>
      ) : (
        <div className="px-6 sm:px-10 pb-6 flex items-center gap-1.5 text-sm text-muted">
          <Calendar className="w-3.5 h-3.5" aria-hidden />
          Sur DIVARC depuis {memberSince}
        </div>
      )}
    </section>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="text-center sm:text-left p-4 rounded-2xl bg-night/[0.03] border border-line">
      <dt className="text-[10px] font-semibold uppercase tracking-widest text-muted">
        {label}
      </dt>
      <dd className="mt-1 font-display text-2xl text-night">{value}</dd>
    </div>
  );
}

function InfoCard({
  label,
  value,
  icon: Icon,
}: {
  label: string;
  value: string;
  icon: typeof Briefcase;
}) {
  return (
    <article className="p-5 rounded-2xl bg-white border border-line">
      <div className="flex items-center gap-3">
        <div className="w-9 h-9 rounded-xl bg-night/5 flex items-center justify-center">
          <Icon className="w-4 h-4 text-night" aria-hidden />
        </div>
        <div className="min-w-0">
          <p className="text-[10px] font-semibold uppercase tracking-widest text-muted">
            {label}
          </p>
          <p className="text-sm font-medium text-night truncate">{value}</p>
        </div>
      </div>
    </article>
  );
}

function EmptyState({
  emoji,
  title,
  body,
  ctaHref,
  ctaLabel,
}: {
  emoji: string;
  title: string;
  body: string;
  ctaHref?: string;
  ctaLabel?: string;
}) {
  return (
    <div className="text-center py-16 px-6 rounded-3xl bg-white border border-line">
      <div
        aria-hidden
        className="w-16 h-16 mx-auto rounded-2xl bg-gradient-to-br from-cream via-bg to-gold/15 border border-gold/30 flex items-center justify-center mb-4 text-3xl leading-none"
      >
        {emoji}
      </div>
      <h2 className="font-display text-xl text-night">{title}</h2>
      <p className="mt-1 text-sm text-muted max-w-sm mx-auto">{body}</p>
      {ctaHref && ctaLabel ? (
        <Link
          href={ctaHref}
          className="mt-5 inline-flex items-center gap-2 px-5 h-11 rounded-full bg-night text-cream font-semibold text-sm hover:bg-night-soft"
        >
          {ctaLabel}
        </Link>
      ) : null}
    </div>
  );
}
