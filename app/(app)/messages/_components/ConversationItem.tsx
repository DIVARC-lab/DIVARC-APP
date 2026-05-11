"use client";

import { BellOff, Lock, Pin } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useRef, useState } from "react";
import { Avatar } from "@/components/ui/Avatar";
import { PresenceDot } from "@/components/ui/PresenceDot";
import { useLongPress } from "@/lib/hooks/useLongPress";
import type { ConversationListItem, PresenceInfo } from "@/lib/database.types";
import { formatRelative } from "@/lib/utils/relativeTime";
import { ConversationActionsSheet } from "./ConversationActionsSheet";

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
  const [sheetOpen, setSheetOpen] = useState(false);

  /* Si le long-press a triggered, on annule le click qui suit (sinon
     iOS Safari navigue quand même vers la conv). Réinitialisé après
     consommation. */
  const longPressTriggeredRef = useRef(false);
  const longPressHandlers = useLongPress(
    () => {
      longPressTriggeredRef.current = true;
      setSheetOpen(true);
    },
    { delay: 420 },
  );

  function handleClickGuard(event: React.MouseEvent) {
    if (longPressTriggeredRef.current) {
      event.preventDefault();
      event.stopPropagation();
      longPressTriggeredRef.current = false;
    }
  }

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
    <>
      <div
        /* Pseudo-virtualization : content-visibility:auto laisse au
           navigateur l'option de sauter le rendu des items hors viewport.
           contain-intrinsic-size garde la place réservée pour éviter le
           scroll-jump. min-w-0 + overflow-hidden évitent que les noms
           très longs poussent le layout horizontalement sur mobile. */
        className="relative min-w-0 [content-visibility:auto] [contain-intrinsic-size:auto_80px]"
        {...longPressHandlers}
      >
        <Link
          href={`/messages/${conversation.id}`}
          aria-current={active ? "page" : undefined}
          onClickCapture={handleClickGuard}
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
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-1.5 min-w-0">
                {conversation.is_pinned ? (
                  <Pin
                    className={`w-3 h-3 shrink-0 ${
                      active ? "text-gold" : "text-gold-deep"
                    }`}
                    aria-label="Épinglée"
                  />
                ) : null}
                <p
                  className={`flex-1 min-w-0 text-sm font-semibold truncate ${
                    active ? "text-cream" : "text-night"
                  }`}
                >
                  {displayName}
                </p>
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
                className={`text-[10px] shrink-0 ${
                  active ? "text-cream/60" : "text-muted"
                }`}
              >
                {formatRelative(conversation.last_message_at)}
              </span>
            </div>
            <div className="flex items-center justify-between gap-2 mt-0.5 min-w-0">
              <p
                className={`flex-1 min-w-0 text-xs truncate ${
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
              {!active && conversation.unread_count > 0 ? (
                <span
                  aria-label={`${conversation.unread_count} message non lu`}
                  className={`relative shrink-0 ml-1 min-w-5 h-5 px-1.5 rounded-full text-[10px] font-bold flex items-center justify-center ${
                    conversation.is_muted
                      ? "bg-night/10 text-night-muted"
                      : "bg-gold text-night"
                  }`}
                >
                  {/* Halo pulsé uniquement si pas muet */}
                  {!conversation.is_muted ? (
                    <span
                      aria-hidden
                      className="absolute inset-0 rounded-full bg-gold animate-ping opacity-50"
                    />
                  ) : null}
                  <span className="relative">
                    {conversation.unread_count}
                  </span>
                </span>
              ) : null}
            </div>
          </div>
        </Link>
      </div>

      <ConversationActionsSheet
        open={sheetOpen}
        onClose={() => setSheetOpen(false)}
        conversationId={conversation.id}
        isPinned={conversation.is_pinned}
        isArchived={conversation.is_archived}
        isMuted={conversation.is_muted}
      />
    </>
  );
}
