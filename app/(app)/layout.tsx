import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getCurrentProfile } from "@/lib/queries/profile";
import { getTotalUnreadCount } from "@/lib/queries/conversations";
import {
  countUnreadNotifications,
  listNotificationsForUser,
} from "@/lib/queries/notifications";
import { listMyCircles } from "@/lib/queries/circles";
import { MobileBottomNav } from "@/components/MobileBottomNav";
import { NotificationsRealtime } from "@/components/NotificationsRealtime";
import { PresenceHeartbeat } from "@/components/PresenceHeartbeat";
import { ThemeProvider } from "@/components/ThemeProvider";
import { CreatorModalHost } from "@/components/creator/CreatorModalHost";
import { CreatorProvider } from "@/components/creator/CreatorProvider";
import { ConfirmProvider } from "@/components/ui/ConfirmDialog";
import { TopBar } from "@/components/layout/TopBar";
import { LeftSidebar } from "@/components/layout/LeftSidebar";

/* Layout app refonte étape 9 — pattern Facebook adapté à DIVARC.
 *
 * Architecture :
 *  - TopBar fixed h-14 (étapes 2-3) sur tous viewports
 *  - Desktop xl (≥1280px) : grid 3 colonnes
 *      [LeftSidebar 320px] [Main flex-1 pt-14] [RightRail 320px optionnel]
 *  - Desktop lg (1024-1279px) : 2 colonnes (Main + RightRail si dispo)
 *  - Mobile (<1024px) : 1 colonne pleine largeur + BottomNav fixed bottom
 *
 * Le RightRail est rendu DANS chaque page concernée (/feed, /explore,
 * /profile etc.) via un composant dédié — il n'est pas dans le layout
 * global pour permettre des contenus spécifiques par route.
 *
 * Tous les Providers (CreatorProvider, ConfirmProvider, etc.) wrappent
 * le tout pour rester accessibles partout. */
export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const profile = await getCurrentProfile();
  if (profile && !profile.onboarded_at) redirect("/welcome");

  const fullName = profile?.full_name ?? user.email?.split("@")[0] ?? null;
  const username = profile?.username ?? null;
  const avatarUrl = profile?.avatar_url ?? null;

  const [unreadMessages, unreadNotifications, myCircles, recentNotifications] =
    await Promise.all([
      getTotalUnreadCount(user.id),
      countUnreadNotifications(user.id),
      listMyCircles(user.id),
      /* 5 plus récentes pour le dropdown TopBar (le reste est dans /notifications) */
      listNotificationsForUser(user.id, 5),
    ]);

  /* Cercles épinglés pour la sidebar gauche (max 6, les plus récents). */
  const pinnedCircles = myCircles.slice(0, 6).map((c) => ({
    id: c.id,
    slug: c.slug ?? null,
    name: c.name,
    emoji: c.emoji ?? null,
  }));

  return (
    <CreatorProvider>
      <ConfirmProvider>
        <div className="min-h-screen bg-bg">
          <TopBar
            userId={user.id}
            fullName={fullName}
            username={username}
            avatarUrl={avatarUrl}
            unreadNotifications={unreadNotifications}
            unreadMessages={unreadMessages}
            recentNotifications={recentNotifications}
          />

          {/* Padding-top h-14 pour décaler sous TopBar fixed.
              Padding-bottom mobile = espace pour BottomNav h-14 + safe-area. */}
          <div className="pt-14 pb-[calc(56px+env(safe-area-inset-bottom,0px))] lg:pb-0">
            {/* LeftSidebar : visible UNIQUEMENT xl ≥ 1280px */}
            <aside className="hidden xl:flex xl:flex-col fixed left-0 top-14 bottom-0 w-80 z-30">
              <LeftSidebar
                fullName={fullName}
                username={username}
                avatarUrl={avatarUrl}
                pinnedCircles={pinnedCircles}
              />
            </aside>

            {/* Main : décalé selon breakpoint.
                xl : margin-left 320px (sidebar). RightRail rendu par chaque
                page individuellement, donc pas de margin-right global ici.
                Le main prend toute la largeur restante et CHAQUE page définit
                sa max-width interne (cf. Partie 7 du brief : 680px feed,
                1200px marketplace, etc.). */}
            <main className="xl:ml-80 min-h-[calc(100vh-56px)]">
              {children}
            </main>
          </div>

          <MobileBottomNav
            unreadNotifications={unreadNotifications}
            unreadMessages={unreadMessages}
            fullName={fullName}
            username={username}
            avatarUrl={avatarUrl}
          />

          <NotificationsRealtime userId={user.id} />
          <PresenceHeartbeat />
          <ThemeProvider initialTheme={profile?.theme ?? "system"} />
          <CreatorModalHost />
        </div>
      </ConfirmProvider>
    </CreatorProvider>
  );
}
