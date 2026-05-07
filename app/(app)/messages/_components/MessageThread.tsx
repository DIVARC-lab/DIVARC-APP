"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Avatar } from "@/components/ui/Avatar";
import { createClient } from "@/lib/supabase/client";
import type {
  Message,
  MessageReaction,
  MessageReactionSummary,
  MessageReplyContext,
} from "@/lib/database.types";
import { formatDateSeparator, isSameDay } from "@/lib/utils/dateSeparator";
import { useTypingChannel } from "@/lib/hooks/useTypingChannel";
import { MessageBubble } from "./MessageBubble";
import { TypingIndicator } from "./TypingIndicator";

const TIME_GAP_MS = 5 * 60 * 1000;

type OtherMember = {
  user_id: string;
  full_name: string | null;
  username: string | null;
  avatar_url: string | null;
};

type ReactionsState = Record<string, MessageReactionSummary[]>;

type MessageThreadProps = {
  conversationId: string;
  initialMessages: Message[];
  initialReactions: ReactionsState;
  initialOtherLastReadAt: string | null;
  currentUserId: string;
  otherMember: OtherMember | null;
  memberMap?: Record<string, OtherMember>;
  isGroup?: boolean;
  onReply: (ctx: MessageReplyContext) => void;
};

export function MessageThread({
  conversationId,
  initialMessages,
  initialReactions,
  initialOtherLastReadAt,
  currentUserId,
  otherMember,
  memberMap,
  isGroup = false,
  onReply,
}: MessageThreadProps) {
  const [messages, setMessages] = useState<Message[]>(initialMessages);
  const [reactions, setReactions] = useState<ReactionsState>(initialReactions);
  const [otherLastReadAt, setOtherLastReadAt] = useState<string | null>(
    initialOtherLastReadAt,
  );
  const scrollRef = useRef<HTMLDivElement>(null);
  const otherUserId = otherMember?.user_id ?? null;
  const { typers } = useTypingChannel(conversationId, currentUserId, null);

  // Visible messages (filter soft-deleted on client side too)
  const visibleMessages = useMemo(
    () => messages.filter((m) => m.deleted_at === null),
    [messages],
  );

  // Quick lookup for reply context resolution
  const messagesById = useMemo(() => {
    const map = new Map<string, Message>();
    for (const m of messages) map.set(m.id, m);
    return map;
  }, [messages]);

  function resolveSenderName(senderId: string): string | null {
    if (senderId === currentUserId) return "Toi";
    if (memberMap?.[senderId]) {
      return memberMap[senderId].full_name ?? null;
    }
    if (otherMember?.user_id === senderId) {
      return otherMember.full_name ?? null;
    }
    return null;
  }

  // Subscribe to messages, deletions, read receipts, and reactions
  useEffect(() => {
    const supabase = createClient();

    const channel = supabase
      .channel(`conversation:${conversationId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "messages",
          filter: `conversation_id=eq.${conversationId}`,
        },
        (payload) => {
          const newMessage = payload.new as Message;
          setMessages((prev) => {
            if (prev.some((m) => m.id === newMessage.id)) return prev;
            return [...prev, newMessage];
          });
        },
      )
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "messages",
          filter: `conversation_id=eq.${conversationId}`,
        },
        (payload) => {
          const updated = payload.new as Message;
          setMessages((prev) =>
            prev.map((m) => (m.id === updated.id ? updated : m)),
          );
        },
      )
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "message_reactions",
          filter: `conversation_id=eq.${conversationId}`,
        },
        (payload) => {
          const row = payload.new as MessageReaction;
          setReactions((prev) =>
            applyReactionInsert(prev, row, currentUserId),
          );
        },
      )
      .on(
        "postgres_changes",
        {
          event: "DELETE",
          schema: "public",
          table: "message_reactions",
          filter: `conversation_id=eq.${conversationId}`,
        },
        (payload) => {
          const row = payload.old as Partial<MessageReaction>;
          if (!row.message_id || !row.emoji) return;
          setReactions((prev) =>
            applyReactionDelete(
              prev,
              row.message_id!,
              row.emoji!,
              row.user_id === currentUserId,
            ),
          );
        },
      )
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "conversation_members",
          filter: `conversation_id=eq.${conversationId}`,
        },
        (payload) => {
          const row = payload.new as {
            user_id: string;
            last_read_at: string;
          };
          if (row.user_id !== currentUserId) {
            setOtherLastReadAt(row.last_read_at);
          }
        },
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [conversationId, currentUserId, otherUserId]);

  // Mark as read whenever new messages arrive
  useEffect(() => {
    if (visibleMessages.length === 0) return;
    const supabase = createClient();
    void supabase.rpc("mark_conversation_read", { conv_id: conversationId });
  }, [visibleMessages.length, conversationId]);

  // Auto-scroll to bottom
  useEffect(() => {
    requestAnimationFrame(() => {
      scrollRef.current?.scrollTo({
        top: scrollRef.current.scrollHeight,
        behavior: "smooth",
      });
    });
  }, [visibleMessages]);

  if (visibleMessages.length === 0) {
    return (
      <div ref={scrollRef} className="flex-1 flex items-center justify-center px-6">
        <div className="text-center max-w-sm">
          <div className="w-16 h-16 mx-auto rounded-2xl bg-gradient-to-br from-cream to-gold/20 flex items-center justify-center mb-5 border border-gold/30">
            {isGroup ? (
              <span aria-hidden className="text-3xl leading-none">👥</span>
            ) : (
              <Avatar
                src={otherMember?.avatar_url ?? null}
                fullName={otherMember?.full_name ?? null}
                size="lg"
              />
            )}
          </div>
          <h3 className="font-display text-2xl text-night">
            Lance la conversation
          </h3>
          <p className="mt-2 text-sm text-muted">
            {isGroup
              ? "Aucun message dans ce groupe pour l'instant. À toi de l'animer !"
              : `Aucun message pour l'instant. Dis bonjour à ${otherMember?.full_name?.split(" ")[0] ?? "ton interlocuteur"}.`}
          </p>
        </div>
      </div>
    );
  }

  // Find the last own message (for read receipt)
  const lastOwnMessageIndex = findLastIndex(
    visibleMessages,
    (m) => m.sender_id === currentUserId,
  );
  const otherHasReadAt = otherLastReadAt
    ? new Date(otherLastReadAt).getTime()
    : 0;

  return (
    <div
      ref={scrollRef}
      className="flex-1 overflow-y-auto px-4 sm:px-6 py-6"
    >
      <div className="max-w-3xl mx-auto w-full space-y-1.5">
        {visibleMessages.map((message, idx) => {
          const previous = visibleMessages[idx - 1];
          const next = visibleMessages[idx + 1];
          const isOwn = message.sender_id === currentUserId;
          const messageDate = new Date(message.created_at);
          const previousDate = previous ? new Date(previous.created_at) : null;
          const showDateSeparator =
            !previousDate || !isSameDay(previousDate, messageDate);

          const samePrevSender =
            previous?.sender_id === message.sender_id &&
            previousDate &&
            messageDate.getTime() - previousDate.getTime() < TIME_GAP_MS &&
            !showDateSeparator;
          const sameNextSender =
            next?.sender_id === message.sender_id &&
            new Date(next.created_at).getTime() - messageDate.getTime() <
              TIME_GAP_MS;

          const showAvatar = !sameNextSender;
          const showTime = !samePrevSender;
          const senderProfile = isGroup
            ? memberMap?.[message.sender_id] ?? null
            : otherMember;
          const senderName = isOwn ? null : senderProfile?.full_name ?? null;
          const senderAvatar = isOwn ? null : senderProfile?.avatar_url ?? null;
          const showSenderLabel =
            isGroup && !isOwn && !samePrevSender;

          const isLastOwn = idx === lastOwnMessageIndex;
          const otherHasRead =
            isLastOwn && otherHasReadAt >= messageDate.getTime();

          let replyContext: MessageReplyContext | null = null;
          if (message.reply_to_message_id) {
            const target = messagesById.get(message.reply_to_message_id);
            if (target) {
              replyContext = {
                id: target.id,
                sender_id: target.sender_id,
                sender_name: resolveSenderName(target.sender_id),
                body: target.deleted_at ? null : target.body,
                attachment_type: target.deleted_at
                  ? null
                  : target.attachment_type,
              };
            }
          }

          const messageReactions = reactions[message.id] ?? [];

          return (
            <div key={message.id}>
              {showDateSeparator ? (
                <div className="flex items-center gap-3 my-6 first:mt-0">
                  <span className="flex-1 h-px bg-line" />
                  <span className="text-[10px] font-semibold uppercase tracking-widest text-muted px-2 py-0.5 rounded-full bg-night/[0.04]">
                    {formatDateSeparator(messageDate)}
                  </span>
                  <span className="flex-1 h-px bg-line" />
                </div>
              ) : null}
              {showSenderLabel ? (
                <p className="text-[11px] font-semibold text-night-muted mt-3 pl-10">
                  {senderName ?? "Un membre"}
                </p>
              ) : null}
              <MessageBubble
                message={message}
                isOwn={isOwn}
                showAvatar={showAvatar}
                showTime={showTime}
                senderName={senderName}
                senderAvatarUrl={senderAvatar}
                reactions={messageReactions}
                replyContext={replyContext}
                onReply={() =>
                  onReply({
                    id: message.id,
                    sender_id: message.sender_id,
                    sender_name: isOwn
                      ? "Toi"
                      : resolveSenderName(message.sender_id),
                    body: message.body,
                    attachment_type: message.attachment_type,
                  })
                }
              />
              {isLastOwn && !isGroup ? (
                <div className="flex justify-end mt-1 pr-1">
                  <ReadReceipt
                    delivered={true}
                    read={otherHasRead}
                    otherMember={otherMember}
                  />
                </div>
              ) : null}
            </div>
          );
        })}
      </div>
      <TypingIndicator
        typerIds={typers.map((t) => t.user_id)}
        memberMap={memberMap ?? {}}
        isGroup={isGroup}
      />
    </div>
  );
}

function applyReactionInsert(
  state: ReactionsState,
  row: MessageReaction,
  currentUserId: string,
): ReactionsState {
  const list = state[row.message_id] ?? [];
  const existing = list.find((r) => r.emoji === row.emoji);
  let nextList: MessageReactionSummary[];
  if (existing) {
    nextList = list.map((r) =>
      r.emoji === row.emoji
        ? {
            ...r,
            count: r.count + 1,
            user_reacted: r.user_reacted || row.user_id === currentUserId,
          }
        : r,
    );
  } else {
    nextList = [
      ...list,
      {
        emoji: row.emoji,
        count: 1,
        user_reacted: row.user_id === currentUserId,
      },
    ];
  }
  nextList.sort((a, b) => b.count - a.count);
  return { ...state, [row.message_id]: nextList };
}

function applyReactionDelete(
  state: ReactionsState,
  messageId: string,
  emoji: string,
  wasCurrentUser: boolean,
): ReactionsState {
  const list = state[messageId];
  if (!list) return state;
  const nextList: MessageReactionSummary[] = [];
  for (const r of list) {
    if (r.emoji !== emoji) {
      nextList.push(r);
      continue;
    }
    const nextCount = r.count - 1;
    if (nextCount <= 0) continue;
    nextList.push({
      ...r,
      count: nextCount,
      user_reacted: wasCurrentUser ? false : r.user_reacted,
    });
  }
  if (nextList.length === 0) {
    const { [messageId]: _, ...rest } = state;
    return rest;
  }
  return { ...state, [messageId]: nextList };
}

function ReadReceipt({
  read,
  otherMember,
}: {
  delivered: boolean;
  read: boolean;
  otherMember: OtherMember | null;
}) {
  if (read && otherMember) {
    return (
      <div className="flex items-center gap-1.5 text-[10px] text-muted">
        <span>Lu</span>
        <Avatar
          src={otherMember.avatar_url}
          fullName={otherMember.full_name}
          size="sm"
          className="!w-4 !h-4 !text-[8px]"
        />
      </div>
    );
  }
  return <span className="text-[10px] text-muted">Envoyé</span>;
}

function findLastIndex<T>(
  array: ReadonlyArray<T>,
  predicate: (item: T) => boolean,
): number {
  for (let i = array.length - 1; i >= 0; i--) {
    if (predicate(array[i]!)) return i;
  }
  return -1;
}
