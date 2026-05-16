"use client";

/* Drawer chat live avec Supabase Realtime (instantané TikTok-like).
 *
 * - Initial load : 50 derniers messages via RPC
 * - Realtime subscribe sur live_chat_messages WHERE session_id=X
 *   → INSERT/UPDATE/DELETE broadcastés instantanément (~100ms)
 * - Form input rate-limited côté DB (1 msg / 2s) — UI affiche cooldown
 * - Host peut supprimer (X) sur hover ; user peut supprimer son propre msg
 */

import {
  Loader2,
  LogOut,
  MessageSquare,
  Pin,
  PinOff,
  Send,
  Trash2,
  X,
} from "lucide-react";
import { useEffect, useRef, useState, useTransition } from "react";
import { toast } from "sonner";
import { Avatar } from "@/components/ui/Avatar";
import { createClient } from "@/lib/supabase/client";
import {
  kickFromLive,
  pinChatMessage,
  unpinChatMessage,
} from "../admin-actions";
import {
  deleteLiveChatMessage,
  sendLiveChatMessage,
} from "../chat-actions";

type Msg = {
  id: string;
  user_id: string;
  content: string;
  is_pinned: boolean;
  created_at: string;
  full_name: string | null;
  username: string | null;
  avatar_url: string | null;
};

type Props = {
  sessionId: string;
  open: boolean;
  onClose: () => void;
  currentUserId: string;
  hostId: string;
};

const COOLDOWN_MS = 2000;

export function LiveChatPanel({
  sessionId,
  open,
  onClose,
  currentUserId,
  hostId,
}: Props) {
  const [messages, setMessages] = useState<Msg[]>([]);
  const [content, setContent] = useState("");
  const [lastSentAt, setLastSentAt] = useState<number>(0);
  const [cooldownRemaining, setCooldownRemaining] = useState<number>(0);
  const [isPending, startTransition] = useTransition();
  const listRef = useRef<HTMLUListElement | null>(null);
  const lastTimestampRef = useRef<string | null>(null);
  const isHost = currentUserId === hostId;

  /* Initial load + Supabase Realtime subscribe.
     - 1 fetch initial pour les 50 derniers messages
     - 1 channel "live-chat-{sessionId}" qui écoute INSERT/DELETE de la
       table live_chat_messages filtré par session_id
     - INSERT → ajoute au state. Si profile pas en cache, on fetch
       à la volée (1 select rapide). */
  useEffect(() => {
    if (!open) return;
    let alive = true;

    async function loadInitial() {
      try {
        const url = new URL(
          `/api/lives/${sessionId}/chat`,
          window.location.origin,
        );
        url.searchParams.set("limit", "50");
        const res = await fetch(url.toString(), { cache: "no-store" });
        if (!res.ok) return;
        const data = (await res.json()) as { items: Msg[] };
        if (!alive) return;
        setMessages(data.items);
        const last = data.items[data.items.length - 1];
        lastTimestampRef.current = last?.created_at ?? null;
      } catch {
        /* silencieux */
      }
    }

    void loadInitial();

    const supabase = createClient();
    const channel = supabase
      .channel(`live-chat-${sessionId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "live_chat_messages",
          filter: `session_id=eq.${sessionId}`,
        },
        async (payload) => {
          if (!alive) return;
          /* eslint-disable-next-line @typescript-eslint/no-explicit-any */
          const row = payload.new as any;
          if (row.deleted_at) return;

          /* Fetch profile pour avatar + nom (Realtime ne joint pas). */
          /* eslint-disable-next-line @typescript-eslint/no-explicit-any */
          const { data: prof } = await (supabase as any)
            .from("profiles")
            .select("full_name, username, avatar_url")
            .eq("id", row.user_id)
            .maybeSingle();
          if (!alive) return;

          const msg: Msg = {
            id: row.id,
            user_id: row.user_id,
            content: row.content,
            is_pinned: row.is_pinned ?? false,
            created_at: row.created_at,
            full_name: prof?.full_name ?? null,
            username: prof?.username ?? null,
            avatar_url: prof?.avatar_url ?? null,
          };

          setMessages((prev) => {
            if (prev.some((m) => m.id === msg.id)) return prev;
            return [...prev, msg];
          });
          lastTimestampRef.current = msg.created_at;
        },
      )
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "live_chat_messages",
          filter: `session_id=eq.${sessionId}`,
        },
        (payload) => {
          if (!alive) return;
          /* eslint-disable-next-line @typescript-eslint/no-explicit-any */
          const row = payload.new as any;
          /* Soft-delete = filter out. */
          if (row.deleted_at) {
            setMessages((prev) => prev.filter((m) => m.id !== row.id));
          }
        },
      )
      .subscribe();

    return () => {
      alive = false;
      void supabase.removeChannel(channel);
    };
  }, [sessionId, open]);

  /* Auto-scroll vers le bas quand nouveau message. */
  useEffect(() => {
    if (!listRef.current) return;
    listRef.current.scrollTop = listRef.current.scrollHeight;
  }, [messages.length]);

  /* Cooldown UI countdown. */
  useEffect(() => {
    if (lastSentAt === 0) return;
    const interval = window.setInterval(() => {
      const elapsed = Date.now() - lastSentAt;
      const remaining = Math.max(0, COOLDOWN_MS - elapsed);
      setCooldownRemaining(remaining);
      if (remaining === 0) window.clearInterval(interval);
    }, 100);
    return () => window.clearInterval(interval);
  }, [lastSentAt]);

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const trimmed = content.trim();
    if (trimmed.length === 0) return;
    if (cooldownRemaining > 0) {
      toast("Attends un peu avant ton prochain message.");
      return;
    }
    startTransition(async () => {
      const res = await sendLiveChatMessage({
        sessionId,
        content: trimmed,
      });
      if (!res.ok) {
        toast.error(res.error);
        return;
      }
      setContent("");
      setLastSentAt(Date.now());
    });
  }

  function handleDelete(messageId: string) {
    startTransition(async () => {
      const res = await deleteLiveChatMessage({ messageId });
      if (!res.ok) {
        toast.error(res.error);
        return;
      }
      setMessages((prev) => prev.filter((m) => m.id !== messageId));
    });
  }

  function handlePin(message: Msg) {
    startTransition(async () => {
      if (message.is_pinned) {
        const res = await unpinChatMessage({ messageId: message.id });
        if (!res.ok) {
          toast.error(res.error);
          return;
        }
        setMessages((prev) =>
          prev.map((m) => (m.id === message.id ? { ...m, is_pinned: false } : m)),
        );
      } else {
        const res = await pinChatMessage({ messageId: message.id });
        if (!res.ok) {
          toast.error(res.error);
          return;
        }
        setMessages((prev) =>
          prev.map((m) => ({
            ...m,
            is_pinned: m.id === message.id,
          })),
        );
        toast.success("Message épinglé en haut du chat.");
      }
    });
  }

  function handleKick(userId: string, name: string) {
    if (!confirm(`Exclure ${name} du live ?`)) return;
    startTransition(async () => {
      const res = await kickFromLive({ sessionId, userId });
      if (!res.ok) {
        toast.error(res.error);
        return;
      }
      toast.success(`${name} a été exclu·e du live.`);
    });
  }

  const pinnedMessage = messages.find((m) => m.is_pinned) ?? null;

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-stretch sm:justify-end bg-night/40 backdrop-blur-sm"
      onClick={onClose}
    >
      <aside
        onClick={(e) => e.stopPropagation()}
        className="w-full sm:max-w-sm h-[80vh] sm:h-full bg-night/95 border-t sm:border-t-0 sm:border-l border-cream/15 text-cream flex flex-col rounded-t-3xl sm:rounded-none shadow-2xl"
        aria-label="Chat du live"
      >
        <header className="flex items-center justify-between px-4 py-3 border-b border-cream/10">
          <div className="flex items-center gap-2">
            <MessageSquare className="w-4 h-4 text-gold" aria-hidden />
            <p className="text-[12px] font-extrabold uppercase tracking-wider text-cream">
              Chat
            </p>
            <span className="text-[10px] text-cream/50 tabular-nums">
              · {messages.length}
            </span>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Fermer le chat"
            className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-cream/10 hover:bg-cream/20 transition-colors"
          >
            <X className="w-4 h-4" aria-hidden />
          </button>
        </header>

        {/* Message épinglé en bandeau top (TikTok-style) */}
        {pinnedMessage ? (
          <div className="px-3 py-2 bg-gold/15 border-b border-gold/30 flex items-start gap-2">
            <Pin
              className="w-3.5 h-3.5 text-gold mt-0.5 shrink-0"
              aria-hidden
            />
            <div className="flex-1 min-w-0">
              <p className="text-[10px] font-bold uppercase tracking-wider text-gold mb-0.5">
                Épinglé · {pinnedMessage.full_name ??
                  pinnedMessage.username ??
                  "Spectateur"}
              </p>
              <p className="text-[12px] text-cream/90 leading-snug break-words">
                {pinnedMessage.content}
              </p>
            </div>
            {isHost ? (
              <button
                type="button"
                onClick={() => handlePin(pinnedMessage)}
                disabled={isPending}
                aria-label="Désépingler"
                className="shrink-0 inline-flex items-center justify-center w-6 h-6 rounded-full text-cream/60 hover:bg-cream/10 hover:text-cream transition-colors"
              >
                <PinOff className="w-3 h-3" aria-hidden />
              </button>
            ) : null}
          </div>
        ) : null}

        <ul
          ref={listRef}
          className="flex-1 overflow-y-auto px-3 py-3 space-y-2 scrollbar-hide"
          aria-live="polite"
        >
          {messages.length === 0 ? (
            <li className="text-[12px] text-cream/50 text-center py-8">
              Pas encore de message. Lance la conversation !
            </li>
          ) : (
            messages.map((m) => {
              const name = m.full_name ?? m.username ?? "Spectateur";
              const isMine = m.user_id === currentUserId;
              const isFromHost = m.user_id === hostId;
              const canDelete = isMine || isHost;
              return (
                <li
                  key={m.id}
                  className="group flex items-start gap-2 rounded-xl px-2 py-1.5 hover:bg-cream/5"
                >
                  <Avatar
                    src={m.avatar_url}
                    fullName={name}
                    size="sm"
                  />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5">
                      <span
                        className={`text-[11px] font-bold truncate ${
                          isFromHost
                            ? "text-gold"
                            : isMine
                              ? "text-cream"
                              : "text-cream/80"
                        }`}
                      >
                        {name}
                      </span>
                      {isFromHost ? (
                        <span className="inline-flex items-center h-3.5 px-1 rounded-sm bg-gold text-night text-[8px] font-extrabold uppercase tracking-wider">
                          Host
                        </span>
                      ) : null}
                    </div>
                    <p className="text-[12.5px] text-cream/90 leading-snug break-words mt-0.5">
                      {m.content}
                    </p>
                  </div>
                  <div className="shrink-0 opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-0.5">
                    {isHost && !isFromHost ? (
                      <button
                        type="button"
                        onClick={() => handlePin(m)}
                        disabled={isPending}
                        aria-label={m.is_pinned ? "Désépingler" : "Épingler"}
                        title={m.is_pinned ? "Désépingler" : "Épingler"}
                        className="inline-flex items-center justify-center w-6 h-6 rounded-full text-cream/60 hover:bg-gold/20 hover:text-gold"
                      >
                        {m.is_pinned ? (
                          <PinOff className="w-3 h-3" aria-hidden />
                        ) : (
                          <Pin className="w-3 h-3" aria-hidden />
                        )}
                      </button>
                    ) : null}
                    {isHost && !isMine ? (
                      <button
                        type="button"
                        onClick={() => handleKick(m.user_id, name)}
                        disabled={isPending}
                        aria-label="Exclure du live"
                        title="Exclure du live"
                        className="inline-flex items-center justify-center w-6 h-6 rounded-full text-cream/60 hover:bg-rose-500/20 hover:text-rose-300"
                      >
                        <LogOut className="w-3 h-3" aria-hidden />
                      </button>
                    ) : null}
                    {canDelete ? (
                      <button
                        type="button"
                        onClick={() => handleDelete(m.id)}
                        disabled={isPending}
                        aria-label="Supprimer le message"
                        title="Supprimer"
                        className="inline-flex items-center justify-center w-6 h-6 rounded-full text-cream/60 hover:bg-rose-500/20 hover:text-rose-300"
                      >
                        <Trash2 className="w-3 h-3" aria-hidden />
                      </button>
                    ) : null}
                  </div>
                </li>
              );
            })
          )}
        </ul>

        <form
          onSubmit={handleSubmit}
          className="border-t border-cream/10 p-3 flex items-center gap-2"
        >
          <input
            type="text"
            value={content}
            onChange={(e) => setContent(e.target.value.slice(0, 400))}
            maxLength={400}
            placeholder={
              cooldownRemaining > 0
                ? `Attends ${Math.ceil(cooldownRemaining / 1000)}s…`
                : "Écris un message…"
            }
            disabled={isPending}
            className="flex-1 h-10 px-3 rounded-full bg-cream/10 text-cream text-[13px] placeholder:text-cream/40 focus:outline-none focus:bg-cream/15 border border-transparent focus:border-cream/30 disabled:opacity-60"
          />
          <button
            type="submit"
            disabled={
              isPending || content.trim().length === 0 || cooldownRemaining > 0
            }
            aria-label="Envoyer"
            className="inline-flex items-center justify-center w-10 h-10 rounded-full bg-gold text-night hover:bg-gold/90 transition-colors disabled:opacity-50"
          >
            {isPending ? (
              <Loader2 className="w-4 h-4 animate-spin" aria-hidden />
            ) : (
              <Send className="w-4 h-4" aria-hidden />
            )}
          </button>
        </form>
      </aside>
    </div>
  );
}
