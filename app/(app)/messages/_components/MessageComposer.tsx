"use client";

import { Send } from "lucide-react";
import { useEffect, useRef, useState, useTransition } from "react";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";

const MAX_LENGTH = 4000;

type MessageComposerProps = {
  conversationId: string;
  senderId: string;
};

function draftKey(conversationId: string) {
  return `divarc:draft:${conversationId}`;
}

export function MessageComposer({
  conversationId,
  senderId,
}: MessageComposerProps) {
  const [body, setBody] = useState("");
  const [pending, startTransition] = useTransition();
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Load draft from localStorage
  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      const stored = window.localStorage.getItem(draftKey(conversationId));
      if (stored) {
        setBody(stored);
        requestAnimationFrame(() => resize());
      }
    } catch {
      /* ignore */
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [conversationId]);

  // Persist draft on change
  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      if (body.length > 0) {
        window.localStorage.setItem(draftKey(conversationId), body);
      } else {
        window.localStorage.removeItem(draftKey(conversationId));
      }
    } catch {
      /* ignore */
    }
  }, [body, conversationId]);

  function resize() {
    const ta = textareaRef.current;
    if (!ta) return;
    ta.style.height = "auto";
    ta.style.height = `${Math.min(ta.scrollHeight, 180)}px`;
  }

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const trimmed = body.trim();
    if (!trimmed || pending) return;

    // Optimistic clear (will resync via realtime)
    setBody("");
    requestAnimationFrame(resize);

    startTransition(async () => {
      const supabase = createClient();
      const { error } = await supabase.from("messages").insert({
        conversation_id: conversationId,
        sender_id: senderId,
        body: trimmed,
      });

      if (error) {
        toast.error("Échec de l'envoi du message.");
        // Restore draft so user doesn't lose their text
        setBody(trimmed);
        requestAnimationFrame(resize);
      }
    });
  }

  function handleKeyDown(event: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      event.currentTarget.form?.requestSubmit();
    }
  }

  // Focus textarea on conversation mount
  useEffect(() => {
    textareaRef.current?.focus();
  }, []);

  const remaining = MAX_LENGTH - body.length;
  const tooLong = remaining < 0;
  const hasText = body.trim().length > 0;

  return (
    <form
      onSubmit={handleSubmit}
      className="border-t border-line bg-white px-4 py-3 sm:px-6 sm:py-4"
    >
      <div className="flex items-end gap-2 max-w-3xl mx-auto">
        <div className="flex-1 relative">
          <textarea
            ref={textareaRef}
            value={body}
            onChange={(event) => {
              setBody(event.currentTarget.value);
              resize();
            }}
            onKeyDown={handleKeyDown}
            placeholder="Écris un message..."
            rows={1}
            maxLength={MAX_LENGTH + 100}
            disabled={pending}
            className="w-full resize-none rounded-2xl border border-line bg-bg px-4 py-3 text-sm text-fg placeholder:text-muted focus:outline-none focus:border-night focus:ring-2 focus:ring-night/15 disabled:opacity-60"
            aria-label="Message"
          />
          {tooLong ? (
            <p className="absolute -top-5 right-1 text-[10px] text-red-600">
              {remaining}
            </p>
          ) : null}
        </div>
        <button
          type="submit"
          disabled={pending || !hasText || tooLong}
          aria-label="Envoyer"
          className={`shrink-0 w-12 h-12 rounded-full flex items-center justify-center transition-all duration-200 ${
            hasText
              ? "bg-night text-cream hover:bg-night-soft scale-100"
              : "bg-night/30 text-cream scale-95"
          } disabled:opacity-40 disabled:cursor-not-allowed`}
        >
          {pending ? (
            <span className="w-4 h-4 border-2 border-cream border-t-transparent rounded-full animate-spin" />
          ) : (
            <Send className="w-4 h-4" aria-hidden />
          )}
        </button>
      </div>
      <p className="mt-2 text-[10px] text-muted text-center">
        Entrée pour envoyer · Maj+Entrée pour aller à la ligne
      </p>
    </form>
  );
}
