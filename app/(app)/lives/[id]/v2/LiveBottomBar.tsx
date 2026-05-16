"use client";

/* Étape 14-15/60 — Bottom bar TikTok (input + actions row).
 *
 * - Input commentaire flex-1 left
 * - Actions row : Emoji, Gift (gold highlight), Shop, Mic
 *   (request to join panel), Share, More
 * - Mic button affiche 3 états : idle/pending/on-panel
 * - Gradient noir → transparent en background
 * - Safe area inset bottom respect */

import {
  Gift,
  Loader2,
  Mic,
  MicOff,
  MoreVertical,
  PhoneOff,
  Send,
  Share2,
  ShoppingBag,
  Smile,
} from "lucide-react";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import {
  cancelMyStageRequest,
  requestJoinStage,
} from "../../stage-actions";
import { leavePanel } from "../../session-actions";
import { sendLiveChatMessage } from "../../chat-actions";

type StageStatus =
  | "idle"
  | "pending"
  | "approved"
  | "denied"
  | "cancelled"
  | "revoked";

type Props = {
  sessionId: string;
  chatEnabled: boolean;
  stageStatus: StageStatus;
  onStageStatusChange: (s: StageStatus) => void;
  onOpenGifts: () => void;
  onOpenEmoji: () => void;
  onOpenShop?: () => void;
  onShare: () => void;
  onOpenMore: () => void;
};

export function LiveBottomBar({
  sessionId,
  chatEnabled,
  stageStatus,
  onStageStatusChange,
  onOpenGifts,
  onOpenEmoji,
  onOpenShop,
  onShare,
  onOpenMore,
}: Props) {
  const [content, setContent] = useState("");
  const [isPending, startTransition] = useTransition();

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!chatEnabled) return;
    const trimmed = content.trim();
    if (trimmed.length === 0) return;
    startTransition(async () => {
      const res = await sendLiveChatMessage({ sessionId, content: trimmed });
      if (!res.ok) {
        toast.error(res.error);
        return;
      }
      setContent("");
    });
  }

  function handleStageClick() {
    if (stageStatus === "approved") {
      startTransition(async () => {
        const res = await leavePanel({ sessionId });
        if (!res.ok) {
          toast.error(res.error);
          return;
        }
        onStageStatusChange("idle");
        toast("Tu as quitté le panel.");
      });
      return;
    }
    if (stageStatus === "pending") {
      startTransition(async () => {
        const res = await cancelMyStageRequest({ sessionId });
        if (!res.ok) {
          toast.error(res.error);
          return;
        }
        onStageStatusChange("idle");
      });
      return;
    }
    startTransition(async () => {
      const res = await requestJoinStage({ sessionId });
      if (!res.ok) {
        toast.error(res.error);
        return;
      }
      onStageStatusChange("pending");
      toast.success("Demande envoyée au créateur !");
    });
  }

  return (
    <div
      className="absolute bottom-0 left-0 right-0 z-30"
      style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
    >
      {/* Gradient noir vers haut. */}
      <div
        aria-hidden
        className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/30 to-transparent pointer-events-none"
      />

      <div className="relative px-3 py-3 flex items-center gap-2">
        {/* Input commentaire. */}
        <form onSubmit={handleSubmit} className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5 bg-black/55 backdrop-blur-md border border-white/15 rounded-full pl-4 pr-1 h-10 max-w-full">
            <input
              type="text"
              value={content}
              onChange={(e) => setContent(e.target.value.slice(0, 150))}
              maxLength={150}
              placeholder={
                chatEnabled
                  ? "Dis quelque chose…"
                  : "Chat désactivé"
              }
              disabled={!chatEnabled || isPending}
              className="flex-1 bg-transparent text-white placeholder:text-white/50 text-[13px] outline-none min-w-0"
            />
            {content.trim().length > 0 ? (
              <button
                type="submit"
                disabled={isPending}
                aria-label="Envoyer"
                className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-gold text-night transition-colors hover:bg-gold-soft active:scale-90 disabled:opacity-60 shrink-0"
              >
                {isPending ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Send
                    className="w-3.5 h-3.5"
                    aria-hidden
                    strokeWidth={2.6}
                  />
                )}
              </button>
            ) : null}
          </div>
        </form>

        {/* Actions row : 5-6 icônes ronds. */}
        <div className="flex items-center gap-1.5 shrink-0">
          <ActionButton onClick={onOpenEmoji} aria-label="Emojis">
            <Smile className="w-5 h-5" aria-hidden />
          </ActionButton>

          {/* Gift = mise en avant gold. */}
          <button
            type="button"
            onClick={onOpenGifts}
            aria-label="Envoyer un cadeau"
            className="relative inline-flex items-center justify-center w-10 h-10 rounded-full bg-gradient-to-br from-amber-400 to-rose-500 text-white shadow-[0_4px_14px_-2px_rgba(244,114,182,0.5)] hover:shadow-[0_4px_24px_-2px_rgba(244,114,182,0.7)] transition-all active:scale-90"
          >
            <Gift className="w-5 h-5" aria-hidden strokeWidth={2.4} />
            <span
              aria-hidden
              className="absolute inset-0 rounded-full ring-2 ring-amber-300/50 animate-pulse"
            />
          </button>

          {onOpenShop ? (
            <ActionButton onClick={onOpenShop} aria-label="Boutique">
              <ShoppingBag className="w-5 h-5" aria-hidden />
            </ActionButton>
          ) : null}

          {/* Mic = 3 états : idle (mic), pending (loader+ambre),
              approved (PhoneOff = quitter). */}
          <button
            type="button"
            onClick={handleStageClick}
            disabled={isPending}
            aria-label={
              stageStatus === "approved"
                ? "Quitter le panel"
                : stageStatus === "pending"
                  ? "Annuler la demande"
                  : "Demander à monter"
            }
            className={`inline-flex items-center justify-center w-10 h-10 rounded-full border-2 transition-all active:scale-90 ${
              stageStatus === "approved"
                ? "bg-rose-500 text-white border-rose-300"
                : stageStatus === "pending"
                  ? "bg-amber-400 text-amber-950 border-amber-200"
                  : "bg-night text-cream border-gold"
            } disabled:opacity-60`}
          >
            {isPending ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : stageStatus === "approved" ? (
              <PhoneOff className="w-4 h-4" aria-hidden />
            ) : stageStatus === "pending" ? (
              <MicOff className="w-4 h-4" aria-hidden />
            ) : (
              <Mic className="w-4 h-4" aria-hidden strokeWidth={2.4} />
            )}
          </button>

          <ActionButton onClick={onShare} aria-label="Partager">
            <Share2 className="w-5 h-5" aria-hidden />
          </ActionButton>

          <ActionButton onClick={onOpenMore} aria-label="Plus d'options">
            <MoreVertical className="w-5 h-5" aria-hidden />
          </ActionButton>
        </div>
      </div>
    </div>
  );
}

function ActionButton({
  onClick,
  children,
  ...rest
}: React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      type="button"
      onClick={onClick}
      {...rest}
      className="inline-flex items-center justify-center w-10 h-10 rounded-full bg-black/55 backdrop-blur-md border border-white/15 text-white hover:bg-black/70 transition-colors active:scale-90"
    >
      {children}
    </button>
  );
}
