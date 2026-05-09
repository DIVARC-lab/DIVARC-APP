import Link from "next/link";
import { redirect } from "next/navigation";
import {
  Bell,
  Briefcase,
  Building2,
  Compass,
  GraduationCap,
  Home,
  Map as MapIcon,
  MessageSquareText,
  Network,
  Search,
  Sparkles,
  Sparkle,
  ShoppingBag,
  User,
  Users,
  Users2,
  Wallet,
} from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getCurrentProfile } from "@/lib/queries/profile";
import { getTotalUnreadCount } from "@/lib/queries/conversations";
import { countIncomingRequests } from "@/lib/queries/friendships";
import { countUnreadNotifications } from "@/lib/queries/notifications";
import { MobileBottomNav } from "@/components/MobileBottomNav";
import { NotificationsRealtime } from "@/components/NotificationsRealtime";
import { PresenceHeartbeat } from "@/components/PresenceHeartbeat";
import { GlobalSearch } from "@/components/GlobalSearch";
import { ThemeProvider } from "@/components/ThemeProvider";
import { CreatorModalHost } from "@/components/creator/CreatorModalHost";
import { CreatorProvider } from "@/components/creator/CreatorProvider";
import { ConfirmProvider } from "@/components/ui/ConfirmDialog";
import { Logo } from "@/components/Logo";
import { SidebarNavLink } from "@/components/SidebarNavLink";
import { Avatar } from "@/components/ui/Avatar";
import { LogoutButton } from "@/components/auth/LogoutButton";

type NavItem = {
  href: string;
  label: string;
  icon: typeof Home;
  available: boolean;
  badge?: number;
};

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const profile = await getCurrentProfile();
  if (profile && !profile.onboarded_at) {
    redirect("/welcome");
  }

  const fullName =
    profile?.full_name ?? (user.email?.split("@")[0] ?? "");
  const [unread, incomingRequests, unreadNotifications] = await Promise.all([
    getTotalUnreadCount(user.id),
    countIncomingRequests(user.id),
    countUnreadNotifications(user.id),
  ]);

  /* Sidebar handoff Sage : 10 items max curés. Les routes non listées
     restent accessibles mais ne sont pas dans la nav principale —
     accessible via /search, /settings, ou liens contextuels. */
  const navItems: ReadonlyArray<NavItem> = [
    { href: "/dashboard", label: "Accueil", icon: Home, available: true },
    { href: "/profile", label: "Profil", icon: User, available: true },
    {
      href: "/notifications",
      label: "Notifications",
      icon: Bell,
      available: true,
      badge: unreadNotifications > 0 ? unreadNotifications : undefined,
    },
    {
      href: "/friends",
      label: "Amis",
      icon: Users,
      available: true,
      badge: incomingRequests > 0 ? incomingRequests : undefined,
    },
    {
      href: "/messages",
      label: "Discussions",
      icon: MessageSquareText,
      available: true,
      badge: unread > 0 ? unread : undefined,
    },
    {
      href: "/feed",
      label: "Feed",
      icon: Sparkle,
      available: true,
    },
    {
      href: "/marketplace",
      label: "Marché",
      icon: ShoppingBag,
      available: true,
    },
    {
      href: "/jobs",
      label: "Emploi",
      icon: Briefcase,
      available: true,
    },
    {
      href: "/wallet",
      label: "Wallet",
      icon: Wallet,
      available: true,
    },
    {
      href: "/explore",
      label: "Découvrir",
      icon: Compass,
      available: true,
    },
  ];

  /* Liens secondaires : Cercles / Carte / Mentors / Compétences /
     Entreprises / Réseau pro restent dans /search et liens contextuels. */

  return (
    <CreatorProvider>
    <ConfirmProvider>
    <div className="min-h-screen lg:grid lg:grid-cols-[260px_1fr]">
      <aside className="hidden lg:flex flex-col border-r border-line bg-gradient-to-b from-cream/80 via-white/60 to-white/60 backdrop-blur-md sticky top-0 h-screen relative overflow-hidden">
        {/* Arc fin doré (signature) — opacity douce */}
        <div
          aria-hidden
          className="absolute -bottom-16 -left-20 w-64 h-64 pointer-events-none opacity-30"
        >
          <svg viewBox="0 0 320 320" fill="none" className="w-full h-full">
            <circle
              cx="160"
              cy="160"
              r="130"
              stroke="#C8A14A"
              strokeWidth="1.5"
              fill="none"
              strokeDasharray="700 100"
              strokeDashoffset="-180"
            />
            <circle cx="55" cy="225" r="4" fill="#C8A14A" />
          </svg>
        </div>
        {/* Arc plus épais navy/foncé qui croise le doré (proto pied de page) */}
        <div
          aria-hidden
          className="absolute -bottom-24 -left-32 w-80 h-80 pointer-events-none opacity-20"
        >
          <svg viewBox="0 0 320 320" fill="none" className="w-full h-full">
            <circle
              cx="170"
              cy="170"
              r="155"
              stroke="#4B5B87"
              strokeWidth="3.5"
              fill="none"
              strokeDasharray="540 280"
              strokeDashoffset="-220"
            />
          </svg>
        </div>
        <div className="px-6 py-5 border-b border-line space-y-3 relative">
          <Link href="/dashboard" className="flex items-center gap-3">
            <Logo size={36} />
            <span className="font-display text-2xl text-night">DIVARC</span>
          </Link>
          <GlobalSearch />
        </div>

        <nav className="flex-1 min-h-0 overflow-y-auto px-3 py-6 space-y-0.5" aria-label="Navigation principale">
          {navItems.map((item) => {
            const Icon = item.icon;
            return (
              <SidebarNavLink
                key={item.label}
                href={item.available ? item.href : "#"}
                ariaDisabled={!item.available}
                baseClass="group flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors"
                activeClass={
                  item.available
                    ? "bg-night text-cream shadow-[0_8px_22px_-12px_rgba(10,31,68,0.45)]"
                    : "text-muted/70 cursor-default"
                }
                inactiveClass={
                  item.available
                    ? "text-night-muted hover:bg-night/5 hover:text-night"
                    : "text-muted/70 cursor-default"
                }
              >
                <Icon className="w-4 h-4 shrink-0" aria-hidden />
                <span className="flex-1">{item.label}</span>
                {item.badge ? (
                  <span className="min-w-5 h-5 px-1.5 rounded-full text-[10px] font-bold flex items-center justify-center bg-night text-cream group-data-[active=true]:bg-gold group-data-[active=true]:text-night">
                    {item.badge}
                  </span>
                ) : null}
                {!item.available ? (
                  <span className="text-[10px] font-semibold uppercase tracking-wider px-1.5 py-0.5 rounded-md bg-gold/15 text-gold-deep">
                    Bientôt
                  </span>
                ) : null}
              </SidebarNavLink>
            );
          })}

          {/* Liens secondaires (Cercles, Carte, etc.) — discrets, séparés
              par un divider, pour respecter la curation handoff sage. */}
          <div className="my-3 mx-3 border-t border-line" aria-hidden />
          {[
            { href: "/circles", label: "Cercles", icon: Users2 },
            { href: "/map", label: "Carte", icon: MapIcon },
            { href: "/mentors", label: "Mentors", icon: GraduationCap },
            { href: "/network", label: "Réseau pro", icon: Network },
            { href: "/skills", label: "Compétences", icon: Sparkles },
            { href: "/companies", label: "Entreprises", icon: Building2 },
          ].map((it) => {
            const Icon = it.icon;
            return (
              <SidebarNavLink
                key={it.href}
                href={it.href}
                baseClass="group flex items-center gap-3 px-3 py-2 rounded-xl text-xs font-medium transition-colors"
                activeClass="bg-night text-cream"
                inactiveClass="text-muted hover:bg-night/5 hover:text-night-muted"
              >
                <Icon className="w-3.5 h-3.5 shrink-0" aria-hidden />
                <span className="flex-1">{it.label}</span>
              </SidebarNavLink>
            );
          })}
        </nav>

        <div className="p-3 border-t border-line">
          <Link
            href="/profile"
            className="flex items-center gap-3 p-2.5 rounded-xl hover:bg-night/5 transition-colors"
          >
            <Avatar
              src={profile?.avatar_url ?? null}
              fullName={fullName}
              size="md"
            />
            <div className="flex-1 min-w-0 leading-tight">
              <p className="text-sm font-semibold text-night truncate">
                {fullName}
              </p>
              <p className="text-xs text-muted truncate">
                {profile?.username ? `@${profile.username}` : user.email}
              </p>
            </div>
          </Link>
          <div className="mt-2 px-1">
            <LogoutButton />
          </div>
        </div>
      </aside>

      <div className="flex flex-col">
        {/* Header mobile — refonte audit S4 (handoff feed-mobile-bold L12-22) :
            - Logo 32 + label "DIVARC" Instrument Serif 24px tracking [-0.01em]
              (au lieu de Geist 17 font-extrabold)
            - Right : Search button blanc/border + Bell button navy/cream avec
              badge gold dot 9x9 r-[5px] (proto pattern) */}
        <header className="lg:hidden sticky top-0 z-30 h-14 px-4 border-b border-line bg-white/95 backdrop-blur-xl flex items-center gap-2.5">
          <Link
            href="/dashboard"
            className="flex items-center gap-2.5"
            aria-label="Accueil DIVARC"
          >
            <Logo size={32} />
            <span className="font-display text-[24px] text-night leading-none tracking-[-0.01em]">
              DIVARC
            </span>
          </Link>
          <div className="ml-auto flex items-center gap-2">
            <Link
              href="/search"
              aria-label="Rechercher"
              className="flex h-[38px] w-[38px] items-center justify-center rounded-[19px] bg-white border border-night/[0.06] shadow-[0_1px_2px_rgba(10,31,68,0.04)] text-night hover:border-night/15 transition-colors"
            >
              <Search className="w-4 h-4" aria-hidden />
            </Link>
            <Link
              href="/notifications"
              aria-label={
                unreadNotifications > 0
                  ? `Notifications (${unreadNotifications} non lue${unreadNotifications > 1 ? "s" : ""})`
                  : "Notifications"
              }
              className="relative flex h-[38px] w-[38px] items-center justify-center rounded-[19px] bg-night text-cream hover:bg-night-soft transition-colors"
            >
              <Bell className="w-4 h-4" aria-hidden />
              {unreadNotifications > 0 ? (
                <span
                  aria-hidden
                  className="absolute top-1.5 right-1.5 w-[9px] h-[9px] rounded-full bg-gold border-[1.5px] border-night"
                />
              ) : null}
            </Link>
          </div>
        </header>

        <div className="flex items-center gap-2 px-6 py-2.5 border-b border-line bg-gradient-to-r from-cream via-cream/40 to-transparent">
          <Sparkles className="w-3.5 h-3.5 text-gold-deep" aria-hidden />
          <p className="text-xs font-medium text-night-muted">
            <span className="font-bold text-night">Beta privée</span> · Tu fais
            partie des fondateurs. Badge permanent.
          </p>
        </div>

        <main className="flex-1 pb-20 lg:pb-0">{children}</main>
      </div>
      <MobileBottomNav />
      <NotificationsRealtime userId={user.id} />
      <PresenceHeartbeat />
      <ThemeProvider initialTheme={profile?.theme ?? "system"} />
      <CreatorModalHost />
    </div>
    </ConfirmProvider>
    </CreatorProvider>
  );
}
