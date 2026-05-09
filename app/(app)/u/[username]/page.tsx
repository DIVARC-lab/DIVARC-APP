import {
  Award,
  Briefcase,
  Calendar,
  Image as ImageIcon,
  MapPin,
  ShoppingBag,
  Sparkles,
  Video,
} from "lucide-react";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ArcDeco } from "@/components/marketing/ArcDeco";
import { Avatar } from "@/components/ui/Avatar";
import { EmptyState } from "@/components/ui/EmptyState";
import { ListingCard } from "@/components/marketplace/ListingCard";
import { listListings } from "@/lib/queries/listings";
import { listJobs } from "@/lib/queries/jobs";
import { listPostsByAuthor } from "@/lib/queries/posts";
import {
  getPublicProfileByUsername,
  getPublicStatsByUserId,
} from "@/lib/queries/publicProfile";
import { lookupFriendshipState } from "@/lib/queries/friendships";
import { createClient } from "@/lib/supabase/server";
import { safeFormatDate } from "@/lib/utils/date";
import { cn } from "@/lib/utils/cn";
import {
  UserActionBar,
  type FriendshipState,
} from "./_components/UserActionBar";
import { IntroVideoPlayer } from "./_components/IntroVideoPlayer";
import { ProConnectButton } from "./_components/ProConnectButton";
import type { JobWithDetails, PostWithDetails } from "@/lib/database.types";

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

/* Brief Session 6 — handoff /u/[username] :
   3 onglets stricts (Posts / Marketplace / Jobs) avec indicateur gold sous
   l'actif. Pas d'onglet "Pro" ni "À propos" : l'identité tient dans le hero
   (badge fondateur, bio, ville, membre depuis). */
const TABS = [
  { id: "posts", label: "Posts", icon: Sparkles },
  { id: "marketplace", label: "Marketplace", icon: ShoppingBag },
  { id: "jobs", label: "Jobs", icon: Briefcase },
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

  if (!isSelf) {
    void supabase.rpc("record_profile_view", { target_user_id: profile.id });
  }

  let proConnectionState: "none" | "connected" | "pending_in" | "pending_out" =
    "none";
  if (!isSelf) {
    const { data: existing } = await supabase
      .from("pro_connections")
      .select("requester_id, recipient_id, status")
      .or(
        `and(requester_id.eq.${user.id},recipient_id.eq.${profile.id}),and(requester_id.eq.${profile.id},recipient_id.eq.${user.id})`,
      )
      .in("status", ["pending", "accepted"])
      .maybeSingle();
    if (existing) {
      if (existing.status === "accepted") proConnectionState = "connected";
      else if (existing.requester_id === user.id) proConnectionState = "pending_out";
      else proConnectionState = "pending_in";
    }
  }

  /* Posts visibles : RLS + policy "amis seulement" — on ne fetch que si
     soi-même ou ami pour économiser la requête réseau. */
  const posts: PostWithDetails[] =
    isSelf || isFriend ? await listPostsByAuthor(profile.id, user.id, 24) : [];

  const listings = await listListings(user.id, {
    sellerId: profile.id,
    limit: 12,
  });

  /* Jobs postées par cet utilisateur — public (RLS authorise lecture si status=active). */
  const userJobs: JobWithDetails[] =
    activeTab === "jobs"
      ? await listJobs(user.id, { posterId: profile.id, limit: 20 })
      : [];

  const memberSince = safeFormatDate(profile.created_at, {
    month: "long",
    year: "numeric",
  });

  const tabBase = `/u/${profile.username}`;

  return (
    <div className="mx-auto w-full max-w-4xl">
      <Hero
        profile={profile}
        memberSince={memberSince}
        stats={stats}
        actionBar={
          <div className="flex flex-wrap items-center gap-2">
            <UserActionBar
              targetUserId={profile.id}
              initialState={initialFriendState}
            />
            {!isSelf ? (
              <ProConnectButton
                targetUserId={profile.id}
                initialState={proConnectionState}
              />
            ) : null}
          </div>
        }
      />

      {profile.intro_video_url ? (
        <section className="mt-6 mx-4 sm:mx-6 rounded-3xl border border-line bg-white p-5 sm:p-6 shadow-soft flex flex-col sm:flex-row items-center gap-5">
          <IntroVideoPlayer
            url={profile.intro_video_url}
            thumbnailUrl={profile.intro_video_thumbnail_url}
            durationMs={profile.intro_video_duration_ms}
          />
          <div className="flex-1 text-center sm:text-left">
            <span className="text-kicker">· Vidéo de présentation</span>
            <h2 className="mt-2 font-display italic text-[26px] sm:text-[30px] text-night text-balance leading-[1.1]">
              {profile.full_name?.split(" ")[0] ?? "Iel"} se présente.
            </h2>
            <p className="mt-2 text-sm text-night-muted leading-relaxed max-w-md">
              60 secondes pour comprendre qui iel est, vraiment.
            </p>
          </div>
        </section>
      ) : null}

      {/* Tabs locaux : 3 onglets avec indicateur gold sous l'actif. */}
      <nav
        aria-label="Sections du profil"
        className="mt-6 px-4 sm:px-6 border-b border-line"
      >
        <ul className="flex items-stretch gap-6">
          {TABS.map((t) => {
            const isActive = t.id === activeTab;
            const Icon = t.icon;
            const href = t.id === "posts" ? tabBase : `${tabBase}?tab=${t.id}`;
            return (
              <li key={t.id}>
                <Link
                  href={href}
                  aria-current={isActive ? "page" : undefined}
                  className={cn(
                    "inline-flex items-center gap-1.5 pt-2 pb-2.5 text-sm transition-colors",
                    isActive
                      ? "border-b-2 border-gold font-extrabold text-night"
                      : "border-b-2 border-transparent font-semibold text-muted-strong hover:text-night",
                  )}
                >
                  <Icon className="w-4 h-4" aria-hidden />
                  {t.label}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      <div className="px-4 sm:px-6 py-6">
        {activeTab === "posts" ? (
          posts.length === 0 ? (
            <EmptyState
              emoji="✨"
              title={
                isSelf
                  ? "Tu n'as pas encore publié"
                  : isFriend
                    ? `${profile.full_name?.split(" ")[0] ?? profile.username} n'a encore rien publié`
                    : "Posts visibles entre amis"
              }
              body={
                isSelf
                  ? "Va sur le feed pour publier ton premier post."
                  : isFriend
                    ? "Reviens un peu plus tard."
                    : "Demande à devenir ami pour voir ses posts."
              }
              ctaHref={isSelf ? "/feed" : undefined}
              ctaLabel={isSelf ? "Publier un post" : undefined}
            />
          ) : (
            <ul className="grid grid-cols-3 gap-1 sm:gap-2">
              {posts.map((post) => (
                <li key={post.id}>
                  <PostThumb post={post} username={profile.username} />
                </li>
              ))}
            </ul>
          )
        ) : null}

        {activeTab === "marketplace" ? (
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

        {activeTab === "jobs" ? (
          userJobs.length === 0 ? (
            <EmptyState
              emoji="💼"
              title="Aucune offre publiée"
              body={
                isSelf
                  ? "Publie une offre pour recruter via DIVARC."
                  : "Cet utilisateur n'a pas d'offre active actuellement."
              }
              ctaHref={isSelf ? "/jobs/new" : undefined}
              ctaLabel={isSelf ? "Poster une offre" : undefined}
            />
          ) : (
            <ul className="grid sm:grid-cols-2 gap-3">
              {userJobs.map((job) => (
                <li key={job.id}>
                  <JobMiniCard job={job} />
                </li>
              ))}
            </ul>
          )
        ) : null}

        <p className="mt-10 flex items-center justify-center gap-1.5 text-xs text-muted">
          <Calendar className="w-3.5 h-3.5" aria-hidden />
          <span>Membre depuis {memberSince}</span>
          {profile.show_location && profile.location ? (
            <>
              <span className="text-night-muted">·</span>
              <MapPin className="w-3.5 h-3.5" aria-hidden />
              {profile.location}
            </>
          ) : null}
        </p>
      </div>
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
    <section className="relative">
      {/* Cover navy 160px + ArcDeco gold (handoff /u/aissata).
          Pas de border-radius sur mobile (full-bleed), arrondi sur desktop. */}
      <div className="relative h-40 bg-night overflow-hidden sm:rounded-b-[28px]">
        <div
          aria-hidden
          className="absolute -right-16 -top-20 pointer-events-none"
        >
          <ArcDeco size={320} tone="gold" opacity={0.55} stroke={1.25} />
        </div>
        <div
          aria-hidden
          className="absolute -left-24 -bottom-16 pointer-events-none"
        >
          <ArcDeco size={240} tone="gold" opacity={0.28} stroke={1} />
        </div>
      </div>

      <div className="px-4 sm:px-6 -mt-12 relative">
        <div className="flex items-end justify-between gap-3">
          {/* Avatar 96px ring gold 4px (brief). */}
          <div className="rounded-full ring-4 ring-gold ring-offset-4 ring-offset-bg shrink-0">
            <Avatar
              src={profile.avatar_url}
              fullName={fullName}
              size="xl"
              priority
            />
          </div>
          <div className="pb-1.5">{actionBar}</div>
        </div>

        {/* Badges status sous l'avatar. */}
        <div className="mt-4 flex flex-wrap items-center gap-1.5">
          {profile.founder_rank ? (
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-gold/15 text-gold-deep text-[10px] font-extrabold uppercase tracking-[0.16em] border border-gold/30">
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

        {/* Nom Instrument Serif italic 32px FIXE (brief). */}
        <h1 className="mt-2 font-display italic text-[32px] text-night text-balance leading-[1.05]">
          {fullName}
        </h1>
        <p className="text-sm text-muted-strong mt-0.5">@{profile.username}</p>
        {profile.bio ? (
          <p className="mt-3 text-sm text-night-muted leading-relaxed text-pretty max-w-2xl">
            {profile.bio}
          </p>
        ) : profile.headline ? (
          <p className="mt-3 text-sm text-night-muted max-w-md">
            {profile.headline}
          </p>
        ) : null}

        {/* Stats : 3 colonnes, chiffre Instrument Serif italic 24px (brief). */}
        <dl className="mt-5 grid grid-cols-3 gap-3">
          <Stat label="Posts" value={stats.postsCount} />
          <Stat label="Annonces" value={stats.listingsCount} />
          <Stat label="Amis" value={stats.friendsCount} />
        </dl>
      </div>
    </section>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="text-center px-3 py-3 rounded-2xl bg-white border border-line">
      <dt className="text-[10px] font-extrabold uppercase tracking-[0.16em] text-muted">
        {label}
      </dt>
      <dd className="mt-1 font-display italic text-2xl text-night leading-none">
        {value}
      </dd>
    </div>
  );
}

function PostThumb({
  post,
  username,
}: {
  post: PostWithDetails;
  username: string | null;
}) {
  const firstPhoto = post.photos[0]?.url ?? null;
  const hasVideo = !!post.video_url;
  const videoThumb = post.video_thumbnail_url ?? null;
  const cover = firstPhoto ?? videoThumb;
  const firstLine = (post.body ?? "").split("\n")[0]?.trim() ?? "";

  return (
    <Link
      href={username ? `/u/${username}/posts/${post.id}` : `/feed`}
      className="group relative block aspect-square overflow-hidden rounded-md bg-bg-deep border border-line"
      aria-label={firstLine || "Post"}
    >
      {cover ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={cover}
          alt=""
          className="absolute inset-0 h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.03]"
          loading="lazy"
        />
      ) : (
        <div className="absolute inset-0 flex items-center justify-center p-3 bg-gradient-to-br from-cream via-white to-bg-deep">
          <p className="font-display italic text-[15px] leading-[1.25] text-night text-balance line-clamp-4">
            {firstLine || "Note"}
          </p>
        </div>
      )}
      {hasVideo ? (
        <span
          aria-hidden
          className="absolute top-1.5 right-1.5 inline-flex items-center justify-center h-6 w-6 rounded-full bg-night/80 text-cream"
        >
          <Video className="h-3 w-3" />
        </span>
      ) : firstPhoto && post.photos.length > 1 ? (
        <span
          aria-hidden
          className="absolute top-1.5 right-1.5 inline-flex items-center justify-center h-6 w-6 rounded-full bg-night/70 text-cream"
        >
          <ImageIcon className="h-3 w-3" />
        </span>
      ) : null}
    </Link>
  );
}

function JobMiniCard({ job }: { job: JobWithDetails }) {
  const salary =
    job.salary_min && job.salary_max
      ? `${Math.round(job.salary_min / 1000)}–${Math.round(job.salary_max / 1000)}k`
      : null;
  return (
    <Link
      href={`/jobs/${job.id}`}
      className="group flex flex-col gap-2 rounded-2xl border border-line bg-white p-4 hover:border-gold/40 transition-colors"
    >
      <div className="flex items-start gap-2">
        <span className="inline-flex items-center justify-center w-9 h-9 rounded-xl bg-cream text-gold-deep shrink-0">
          <Briefcase className="w-4 h-4" aria-hidden />
        </span>
        <div className="min-w-0 flex-1">
          <h3 className="font-display italic text-[19px] text-night leading-[1.15] line-clamp-2">
            {job.title}
          </h3>
          {job.company_name ? (
            <p className="mt-0.5 text-xs font-semibold text-night-muted truncate">
              {job.company_name}
            </p>
          ) : null}
        </div>
      </div>
      <div className="flex flex-wrap items-center gap-1.5">
        <span className="inline-flex items-center px-2 h-6 rounded-full bg-bg-deep border border-line text-[10px] font-bold uppercase tracking-wider text-night-muted">
          {job.job_type}
        </span>
        <span className="inline-flex items-center px-2 h-6 rounded-full bg-bg-deep border border-line text-[10px] font-bold uppercase tracking-wider text-night-muted">
          {job.work_mode === "remote"
            ? "Remote"
            : job.work_mode === "hybrid"
              ? "Hybride"
              : "Sur site"}
        </span>
        {job.location ? (
          <span className="inline-flex items-center gap-1 text-[11px] text-night-muted">
            <MapPin className="w-3 h-3" aria-hidden />
            {job.location}
          </span>
        ) : null}
        {salary ? (
          <span className="ml-auto text-[12px] font-extrabold text-gold-deep">
            {salary}€
          </span>
        ) : null}
      </div>
    </Link>
  );
}

