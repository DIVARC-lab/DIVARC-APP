import { MessageSquarePlus, Search } from "lucide-react";
import Link from "next/link";
import { ConversationItem } from "./ConversationItem";
import type { ConversationListItem } from "@/lib/database.types";

type ConversationListSidebarProps = {
  conversations: ConversationListItem[];
  currentUserId: string;
};

export function ConversationListSidebar({
  conversations,
  currentUserId,
}: ConversationListSidebarProps) {
  return (
    <aside className="flex flex-col border-r border-line bg-bg h-full">
      <header className="px-5 py-5 border-b border-line">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-display text-2xl text-night">Discussions</h2>
          <Link
            href="/messages/new"
            aria-label="Nouvelle conversation"
            className="w-9 h-9 rounded-full bg-night text-cream flex items-center justify-center hover:bg-night-soft transition-colors"
          >
            <MessageSquarePlus className="w-4 h-4" aria-hidden />
          </Link>
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
          conversations.map((conversation) => (
            <ConversationItem
              key={conversation.id}
              conversation={conversation}
              currentUserId={currentUserId}
            />
          ))
        )}
      </div>
    </aside>
  );
}

function EmptyConversationList() {
  return (
    <div className="text-center py-12 px-4">
      <div className="w-14 h-14 mx-auto rounded-2xl bg-night/5 flex items-center justify-center mb-4">
        <MessageSquarePlus className="w-6 h-6 text-night-muted" aria-hidden />
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
