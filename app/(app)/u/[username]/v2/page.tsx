import { notFound, redirect } from "next/navigation";
import { AboutSection } from "@/components/profile/AboutSection";
import {
  ProfileTabsV2,
  type TabCounters,
} from "@/components/profile/ProfileTabsV2";
import { ProfileHeroV2 } from "@/components/profile/ProfileHeroV2";
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

  /* Compteurs pour les onglets (provisoires V1, fetch détaillés étape 6+). */
  const counters: TabCounters = {
    highlights: pkg.highlights.length,
    recommendations: pkg.recommendations_received.length,
    projects: pkg.projects.length,
    publications: pkg.publications.length,
  };

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

      <main className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-6 lg:py-8">
        {activeTab === "about" ? (
          <AboutSection profile={profile} interests={[]} />
        ) : (
          <SectionPlaceholder tab={activeTab} />
        )}
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
