"use client";

import {
  Briefcase,
  Building2,
  Calendar,
  Compass,
  GraduationCap,
  HelpCircle,
  Lock,
  LogOut,
  Map as MapIcon,
  MessageCircle,
  Network,
  Search,
  Settings,
  Sparkles,
  Store,
  Users,
  Wallet,
  X,
} from "lucide-react";
import Link from "next/link";
import { useEffect } from "react";
import { Avatar } from "@/components/ui/Avatar";
import { useBodyScrollLock } from "@/lib/hooks/useBodyScrollLock";
import { cn } from "@/lib/utils/cn";

/* MobileMenuSheet — bottom sheet plein écran ouvert depuis l'onglet
 * "Menu" du BottomNav. Style FB Mobile : header sticky avec recherche,
 * grille de raccourcis 4 colonnes, section cercles, paramètres, footer
 * déconnexion.
 *
 * Slide depuis le bas (motion via translateY transition CSS, pas besoin
 * de motion lib pour ce cas simple).
 *
 * Couleurs DIVARC : pas de bleu FB, indicateurs gold pour les badges. */

type Shortcut = {
  href: string;
  label: string;
  icon: typeof Store;
};

const SHORTCUTS: Shortcut[] = [
  { href: "/messages", label: "Discussions", icon: MessageCircle },
  { href: "/marketplace", label: "Marketplace", icon: Store },
  { href: "/jobs", label: "Emploi", icon: Briefcase },
  { href: "/wallet", label: "Wallet", icon: Wallet },
  { href: "/mentors", label: "Mentors", icon: GraduationCap },
  { href: "/skills", label: "Compétences", icon: Sparkles },
  { href: "/companies", label: "Entreprises", icon: Building2 },
  { href: "/map", label: "Carte", icon: MapIcon },
  { href: "/circles", label: "Cercles", icon: Users },
  { href: "/explore", label: "Découvrir", icon: Compass },
  { href: "/network", label: "Réseau pro", icon: Network },
  { href: "/calendar", label: "Événements", icon: Calendar },
];

type MobileMenuSheetProps = {
  open: boolean;
  onClose: () => void;
  fullName: string | null;
  username: string | null;
  avatarUrl: string | null;
  unreadMessages: number;
};

export function MobileMenuSheet({
  open,
  onClose,
  fullName,
  username,
  avatarUrl,
  unreadMessages,
}: MobileMenuSheetProps) {
  useBodyScrollLock(open);

  /* Escape ferme le sheet. */
  useEffect(() => {
    if (!open) return;
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Menu"
      className="lg:hidden fixed inset-0 z-50 bg-night/40 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className={cn(
          "absolute inset-x-0 bottom-0 top-12 bg-bg rounded-t-3xl shadow-[0_-30px_80px_-30px_rgba(10,31,68,0.5)] flex flex-col overflow-hidden",
        )}
      >
        {/* Drag handle */}
        <div
          aria-hidden
          className="mx-auto mt-2.5 mb-1 w-10 h-1 rounded-full bg-night/15 shrink-0"
        />

        {/* Header sticky : Search + close */}
        <header className="flex items-center gap-2 px-4 pt-3 pb-3 shrink-0 border-b border-line">
          <div className="flex-1 flex items-center gap-2 h-10 px-4 rounded-full bg-bg-soft">
            <Search className="w-4 h-4 text-muted" aria-hidden />
            <Link
              href="/search"
              onClick={onClose}
              className="flex-1 text-sm text-muted"
            >
              Rechercher sur DIVARC
            </Link>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Fermer le menu"
            className="w-10 h-10 rounded-full bg-bg-soft hover:bg-cream text-night flex items-center justify-center"
          >
            <X className="w-4 h-4" aria-hidden />
          </button>
        </header>

        <div className="flex-1 min-h-0 overflow-y-auto pb-[max(env(safe-area-inset-bottom,0px),16px)]">
          {/* Profile card */}
          <Link
            href={username ? `/u/${username}` : "/profile"}
            onClick={onClose}
            className="flex items-center gap-3 px-4 py-3 hover:bg-bg-soft transition-colors"
          >
            <Avatar src={avatarUrl} fullName={fullName} size="md-bold" />
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-night truncate">
                {fullName ?? "Mon profil"}
              </p>
              <p className="text-xs text-muted truncate">
                Voir mon profil DIVARC
              </p>
            </div>
          </Link>

          <div className="h-px bg-line mx-4" aria-hidden />

          {/* Section "Raccourcis" : grille 4 colonnes */}
          <section className="px-4 py-4">
            <h2 className="text-[11px] font-extrabold uppercase tracking-[0.16em] text-muted mb-3 flex items-center gap-1.5">
              <span className="text-gold-deep">·</span>
              Raccourcis
            </h2>
            <div className="grid grid-cols-4 gap-2">
              {SHORTCUTS.map((s) => {
                const Icon = s.icon;
                const showBadge =
                  s.href === "/messages" && unreadMessages > 0;
                return (
                  <Link
                    key={s.href}
                    href={s.href}
                    onClick={onClose}
                    className="flex flex-col items-center gap-1.5 p-2 rounded-xl hover:bg-bg-soft transition-colors"
                  >
                    <span
                      aria-hidden
                      className="relative w-12 h-12 rounded-2xl bg-cream text-night flex items-center justify-center"
                    >
                      <Icon className="w-5 h-5 text-night" strokeWidth={2} aria-hidden />
                      {showBadge ? (
                        <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 rounded-full bg-gold text-night text-[10px] font-bold flex items-center justify-center">
                          {unreadMessages > 9 ? "9+" : unreadMessages}
                        </span>
                      ) : null}
                    </span>
                    <span className="text-[11px] font-medium text-night text-center leading-tight">
                      {s.label}
                    </span>
                  </Link>
                );
              })}
            </div>
          </section>

          <div className="h-px bg-line mx-4" aria-hidden />

          {/* Section "Aide & Paramètres" */}
          <nav className="px-2 py-3">
            <SheetItem
              href="/settings"
              label="Paramètres"
              icon={Settings}
              onClose={onClose}
            />
            <SheetItem
              href="/profile?tab=preferences"
              label="Confidentialité"
              icon={Lock}
              onClose={onClose}
            />
            <SheetItem
              href="/help"
              label="Aide & support"
              icon={HelpCircle}
              onClose={onClose}
            />
          </nav>

          {/* Footer logout */}
          <div className="px-4 py-3 border-t border-line">
            <form action="/api/auth/logout" method="POST">
              <button
                type="submit"
                className="w-full flex items-center gap-3 h-12 px-3 rounded-xl text-red-600 hover:bg-red-50 transition-colors"
              >
                <LogOut className="w-5 h-5" aria-hidden />
                <span className="text-sm font-semibold">Se déconnecter</span>
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}

function SheetItem({
  href,
  label,
  icon: Icon,
  onClose,
}: {
  href: string;
  label: string;
  icon: typeof Settings;
  onClose: () => void;
}) {
  return (
    <Link
      href={href}
      onClick={onClose}
      className="flex items-center gap-3 h-12 px-3 rounded-xl hover:bg-bg-soft text-night text-[15px] font-medium transition-colors"
    >
      <Icon className="w-5 h-5 text-night-dim" strokeWidth={2} aria-hidden />
      {label}
    </Link>
  );
}
