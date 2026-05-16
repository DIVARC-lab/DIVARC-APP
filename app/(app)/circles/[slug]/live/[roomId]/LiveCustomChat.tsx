"use client";

/* Custom Chat panel pour la salle Live :
 *  - useChat hook LiveKit (même data channel que le chat natif)
 *  - Bottom sheet sur mobile (~70vh) avec backdrop cliquable
 *  - Side panel droit sur desktop (≥sm)
 *  - Auto-close après envoi sur mobile pour revenir au live
 */

import { useChat } from "@livekit/components-react";
import { Send, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";

type Props = {
  open: boolean;
  onClose: () => void;
};

export function LiveCustomChat({ open, onClose }: Props) {
  const { chatMessages, send, isSending } = useChat();
  const [draft, setDraft] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  /* Scroll au plus récent à chaque nouveau message. */
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chatMessages.length]);

  /* Focus input quand on ouvre (sauf mobile pour éviter clavier auto). */
  useEffect(() => {
    if (!open) return;
    if (typeof window !== "undefined" && window.innerWidth >= 640) {
      inputRef.current?.focus();
    }
  }, [open]);

  if (!open) return null;

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const text = draft.trim();
    if (!text || isSending) return;
    try {
      await send(text);
      setDraft("");
      /* Sprint Live UX — Auto-close après envoi sur mobile pour
         revenir directement à la vue de la salle. Sur desktop on
         garde le panel ouvert pour conversation continue. */
      if (typeof window !== "undefined" && window.innerWidth < 640) {
        onClose();
      } else {
        inputRef.current?.focus();
      }
    } catch (err) {
      console.error("[LiveCustomChat] send failed", err);
    }
  }

  return (
    <>
      {/* Backdrop mobile (cliquable pour fermer) */}
      <div
        className="absolute inset-0 z-20 bg-night/40 sm:hidden"
        onClick={onClose}
        aria-hidden
      />
      <div
        className={
          "absolute z-30 bg-night/95 backdrop-blur-md flex flex-col " +
          /* Mobile : bottom sheet 70vh */
          "inset-x-0 bottom-0 h-[70vh] rounded-t-3xl border-t border-cream/10 " +
          /* Desktop : side panel right, full height minus bottom bar */
          "sm:inset-x-auto sm:right-0 sm:top-0 sm:bottom-24 sm:h-auto sm:w-80 " +
          "sm:rounded-none sm:border-l sm:border-t-0"
        }
      >
        {/* Drag handle visuel mobile */}
        <div className="sm:hidden flex justify-center pt-2 pb-1">
          <div className="w-10 h-1 rounded-full bg-cream/30" />
        </div>

        {/* Header avec close bien visible */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-cream/10">
          <p className="text-[13px] font-bold text-cream">💬 Chat de la salle</p>
          <button
            type="button"
            onClick={onClose}
            aria-label="Fermer le chat"
            className="inline-flex items-center justify-center w-9 h-9 rounded-full bg-cream/10 text-cream hover:bg-cream/20 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Liste messages */}
        <div className="flex-1 min-h-0 overflow-y-auto px-4 py-3 space-y-3">
          {chatMessages.length === 0 ? (
            <p className="text-center text-[12px] text-cream/40 mt-6">
              Aucun message. Lance la conversation.
            </p>
          ) : (
            chatMessages.map((m, i) => (
              <div key={`${m.timestamp}-${i}`} className="flex flex-col">
                <div className="flex items-baseline gap-2">
                  <span className="text-[11px] font-bold text-gold">
                    {m.from?.name || "Membre"}
                  </span>
                  <span className="text-[10px] text-cream/40">
                    {new Date(m.timestamp).toLocaleTimeString("fr-FR", {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </span>
                </div>
                <p className="text-[13px] text-cream leading-relaxed break-words">
                  {m.message}
                </p>
              </div>
            ))
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Input + envoi */}
        <form
          onSubmit={handleSubmit}
          className="border-t border-cream/10 p-3 flex items-center gap-2"
        >
          <input
            ref={inputRef}
            type="text"
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            placeholder="Écris un message…"
            maxLength={500}
            className="flex-1 h-10 px-3 rounded-full bg-cream/10 text-cream text-[13px] placeholder:text-cream/40 focus:outline-none focus:bg-cream/15"
          />
          <button
            type="submit"
            disabled={!draft.trim() || isSending}
            aria-label="Envoyer"
            className="inline-flex items-center justify-center w-10 h-10 rounded-full bg-gold text-night disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gold/90 transition-colors"
          >
            <Send className="w-4 h-4" aria-hidden />
          </button>
        </form>
      </div>
    </>
  );
}
