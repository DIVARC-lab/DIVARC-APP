import { MessageSquarePlus, Search, Users } from "lucide-react";
import Link from "next/link";
import { ConversationItem } from "./ConversationItem";
import type { ConversationListItem, PresenceInfo } from "@/lib/database.types";

type ConversationListSidebarProps = {
  conversations: ConversationListItem[];
  currentUserId: string;
  presenceMap: Record<string, PresenceInfo>;
};

export function ConversationListSidebar({
  conversations,
  currentUserId,
  presenceMap,
}: ConversationListSidebarProps) {
  return (
    <aside className="flex flex-col border-r border-line bg-bg h-full">
      <header className="px-5 py-5 border-b border-line">
        <div className="flex items-center justify-between mb-4 gap-2">
          <h2 className="font-display text-2xl text-night">Discussions</h2>
          <div className="flex items-center gap-1.5">
            <Link
              href="/messages/new-group"
              aria-label="Nouveau groupe"
              title="Nouveau groupe"
              className="w-9 h-9 rounded-full bg-white border border-line text-night-muted flex items-center justify-center hover:border-night/30 hover:text-night transition-colors"
            >
              <Users className="w-4 h-4" aria-hidden />
            </Link>
            <Link
              href="/messages/new"
              aria-label="Nouvelle conversation"
              title="Nouvelle discussion"
              className="w-9 h-9 rounded-full bg-night text-cream flex items-center justify-center hover:bg-night-soft transition-colors"
            >
              <MessageSquarePlus className="w-4 h-4" aria-hidden />
            </Link>
          </div>
        </div>
        <div className="relative">
          <Search
            className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted pointer-events-none"
            aria-hidden
          />
          <input
            type="search"
            placeholder="Rechercher une discussion..."
            disabled
            className="w-full h-10 rounded-xl border border-line bg-white pl-9 pr-3 text-sm placeholder:text-muted/70 disabled:opacity-70"
          />
        </div>
      </header>

      <div className="flex-1 overflow-y-auto p-3 space-y-1.5">
        {conversations.length === 0 ? (
          <EmptyConversationList />
        ) : (
          conversations.map((conversation) => {
            const otherId = conversation.other_member?.user_id;
            const presence = otherId ? presenceMap[otherId] ?? null : null;
            return (
              <ConversationItem
                key={conversation.id}
                conversation={conversation}
                currentUserId={currentUserId}
                presence={presence}
              />
            );
          })
        )}
      </div>
    </aside>
  );
}

function EmptyConversationList() {
  return (
    <div className="text-center py-12 px-4">
      <div
        aria-hidden
        className="w-16 h-16 mx-auto rounded-2xl bg-gradient-to-br from-cream to-gold/20 border border-gold/30 flex items-center justify-center mb-4 text-3xl leading-none"
      >
        💬
      </div>
      <h3 className="font-display text-lg text-night">Aucune discussion</h3>
      <p className="mt-1 text-xs text-muted leading-relaxed">
        Démarre ta première conversation en cliquant sur le bouton{" "}
        <span className="inline-flex w-5 h-5 rounded-md bg-night text-cream items-center justify-center align-middle text-[10px]">
          +
        </span>{" "}
        en haut.
      </p>
    </div>
  );
}
