"use client";

import {
  Bookmark,
  Briefcase,
  Building2,
  Calendar,
  ChevronDown,
  ChevronUp,
  Clock,
  Compass,
  Flag,
  GraduationCap,
  Map as MapIcon,
  Megaphone,
  MessageCircle,
  Network,
  Settings,
  Sparkles,
  Store,
  Tag,
  Users,
  Wallet,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { Avatar } from "@/components/ui/Avatar";
import { cn } from "@/lib/utils/cn";

/* LeftSidebar — visible UNIQUEMENT desktop ≥ xl (1280px). Largeur 320px,
 * fixed left-0 top-14 (sous TopBar), height calc(100vh - 56px), scroll
 * indépendant.
 *
 * Pattern Facebook : nav primaire dans la TopBar (étape 2), sidebar
 * gauche = raccourcis SECONDAIRES (Voir plus, Tes cercles épinglés,
 * footer liens fins).
 *
 * Items :
 *  - User (avatar + nom)
 *  - Sections principales déjà visibles dans la TopBar mais accessibles ici
 *    aussi (cohérence FB qui répète Home/Friends/Watch/Marketplace dans la
 *    sidebar gauche)
 *  - Bouton "Voir plus" qui révèle Wallet/Mentors/Skills/etc.
 *  - Section "Tes cercles" épinglés
 *  - Footer liens
 *
 * État ACTIF : background navy + texte/icône gold (signature DIVARC,
 * différent du FB qui met juste un rond bleu).
 */

type NavItemDef = {
  href: string;
  label: string;
  icon: typeof Users;
  badge?: number;
};

const PRIMARY_ITEMS: NavItemDef[] = [
  { href: "/feed", label: "Accueil", icon: Compass },
  { href: "/friends", label: "Amis", icon: Users },
  { href: "/messages", label: "Discussions", icon: MessageCircle },
  { href: "/marketplace", label: "Marketplace", icon: Store },
  { href: "/jobs", label: "Emploi", icon: Briefcase },
  { href: "/notifications", label: "Notifications", icon: Bookmark },
];

const SECONDARY_ITEMS: NavItemDef[] = [
  { href: "/wallet", label: "Wallet", icon: Wallet },
  { href: "/mentors", label: "Mentors", icon: GraduationCap },
  { href: "/network", label: "Réseau pro", icon: Network },
  { href: "/skills", label: "Compétences", icon: Sparkles },
  { href: "/companies", label: "Entreprises", icon: Building2 },
  { href: "/map", label: "Carte", icon: MapIcon },
  { href: "/circles", label: "Cercles", icon: Tag },
  { href: "/profile/views", label: "Souvenirs", icon: Clock },
  { href: "/jobs/saved", label: "Enregistrements", icon: Bookmark },
  { href: "/circles/events", label: "Événements", icon: Calendar },
  { href: "/explore", label: "Pages que je suis", icon: Flag },
  { href: "/ads-manager", label: "Ads Manager", icon: Megaphone },
];

type LeftSidebarProps = {
  fullName: string | null;
  username: string | null;
  avatarUrl: string | null;
  /** Liste des cercles épinglés (max 6) à afficher dans la section "Tes cercles". */
  pinnedCircles?: Array<{
    id: string;
    slug: string | null;
    name: string;
    emoji: string | null;
  }>;
};

export function LeftSidebar({
  fullName,
  username,
  avatarUrl,
  pinnedCircles = [],
}: LeftSidebarProps) {
  const [showSecondary, setShowSecondary] = useState(false);
  const pathname = usePathname();

  return (
    <aside
      aria-label="Navigation secondaire"
      className="hidden xl:flex flex-col gap-1 px-2 py-3 h-full overflow-y-auto relative bg-gradient-to-b from-cream/80 via-white/60 to-white/60 backdrop-blur-md"
    >
      {/* Arc fin doré (signature DIVARC) — opacity douce, derrière le contenu.
          Restaure l'élément décoratif perdu lors de la refonte FB-style. */}
      <div
        aria-hidden
        className="absolute -bottom-16 -left-20 w-64 h-64 pointer-events-none opacity-30"
      >
        <svg viewBox="0 0 320 320" fill="none" className="w-full h-full">
          <circle
            cx="160"
            cy="160"
            r="120"
            stroke="#F4B942"
            strokeWidth="1.5"
            fill="none"
          />
          <circle
            cx="160"
            cy="160"
            r="80"
            stroke="#F4B942"
            strokeWidth="1"
            fill="none"
            opacity="0.6"
          />
          <circle cx="160" cy="40" r="3" fill="#F4B942" />
          <circle cx="40" cy="160" r="2.5" fill="#F4B942" opacity="0.8" />
        </svg>
      </div>

      {/* Item user */}
      <Link
        href={username ? `/u/${username}` : "/profile"}
        className={cn(
          "flex items-center gap-3 px-2 h-12 rounded-lg hover:bg-bg-soft transition-colors",
          pathname.startsWith("/profile") && "bg-night text-cream",
        )}
      >
        <Avatar src={avatarUrl} fullName={fullName} size="sm" />
        <span
          className={cn(
            "font-semibold text-[15px] truncate",
            pathname.startsWith("/profile") ? "text-cream" : "text-night",
          )}
        >
          {fullName ?? "Mon profil"}
        </span>
      </Link>

      <div className="h-px bg-line my-1.5" aria-hidden />

      {/* Sections principales */}
      <nav className="flex flex-col gap-0.5">
        {PRIMARY_ITEMS.map((item) => (
          <SidebarItem
            key={item.href}
            item={item}
            active={isActive(pathname, item.href)}
          />
        ))}

        {/* CTA Ads Manager — toujours visible, style proéminent gold. */}
        <Link
          href="/ads-manager"
          className={cn(
            "flex items-center gap-3 px-2 h-12 rounded-lg my-1 transition-colors group",
            pathname.startsWith("/ads-manager")
              ? "bg-night text-cream"
              : "bg-gold/15 hover:bg-gold/25 text-night",
          )}
        >
          <span
            className={cn(
              "w-9 h-9 rounded-full flex items-center justify-center shrink-0",
              pathname.startsWith("/ads-manager")
                ? "bg-cream/15 text-cream"
                : "bg-gold-deep text-cream",
            )}
          >
            <Megaphone className="w-[18px] h-[18px]" aria-hidden />
          </span>
          <span className="flex flex-col min-w-0">
            <span
              className={cn(
                "font-semibold text-[14px] truncate leading-tight",
                pathname.startsWith("/ads-manager")
                  ? "text-cream"
                  : "text-night",
              )}
            >
              Ads Manager
            </span>
            <span
              className={cn(
                "text-[10.5px] uppercase tracking-wider font-bold leading-tight",
                pathname.startsWith("/ads-manager")
                  ? "text-cream/70"
                  : "text-gold-deep",
              )}
            >
              · Créer une pub
            </span>
          </span>
        </Link>

        {/* Bouton Voir plus / Voir moins */}
        <button
          type="button"
          onClick={() => setShowSecondary((v) => !v)}
          aria-expanded={showSecondary}
          className="flex items-center gap-3 px-2 h-9 rounded-lg hover:bg-bg-soft text-[15px] text-night transition-colors"
        >
          <span className="w-9 h-9 rounded-full bg-bg-soft flex items-center justify-center">
            {showSecondary ? (
              <ChevronUp className="w-4 h-4 text-night" aria-hidden />
            ) : (
              <ChevronDown className="w-4 h-4 text-night" aria-hidden />
            )}
          </span>
          <span className="font-medium">
            {showSecondary ? "Voir moins" : "Voir plus"}
          </span>
        </button>

        {showSecondary
          ? SECONDARY_ITEMS.map((item) => (
              <SidebarItem
                key={item.href}
                item={item}
                active={isActive(pathname, item.href)}
              />
            ))
          : null}
      </nav>

      {pinnedCircles.length > 0 ? (
        <>
          <div className="h-px bg-line my-2" aria-hidden />
          <section>
            <header className="flex items-center justify-between px-2 mb-1.5">
              <h3 className="text-[12px] font-extrabold uppercase tracking-[0.16em] text-muted">
                Tes cercles
              </h3>
              <Link
                href="/circles"
                aria-label="Gérer les cercles"
                className="w-8 h-8 rounded-full hover:bg-bg-soft flex items-center justify-center text-night-dim hover:text-night"
              >
                <Settings className="w-3.5 h-3.5" aria-hidden />
              </Link>
            </header>
            <ul className="flex flex-col gap-0.5">
              {pinnedCircles.slice(0, 6).map((circle) => (
                <li key={circle.id}>
                  <Link
                    href={circle.slug ? `/circles/${circle.slug}` : "/circles"}
                    className="flex items-center gap-3 px-2 h-9 rounded-lg hover:bg-bg-soft transition-colors"
                  >
                    <span
                      aria-hidden
                      className="w-7 h-7 rounded-md bg-gold/15 text-gold-deep flex items-center justify-center text-sm font-bold"
                    >
                      {circle.emoji ?? circle.name.charAt(0)}
                    </span>
                    <span className="text-[14px] text-night truncate">
                      {circle.name}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
            <Link
              href="/circles"
              className="block mt-1 px-2 py-1.5 rounded-lg hover:bg-bg-soft text-[13px] text-night-dim hover:text-night transition-colors"
            >
              Voir tous tes cercles
            </Link>
          </section>
        </>
      ) : null}

      {/* Footer sticky bottom : liens fins */}
      <div className="mt-auto pt-4 px-2">
        <p className="text-[11px] text-muted leading-[1.6]">
          <FooterLink href="/legal/privacy">Confidentialité</FooterLink>
          {" · "}
          <FooterLink href="/legal/terms">CGU</FooterLink>
          {" · "}
          <FooterLink href="/legal/cookies">Cookies</FooterLink>
          {" · "}
          DIVARC © 2026
        </p>
      </div>
    </aside>
  );
}

function SidebarItem({
  item,
  active,
}: {
  item: NavItemDef;
  active: boolean;
}) {
  const Icon = item.icon;
  return (
    <Link
      href={item.href}
      aria-current={active ? "page" : undefined}
      className={cn(
        "flex items-center gap-3 px-2 h-9 rounded-lg transition-colors text-[15px]",
        active
          ? "bg-night text-cream"
          : "text-night hover:bg-bg-soft",
      )}
    >
      <Icon
        className={cn("w-5 h-5 shrink-0", active ? "text-gold" : "text-night")}
        strokeWidth={active ? 2.4 : 2}
        aria-hidden
      />
      <span className={cn("font-medium truncate", active && "font-semibold")}>
        {item.label}
      </span>
      {item.badge && item.badge > 0 ? (
        <span
          aria-hidden
          className="ml-auto min-w-[20px] h-[20px] px-1.5 rounded-full bg-gold text-night text-[11px] font-bold flex items-center justify-center"
        >
          {item.badge > 9 ? "9+" : item.badge}
        </span>
      ) : null}
    </Link>
  );
}

function FooterLink({
  href,
  children,
}: {
  href: string;
  children: React.ReactNode;
}) {
  return (
    <Link href={href} className="hover:underline hover:text-night-dim">
      {children}
    </Link>
  );
}

function isActive(pathname: string, href: string): boolean {
  if (href === "/feed") {
    return pathname === "/feed" || pathname === "/";
  }
  return pathname === href || pathname.startsWith(href + "/");
}
