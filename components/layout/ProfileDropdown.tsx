"use client";

import {
  HelpCircle,
  LogOut,
  Moon,
  Settings,
  Shield,
  User,
} from "lucide-react";
import Link from "next/link";
import { Avatar } from "@/components/ui/Avatar";
import { Bell } from "lucide-react";
import { HeaderDropdown } from "./HeaderDropdown";

/* ProfileDropdown — dropdown depuis l'avatar dans la TopBar desktop.
 * Pattern Facebook : grand avatar + nom + lien profil + actions
 * (Paramètres, Confidentialité, Aide, Mode sombre, Déconnexion).
 *
 * Mounted dans la TopBar desktop uniquement. Mobile linke vers /profile
 * directement (le dropdown est trop étroit en mobile). */

type ProfileDropdownProps = {
  fullName: string | null;
  username: string | null;
  avatarUrl: string | null;
};

export function ProfileDropdown({
  fullName,
  username,
  avatarUrl,
}: ProfileDropdownProps) {
  return (
    <HeaderDropdown
      width={320}
      align="end"
      renderTrigger={({ ref, open, triggerProps }) => (
        <button
          ref={ref as React.Ref<HTMLButtonElement>}
          type="button"
          {...triggerProps}
          aria-label={open ? "Fermer le menu profil" : "Ouvrir le menu profil"}
          className="ml-1 shrink-0 rounded-full ring-2 ring-transparent hover:ring-gold/30 transition-all"
        >
          <Avatar src={avatarUrl} fullName={fullName} size="sm" />
        </button>
      )}
    >
      {({ close }) => (
        <div className="overflow-hidden">
          <Link
            href={username ? `/u/${username}` : "/profile"}
            onClick={close}
            className="flex items-center gap-3 p-3 hover:bg-bg-soft transition-colors"
          >
            <Avatar src={avatarUrl} fullName={fullName} size="md" />
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-night truncate">
                {fullName ?? "Mon profil"}
              </p>
              <p className="text-xs text-muted truncate">
                Voir mon profil DIVARC
              </p>
            </div>
          </Link>

          <div className="h-px bg-line" aria-hidden />

          <nav className="py-1">
            <DropdownItem
              href="/notifications"
              icon={Bell}
              onClose={close}
              label="Notifications"
            />
            <DropdownItem
              href="/settings"
              icon={Settings}
              onClose={close}
              label="Paramètres"
            />
            <DropdownItem
              href="/profile?tab=preferences"
              icon={Shield}
              onClose={close}
              label="Confidentialité"
            />
            <DropdownItem
              href="/help"
              icon={HelpCircle}
              onClose={close}
              label="Aide & support"
            />
            <DropdownItem
              href="/settings#theme"
              icon={Moon}
              onClose={close}
              label="Mode sombre"
            />
          </nav>

          <div className="h-px bg-line" aria-hidden />

          <form action="/api/auth/logout" method="POST" className="p-2">
            <button
              type="submit"
              className="w-full flex items-center gap-3 h-10 px-3 rounded-lg text-red-600 hover:bg-red-50 transition-colors text-[14px] font-semibold"
            >
              <LogOut className="w-4 h-4" aria-hidden />
              Se déconnecter
            </button>
          </form>
        </div>
      )}
    </HeaderDropdown>
  );
}

function DropdownItem({
  href,
  icon: Icon,
  label,
  onClose,
}: {
  href: string;
  icon: typeof User;
  label: string;
  onClose: () => void;
}) {
  return (
    <Link
      href={href}
      onClick={onClose}
      className="flex items-center gap-3 mx-2 px-3 h-10 rounded-lg hover:bg-bg-soft text-[14px] text-night font-medium transition-colors"
    >
      <Icon className="w-4 h-4 text-night-dim" aria-hidden strokeWidth={2} />
      {label}
    </Link>
  );
}
