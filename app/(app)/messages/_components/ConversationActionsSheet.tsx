"use client";

import {
  Archive,
  ArchiveRestore,
  BellOff,
  BellRing,
  Pin,
  PinOff,
} from "lucide-react";
import { useEffect, useTransition } from "react";
import { toast } from "sonner";
import {
  MUTE_DURATIONS,
  setConversationMute,
  toggleArchiveConversation,
  togglePinConversation,
} from "../conv-prefs-actions";

type ConversationActionsSheetProps = {
  open: boolean;
  onClose: () => void;
  conversationId: string;
  isPinned: boolean;
  isArchived: boolean;
  isMuted: boolean;
};

/* Bottom sheet pour les actions par-conversation (pin / archive / mute).
 * Déclenché via long-press ou bouton "..." dans ConversationItem. */
export function ConversationActionsSheet({
  open,
  onClose,
  conversationId,
  isPinned,
  isArchived,
  isMuted,
}: ConversationActionsSheetProps) {
  const [pending, startTransition] = useTransition();

  useEffect(() => {
    if (!open) return;
    function handleKey(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
    }
    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, [open, onClose]);

  if (!open) return null;

  function run(
    action: () => Promise<{ ok: true } | { ok: false; error: string }>,
    successLabel: string,
  ) {
    startTransition(async () => {
      const res = await action();
      if (res.ok) {
        toast.success(successLabel);
        onClose();
      } else {
        toast.error(res.error);
      }
    });
  }

  function handleMute(durationMs: number | null) {
    const muteUntil =
      durationMs === null
        ? null
        : new Date(Date.now() + durationMs).toISOString();
    run(
      () => setConversationMute(conversationId, muteUntil),
      muteUntil ? "Conversation muette." : "Notifications réactivées.",
    );
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Actions de la conversation"
      className="fixed inset-0 z-50 flex items-end justify-center bg-night/40 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-md bg-bg border-t border-line rounded-t-3xl shadow-[0_-20px_60px_-20px_rgba(10,31,68,0.4)] pb-[max(env(safe-area-inset-bottom,0px),16px)]"
      >
        <div
          aria-hidden
          className="mx-auto mt-2.5 mb-3 w-10 h-1 rounded-full bg-night/15"
        />

        <ul className="px-2 pb-2">
          <li>
            <button
              type="button"
              disabled={pending}
              onClick={() =>
                run(
                  () => togglePinConversation(conversationId),
                  isPinned ? "Détaché." : "Épinglée en haut.",
                )
              }
              className="w-full flex items-center gap-3 px-4 h-14 rounded-2xl text-left text-sm font-semibold text-night hover:bg-night/5 disabled:opacity-50 transition-colors"
            >
              {isPinned ? (
                <PinOff className="w-5 h-5 text-night-muted" aria-hidden />
              ) : (
                <Pin className="w-5 h-5 text-night-muted" aria-hidden />
              )}
              {isPinned ? "Détacher" : "Épingler en haut"}
            </button>
          </li>

          <li>
            <button
              type="button"
              disabled={pending}
              onClick={() =>
                run(
                  () => toggleArchiveConversation(conversationId),
                  isArchived ? "Désarchivée." : "Archivée.",
                )
              }
              className="w-full flex items-center gap-3 px-4 h-14 rounded-2xl text-left text-sm font-semibold text-night hover:bg-night/5 disabled:opacity-50 transition-colors"
            >
              {isArchived ? (
                <ArchiveRestore
                  className="w-5 h-5 text-night-muted"
                  aria-hidden
                />
              ) : (
                <Archive className="w-5 h-5 text-night-muted" aria-hidden />
              )}
              {isArchived ? "Désarchiver" : "Archiver"}
            </button>
          </li>

          <li className="border-t border-line mt-1 pt-1">
            <p className="px-4 pt-2 pb-1 text-[10px] font-extrabold uppercase tracking-[0.16em] text-muted">
              Notifications
            </p>
            {isMuted ? (
              <button
                type="button"
                disabled={pending}
                onClick={() => handleMute(null)}
                className="w-full flex items-center gap-3 px-4 h-12 rounded-2xl text-left text-sm font-semibold text-gold-deep hover:bg-night/5 disabled:opacity-50 transition-colors"
              >
                <BellRing className="w-5 h-5" aria-hidden />
                Réactiver les notifications
              </button>
            ) : (
              <>
                <MuteRow
                  label="1 heure"
                  onClick={() => handleMute(MUTE_DURATIONS.HOUR_1)}
                  disabled={pending}
                />
                <MuteRow
                  label="8 heures"
                  onClick={() => handleMute(MUTE_DURATIONS.HOURS_8)}
                  disabled={pending}
                />
                <MuteRow
                  label="1 jour"
                  onClick={() => handleMute(MUTE_DURATIONS.DAY_1)}
                  disabled={pending}
                />
                <MuteRow
                  label="1 semaine"
                  onClick={() => handleMute(MUTE_DURATIONS.WEEK_1)}
                  disabled={pending}
                />
              </>
            )}
          </li>
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

function MuteRow({
  label,
  onClick,
  disabled,
}: {
  label: string;
  onClick: () => void;
  disabled: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="w-full flex items-center gap-3 px-4 h-12 rounded-2xl text-left text-sm font-semibold text-night hover:bg-night/5 disabled:opacity-50 transition-colors"
    >
      <BellOff className="w-5 h-5 text-night-muted" aria-hidden />
      Muet pendant {label}
    </button>
  );
}
