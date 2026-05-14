"use client";

import { BellOff, Lock, PhoneMissed, Pin } from "lucide-react";
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
  /* Chantier 2 polish : signale qu'il y a un appel manqué récent dans
     cette conv (callee=me, status=missed, < 7 jours). */
  hasMissedCall?: boolean;
};

/* Item de la liste des conversations. Card simple, click → ouvre la conv.
 * Les options épingler/archiver/muet sont accessibles depuis l'intérieur
 * de la conversation via le menu ⋯ du ChatHeader. */
export function ConversationItem({
  conversation,
  currentUserId,
  presence,
  hasMissedCall = false,
}: ConversationItemProps) {
  const pathname = usePathname();
  const active = pathname === `/messages/${conversation.id}`;

  const displayName =
    conversation.other_member?.full_name ??
    conversation.other_member?.username ??
    conversation.name ??
    "Conversation";

  const lastMessage = conversation.last_message;
  const lastBody = lastMessage
    ? lastMessage.is_secret
      ? "🔒 Message secret"
      : (lastMessage.body ??
        (lastMessage.attachment_type === "image"
          ? "📷 Photo"
          : lastMessage.attachment_type === "audio"
            ? "🎙️ Message vocal"
            : lastMessage.attachment_type
              ? "📎 Pièce jointe"
              : "Aucun message"))
    : "Aucun message pour l'instant";
  const isOwnLastMessage = lastMessage?.sender_id === currentUserId;

  return (
    <div className="relative min-w-0">
      <Link
        href={`/messages/${conversation.id}`}
        aria-current={active ? "page" : undefined}
        className={`flex items-center gap-2.5 p-2.5 sm:p-3 rounded-2xl border overflow-hidden transition-colors ${
          active
            ? "bg-night text-cream border-night shadow-soft"
            : "bg-white border-line hover:border-night/30 hover:bg-night/[0.02]"
        }`}
      >
        <div className="relative shrink-0">
          <div
            className={
              presence?.presence_status === "online"
                ? "rounded-full ring-2 ring-emerald-500 ring-offset-2 ring-offset-bg"
                : ""
            }
          >
            <Avatar
              src={
                conversation.other_member?.avatar_url ??
                conversation.avatar_url
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
        <div className="flex-1 min-w-0 max-w-full overflow-hidden">
          {/* Row 1 : nom (avec icones inline) à gauche, timestamp à droite.
              Grid [1fr auto] garantit que la timestamp est TOUJOURS
              visible — le nom truncate avant. */}
          <div className="grid grid-cols-[1fr_auto] gap-2 items-center">
            <div className="min-w-0 flex items-center gap-1.5 overflow-hidden">
              {conversation.is_pinned ? (
                <Pin
                  className={`w-3 h-3 shrink-0 ${
                    active ? "text-gold" : "text-gold-deep"
                  }`}
                  aria-label="Épinglée"
                />
              ) : null}
              <span
                className={`min-w-0 text-sm font-semibold truncate ${
                  active ? "text-cream" : "text-night"
                }`}
              >
                {displayName}
              </span>
              {conversation.wants_secret ? (
                <Lock
                  className={`w-3 h-3 shrink-0 ${
                    active ? "text-cream/70" : "text-night-muted"
                  }`}
                  aria-label="Conversation secrète"
                />
              ) : null}
              {conversation.is_muted ? (
                <BellOff
                  className={`w-3 h-3 shrink-0 ${
                    active ? "text-cream/70" : "text-night-muted"
                  }`}
                  aria-label="Notifications muettes"
                />
              ) : null}
            </div>
            <span
              className={`text-[10px] shrink-0 whitespace-nowrap ${
                active ? "text-cream/60" : "text-muted"
              }`}
            >
              {formatRelative(conversation.last_message_at)}
            </span>
          </div>
          {/* Row 2 : aperçu du dernier message à gauche, badge unread à droite.
              Si appel manqué récent, on remplace l'aperçu par "Appel manqué" rouge. */}
          <div className="grid grid-cols-[1fr_auto] gap-2 items-center mt-0.5">
            {hasMissedCall && !active ? (
              <p className="min-w-0 text-xs truncate font-semibold text-red-600 inline-flex items-center gap-1">
                <PhoneMissed className="w-3 h-3 shrink-0" aria-hidden />
                Appel manqué
              </p>
            ) : (
              <p
                className={`min-w-0 text-xs truncate ${
                  active
                    ? "text-cream/80"
                    : conversation.unread_count > 0 && !conversation.is_muted
                      ? "text-night font-medium"
                      : "text-muted"
                }`}
              >
                {isOwnLastMessage ? "Toi : " : ""}
                {lastBody}
              </p>
            )}
            {!active && conversation.unread_count > 0 ? (
              <span
                aria-label={`${conversation.unread_count} message non lu`}
                className={`shrink-0 min-w-5 h-5 px-1.5 rounded-full text-[10px] font-bold flex items-center justify-center ${
                  conversation.is_muted
                    ? "bg-night/10 text-night-muted"
                    : "bg-gold text-night"
                }`}
              >
                {conversation.unread_count}
              </span>
            ) : null}
          </div>
        </div>
      </Link>
    </div>
  );
}
