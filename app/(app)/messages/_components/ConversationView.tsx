"use client";

import { useState } from "react";
import type {
  Message,
  MessageReactionSummary,
  MessageReplyContext,
} from "@/lib/database.types";
import { MessageComposer } from "./MessageComposer";
import { MessageThread } from "./MessageThread";

type OtherMember = {
  user_id: string;
  full_name: string | null;
  username: string | null;
  avatar_url: string | null;
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
}: ConversationViewProps) {
  const [replyTo, setReplyTo] = useState<MessageReplyContext | null>(null);

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
      />
    </>
  );
}
