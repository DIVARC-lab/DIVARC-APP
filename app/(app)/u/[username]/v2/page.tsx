import { notFound, redirect } from "next/navigation";
import { AboutSection } from "@/components/profile/AboutSection";
import { EducationTimeline } from "@/components/profile/EducationTimeline";
import { ExperienceTimeline } from "@/components/profile/ExperienceTimeline";
import { OpenToWorkBanner } from "@/components/profile/OpenToWorkBanner";
import {
  ProfileTabsV2,
  type TabCounters,
} from "@/components/profile/ProfileTabsV2";
import { ProfileHeroV2 } from "@/components/profile/ProfileHeroV2";
import { RecommendationsSection } from "@/components/profile/RecommendationsSection";
import { SkillsSection } from "@/components/profile/SkillsSection";
import { getExtendedProfileByUsername } from "@/lib/queries/extendedProfile";
import { lookupFriendshipState } from "@/lib/queries/friendships";
import { createClient } from "@/lib/supabase/server";
import { UserActionBar } from "../_components/UserActionBar";

/* Profil v2 — Preview vue lecture étape 4.
 *
 * Route parallèle à /u/[username] pour valider visuellement avant de
 * remplacer l'existant. URL: /u/<username>/v2[?tab=...]
 *
 * Sections affichées V1 :
 *   - ProfileHero (cover + avatar + identité + actions)
 *   - ProfileTabs sticky
 *   - Tab "about" actif par défaut (autres tabs étape 6+)
 *
 * Sections détaillées (experiences/skills/etc.) arrivent étape 6 et +.
 * Cette page V1 affiche surtout About et la structure de hub. */

export async function generateMetadata({
  params,
}: {
  params: Promise<{ username: string }>;
}) {
  const { username } = await params;
  const pkg = await getExtendedProfileByUsername(username);
  if (!pkg) return { title: "Profil introuvable" };
  return {
    title: `${pkg.profile.full_name ?? `@${pkg.profile.username}`} (V2)`,
    description: pkg.profile.headline ?? pkg.profile.bio ?? undefined,
  };
}

export default async function ProfileV2Page({
  params,
  searchParams,
}: {
  params: Promise<{ username: string }>;
  searchParams: Promise<{ tab?: string }>;
}) {
  const { username } = await params;
  const { tab } = await searchParams;
  const activeTab = tab ?? "about";

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const pkg = await getExtendedProfileByUsername(username);
  if (!pkg) notFound();

  const { profile } = pkg;
  const isOwn = profile.id === user.id;
  const friendship = await lookupFriendshipState(user.id, profile.id);

  /* Compteurs pour les onglets. */
  const counters: TabCounters = {
    highlights: pkg.highlights.length,
    recommendations: pkg.recommendations_received.length,
    projects: pkg.projects.length,
    publications: pkg.publications.length,
    experiences: pkg.experiences.length,
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
    <div className="min-h-screen bg-bg-soft">
      <ProfileHeroV2
        profile={profile}
        badges={pkg.badges}
        isOwn={isOwn}
        actionsBar={
          <UserActionBar
            targetUserId={profile.id}
            initialState={friendship}
          />
        }
      />

      <ProfileTabsV2 facets={profile.facets} counters={counters} />

      <main className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-6 lg:py-8 space-y-6">
        {/* Open to Work banner (top, toutes les vues) */}
        {pkg.open_to_work && pkg.open_to_work.visibility !== "hidden" ? (
          <OpenToWorkBanner data={pkg.open_to_work} />
        ) : null}

        {activeTab === "about" ? (
          <AboutSection profile={profile} interests={[]} />
        ) : null}

        {activeTab === "experiences" ? (
          <div className="space-y-5">
            <ExperienceTimeline experiences={pkg.experiences} />
            <EducationTimeline education={pkg.education} />
          </div>
        ) : null}

        {activeTab === "skills" ? (
          <SkillsSection skills={pkg.skills} />
        ) : null}

        {activeTab === "recommendations" ? (
          <RecommendationsSection
            recommendations={pkg.recommendations_received}
            authorById={authorById}
          />
        ) : null}

        {/* Fallback placeholder pour tabs pas encore implémentés */}
        {!["about", "experiences", "skills", "recommendations"].includes(
          activeTab,
        ) ? (
          <SectionPlaceholder tab={activeTab} />
        ) : null}
      </main>
    </div>
  );
}

function SectionPlaceholder({ tab }: { tab: string }) {
  return (
    <div className="rounded-2xl bg-white border border-line border-dashed p-12 text-center">
      <p className="text-[13.5px] text-night-muted">
        Section <span className="font-bold text-night">{tab}</span> arrive aux
        étapes 6&ndash;9 du chantier profil v2.
      </p>
    </div>
  );
}
