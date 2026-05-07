"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Avatar } from "@/components/ui/Avatar";
import type { ConversationListItem } from "@/lib/database.types";
import { formatRelative } from "@/lib/utils/relativeTime";

type ConversationItemProps = {
  conversation: ConversationListItem;
  currentUserId: string;
};

export function ConversationItem({
  conversation,
  currentUserId,
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
      <Avatar
        src={conversation.other_member?.avatar_url ?? conversation.avatar_url}
        fullName={displayName}
        size="md"
      />
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
              aria-label={`${conversation.unread_count} non lu`}
              className="shrink-0 ml-1 min-w-5 h-5 px-1.5 rounded-full bg-gold text-night text-[10px] font-bold flex items-center justify-center"
            >
              {conversation.unread_count}
            </span>
          ) : null}
        </div>
      </div>
    </Link>
  );
}
