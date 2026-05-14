import { notFound, redirect } from "next/navigation";
import { ListingCard } from "@/components/marketplace/ListingCard";
import { AboutSection } from "@/components/profile/AboutSection";
import { CreatorSection } from "@/components/profile/CreatorSection";
import { EducationTimeline } from "@/components/profile/EducationTimeline";
import { EntrepreneurSection } from "@/components/profile/EntrepreneurSection";
import { ExperienceTimeline } from "@/components/profile/ExperienceTimeline";
import { HighlightsRow } from "@/components/profile/HighlightsRow";
import { OpenToWorkBanner } from "@/components/profile/OpenToWorkBanner";
import { PhotosGrid, type GridPhotoItem } from "@/components/profile/PhotosGrid";
import { listJobs } from "@/lib/queries/jobs";
import { listListings } from "@/lib/queries/listings";
import {
  ProfileTabsV2,
  type TabCounters,
} from "@/components/profile/ProfileTabsV2";
import { ProfileHeroV2 } from "@/components/profile/ProfileHeroV2";
import { ProfileRelationsBar } from "@/components/profile/ProfileRelationsBar";
import { RecommendationsSection } from "@/components/profile/RecommendationsSection";
import { ShareProfileButton } from "@/components/profile/ShareProfileButton";
import { SkillsSection } from "@/components/profile/SkillsSection";
import { ViewAsButton } from "@/components/profile/ViewAsButton";
import { getExtendedProfileByUsername } from "@/lib/queries/extendedProfile";
import { listPostsByAuthor } from "@/lib/queries/posts";
import { lookupFriendshipState } from "@/lib/queries/friendships";
import { canViewSection, computeViewerRelation } from "@/lib/profile/visibility";
import { createClient } from "@/lib/supabase/server";
import { UserActionBar } from "./_components/UserActionBar";
import { Container } from "@/components/primitives/Container";

/* Page profil public /u/[username] — Profil v2 (bascule V2 effective).
 *
 * Cette page utilise le layout V2 (cover + hero + tabs + sections par
 * facette). L'ancienne version (Posts/Marketplace/Jobs trois tabs) est
 * conservée dans l'historique git. La route /u/[username]/v2 reste
 * accessible le temps de la transition (redirect vers / V2). */

export async function generateMetadata({
  params,
}: {
  params: Promise<{ username: string }>;
}) {
  const { username } = await params;
  const pkg = await getExtendedProfileByUsername(username);
  if (!pkg) return { title: "Profil introuvable" };
  return {
    title: pkg.profile.full_name ?? `@${pkg.profile.username}`,
    description: pkg.profile.headline ?? pkg.profile.bio ?? undefined,
  };
}

export default async function PublicProfilePage({
  params,
  searchParams,
}: {
  params: Promise<{ username: string }>;
  searchParams: Promise<{ tab?: string; view_as?: string }>;
}) {
  const { username } = await params;
  const { tab, view_as } = await searchParams;
  const activeTab = tab ?? "about";
  /* ViewAs simulation : owner peut visualiser son profil tel que vu par
     un visiteur public / friend / friend-of-friend. V1 = juste un override
     du flag isOwn pour cacher la completion bar + afficher les
     ProfileRelationsBar mocked. V2 : filtrer sections_visibility. */
  const viewAsMode =
    view_as === "public" ||
    view_as === "friends" ||
    view_as === "friends_of_friends"
      ? view_as
      : null;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const pkg = await getExtendedProfileByUsername(username);
  if (!pkg) notFound();

  const { profile } = pkg;
  const isReallyOwn = profile.id === user.id;
  /* En mode view_as, isOwn devient false pour cacher les UI propriétaire
     (CompletionBar, ShareButton owner shortcuts). */
  const isOwn = isReallyOwn && !viewAsMode;
  const friendship = await lookupFriendshipState(user.id, profile.id);
  /* Compute relation viewer ↔ owner pour filtrer les sections. Skip si
     own (toujours self) — économise 2 queries. */
  const viewerRelation = isReallyOwn
    ? "self"
    : await computeViewerRelation(user.id, profile.id);
  /* Helper local : peut-on voir cette section ? */
  const canView = (sectionId: string) =>
    canViewSection(
      sectionId,
      profile.sections_visibility,
      viewerRelation,
      viewAsMode,
    );

  /* Posts + listings + jobs en parallèle. */
  const [recentPosts, listings, userJobs] = await Promise.all([
    listPostsByAuthor(profile.id, user.id, 30),
    listListings(user.id, { sellerId: profile.id, limit: 12 }),
    listJobs(user.id, { posterId: profile.id, limit: 20 }),
  ]);

  /* Extract photos pour grid. */
  const gridPhotos: GridPhotoItem[] = [];
  for (const post of recentPosts) {
    if (post.photos.length > 0 && post.photos[0]?.url) {
      gridPhotos.push({
        post_id: post.id,
        url: post.photos[0].url,
        alt: post.body?.slice(0, 80) ?? "Photo",
        likes_count: post.likes_count,
        comments_count: post.comments_count,
      });
      if (gridPhotos.length >= 15) break;
    }
  }

  /* Compteurs pour les onglets. */
  const counters: TabCounters = {
    highlights: pkg.highlights.length,
    recommendations: pkg.recommendations_received.length,
    projects: pkg.projects.length,
    publications: pkg.publications.length,
    experiences: pkg.experiences.length,
    posts: recentPosts.length,
    photos: gridPhotos.length,
    marketplace: listings.length,
    jobs: userJobs.length,
  };

  /* Hydrate auteurs des recommandations pour affichage avatar. */
  const recoAuthorIds = Array.from(
    new Set(pkg.recommendations_received.map((r) => r.from_user_id)),
  );
  let authorById = new Map<
    string,
    {
      id: string;
      full_name: string | null;
      username: string | null;
      avatar_url: string | null;
      headline: string | null;
    }
  >();
  if (recoAuthorIds.length > 0) {
    const { data: authors } = await supabase
      .from("profiles")
      .select("id, full_name, username, avatar_url, headline")
      .in("id", recoAuthorIds);
    if (authors) {
      authorById = new Map(
        authors.map((a) => [
          a.id as string,
          {
            id: a.id as string,
            full_name: (a.full_name as string | null) ?? null,
            username: (a.username as string | null) ?? null,
            avatar_url: (a.avatar_url as string | null) ?? null,
            headline: (a.headline as string | null) ?? null,
          },
        ]),
      );
    }
  }

  return (
    <div className="min-h-[calc(100dvh-56px)] bg-bg-soft">
      {/* Bannière "Tu visualises en mode X" si view_as actif. */}
      {viewAsMode && isReallyOwn ? (
        <div className="bg-gold-deep text-white text-center py-2 px-4 text-[12.5px] font-semibold">
          Tu visualises ton profil en mode{" "}
          <strong>
            {viewAsMode === "public"
              ? "Public"
              : viewAsMode === "friends"
                ? "Relations"
                : "Amis d'amis"}
          </strong>
          {" · "}
          <a href={`/u/${profile.username}`} className="underline">
            Revenir à ma vue
          </a>
        </div>
      ) : null}

      <ProfileHeroV2
        profile={profile}
        badges={pkg.badges}
        isOwn={isOwn}
        actionsBar={
          isReallyOwn && !viewAsMode && profile.username ? (
            <ViewAsButton username={profile.username} />
          ) : !isReallyOwn ? (
            <UserActionBar
              targetUserId={profile.id}
              initialState={friendship}
            />
          ) : null
        }
        shareButton={
          profile.username ? (
            <ShareProfileButton
              username={profile.username}
              fullName={profile.full_name ?? profile.username}
            />
          ) : undefined
        }
      />

      {!isOwn ? (
        <Container maxWidth="default" paddingX="page" className="-mt-2 mb-2">
          <ProfileRelationsBar targetUserId={profile.id} isOwn={isOwn} />
        </Container>
      ) : null}

      <ProfileTabsV2 facets={profile.facets} counters={counters} />

      <Container as="main" maxWidth="default" paddingX="page" className="py-6 lg:py-8 space-y-6">
        {pkg.open_to_work && pkg.open_to_work.visibility !== "hidden" ? (
          <OpenToWorkBanner data={pkg.open_to_work} />
        ) : null}

        {activeTab === "about" && canView("about") ? (
          <div className="space-y-5">
            {canView("highlights") && (pkg.highlights.length > 0 || isOwn) ? (
              <HighlightsRow
                highlights={pkg.highlights}
                username={profile.username ?? ""}
                isOwn={isOwn}
              />
            ) : null}
            <AboutSection profile={profile} interests={[]} />
            {canView("photos") && gridPhotos.length > 0 ? (
              <PhotosGrid photos={gridPhotos.slice(0, 9)} />
            ) : null}
          </div>
        ) : null}

        {activeTab === "highlights" && canView("highlights") ? (
          <HighlightsRow
            highlights={pkg.highlights}
            username={profile.username ?? ""}
            isOwn={isOwn}
          />
        ) : null}

        {activeTab === "photos" && canView("photos") ? (
          <PhotosGrid photos={gridPhotos} />
        ) : null}

        {activeTab === "experiences" && canView("experiences") ? (
          <div className="space-y-5">
            <ExperienceTimeline experiences={pkg.experiences} />
            <EducationTimeline education={pkg.education} />
          </div>
        ) : null}

        {activeTab === "skills" && canView("skills") ? (
          <SkillsSection skills={pkg.skills} />
        ) : null}

        {activeTab === "recommendations" && canView("recommendations") ? (
          <RecommendationsSection
            recommendations={pkg.recommendations_received}
            authorById={authorById}
          />
        ) : null}

        {activeTab === "creator" && canView("creator") ? (
          <CreatorSection
            stats={pkg.creator_stats}
            featured={pkg.creator_featured}
            collaborations={pkg.creator_collaborations}
            mediaKit={pkg.creator_media_kit}
          />
        ) : null}

        {activeTab === "entrepreneur" && canView("entrepreneur") ? (
          <EntrepreneurSection
            companies={pkg.entrepreneur_companies}
            investments={pkg.entrepreneur_investments}
            fundraising={pkg.fundraising_status}
          />
        ) : null}

        {activeTab === "posts" && canView("posts") ? (
          recentPosts.length === 0 ? (
            <div className="rounded-2xl bg-white border border-line p-6 text-center">
              <p className="text-[13px] text-night-muted">
                Aucun post publié.
              </p>
            </div>
          ) : (
            <ul className="grid grid-cols-3 gap-1 sm:gap-2">
              {recentPosts.map((post) => (
                <li
                  key={post.id}
                  className="aspect-square overflow-hidden rounded-md bg-bg-soft"
                >
                  {post.photos[0]?.url ? (
                    /* eslint-disable-next-line @next/next/no-img-element */
                    <img
                      src={post.photos[0].url}
                      alt=""
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full p-2 text-[11px] text-night-soft line-clamp-6">
                      {post.body?.slice(0, 200) ?? ""}
                    </div>
                  )}
                </li>
              ))}
            </ul>
          )
        ) : null}

        {activeTab === "marketplace" && canView("marketplace") ? (
          listings.length === 0 ? (
            <div className="rounded-2xl bg-white border border-line p-6 text-center">
              <p className="text-[13px] text-night-muted">
                Aucune annonce active.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
              {listings.map((listing) => (
                <ListingCard key={listing.id} listing={listing} />
              ))}
            </div>
          )
        ) : null}

        {activeTab === "jobs" && canView("jobs") ? (
          userJobs.length === 0 ? (
            <div className="rounded-2xl bg-white border border-line p-6 text-center">
              <p className="text-[13px] text-night-muted">
                Aucune offre publiée.
              </p>
            </div>
          ) : (
            <ul className="space-y-3">
              {userJobs.map((job) => (
                <li
                  key={job.id}
                  className="rounded-2xl bg-white border border-line p-4"
                >
                  <p className="text-[14px] font-bold text-night">
                    {job.title}
                  </p>
                  {job.location ? (
                    <p className="text-[12.5px] text-night-muted">
                      {job.location}
                    </p>
                  ) : null}
                </li>
              ))}
            </ul>
          )
        ) : null}

        {/* Fallback : section restreinte par visibility (si activeTab est
            une section connue mais canView() retourne false). */}
        {[
          "about",
          "highlights",
          "photos",
          "experiences",
          "skills",
          "recommendations",
          "creator",
          "entrepreneur",
          "posts",
          "marketplace",
          "jobs",
        ].includes(activeTab) && !canView(activeTab) ? (
          <div className="rounded-2xl bg-white border border-line p-8 text-center">
            <p className="text-[13.5px] text-night-muted">
              🔒 Cette section n&apos;est pas accessible{" "}
              {viewAsMode
                ? `dans le mode "${viewAsMode}"`
                : "avec ton niveau de relation"}
              .
            </p>
          </div>
        ) : null}
      </Container>
    </div>
  );
}
