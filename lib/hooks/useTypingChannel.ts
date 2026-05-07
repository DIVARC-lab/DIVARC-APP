"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { RealtimeChannel } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/client";

const TYPING_TTL_MS = 4000;
const TYPING_THROTTLE_MS = 1500;

type TypingMember = {
  user_id: string;
  full_name: string | null;
};

type TypingPayload = {
  user_id: string;
  full_name: string | null;
};

/** Subscribes to typing broadcasts for a conversation and exposes a
 * `notifyTyping()` to send your own typing event (throttled). */
export function useTypingChannel(
  conversationId: string,
  currentUserId: string,
  currentUserName: string | null,
) {
  const [typers, setTypers] = useState<TypingMember[]>([]);
  const channelRef = useRef<RealtimeChannel | null>(null);
  const lastSentRef = useRef<number>(0);
  const expiryByUserRef = useRef<Map<string, number>>(new Map());

  useEffect(() => {
    const supabase = createClient();
    const channel = supabase
      .channel(`conversation-typing:${conversationId}`, {
        config: { broadcast: { self: false } },
      })
      .on(
        "broadcast",
        { event: "typing" },
        ({ payload }: { payload: TypingPayload }) => {
          if (payload.user_id === currentUserId) return;
          expiryByUserRef.current.set(
            payload.user_id,
            Date.now() + TYPING_TTL_MS,
          );
          updateTypers();
        },
      )
      .subscribe();

    channelRef.current = channel;

    const interval = setInterval(updateTypers, 1000);

    function updateTypers() {
      const now = Date.now();
      const next: TypingMember[] = [];
      for (const [userId, expiry] of expiryByUserRef.current) {
        if (expiry <= now) {
          expiryByUserRef.current.delete(userId);
        } else {
          next.push({ user_id: userId, full_name: null });
        }
      }
      setTypers((prev) => {
        if (prev.length === next.length) {
          const sameIds = prev.every(
            (p, idx) => p.user_id === next[idx]?.user_id,
          );
          if (sameIds) return prev;
        }
        return next;
      });
    }

    return () => {
      clearInterval(interval);
      void supabase.removeChannel(channel);
      channelRef.current = null;
    };
  }, [conversationId, currentUserId]);

  const notifyTyping = useCallback(() => {
    const now = Date.now();
    if (now - lastSentRef.current < TYPING_THROTTLE_MS) return;
    lastSentRef.current = now;
    void channelRef.current?.send({
      type: "broadcast",
      event: "typing",
      payload: {
        user_id: currentUserId,
        full_name: currentUserName,
      } satisfies TypingPayload,
    });
  }, [currentUserId, currentUserName]);

  return { typers, notifyTyping };
}
