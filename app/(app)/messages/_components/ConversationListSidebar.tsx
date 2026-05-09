"use client";

import { MessageSquarePlus, Search, Users, X } from "lucide-react";
import Link from "next/link";
import { useMemo, useState } from "react";
import { KickerLabel } from "@/components/ui/KickerLabel";
import { cn } from "@/lib/utils/cn";
import { ConversationItem } from "./ConversationItem";
import type { ConversationListItem, PresenceInfo } from "@/lib/database.types";

type ConversationListSidebarProps = {
  conversations: ConversationListItem[];
  currentUserId: string;
  presenceMap: Record<string, PresenceInfo>;
};

type FilterId = "all" | "unread" | "groups";

const FILTERS: { id: FilterId; label: string }[] = [
  { id: "all", label: "Tous" },
  { id: "unread", label: "Non lus" },
  { id: "groups", label: "Groupes" },
];

export function ConversationListSidebar({
  conversations,
  currentUserId,
  presenceMap,
}: ConversationListSidebarProps) {
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<FilterId>("all");

  const filtered = useMemo(() => {
    let items = conversations;

    /* Tab filter. */
    if (filter === "unread") {
      items = items.filter((c) => c.unread_count > 0);
    } else if (filter === "groups") {
      items = items.filter((c) => c.type === "group");
    }

    /* Text search : name + other member name/username + last message body. */
    const q = query.trim().toLowerCase();
    if (q.length > 0) {
      items = items.filter((c) => {
        const haystack = [
          c.name,
          c.other_member?.full_name,
          c.other_member?.username,
          c.last_message?.body,
        ]
          .filter(Boolean)
          .join(" ")
          .toLowerCase();
        return haystack.includes(q);
      });
    }

    return items;
  }, [conversations, filter, query]);

  const unreadCount = useMemo(
    () => conversations.filter((c) => c.unread_count > 0).length,
    [conversations],
  );
  const groupsCount = useMemo(
    () => conversations.filter((c) => c.type === "group").length,
    [conversations],
  );

  return (
    <aside className="flex flex-col border-r border-line bg-bg h-full">
      <header className="px-5 pt-6 pb-4 border-b border-line">
        <div className="flex items-start justify-between mb-4 gap-2">
          <div className="min-w-0">
            <KickerLabel>· Messages</KickerLabel>
            <h2 className="mt-2 font-display italic text-[34px] sm:text-[42px] text-night leading-[1.05] tracking-[-0.02em]">
              Discussions
            </h2>
          </div>
          <div className="flex items-center gap-1.5 mt-1">
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
              className="w-9 h-9 rounded-full bg-gold text-night flex items-center justify-center hover:bg-gold-soft transition-colors shadow-[0_4px_12px_-4px_rgba(244,185,66,0.5)]"
            >
              <MessageSquarePlus className="w-4 h-4" aria-hidden />
            </Link>
          </div>
        </div>

        {/* Search bar — fonctionnelle */}
        <div className="relative">
          <Search
            className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted pointer-events-none"
            aria-hidden
          />
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.currentTarget.value)}
            placeholder="Rechercher une discussion…"
            aria-label="Rechercher dans les discussions"
            className="w-full h-10 rounded-full border border-line bg-white pl-10 pr-9 text-sm text-night placeholder:text-muted/70 focus:outline-none focus:border-gold/40 focus:ring-2 focus:ring-gold/20"
          />
          {query.length > 0 ? (
            <button
              type="button"
              onClick={() => setQuery("")}
              aria-label="Effacer la recherche"
              className="absolute right-2 top-1/2 -translate-y-1/2 w-7 h-7 rounded-full text-muted hover:text-night hover:bg-night/5 flex items-center justify-center transition-colors"
            >
              <X className="w-3.5 h-3.5" aria-hidden />
            </button>
          ) : null}
        </div>

        {/* Filter chips */}
        <nav
          aria-label="Filtres discussions"
          className="mt-3 flex gap-1.5 overflow-x-auto scrollbar-none -mx-1 px-1"
        >
          {FILTERS.map((f) => {
            const active = filter === f.id;
            const count =
              f.id === "unread"
                ? unreadCount
                : f.id === "groups"
                  ? groupsCount
                  : conversations.length;
            return (
              <button
                key={f.id}
                type="button"
                onClick={() => setFilter(f.id)}
                aria-pressed={active}
                className={cn(
                  "shrink-0 inline-flex items-center gap-1.5 h-7 px-3 rounded-full text-[12px] font-bold transition-colors",
                  active
                    ? "bg-night text-cream"
                    : "bg-bg-soft border border-line text-night-soft hover:border-night/30",
                )}
              >
                {f.label}
                {count > 0 ? (
                  <span
                    className={cn(
                      "min-w-[18px] h-[18px] px-1 rounded-full text-[10px] font-extrabold flex items-center justify-center",
                      active ? "bg-gold text-night" : "bg-night/10 text-night",
                    )}
                  >
                    {count}
                  </span>
                ) : null}
              </button>
            );
          })}
        </nav>
      </header>

      <div className="flex-1 overflow-y-auto p-3 space-y-1.5">
        {filtered.length === 0 ? (
          query.trim().length > 0 || filter !== "all" ? (
            <NoResults query={query} filter={filter} onReset={() => {
              setQuery("");
              setFilter("all");
            }} />
          ) : (
            <EmptyConversationList />
          )
        ) : (
          filtered.map((conversation) => {
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

function NoResults({
  query,
  filter,
  onReset,
}: {
  query: string;
  filter: FilterId;
  onReset: () => void;
}) {
  return (
    <div className="text-center py-10 px-4">
      <p className="text-[13px] text-night-muted">
        {query.trim().length > 0 ? (
          <>
            Aucun résultat pour <span className="font-bold text-night">« {query} »</span>
          </>
        ) : filter === "unread" ? (
          "Aucune discussion non lue."
        ) : (
          "Aucun groupe."
        )}
      </p>
      <button
        type="button"
        onClick={onReset}
        className="mt-3 inline-flex items-center gap-1 text-[12px] font-semibold text-gold-deep hover:text-night transition-colors"
      >
        Réinitialiser les filtres →
      </button>
    </div>
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
