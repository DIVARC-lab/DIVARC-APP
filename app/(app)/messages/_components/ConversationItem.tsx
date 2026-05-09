"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Avatar } from "@/components/ui/Avatar";
import { PresenceDot } from "@/components/ui/PresenceDot";
import type { ConversationListItem, PresenceInfo } from "@/lib/database.types";
import { formatRelative } from "@/lib/utils/relativeTime";

type ConversationItemProps = {
  conversation: ConversationListItem;
  currentUserId: string;
  presence: PresenceInfo | null;
};

export function ConversationItem({
  conversation,
  currentUserId,
  presence,
}: ConversationItemProps) {
  const pathname = usePathname();
  const active = pathname === `/messages/${conversation.id}`;

  const displayName =
    conversation.other_member?.full_name ??
    conversation.other_member?.username ??
    conversation.name ??
    "Conversation";

  const lastBody = conversation.last_message
    ? (conversation.last_message.body ??
      (conversation.last_message.attachment_type === "image"
        ? "📷 Photo"
        : conversation.last_message.attachment_type
          ? "📎 Pièce jointe"
          : "Aucun message"))
    : "Aucun message pour l'instant";
  const isOwnLastMessage =
    conversation.last_message?.sender_id === currentUserId;

  return (
    <Link
      href={`/messages/${conversation.id}`}
      aria-current={active ? "page" : undefined}
      className={`flex items-center gap-3 p-3 rounded-2xl border transition-colors ${
        active
          ? "bg-night text-cream border-night shadow-soft"
          : "bg-white border-line hover:border-night/30 hover:bg-night/[0.02]"
      }`}
    >
      <div className="relative shrink-0">
        {/* Ring vert autour de l'avatar quand la personne est online */}
        <div
          className={
            presence?.presence_status === "online"
              ? "rounded-full ring-2 ring-emerald-500 ring-offset-2 ring-offset-bg"
              : ""
          }
        >
          <Avatar
            src={
              conversation.other_member?.avatar_url ?? conversation.avatar_url
            }
            fullName={displayName}
            size="md"
          />
        </div>
        {presence && presence.presence_status !== "online" ? (
          <PresenceDot
            status={presence.presence_status}
            customStatus={presence.custom_status}
            size="md"
            className="absolute bottom-0 right-0"
          />
        ) : null}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between gap-2">
          <p
            className={`text-sm font-semibold truncate ${
              active ? "text-cream" : "text-night"
            }`}
          >
            {displayName}
          </p>
          <span
            className={`text-[10px] shrink-0 ${
              active ? "text-cream/60" : "text-muted"
            }`}
          >
            {formatRelative(conversation.last_message_at)}
          </span>
        </div>
        <div className="flex items-center justify-between gap-2 mt-0.5">
          <p
            className={`text-xs truncate ${
              active
                ? "text-cream/80"
                : conversation.unread_count > 0
                  ? "text-night font-medium"
                  : "text-muted"
            }`}
          >
            {isOwnLastMessage ? "Toi : " : ""}
            {lastBody}
          </p>
          {!active && conversation.unread_count > 0 ? (
            <span
              aria-label={`${conversation.unread_count} message non lu`}
              className="relative shrink-0 ml-1 min-w-5 h-5 px-1.5 rounded-full bg-gold text-night text-[10px] font-bold flex items-center justify-center"
            >
              {/* Halo pulsé pour attirer l'attention sur les non-lus */}
              <span
                aria-hidden
                className="absolute inset-0 rounded-full bg-gold animate-ping opacity-50"
              />
              <span className="relative">{conversation.unread_count}</span>
            </span>
          ) : null}
        </div>
      </div>
    </Link>
  );
}
