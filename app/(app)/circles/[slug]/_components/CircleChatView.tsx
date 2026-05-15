"use client";

/* CircleChatView — chat de groupe temps réel d'un cercle.
 *
 * Architecture :
 *  - Liste de messages scrollable (auto-scroll bottom au nouveau)
 *  - Composer sticky bas avec textarea + Envoyer (Cmd/Ctrl+Enter)
 *  - Supabase Realtime postgres_changes : INSERT/UPDATE/DELETE
 *    sur circle_chat_messages filtré par circle_id
 *  - Optimistic UI : le message envoyé apparaît immédiatement, puis
 *    sera dédupliqué par id quand le Realtime fait son INSERT
 *  - mark_circle_chat_read au mount + à chaque message reçu si la
 *    page est visible
 *  - V1 : pas de thread modal (juste un compteur replies cliquable
 *    qui pourra ouvrir un panel plus tard)
 *
 * iOS PWA / mobile :
 *  - h-full + flex column = utilise toute la hauteur dispo du layout
 *  - Le composer en sticky bottom prend la pb safe-area-inset
 *  - Pas de body-lock ici (le chat est in-flow dans le layout cercle) */

import { Send, Trash2, MessageSquare } from "lucide-react";
import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { Avatar } from "@/components/ui/Avatar";
import type {
  CircleChatMessageWithAuthor,
  Profile,
} from "@/lib/database.types";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils/cn";
import { formatRelative } from "@/lib/utils/relativeTime";
import {
  deleteCircleChatMessage,
  markCircleChatRead,
  sendCircleChatMessage,
  toggleCircleChatReaction,
} from "../chat-actions";

const QUICK_REACTIONS = ["👍", "❤️", "😂", "🔥", "👏", "🎉"] as const;

type ProfileLite = Pick<Profile, "id" | "full_name" | "username" | "avatar_url"> | null;

type Props = {
  circleId: string;
  circleSlug: string;
  circleName: string;
  currentUserId: string;
  currentUserProfile: ProfileLite;
  initialMessages: CircleChatMessageWithAuthor[];
};

export function CircleChatView({
  circleId,
  circleSlug,
  circleName,
  currentUserId,
  currentUserProfile,
  initialMessages,
}: Props) {
  const [messages, setMessages] = useState(initialMessages);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  /* Auto-scroll bottom au mount + nouveau message (si déjà au bas). */
  useLayoutEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    el.scrollTop = el.scrollHeight;
  }, []);

  /* Mark read au mount. */
  useEffect(() => {
    void markCircleChatRead(circleId);
  }, [circleId]);

  /* Supabase Realtime subscription. */
  useEffect(() => {
    const supabase = createClient();
    const channel = supabase
      .channel(`circle-chat:${circleId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "circle_chat_messages",
          filter: `circle_id=eq.${circleId}`,
        },
        async (payload) => {
          const row = payload.new as CircleChatMessageWithAuthor;
          /* Récupère le profil de l'auteur OU les infos du bot.
             RLS l'autorise si membre. */
          let author: CircleChatMessageWithAuthor["author"] = null;
          let bot: CircleChatMessageWithAuthor["bot"] = null;
          if (row.author_id) {
            const { data } = await supabase
              .from("profiles")
              .select("id, full_name, username, avatar_url")
              .eq("id", row.author_id)
              .maybeSingle();
            author = data ?? null;
          } else if (row.bot_id) {
            /* eslint-disable @typescript-eslint/no-explicit-any */
            const { data } = await (supabase as any)
              .from("circle_bots")
              .select("id, name, avatar_url, bot_type")
              .eq("id", row.bot_id)
              .maybeSingle();
            bot = data ?? null;
          }
          /* Ignore les replies (gérés via thread panel séparé V2). */
          if (row.parent_message_id) return;
          setMessages((prev) => {
            /* Déduplique par id (optimistic ajout déjà visible). */
            if (prev.some((m) => m.id === row.id)) return prev;
            return [...prev, { ...row, author, bot }];
          });
          /* Mark read si on est sur la page (visible). */
          if (document.visibilityState === "visible") {
            void markCircleChatRead(circleId);
          }
        },
      )
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "circle_chat_messages",
          filter: `circle_id=eq.${circleId}`,
        },
        (payload) => {
          const row = payload.new as CircleChatMessageWithAuthor;
          setMessages((prev) =>
            prev.map((m) =>
              m.id === row.id
                ? {
                    ...m,
                    body: row.body,
                    edited_at: row.edited_at,
                    deleted_at: row.deleted_at,
                  }
                : m,
            ).filter((m) => !m.deleted_at),
          );
        },
      )
      .subscribe();
    return () => {
      void supabase.removeChannel(channel);
    };
  }, [circleId]);

  /* Auto-scroll bottom si on était déjà près du bas et qu'un nouveau
     message arrive. */
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const nearBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 200;
    if (nearBottom) {
      el.scrollTop = el.scrollHeight;
    }
  }, [messages.length]);

  async function handleSend() {
    const body = input.trim();
    if (!body || sending) return;
    setSending(true);
    /* Optimistic : ajoute un message temporaire (id local). Il sera
       remplacé par le vrai au retour serveur. */
    const tempId = `temp-${Date.now()}`;
    const optimistic: CircleChatMessageWithAuthor = {
      id: tempId,
      circle_id: circleId,
      author_id: currentUserId,
      body,
      parent_message_id: null,
      attachments: null,
      mentions: [],
      created_at: new Date().toISOString(),
      edited_at: null,
      deleted_at: null,
      author: currentUserProfile,
      reactions_summary: {},
      my_reactions: [],
      replies_count: 0,
    };
    setMessages((prev) => [...prev, optimistic]);
    setInput("");

    const res = await sendCircleChatMessage({
      circleId,
      circleSlug,
      body,
    });

    if (!res.ok) {
      toast.error(res.error);
      setMessages((prev) => prev.filter((m) => m.id !== tempId));
    } else {
      /* Remplace l'optimistic par le vrai (avec id réel). Le Realtime
         INSERT déduplique côté listener s'il est plus rapide. */
      setMessages((prev) =>
        prev.map((m) =>
          m.id === tempId
            ? { ...m, id: res.message.id }
            : m,
        ),
      );
    }
    setSending(false);
    textareaRef.current?.focus();
  }

  async function handleDelete(messageId: string) {
    /* Optimistic remove. */
    setMessages((prev) => prev.filter((m) => m.id !== messageId));
    const res = await deleteCircleChatMessage({
      messageId,
      circleSlug,
    });
    if (!res.ok) {
      toast.error(res.error);
    }
  }

  async function handleReact(messageId: string, emoji: string) {
    /* Optimistic toggle. */
    setMessages((prev) =>
      prev.map((m) => {
        if (m.id !== messageId) return m;
        const mine = m.my_reactions ?? [];
        const summary = { ...(m.reactions_summary ?? {}) };
        if (mine.includes(emoji)) {
          summary[emoji] = Math.max((summary[emoji] ?? 1) - 1, 0);
          if (summary[emoji] === 0) delete summary[emoji];
          return {
            ...m,
            my_reactions: mine.filter((e) => e !== emoji),
            reactions_summary: summary,
          };
        }
        summary[emoji] = (summary[emoji] ?? 0) + 1;
        return {
          ...m,
          my_reactions: [...mine, emoji],
          reactions_summary: summary,
        };
      }),
    );
    const res = await toggleCircleChatReaction({ messageId, emoji });
    if (!res.ok) {
      toast.error(res.error);
    }
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
      e.preventDefault();
      void handleSend();
    }
  }

  return (
    <div className="flex flex-col h-[calc(100dvh-220px)] min-h-[500px] bg-white border border-line rounded-3xl overflow-hidden">
      {/* Header */}
      <header className="shrink-0 px-5 py-4 border-b border-line">
        <h1 className="text-sm font-bold text-night flex items-center gap-2">
          <MessageSquare className="w-4 h-4 text-night-muted" aria-hidden />
          Chat de #{circleName}
        </h1>
        <p className="text-[11px] text-night-muted mt-0.5">
          Messages temps réel · @mention pour notifier · Cmd/Ctrl+Entrée pour envoyer
        </p>
      </header>

      {/* Liste messages — scrollable */}
      <div
        ref={scrollRef}
        className="flex-1 min-h-0 overflow-y-auto px-4 sm:px-6 py-4 space-y-3"
      >
        {messages.length === 0 ? (
          <div className="text-center text-[13px] text-night-muted py-12">
            Aucun message pour l'instant. Lance la conversation !
          </div>
        ) : (
          messages.map((m) => (
            <ChatMessageItem
              key={m.id}
              message={m}
              isOwn={m.author_id === currentUserId}
              onDelete={() => handleDelete(m.id)}
              onReact={(emoji) => handleReact(m.id, emoji)}
            />
          ))
        )}
      </div>

      {/* Composer */}
      <div className="shrink-0 px-4 py-3 border-t border-line bg-bg-soft/40">
        <div className="flex items-end gap-2">
          {currentUserProfile ? (
            <Avatar
              src={currentUserProfile.avatar_url}
              fullName={currentUserProfile.full_name ?? "?"}
              size="sm"
            />
          ) : null}
          <div className="flex-1 min-w-0">
            <textarea
              ref={textareaRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Écris un message..."
              rows={1}
              className="w-full px-3 py-2 rounded-2xl bg-white border border-line text-[14px] text-night placeholder:text-night-muted resize-none focus:outline-none focus:ring-2 focus:ring-gold/30 max-h-32"
            />
          </div>
          <button
            type="button"
            onClick={() => void handleSend()}
            disabled={!input.trim() || sending}
            aria-label="Envoyer"
            className="w-10 h-10 rounded-full bg-night text-cream flex items-center justify-center disabled:opacity-40 hover:bg-night-soft transition-colors shrink-0"
          >
            <Send className="w-4 h-4" aria-hidden />
          </button>
        </div>
      </div>
    </div>
  );
}

function ChatMessageItem({
  message,
  isOwn,
  onDelete,
  onReact,
}: {
  message: CircleChatMessageWithAuthor;
  isOwn: boolean;
  onDelete: () => void;
  onReact: (emoji: string) => void;
}) {
  const author = message.author;
  const bot = message.bot;
  const isBot = !!bot;
  const displayName = isBot
    ? bot.name
    : author?.full_name ?? author?.username ?? "Utilisateur";
  const [showReactions, setShowReactions] = useState(false);

  return (
    <div className="group flex items-start gap-2.5">
      {isBot ? (
        /* Bot avatar : carré rounded avec icon 🤖 ou avatar_url custom. */
        <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-gold/20 to-gold/5 border border-gold/30 flex items-center justify-center shrink-0">
          <span className="text-[14px]" aria-hidden>
            🤖
          </span>
        </div>
      ) : (
        <Avatar
          src={author?.avatar_url ?? null}
          fullName={displayName}
          size="sm"
        />
      )}
      <div className="flex-1 min-w-0">
        <div className="flex items-baseline gap-2 mb-0.5">
          <span className="text-[13px] font-bold text-night">{displayName}</span>
          {isBot ? (
            <span className="inline-flex items-center px-1.5 h-4 rounded-full bg-gold/15 text-gold-deep text-[9px] font-extrabold uppercase tracking-[0.08em]">
              Bot
            </span>
          ) : null}
          <span className="text-[11px] text-night-muted tabular-nums">
            {formatRelative(message.created_at)}
          </span>
          {message.edited_at ? (
            <span className="text-[10px] text-night-muted italic">(modifié)</span>
          ) : null}
        </div>
        <p className="text-[14px] text-night leading-relaxed whitespace-pre-wrap break-words [overflow-wrap:anywhere]">
          {message.body}
        </p>

        {/* Reactions summary inline */}
        {message.reactions_summary &&
        Object.keys(message.reactions_summary).length > 0 ? (
          <div className="flex flex-wrap gap-1 mt-1.5">
            {Object.entries(message.reactions_summary).map(([emoji, count]) => {
              const mine = message.my_reactions?.includes(emoji);
              return (
                <button
                  key={emoji}
                  type="button"
                  onClick={() => onReact(emoji)}
                  className={cn(
                    "inline-flex items-center gap-1 h-6 px-2 rounded-full border text-[11px] font-semibold transition-colors",
                    mine
                      ? "bg-gold/10 border-gold/40 text-night"
                      : "bg-white border-line text-night-muted hover:border-night/30",
                  )}
                >
                  <span>{emoji}</span>
                  <span className="tabular-nums">{count}</span>
                </button>
              );
            })}
          </div>
        ) : null}
      </div>

      {/* Hover actions : reactions picker + delete (own). Caché pour
          les messages bot (V1 : pas de réactions/delete sur bot). */}
      {isBot ? null : (
      <div className="opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1 shrink-0">
        <div className="relative">
          <button
            type="button"
            onClick={() => setShowReactions((v) => !v)}
            aria-label="Ajouter une réaction"
            className="w-7 h-7 rounded-full bg-white border border-line text-night-muted hover:text-night hover:border-night/30 flex items-center justify-center"
          >
            <span className="text-sm leading-none">😀</span>
          </button>
          {showReactions ? (
            <div className="absolute right-0 top-9 z-10 bg-white border border-line rounded-full shadow-soft p-1 flex items-center gap-0.5">
              {QUICK_REACTIONS.map((emoji) => (
                <button
                  key={emoji}
                  type="button"
                  onClick={() => {
                    onReact(emoji);
                    setShowReactions(false);
                  }}
                  className="w-7 h-7 rounded-full hover:bg-night/5 flex items-center justify-center text-base"
                  aria-label={`Réagir avec ${emoji}`}
                >
                  {emoji}
                </button>
              ))}
            </div>
          ) : null}
        </div>
        {isOwn ? (
          <button
            type="button"
            onClick={onDelete}
            aria-label="Supprimer"
            className="w-7 h-7 rounded-full bg-white border border-line text-red-500 hover:bg-red-50 flex items-center justify-center"
          >
            <Trash2 className="w-3.5 h-3.5" aria-hidden />
          </button>
        ) : null}
      </div>
      )}
    </div>
  );
}
