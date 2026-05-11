"use client";

import { useState } from "react";
import type {
  Message,
  MessageReactionSummary,
  MessageReplyContext,
} from "@/lib/database.types";
import { useConversationCrypto } from "@/lib/hooks/useConversationCrypto";
import { MessageComposer } from "./MessageComposer";
import { MessageThread } from "./MessageThread";

type OtherMember = {
  user_id: string;
  full_name: string | null;
  username: string | null;
  avatar_url: string | null;
};

type SecretContext = {
  peerUserId: string | null;
  isEffectiveSecret: boolean;
};

type ConversationViewProps = {
  conversationId: string;
  currentUserId: string;
  initialMessages: Message[];
  initialReactions: Record<string, MessageReactionSummary[]>;
  initialOtherLastReadAt: string | null;
  otherMember: OtherMember | null;
  memberMap: Record<string, OtherMember>;
  isGroup: boolean;
  secretContext?: SecretContext | null;
};

export function ConversationView({
  conversationId,
  currentUserId,
  initialMessages,
  initialReactions,
  initialOtherLastReadAt,
  otherMember,
  memberMap,
  isGroup,
  secretContext = null,
}: ConversationViewProps) {
  const [replyTo, setReplyTo] = useState<MessageReplyContext | null>(null);

  /* Hook crypto pour cette conv. Si pas de secretContext OU pas
     effective, le hook reste à state "no_secret" et encrypt n'est
     jamais appelé. */
  const convCrypto = useConversationCrypto({
    conversationId,
    peerUserId: secretContext?.peerUserId ?? null,
    isEffectiveSecret: secretContext?.isEffectiveSecret ?? false,
  });

  const isSecretAndReady =
    secretContext?.isEffectiveSecret === true && convCrypto.isReady;
  const secretLabel: string | null = !secretContext?.isEffectiveSecret
    ? null
    : convCrypto.state === "ready"
      ? "🔐 Mode secret actif"
      : convCrypto.state === "needs_unlock"
        ? "🔒 Coffre verrouillé"
        : convCrypto.state === "establishing"
          ? "⏳ Établissement session…"
          : "⚠️ Session indisponible";

  return (
    <>
      <MessageThread
        conversationId={conversationId}
        currentUserId={currentUserId}
        initialMessages={initialMessages}
        initialReactions={initialReactions}
        initialOtherLastReadAt={initialOtherLastReadAt}
        otherMember={otherMember}
        memberMap={memberMap}
        isGroup={isGroup}
        onReply={setReplyTo}
      />
      <MessageComposer
        conversationId={conversationId}
        senderId={currentUserId}
        replyTo={replyTo}
        onClearReply={() => setReplyTo(null)}
        encryptFn={isSecretAndReady ? convCrypto.encrypt : undefined}
        secretLabel={secretLabel}
      />
    </>
  );
}
