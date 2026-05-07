"use client";

import { useEffect, useRef, useState } from "react";
import { Avatar } from "@/components/ui/Avatar";
import { createClient } from "@/lib/supabase/client";
import type { Message } from "@/lib/database.types";
import { formatDateSeparator, isSameDay } from "@/lib/utils/dateSeparator";
import { MessageBubble } from "./MessageBubble";

const TIME_GAP_MS = 5 * 60 * 1000;

type OtherMember = {
  user_id: string;
  full_name: string | null;
  username: string | null;
  avatar_url: string | null;
};

type MessageThreadProps = {
  conversationId: string;
  initialMessages: Message[];
  initialOtherLastReadAt: string | null;
  currentUserId: string;
  otherMember: OtherMember | null;
};

export function MessageThread({
  conversationId,
  initialMessages,
  initialOtherLastReadAt,
  currentUserId,
  otherMember,
}: MessageThreadProps) {
  const [messages, setMessages] = useState<Message[]>(initialMessages);
  const [otherLastReadAt, setOtherLastReadAt] = useState<string | null>(
    initialOtherLastReadAt,
  );
  const scrollRef = useRef<HTMLDivElement>(null);
  const otherUserId = otherMember?.user_id ?? null;

  // Subscribe to messages and read receipts
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
    if (messages.length === 0) return;
    const supabase = createClient();
    void supabase.rpc("mark_conversation_read", { conv_id: conversationId });
  }, [messages.length, conversationId]);

  // Auto-scroll to bottom
  useEffect(() => {
    requestAnimationFrame(() => {
      scrollRef.current?.scrollTo({
        top: scrollRef.current.scrollHeight,
        behavior: "smooth",
      });
    });
  }, [messages]);

  if (messages.length === 0) {
    return (
      <div ref={scrollRef} className="flex-1 flex items-center justify-center px-6">
        <div className="text-center max-w-sm">
          <div className="w-16 h-16 mx-auto rounded-2xl bg-gradient-to-br from-cream to-gold/20 flex items-center justify-center mb-5 border border-gold/30">
            <Avatar
              src={otherMember?.avatar_url ?? null}
              fullName={otherMember?.full_name ?? null}
              size="lg"
            />
          </div>
          <h3 className="font-display text-2xl text-night">
            Lance la conversation
          </h3>
          <p className="mt-2 text-sm text-muted">
            Aucun message pour l&apos;instant. Dis bonjour à{" "}
            <strong className="text-night">
              {otherMember?.full_name?.split(" ")[0] ?? "ton interlocuteur"}
            </strong>
            .
          </p>
        </div>
      </div>
    );
  }

  // Find the last own message (for read receipt)
  const lastOwnMessageIndex = findLastIndex(
    messages,
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
        {messages.map((message, idx) => {
          const previous = messages[idx - 1];
          const next = messages[idx + 1];
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
          const senderName = isOwn ? null : otherMember?.full_name ?? null;
          const senderAvatar = isOwn ? null : otherMember?.avatar_url ?? null;

          const isLastOwn = idx === lastOwnMessageIndex;
          const otherHasRead =
            isLastOwn && otherHasReadAt >= messageDate.getTime();

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
              <MessageBubble
                message={message}
                isOwn={isOwn}
                showAvatar={showAvatar}
                showTime={showTime}
                senderName={senderName}
                senderAvatarUrl={senderAvatar}
              />
              {isLastOwn ? (
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
    </div>
  );
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
