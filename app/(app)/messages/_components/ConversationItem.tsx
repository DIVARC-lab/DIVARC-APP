"use client";

import { BellOff, Lock, MoreHorizontal, Pin } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
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

/* Distance min de swipe à droite pour révéler le bouton ⋯. */
const SWIPE_REVEAL_THRESHOLD = 40;

export function ConversationItem({
  conversation,
  currentUserId,
  presence,
}: ConversationItemProps) {
  const pathname = usePathname();
  const active = pathname === `/messages/${conversation.id}`;
  const [sheetOpen, setSheetOpen] = useState(false);
  /* Sur mobile : devient true après un swipe vers la droite. Reste vrai
     jusqu'à un tap n'importe où ou un scroll. Affiche le bouton ⋯. */
  const [revealed, setRevealed] = useState(false);

  /* Long-press → ouvre directement la sheet. */
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
      return;
    }
    if (revealed) {
      /* Si le bouton ⋯ est visible, le tap sur la card le cache. */
      event.preventDefault();
      event.stopPropagation();
      setRevealed(false);
    }
  }

  /* === Swipe gesture (mobile touch only) === */
  const swipeStartXRef = useRef<number | null>(null);
  const swipeStartedAtRef = useRef<number>(0);
  function onPointerDown(event: React.PointerEvent) {
    if (event.pointerType === "mouse") return;
    swipeStartXRef.current = event.clientX;
    swipeStartedAtRef.current = Date.now();
  }
  function onPointerMove(event: React.PointerEvent) {
    if (event.pointerType === "mouse") return;
    if (swipeStartXRef.current === null) return;
    const delta = event.clientX - swipeStartXRef.current;
    /* Swipe vers la droite (delta positif) > threshold = reveal. */
    if (delta > SWIPE_REVEAL_THRESHOLD && !revealed) {
      setRevealed(true);
    } else if (delta < -SWIPE_REVEAL_THRESHOLD && revealed) {
      setRevealed(false);
    }
  }
  function onPointerEnd() {
    swipeStartXRef.current = null;
  }

  /* Auto-close au scroll. */
  useEffect(() => {
    if (!revealed) return;
    function close() {
      setRevealed(false);
    }
    document.addEventListener("scroll", close, { capture: true, passive: true });
    return () =>
      document.removeEventListener("scroll", close, { capture: true });
  }, [revealed]);

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

  /* Bouton ⋯ visible si :
     - desktop hover (CSS group-hover, lg:opacity-0 → lg:group-hover:opacity-100)
     - OU mobile après swipe droite (state `revealed`) */
  return (
    <>
      <div
        className="group relative min-w-0 [content-visibility:auto] [contain-intrinsic-size:auto_80px]"
        {...longPressHandlers}
        onPointerDown={(e) => {
          longPressHandlers.onPointerDown(e);
          onPointerDown(e);
        }}
        onPointerMove={(e) => {
          longPressHandlers.onPointerMove(e);
          onPointerMove(e);
        }}
        onPointerUp={(e) => {
          longPressHandlers.onPointerUp(e);
          onPointerEnd();
        }}
        onPointerCancel={(e) => {
          longPressHandlers.onPointerCancel(e);
          onPointerEnd();
        }}
        onPointerLeave={(e) => {
          longPressHandlers.onPointerLeave(e);
          onPointerEnd();
        }}
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
            {/* Row 2 : aperçu du dernier message à gauche, badge unread à droite. */}
            <div className="grid grid-cols-[1fr_auto] gap-2 items-center mt-0.5">
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
              {!active && conversation.unread_count > 0 ? (
                <span
                  aria-label={`${conversation.unread_count} message non lu`}
                  className={`relative shrink-0 min-w-5 h-5 px-1.5 rounded-full text-[10px] font-bold flex items-center justify-center ${
                    conversation.is_muted
                      ? "bg-night/10 text-night-muted"
                      : "bg-gold text-night"
                  }`}
                >
                  {!conversation.is_muted ? (
                    <span
                      aria-hidden
                      className="absolute inset-0 rounded-full bg-gold animate-ping opacity-50"
                    />
                  ) : null}
                  <span className="relative">{conversation.unread_count}</span>
                </span>
              ) : null}
            </div>
          </div>
        </Link>

        {/* Bouton ⋯ révélé sur hover desktop ou après swipe right mobile.
            Click → ouvre ConversationActionsSheet avec toutes les options
            (épingler, archiver, muet 1h/8h/1j/1sem, muet pour toujours). */}
        <button
          type="button"
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            setSheetOpen(true);
            setRevealed(false);
          }}
          aria-label="Options de la conversation"
          className={`absolute top-1/2 -translate-y-1/2 right-2 z-10 w-9 h-9 rounded-full bg-white/95 border border-line items-center justify-center text-night-muted hover:text-night hover:border-night/30 shadow-sm transition-opacity ${
            revealed
              ? "flex opacity-100"
              : "hidden lg:flex lg:opacity-0 lg:group-hover:opacity-100"
          }`}
        >
          <MoreHorizontal className="w-4 h-4" aria-hidden />
        </button>
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
