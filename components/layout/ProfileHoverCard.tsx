"use client";

import * as HoverCardPrimitive from "@radix-ui/react-hover-card";
import Link from "next/link";
import { Avatar } from "@/components/ui/Avatar";
import { ArcDeco } from "@/components/marketing/ArcDeco";

/* ProfileHoverCard — au survol d'un avatar (desktop ≥ md), affiche une
 * carte aperçu du profil. Pattern Facebook moderne.
 *
 * Stack : @radix-ui/react-hover-card pour gérer le timing (200ms open,
 * 100ms close) + le focus ring a11y + le portail.
 *
 * Couleurs DIVARC : gradient cover navy → gold, CTA gold avec texte navy. */

type Props = {
  /** Le trigger (typiquement un Avatar wrappé dans un Link). */
  children: React.ReactNode;
  username: string | null;
  fullName: string | null;
  avatarUrl: string | null;
  bio?: string | null;
  /** Stats à afficher (followers, friends, posts...). */
  stats?: { label: string; value: string | number }[];
};

export function ProfileHoverCard({
  children,
  username,
  fullName,
  avatarUrl,
  bio,
  stats = [],
}: Props) {
  if (!username) {
    return <>{children}</>;
  }

  const profileUrl = `/u/${username}`;

  return (
    <HoverCardPrimitive.Root openDelay={200} closeDelay={100}>
      <HoverCardPrimitive.Trigger asChild>{children}</HoverCardPrimitive.Trigger>
      <HoverCardPrimitive.Portal>
        <HoverCardPrimitive.Content
          align="start"
          sideOffset={8}
          className="z-50 w-72 rounded-2xl bg-surface border border-line shadow-[0_24px_60px_-20px_rgba(10,31,68,0.45)] overflow-hidden data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95"
        >
          {/* Cover gradient navy → gold + ArcDeco signature */}
          <div className="relative h-20 bg-gradient-to-br from-night via-night-soft to-gold-deep overflow-hidden">
            <div
              aria-hidden
              className="absolute -right-8 -top-8 opacity-40 pointer-events-none"
            >
              <ArcDeco size={120} tone="gold" opacity={1} stroke={1} />
            </div>
          </div>

          <div className="px-4 -mt-8 pb-4">
            <Avatar
              src={avatarUrl}
              fullName={fullName}
              size="lg"
              className="ring-4 ring-surface"
            />
            <div className="mt-2.5">
              <Link
                href={profileUrl}
                className="font-semibold text-night hover:underline truncate block"
              >
                {fullName ?? `@${username}`}
              </Link>
              <p className="text-xs text-muted truncate">@{username}</p>
            </div>

            {bio ? (
              <p className="mt-2 text-[13px] text-night-soft leading-snug line-clamp-3">
                {bio}
              </p>
            ) : null}

            {stats.length > 0 ? (
              <div className="mt-3 flex gap-4">
                {stats.map((s) => (
                  <div key={s.label}>
                    <p className="text-[15px] font-bold text-night leading-none">
                      {s.value}
                    </p>
                    <p className="text-[10px] uppercase tracking-wider text-muted mt-0.5">
                      {s.label}
                    </p>
                  </div>
                ))}
              </div>
            ) : null}

            <Link
              href={profileUrl}
              className="mt-3 block w-full text-center px-4 h-9 leading-9 rounded-full bg-gold text-night text-[13px] font-bold hover:bg-gold-soft transition-colors"
            >
              Voir le profil
            </Link>
          </div>
        </HoverCardPrimitive.Content>
      </HoverCardPrimitive.Portal>
    </HoverCardPrimitive.Root>
  );
}
