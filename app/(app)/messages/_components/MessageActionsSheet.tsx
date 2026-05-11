"use client";

import { Copy, Forward, Pencil, Pin, PinOff, Reply, Trash2 } from "lucide-react";
import { useEffect } from "react";
import { toast } from "sonner";

const QUICK_EMOJIS = ["❤️", "😂", "🤍", "👀", "🔥", "🎉"] as const;

type MessageActionsSheetProps = {
  open: boolean;
  onClose: () => void;
  isOwn: boolean;
  messageBody: string | null;
  onReact: (emoji: string) => void;
  onReply: () => void;
  onDelete: () => void;
  /* Actions Chantier 1.8 (optionnelles). Si non fournies, l'item
     correspondant n'est pas rendu. */
  onForward?: () => void;
  onTogglePin?: () => void;
  onEdit?: () => void;
  isPinnedInConv?: boolean;
  canEdit?: boolean;
  canForward?: boolean;
};

/* Bottom sheet mobile : actions sur un message déclenchées par long-press.
 * Pattern Telegram / WhatsApp. Sur desktop, le hover-to-reveal classique
 * reste en place ; ce sheet ne s'ouvre que via long-press tactile. */
export function MessageActionsSheet({
  open,
  onClose,
  isOwn,
  messageBody,
  onReact,
  onReply,
  onDelete,
  onForward,
  onTogglePin,
  onEdit,
  isPinnedInConv = false,
  canEdit = false,
  canForward = true,
}: MessageActionsSheetProps) {
  /* Escape pour fermer (clavier physique branché en cas de tablette). */
  useEffect(() => {
    if (!open) return;
    function handleKey(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
    }
    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, [open, onClose]);

  if (!open) return null;

  function handleCopy() {
    if (!messageBody) {
      onClose();
      return;
    }
    navigator.clipboard
      .writeText(messageBody)
      .then(() => toast.success("Message copié."))
      .catch(() => toast.error("Copie impossible."));
    onClose();
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Actions du message"
      className="fixed inset-0 z-50 flex items-end justify-center bg-night/40 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-md bg-bg border-t border-line rounded-t-3xl shadow-[0_-20px_60px_-20px_rgba(10,31,68,0.4)] pb-[max(env(safe-area-inset-bottom,0px),16px)]"
      >
        {/* Drag handle */}
        <div
          aria-hidden
          className="mx-auto mt-2.5 mb-1 w-10 h-1 rounded-full bg-night/15"
        />

        {/* Quick reactions */}
        <div className="px-4 pt-3 pb-2">
          <div className="flex items-center justify-around gap-2">
            {QUICK_EMOJIS.map((emoji) => (
              <button
                key={emoji}
                type="button"
                onClick={() => {
                  onReact(emoji);
                  onClose();
                }}
                aria-label={`Réagir avec ${emoji}`}
                className="w-12 h-12 rounded-full text-2xl hover:bg-night/5 active:bg-night/10 active:scale-95 transition-transform flex items-center justify-center"
              >
                {emoji}
              </button>
            ))}
          </div>
        </div>

        {/* Actions list */}
        <ul className="px-2 py-2 border-t border-line">
          <li>
            <button
              type="button"
              onClick={() => {
                onReply();
                onClose();
              }}
              className="w-full flex items-center gap-3 px-4 h-14 rounded-2xl text-left text-sm font-semibold text-night hover:bg-night/5 transition-colors"
            >
              <Reply className="w-5 h-5 text-night-muted" aria-hidden />
              Répondre
            </button>
          </li>
          {messageBody ? (
            <li>
              <button
                type="button"
                onClick={handleCopy}
                className="w-full flex items-center gap-3 px-4 h-14 rounded-2xl text-left text-sm font-semibold text-night hover:bg-night/5 transition-colors"
              >
                <Copy className="w-5 h-5 text-night-muted" aria-hidden />
                Copier le message
              </button>
            </li>
          ) : null}
          {onForward && canForward ? (
            <li>
              <button
                type="button"
                onClick={() => {
                  onForward();
                  onClose();
                }}
                className="w-full flex items-center gap-3 px-4 h-14 rounded-2xl text-left text-sm font-semibold text-night hover:bg-night/5 transition-colors"
              >
                <Forward className="w-5 h-5 text-night-muted" aria-hidden />
                Transférer
              </button>
            </li>
          ) : null}
          {onTogglePin ? (
            <li>
              <button
                type="button"
                onClick={() => {
                  onTogglePin();
                  onClose();
                }}
                className="w-full flex items-center gap-3 px-4 h-14 rounded-2xl text-left text-sm font-semibold text-night hover:bg-night/5 transition-colors"
              >
                {isPinnedInConv ? (
                  <PinOff className="w-5 h-5 text-night-muted" aria-hidden />
                ) : (
                  <Pin className="w-5 h-5 text-night-muted" aria-hidden />
                )}
                {isPinnedInConv
                  ? "Désépingler du fil"
                  : "Épingler dans le fil"}
              </button>
            </li>
          ) : null}
          {onEdit && canEdit ? (
            <li>
              <button
                type="button"
                onClick={() => {
                  onEdit();
                  onClose();
                }}
                className="w-full flex items-center gap-3 px-4 h-14 rounded-2xl text-left text-sm font-semibold text-night hover:bg-night/5 transition-colors"
              >
                <Pencil className="w-5 h-5 text-night-muted" aria-hidden />
                Modifier
              </button>
            </li>
          ) : null}
          {isOwn ? (
            <li>
              <button
                type="button"
                onClick={() => {
                  onDelete();
                  onClose();
                }}
                className="w-full flex items-center gap-3 px-4 h-14 rounded-2xl text-left text-sm font-semibold text-red-600 hover:bg-red-50 transition-colors"
              >
                <Trash2 className="w-5 h-5" aria-hidden />
                Supprimer
              </button>
            </li>
          ) : null}
        </ul>

        <div className="px-2 pb-2">
          <button
            type="button"
            onClick={onClose}
            className="w-full h-12 rounded-2xl bg-night/5 text-sm font-bold text-night-muted hover:bg-night/10 transition-colors"
          >
            Annuler
          </button>
        </div>
      </div>
    </div>
  );
}
