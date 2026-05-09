"use client";

import {
  HelpCircle,
  LogOut,
  PlayCircle,
  Send,
  Square,
  UserPlus,
} from "lucide-react";
import { useEffect, useRef, useState, useTransition } from "react";
import { toast } from "sonner";
import { Avatar } from "@/components/ui/Avatar";
import { Button } from "@/components/ui/Button";
import { cn } from "@/lib/utils/cn";
import { createClient } from "@/lib/supabase/client";
import type {
  LiveSession,
  LiveSessionMessage,
  LiveSessionMessageWithAuthor,
  Profile,
} from "@/lib/database.types";
import {
  endLiveSession,
  joinLiveSession,
  leaveLiveSession,
  startLiveSession,
} from "../actions";

type Props = {
  session: LiveSession & {
    host: Pick<Profile, "id" | "full_name" | "username" | "avatar_url"> | null;
  };
  currentUserId: string;
  isHost: boolean;
  initiallyAttending: boolean;
  initialMessages: LiveSessionMessageWithAuthor[];
};

export function LiveSessionRoom({
  session,
  currentUserId,
  isHost,
  initiallyAttending,
  initialMessages,
}: Props) {
  const [attending, setAttending] = useState(initiallyAttending || isHost);
  const [messages, setMessages] = useState(initialMessages);
  const [input, setInput] = useState("");
  const [isQuestion, setIsQuestion] = useState(false);
  const [pendingAction, startActionTransition] = useTransition();
  const [pendingSend, startSendTransition] = useTransition();
  const scrollRef = useRef<HTMLDivElement>(null);

  // Realtime : INSERT messages
  useEffect(() => {
    const supabase = createClient();
    const channel = supabase
      .channel(`live:${session.id}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "live_session_messages",
          filter: `session_id=eq.${session.id}`,
        },
        async (payload) => {
          const row = payload.new as LiveSessionMessage;
          if (messages.some((m) => m.id === row.id)) return;
          // Récupère l'auteur
          const { data: profile } = await supabase
            .from("profiles")
            .select("id, full_name, username, avatar_url")
            .eq("id", row.user_id)
            .maybeSingle();
          setMessages((prev) => {
            if (prev.some((m) => m.id === row.id)) return prev;
            return [...prev, { ...row, author: profile ?? null }];
          });
        },
      )
      .subscribe();
    return () => {
      void supabase.removeChannel(channel);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session.id]);

  useEffect(() => {
    requestAnimationFrame(() => {
      scrollRef.current?.scrollTo({
        top: scrollRef.current.scrollHeight,
        behavior: "smooth",
      });
    });
  }, [messages]);

  function handleJoin() {
    startActionTransition(async () => {
      const result = await joinLiveSession(session.id);
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      setAttending(true);
      toast.success("Tu participes ✨");
    });
  }

  function handleLeave() {
    startActionTransition(async () => {
      const result = await leaveLiveSession(session.id);
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      setAttending(false);
    });
  }

  function handleStart() {
    startActionTransition(async () => {
      const result = await startLiveSession(session.id);
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      toast.success("Live démarré 🎬");
    });
  }

  function handleEnd() {
    if (!confirm("Terminer le live ?")) return;
    startActionTransition(async () => {
      const result = await endLiveSession(session.id);
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      toast.success("Live terminé.");
    });
  }

  function send(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const trimmed = input.trim();
    if (!trimmed) return;
    if (!attending) {
      toast.error("Rejoins le live d'abord.");
      return;
    }
    startSendTransition(async () => {
      const supabase = createClient();
      const { error } = await supabase.from("live_session_messages").insert({
        session_id: session.id,
        user_id: currentUserId,
        body: trimmed,
        is_question: isQuestion,
      });
      if (error) {
        toast.error("Envoi impossible.");
        return;
      }
      setInput("");
      setIsQuestion(false);
    });
  }

  const isLive = session.status === "live";
  const isEnded = session.status === "ended" || session.status === "cancelled";

  return (
    <article className="rounded-3xl bg-white border border-line shadow-soft overflow-hidden flex flex-col h-[600px]">
      <header className="flex items-center justify-between gap-3 px-5 py-3 border-b border-line bg-night/[0.02]">
        <div className="text-sm font-semibold text-night flex items-center gap-2">
          {isLive ? (
            <>
              <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
              <span>Salle en direct</span>
            </>
          ) : isEnded ? (
            <span className="text-night-muted">Replay</span>
          ) : (
            <span className="text-night-muted">Salle d&apos;attente</span>
          )}
        </div>

        <div className="flex items-center gap-2">
          {isHost ? (
            isLive ? (
              <Button
                size="sm"
                variant="danger"
                onClick={handleEnd}
                loading={pendingAction}
              >
                <Square className="w-3.5 h-3.5" aria-hidden />
                Terminer
              </Button>
            ) : !isEnded ? (
              <Button
                size="sm"
                onClick={handleStart}
                loading={pendingAction}
              >
                <PlayCircle className="w-3.5 h-3.5" aria-hidden />
                Démarrer
              </Button>
            ) : null
          ) : attending ? (
            <Button
              size="sm"
              variant="ghost"
              onClick={handleLeave}
              disabled={pendingAction}
              className="text-red-600 hover:bg-red-50"
            >
              <LogOut className="w-3.5 h-3.5" aria-hidden />
              Quitter
            </Button>
          ) : !isEnded ? (
            <Button
              size="sm"
              onClick={handleJoin}
              loading={pendingAction}
            >
              <UserPlus className="w-3.5 h-3.5" aria-hidden />
              Rejoindre
            </Button>
          ) : (
            <span className="text-xs text-muted">Session terminée</span>
          )}
        </div>
      </header>

      <div ref={scrollRef} className="flex-1 overflow-y-auto p-5 space-y-3">
        {messages.length === 0 ? (
          <div className="text-center text-sm text-muted italic py-12">
            Aucun message pour l&apos;instant. Sois le premier à poser une
            question 🎤
          </div>
        ) : (
          messages.map((m) => {
            const author = m.author;
            const name = author?.full_name ?? author?.username ?? "Membre";
            const isMine = m.user_id === currentUserId;
            return (
              <div
                key={m.id}
                className={cn(
                  "flex items-start gap-2",
                  isMine ? "flex-row-reverse" : "",
                )}
              >
                <Avatar
                  src={author?.avatar_url ?? null}
                  fullName={name}
                  size="sm"
                />
                <div
                  className={cn(
                    "max-w-[78%] px-4 py-2 rounded-2xl text-sm shadow-sm",
                    m.is_question
                      ? "bg-gold/15 border border-gold/40 text-night"
                      : isMine
                        ? "bg-night text-cream"
                        : "bg-white border border-line text-night",
                  )}
                >
                  <p className="text-[11px] font-bold opacity-80 mb-0.5">
                    {m.is_question ? "❓ Question · " : ""}
                    {name}
                  </p>
                  <p className="whitespace-pre-wrap break-words">{m.body}</p>
                </div>
              </div>
            );
          })
        )}
      </div>

      {!isEnded ? (
        <form
          onSubmit={send}
          className="flex items-end gap-2 px-4 py-3 border-t border-line bg-white"
        >
          <button
            type="button"
            onClick={() => setIsQuestion((v) => !v)}
            aria-pressed={isQuestion}
            aria-label="Marquer comme question"
            className={cn(
              "w-10 h-10 rounded-full flex items-center justify-center transition-colors",
              isQuestion
                ? "bg-gold/30 text-gold-deep border border-gold/40"
                : "bg-night/5 text-night-muted hover:bg-night/10",
            )}
          >
            <HelpCircle className="w-4 h-4" aria-hidden />
          </button>
          <textarea
            value={input}
            onChange={(e) => setInput(e.currentTarget.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                e.currentTarget.form?.requestSubmit();
              }
            }}
            placeholder={
              attending
                ? isQuestion
                  ? "Pose ta question..."
                  : "Écris un message..."
                : "Rejoins le live pour participer"
            }
            disabled={!attending || pendingSend}
            rows={1}
            maxLength={1000}
            className="flex-1 resize-none rounded-2xl border border-line bg-bg px-4 py-2.5 text-sm focus:outline-none focus:border-night focus:ring-2 focus:ring-night/15 disabled:opacity-60"
          />
          <Button
            type="submit"
            disabled={!attending || pendingSend || input.trim().length === 0}
            size="md"
            className="shrink-0"
            aria-label="Envoyer"
          >
            <Send className="w-4 h-4" aria-hidden />
          </Button>
        </form>
      ) : (
        <div className="px-5 py-4 text-xs text-muted italic text-center border-t border-line bg-night/[0.02]">
          Session terminée — vous voyez le replay du chat.
        </div>
      )}
    </article>
  );
}
