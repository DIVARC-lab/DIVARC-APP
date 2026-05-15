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
import { MobileViewportHeight } from "@/components/MobileViewportHeight";
import { NotificationsRealtime } from "@/components/NotificationsRealtime";
import { PresenceHeartbeat } from "@/components/PresenceHeartbeat";
import { ThemeProvider } from "@/components/ThemeProvider";
import { CreatorModalHost } from "@/components/creator/CreatorModalHost";
import { CreatorProvider } from "@/components/creator/CreatorProvider";
import { ConfirmProvider } from "@/components/ui/ConfirmDialog";
import { TopBar } from "@/components/layout/TopBar";
import { LeftSidebar } from "@/components/layout/LeftSidebar";
import { VideoPlayerProvider } from "@/components/video/VideoPlayerProvider";
import { VideoPlayerHost } from "@/components/video/VideoPlayerHost";
import { CryptoProvider } from "@/lib/hooks/useCrypto";
import { CallProvider } from "@/lib/hooks/useCallSession";
import { CallOverlay } from "@/components/calls/CallOverlay";
import { AutoEnablePushPrompt } from "@/components/AutoEnablePushPrompt";

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
        <VideoPlayerProvider>
        <CryptoProvider>
        <CallProvider currentUserId={user.id}>
        <div className="min-h-dvh bg-bg">
          {/* Chantier Feed 6.3 — skip-link a11y. Visible au focus clavier
              (Tab depuis l'URL bar) pour bypass nav et atteindre le contenu. */}
          <a
            href="#main-content"
            className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-[100] focus:bg-night focus:text-cream focus:px-4 focus:py-2 focus:rounded-md focus:text-[13px] focus:font-extrabold focus:outline focus:outline-2 focus:outline-gold"
          >
            Aller au contenu principal
          </a>
          <TopBar
            userId={user.id}
            fullName={fullName}
            username={username}
            avatarUrl={avatarUrl}
            unreadNotifications={unreadNotifications}
            unreadMessages={unreadMessages}
            recentNotifications={recentNotifications}
          />

          {/* Padding-top h-14 + safe-area-inset-top (notch iOS PWA).
              Padding-bottom mobile = espace pour BottomNav h-14 + safe-area.
              data-app-shell : cible CSS pour le mode conv fullscreen
              mobile (cf. globals.css) qui retire ces paddings. */}
          <div
            data-app-shell
            className="pt-[calc(56px+env(safe-area-inset-top,0px))] pb-[calc(56px+env(safe-area-inset-bottom,0px))] lg:pb-0"
          >
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
            <main
              id="main-content"
              data-app-main
              tabIndex={-1}
              className="xl:ml-80 min-h-[calc(100dvh-56px)] focus:outline-none overflow-x-hidden"
            >
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

          <MobileViewportHeight />
          <NotificationsRealtime userId={user.id} />
          <PresenceHeartbeat />
          <ThemeProvider initialTheme={profile?.theme ?? "system"} />
          <CreatorModalHost />
          {/* Host vidéo Facebook-style — rend les overlays expanded /
              mini / fullscreen quand une vidéo est active. */}
          <VideoPlayerHost />
          {/* Overlay d'appel : visible quand un appel est actif (peu importe
              la route courante). */}
          <CallOverlay />
          {/* Auto-enable push notifications dès que l'user arrive sur l'app
              (déclenche la popup native du navigateur si pas encore demandé). */}
          <AutoEnablePushPrompt />
        </div>
        </CallProvider>
        </CryptoProvider>
        </VideoPlayerProvider>
      </ConfirmProvider>
    </CreatorProvider>
  );
}
