"use client";

import {
  Bell,
  Check,
  MessageSquareText,
  Trash2,
  UserPlus,
  X,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { toast } from "sonner";
import { Avatar } from "@/components/ui/Avatar";
import type {
  NotificationType,
  NotificationWithActor,
} from "@/lib/database.types";
import { formatRelative } from "@/lib/utils/relativeTime";
import {
  deleteNotification,
  markNotificationRead,
} from "../actions";

const TYPE_ICONS: Record<
  NotificationType,
  { icon: typeof Bell; bg: string; color: string }
> = {
  friend_request_received: {
    icon: UserPlus,
    bg: "bg-gold/15",
    color: "text-gold-deep",
  },
  friend_request_accepted: {
    icon: Check,
    bg: "bg-emerald-50",
    color: "text-emerald-700",
  },
  friend_request_rejected: {
    icon: X,
    bg: "bg-red-50",
    color: "text-red-600",
  },
  new_message: {
    icon: MessageSquareText,
    bg: "bg-night/10",
    color: "text-night",
  },
  system: {
    icon: Bell,
    bg: "bg-cream",
    color: "text-night",
  },
};

type NotificationItemProps = {
  notification: NotificationWithActor;
};

export function NotificationItem({ notification }: NotificationItemProps) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const meta = TYPE_ICONS[notification.type];
  const Icon = meta.icon;
  const isRead = notification.read_at !== null;

  function handleClick(event: React.MouseEvent<HTMLAnchorElement>) {
    if (!notification.href) {
      event.preventDefault();
      return;
    }
    if (!isRead) {
      void markNotificationRead(notification.id);
    }
  }

  function handleDelete(event: React.MouseEvent) {
    event.preventDefault();
    event.stopPropagation();
    startTransition(async () => {
      const result = await deleteNotification(notification.id);
      if (result.ok) {
        toast.success("Notification supprimée.");
        router.refresh();
      }
    });
  }

  function handleMarkRead(event: React.MouseEvent) {
    event.preventDefault();
    event.stopPropagation();
    startTransition(async () => {
      await markNotificationRead(notification.id);
      router.refresh();
    });
  }

  const className = `group block p-4 sm:p-5 rounded-3xl border transition-all ${
    isRead
      ? "bg-white border-line"
      : "bg-gradient-to-br from-cream/40 to-bg border-gold/30 shadow-soft"
  } ${notification.href ? "hover:border-night/30 hover:shadow-soft cursor-pointer" : ""}`;

  const inner = (
    <div className="flex gap-4">
        <div className="relative shrink-0">
          {notification.actor ? (
            <Avatar
              src={notification.actor.avatar_url}
              fullName={
                notification.actor.full_name ?? notification.actor.username
              }
              size="md"
            />
          ) : (
            <div
              className={`w-12 h-12 rounded-full flex items-center justify-center ${meta.bg}`}
            >
              <Icon className={`w-5 h-5 ${meta.color}`} aria-hidden />
            </div>
          )}
          {notification.actor ? (
            <span
              className={`absolute -bottom-1 -right-1 w-6 h-6 rounded-full border-2 border-bg flex items-center justify-center ${meta.bg}`}
            >
              <Icon className={`w-3 h-3 ${meta.color}`} aria-hidden />
            </span>
          ) : null}
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-3">
            <h3
              className={`text-sm font-semibold truncate ${
                isRead ? "text-night-muted" : "text-night"
              }`}
            >
              {notification.title}
            </h3>
            <time
              dateTime={notification.created_at}
              className="text-[10px] text-muted shrink-0"
            >
              {formatRelative(notification.created_at)}
            </time>
          </div>
          {notification.body ? (
            <p
              className={`mt-1 text-sm leading-relaxed line-clamp-2 ${
                isRead ? "text-muted" : "text-night-muted"
              }`}
            >
              {notification.body}
            </p>
          ) : null}

          <div className="mt-3 flex items-center gap-3 opacity-0 group-hover:opacity-100 transition-opacity">
            {!isRead ? (
              <button
                type="button"
                onClick={handleMarkRead}
                disabled={pending}
                className="text-[11px] font-semibold text-night-muted hover:text-night flex items-center gap-1"
              >
                <Check className="w-3 h-3" aria-hidden />
                Marquer comme lu
              </button>
            ) : null}
            <button
              type="button"
              onClick={handleDelete}
              disabled={pending}
              className="text-[11px] font-semibold text-night-muted hover:text-red-600 flex items-center gap-1"
            >
              <Trash2 className="w-3 h-3" aria-hidden />
              Supprimer
            </button>
          </div>
        </div>

        {!isRead ? (
          <span
            aria-label="Non lu"
            className="shrink-0 w-2.5 h-2.5 rounded-full bg-gold mt-2"
          />
        ) : null}
      </div>
  );

  if (notification.href) {
    return (
      <Link
        href={notification.href}
        onClick={handleClick}
        className={className}
      >
        {inner}
      </Link>
    );
  }
  return <div className={className}>{inner}</div>;
}
