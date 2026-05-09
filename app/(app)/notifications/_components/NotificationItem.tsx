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
import { cn } from "@/lib/utils/cn";
import type {
  NotificationType,
  NotificationWithActor,
} from "@/lib/database.types";
import { formatRelative } from "@/lib/utils/relativeTime";
import {
  deleteNotification,
  markNotificationRead,
} from "../actions";

/* Refonte audit S8 (handoff feed-extra-screens.jsx L232-247) :
 * - Container p-3 r-2xl, unread bg gold/10 border gold/30
 * - Avatar 42px (md-bold)
 * - Badge kind 20×20 r-full bg-white BORDER 2px du kind color, icon 10×10
 *   du kind color (au lieu d'un cercle plein de la kind color)
 * - Texte: <auteur weight 700>{title}</auteur> en text-[13px] navy line-height
 *   1.35, body en muted #4B5B87
 * - Detail truncate 12 #8696B0
 * - Time 11 #8696B0 shrink-0 */
const TYPE_ICONS: Record<
  NotificationType,
  { icon: typeof Bell; color: string }
> = {
  friend_request_received: { icon: UserPlus, color: "#B88A2A" },
  friend_request_accepted: { icon: Check, color: "#16A34A" },
  friend_request_rejected: { icon: X, color: "#DC2626" },
  new_message: { icon: MessageSquareText, color: "#0A1F44" },
  system: { icon: Bell, color: "#142A55" },
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

  const className = cn(
    "group block p-3 rounded-2xl border transition-colors",
    isRead
      ? "bg-white border-line"
      : "bg-[rgba(244,185,66,0.1)] border-[rgba(244,185,66,0.3)]",
    notification.href ? "hover:border-night/20 cursor-pointer" : "",
  );

  const inner = (
    <div className="flex items-center gap-3">
      <div className="relative shrink-0">
        {notification.actor ? (
          <Avatar
            src={notification.actor.avatar_url}
            fullName={
              notification.actor.full_name ?? notification.actor.username
            }
            size="md-bold"
          />
        ) : (
          <div
            className="w-[42px] h-[42px] rounded-full flex items-center justify-center bg-bg-soft"
            style={{ color: meta.color }}
          >
            <Icon className="w-4 h-4" aria-hidden />
          </div>
        )}
        {/* Badge kind : 20×20 bg-white border-2 du kind color (proto L238) */}
        {notification.actor ? (
          <span
            aria-hidden
            className="absolute -bottom-0.5 -right-0.5 w-5 h-5 rounded-full bg-white border-2 flex items-center justify-center"
            style={{ borderColor: meta.color, color: meta.color }}
          >
            <Icon className="w-2.5 h-2.5" aria-hidden />
          </span>
        ) : null}
      </div>

      <div className="flex-1 min-w-0">
        <p
          className={cn(
            "text-[13px] leading-[1.35] truncate",
            isRead ? "text-night-muted" : "text-night",
          )}
        >
          {notification.actor ? (
            <span className="font-bold">
              {notification.actor.full_name ?? notification.actor.username}
            </span>
          ) : null}
          {notification.actor && notification.title ? " " : null}
          <span className="text-night-soft">{notification.title}</span>
        </p>
        {notification.body ? (
          <p className="mt-0.5 text-[12px] text-night-dim truncate">
            {notification.body}
          </p>
        ) : null}

        <div className="mt-1.5 flex items-center gap-3 opacity-0 group-hover:opacity-100 transition-opacity">
          {!isRead ? (
            <button
              type="button"
              onClick={handleMarkRead}
              disabled={pending}
              className="text-[11px] font-semibold text-night-muted hover:text-night flex items-center gap-1"
            >
              <Check className="w-3 h-3" aria-hidden />
              Marquer lu
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

      <time
        dateTime={notification.created_at}
        className="text-[11px] text-night-dim shrink-0 self-start mt-0.5"
      >
        {formatRelative(notification.created_at)}
      </time>

      {!isRead ? (
        <span
          aria-label="Non lu"
          className="shrink-0 w-2 h-2 rounded-full bg-gold mt-1.5"
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
