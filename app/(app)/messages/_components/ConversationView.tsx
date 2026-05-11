"use client";

import { useEffect, useMemo, useState } from "react";
import type {
  Message,
  MessageReactionSummary,
  MessageReplyContext,
} from "@/lib/database.types";
import { useConversationCrypto } from "@/lib/hooks/useConversationCrypto";
import { ConversationSearchBar } from "./ConversationSearchBar";
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

  /* Recherche dans la conversation. Déclenchée par bouton search dans
     ChatHeader via window event (les 2 composants sont siblings). */
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeMatchIndex, setActiveMatchIndex] = useState(0);
  const [matchedIds, setMatchedIds] = useState<string[]>([]);

  useEffect(() => {
    function handleOpen() {
      setSearchOpen(true);
    }
    window.addEventListener("divarc:open-conv-search", handleOpen);
    return () =>
      window.removeEventListener("divarc:open-conv-search", handleOpen);
  }, []);

  /* Calcul des matches : tous les messages dont body inclut la query
     (case-insensitive). On ignore les messages secrets pour V1 (le
     déchiffrement est asynchrone côté Bubble, pas accessible ici). */
  useEffect(() => {
    const q = searchQuery.trim().toLowerCase();
    if (q.length === 0 || !searchOpen) {
      setMatchedIds([]);
      setActiveMatchIndex(0);
      return;
    }
    const matches: string[] = [];
    for (const m of initialMessages) {
      if (m.is_secret) continue;
      if (m.body && m.body.toLowerCase().includes(q)) matches.push(m.id);
    }
    setMatchedIds(matches);
    setActiveMatchIndex(0);
  }, [searchQuery, searchOpen, initialMessages]);

  const activeMatchId = useMemo(
    () => matchedIds[activeMatchIndex] ?? null,
    [matchedIds, activeMatchIndex],
  );

  function handleNext() {
    if (matchedIds.length === 0) return;
    setActiveMatchIndex((i) => (i + 1) % matchedIds.length);
  }
  function handlePrev() {
    if (matchedIds.length === 0) return;
    setActiveMatchIndex(
      (i) => (i - 1 + matchedIds.length) % matchedIds.length,
    );
  }
  function handleCloseSearch() {
    setSearchOpen(false);
    setSearchQuery("");
  }

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
      <ConversationSearchBar
        open={searchOpen}
        query={searchQuery}
        onQueryChange={setSearchQuery}
        onClose={handleCloseSearch}
        matchCount={matchedIds.length}
        activeMatchIndex={activeMatchIndex}
        onPrev={handlePrev}
        onNext={handleNext}
      />
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
        decryptFn={isSecretAndReady ? convCrypto.decrypt : undefined}
        decryptBytesFn={isSecretAndReady ? convCrypto.decryptBytes : undefined}
        searchQuery={searchOpen ? searchQuery : ""}
        activeMatchId={activeMatchId}
      />
      <MessageComposer
        conversationId={conversationId}
        senderId={currentUserId}
        replyTo={replyTo}
        onClearReply={() => setReplyTo(null)}
        encryptFn={isSecretAndReady ? convCrypto.encrypt : undefined}
        encryptBytesFn={isSecretAndReady ? convCrypto.encryptBytes : undefined}
        secretLabel={secretLabel}
      />
    </>
  );
}
