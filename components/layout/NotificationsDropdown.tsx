"use client";

import { Bell, CheckCheck, Settings } from "lucide-react";
import Link from "next/link";
import { Avatar } from "@/components/ui/Avatar";
import { formatRelative } from "@/lib/utils/relativeTime";
import { cn } from "@/lib/utils/cn";
import type { NotificationWithActor } from "@/lib/database.types";
import { HeaderDropdown } from "./HeaderDropdown";

/* NotificationsDropdown — depuis le bouton Bell dans la TopBar desktop.
 *
 * Affiche les 5 dernières notifications + lien "Voir toutes". Les data
 * sont fetched côté serveur dans le layout et passées en prop. Pour
 * rafraîchir au scroll/click, on s'appuie sur revalidatePath des actions.
 *
 * Mobile linke directement vers /notifications (le dropdown est trop
 * étroit en mobile). */

type Props = {
  unreadCount: number;
  notifications: NotificationWithActor[];
};

export function NotificationsDropdown({ unreadCount, notifications }: Props) {
  const top5 = notifications.slice(0, 5);

  return (
    <HeaderDropdown
      width={380}
      align="end"
      renderTrigger={({ ref, open, triggerProps }) => (
        <button
          ref={ref as React.Ref<HTMLButtonElement>}
          type="button"
          {...triggerProps}
          aria-label={
            unreadCount > 0
              ? `Notifications — ${unreadCount} non-lue${unreadCount > 1 ? "s" : ""}`
              : "Notifications"
          }
          className={cn(
            "relative w-10 h-10 rounded-full transition-colors flex items-center justify-center",
            open ? "bg-cream text-night" : "bg-bg-soft hover:bg-cream text-night",
          )}
        >
          <Bell className="w-5 h-5" strokeWidth={2} aria-hidden />
          {unreadCount > 0 ? (
            <span
              aria-hidden
              className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] px-1 rounded-full bg-gold text-night text-[11px] font-bold flex items-center justify-center"
            >
              {unreadCount > 9 ? "9+" : unreadCount}
            </span>
          ) : null}
        </button>
      )}
    >
      {({ close }) => (
        <div className="flex flex-col">
          <header className="flex items-center justify-between p-4 pb-3">
            <h2 className="font-display italic text-xl text-night">
              Notifications
            </h2>
            <Link
              href="/settings"
              onClick={close}
              aria-label="Paramètres notifications"
              className="w-8 h-8 rounded-full hover:bg-bg-soft text-night-dim hover:text-night flex items-center justify-center"
            >
              <Settings className="w-4 h-4" aria-hidden />
            </Link>
          </header>

          {top5.length === 0 ? (
            <div className="px-4 py-12 text-center">
              <Bell className="w-8 h-8 mx-auto text-night-dim mb-2" aria-hidden />
              <p className="text-sm text-muted">Tu es à jour.</p>
            </div>
          ) : (
            <ul className="overflow-y-auto max-h-[420px]">
              {top5.map((notif) => (
                <li key={notif.id}>
                  <Link
                    href={notif.href ?? "/notifications"}
                    onClick={close}
                    className={cn(
                      "flex items-start gap-3 px-3 py-2.5 rounded-xl mx-2 transition-colors hover:bg-bg-soft",
                      !notif.read_at && "bg-gold/5",
                    )}
                  >
                    <Avatar
                      src={notif.actor?.avatar_url ?? null}
                      fullName={
                        notif.actor?.full_name ?? notif.actor?.username ?? null
                      }
                      size="md"
                    />
                    <div className="flex-1 min-w-0">
                      <p className="text-[13px] text-night leading-snug line-clamp-2">
                        {notif.actor ? (
                          <span className="font-semibold">
                            {notif.actor.full_name ?? notif.actor.username}{" "}
                          </span>
                        ) : null}
                        <span className="text-night-soft">{notif.title}</span>
                      </p>
                      {notif.body ? (
                        <p className="text-[12px] text-night-dim truncate mt-0.5">
                          {notif.body}
                        </p>
                      ) : null}
                      <p className="text-[11px] text-muted mt-0.5">
                        {formatRelative(notif.created_at)}
                      </p>
                    </div>
                    {!notif.read_at ? (
                      <span
                        aria-hidden
                        className="shrink-0 w-2.5 h-2.5 rounded-full bg-gold mt-1.5"
                      />
                    ) : null}
                  </Link>
                </li>
              ))}
            </ul>
          )}

          <footer className="border-t border-line p-2">
            <Link
              href="/notifications"
              onClick={close}
              className="flex items-center justify-center gap-1.5 h-10 rounded-lg text-[13px] font-bold text-night hover:bg-bg-soft transition-colors"
            >
              <CheckCheck className="w-4 h-4" aria-hidden />
              Voir toutes les notifications
            </Link>
          </footer>
        </div>
      )}
    </HeaderDropdown>
  );
}
