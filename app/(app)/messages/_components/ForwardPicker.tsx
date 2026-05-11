"use client";

import { Forward, Search, X } from "lucide-react";
import { useEffect, useState, useTransition } from "react";
import { toast } from "sonner";
import { Avatar } from "@/components/ui/Avatar";
import { createClient } from "@/lib/supabase/client";
import type { ConversationListItem } from "@/lib/database.types";
import { forwardMessage } from "../message-actions";

type ForwardPickerProps = {
  open: boolean;
  onClose: () => void;
  messageId: string;
  currentUserId: string;
};

/* Modal pour transférer un message vers une autre conversation.
 * Fetch les conversations côté client à l'ouverture (rare action,
 * pas la peine de pré-fetch dans le layout). */
export function ForwardPicker({
  open,
  onClose,
  messageId,
  currentUserId,
}: ForwardPickerProps) {
  const [conversations, setConversations] = useState<ConversationListItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [query, setQuery] = useState("");
  const [pending, startTransition] = useTransition();

  useEffect(() => {
    if (!open) return;
    setLoading(true);
    const supabase = createClient();
    /* Re-implémente listConversationsForUser côté client en simple
       (pas de RLS-fight, on a juste besoin d'id + nom + avatar). */
    (async () => {
      const { data: memberRows } = await supabase
        .from("conversation_members")
        .select("conversation_id, is_archived")
        .eq("user_id", currentUserId);

      const visibleIds = (memberRows ?? [])
        .filter((m) => !m.is_archived)
        .map((m) => m.conversation_id);

      if (visibleIds.length === 0) {
        setConversations([]);
        setLoading(false);
        return;
      }

      const { data: convs } = await supabase
        .from("conversations")
        .select("id, type, name, avatar_url, last_message_at")
        .in("id", visibleIds)
        .order("last_message_at", { ascending: false })
        .limit(50);

      /* Direct → résoudre le profil de l'autre membre pour afficher
         son nom. */
      const directConvIds = (convs ?? [])
        .filter((c) => c.type === "direct")
        .map((c) => c.id);

      const otherMemberByConv = new Map<string, string>();
      if (directConvIds.length > 0) {
        const { data: allMembers } = await supabase
          .from("conversation_members")
          .select("conversation_id, user_id")
          .in("conversation_id", directConvIds);
        for (const m of allMembers ?? []) {
          if (m.user_id !== currentUserId) {
            otherMemberByConv.set(m.conversation_id, m.user_id);
          }
        }
      }

      const otherUserIds = Array.from(new Set(otherMemberByConv.values()));
      const profileById = new Map<
        string,
        { full_name: string | null; username: string | null; avatar_url: string | null }
      >();
      if (otherUserIds.length > 0) {
        const { data: profiles } = await supabase
          .from("profiles")
          .select("id, full_name, username, avatar_url")
          .in("id", otherUserIds);
        for (const p of profiles ?? []) {
          profileById.set(p.id, p);
        }
      }

      const items: ConversationListItem[] = (convs ?? []).map((c) => {
        const otherId = otherMemberByConv.get(c.id) ?? null;
        const profile = otherId ? profileById.get(otherId) ?? null : null;
        return {
          id: c.id,
          type: c.type,
          name: c.name,
          avatar_url: c.avatar_url,
          last_message_at: c.last_message_at,
          last_read_at: c.last_message_at,
          unread_count: 0,
          is_pinned: false,
          is_archived: false,
          is_muted: false,
          mute_until: null,
          wants_secret: false,
          other_member: profile && otherId
            ? {
                user_id: otherId,
                full_name: profile.full_name,
                username: profile.username,
                avatar_url: profile.avatar_url,
              }
            : null,
          last_message: null,
        };
      });

      setConversations(items);
      setLoading(false);
    })();
  }, [open, currentUserId]);

  useEffect(() => {
    if (!open) return;
    function handleKey(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
    }
    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, [open, onClose]);

  if (!open) return null;

  const q = query.trim().toLowerCase();
  const filtered = q.length === 0
    ? conversations
    : conversations.filter((c) => {
        const hay = [c.name, c.other_member?.full_name, c.other_member?.username]
          .filter(Boolean)
          .join(" ")
          .toLowerCase();
        return hay.includes(q);
      });

  function handlePick(targetConvId: string) {
    startTransition(async () => {
      const res = await forwardMessage(messageId, targetConvId);
      if (res.ok) {
        toast.success("Message transféré.");
        onClose();
      } else {
        toast.error(res.error);
      }
    });
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Transférer le message"
      onClick={onClose}
      className="fixed inset-0 z-50 flex items-center justify-center bg-night/40 backdrop-blur-sm p-4"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-md bg-bg rounded-3xl border border-line shadow-[0_20px_60px_-20px_rgba(10,31,68,0.4)] overflow-hidden flex flex-col max-h-[80vh]"
      >
        <header className="px-5 pt-5 pb-3 border-b border-line flex items-center gap-2">
          <Forward className="w-4 h-4 text-night-muted" aria-hidden />
          <h2 className="text-sm font-bold text-night flex-1">
            Transférer vers…
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Fermer"
            className="w-8 h-8 rounded-full hover:bg-night/5 flex items-center justify-center text-night-muted"
          >
            <X className="w-4 h-4" aria-hidden />
          </button>
        </header>

        <div className="px-5 py-3 relative border-b border-line">
          <Search
            className="absolute left-8 top-1/2 -translate-y-1/2 w-4 h-4 text-muted pointer-events-none"
            aria-hidden
          />
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.currentTarget.value)}
            placeholder="Rechercher une discussion…"
            className="w-full h-10 rounded-full border border-line bg-white pl-10 pr-4 text-sm text-night placeholder:text-muted/70 focus:outline-none focus:border-gold/40 focus:ring-2 focus:ring-gold/20"
          />
        </div>

        <div className="flex-1 overflow-y-auto p-3">
          {loading ? (
            <p className="text-center py-8 text-xs text-muted">
              Chargement…
            </p>
          ) : filtered.length === 0 ? (
            <p className="text-center py-8 text-xs text-muted">
              Aucune conversation trouvée.
            </p>
          ) : (
            <ul className="space-y-1">
              {filtered.map((conv) => {
                const name =
                  conv.other_member?.full_name ??
                  conv.other_member?.username ??
                  conv.name ??
                  "Conversation";
                return (
                  <li key={conv.id}>
                    <button
                      type="button"
                      onClick={() => handlePick(conv.id)}
                      disabled={pending}
                      className="w-full flex items-center gap-3 p-2.5 rounded-2xl hover:bg-night/5 text-left transition-colors disabled:opacity-50"
                    >
                      <Avatar
                        src={
                          conv.other_member?.avatar_url ?? conv.avatar_url
                        }
                        fullName={name}
                        size="sm"
                      />
                      <span className="flex-1 min-w-0">
                        <span className="block text-sm font-semibold text-night truncate">
                          {name}
                        </span>
                        {conv.other_member?.username ? (
                          <span className="block text-xs text-muted truncate">
                            @{conv.other_member.username}
                          </span>
                        ) : null}
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
