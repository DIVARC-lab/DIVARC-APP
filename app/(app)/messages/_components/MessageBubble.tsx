"use client";

import { Download, FileText, Reply, Sparkles, Trash2 } from "lucide-react";
import Image from "next/image";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Avatar } from "@/components/ui/Avatar";
import type {
  Message,
  MessageReplyContext,
  MessageReactionSummary,
} from "@/lib/database.types";
import { useLongPress } from "@/lib/hooks/useLongPress";
import { cn } from "@/lib/utils/cn";
import { createClient } from "@/lib/supabase/client";
import { formatTimestamp } from "@/lib/utils/relativeTime";
import { AudioPlayer } from "./AudioPlayer";
import { MessageActionsSheet } from "./MessageActionsSheet";
import { MessageReactions } from "./MessageReactions";
import { ReactionPicker } from "./ReactionPicker";
import { ReplyPreview } from "./ReplyPreview";

type MessageBubbleProps = {
  message: Message;
  isOwn: boolean;
  showAvatar: boolean;
  showTime: boolean;
  senderName: string | null;
  senderAvatarUrl: string | null;
  reactions: MessageReactionSummary[];
  replyContext: MessageReplyContext | null;
  onReply: () => void;
};

export function MessageBubble({
  message,
  isOwn,
  showAvatar,
  showTime,
  senderName,
  senderAvatarUrl,
  reactions,
  replyContext,
  onReply,
}: MessageBubbleProps) {
  const [pendingDelete, startDelete] = useTransition();
  const [sheetOpen, setSheetOpen] = useState(false);

  /* Long-press tactile (mobile) → ouvre le bottom sheet d'actions. Sur
     desktop le hover-to-reveal classique reste actif (le hook ignore les
     pointerType="mouse"). */
  const longPressHandlers = useLongPress(
    () => {
      if (message.type === "system") return;
      setSheetOpen(true);
    },
    { delay: 380 },
  );

  if (message.type === "system") {
    return (
      <div className="flex justify-center my-3">
        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-gradient-to-r from-cream via-bg to-gold/10 border border-gold/30 text-xs text-night-muted">
          <Sparkles className="w-3.5 h-3.5 text-gold-deep" aria-hidden />
          <span>{message.body}</span>
        </div>
      </div>
    );
  }

  const hasImage =
    message.attachment_type === "image" && message.attachment_url;
  const hasAudio =
    message.attachment_type === "audio" && message.attachment_url;
  const hasFile =
    message.attachment_url &&
    message.attachment_type !== "image" &&
    message.attachment_type !== "audio" &&
    message.attachment_type !== null;

  async function handleQuickReact(emoji: string) {
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;

    const existing = reactions.find(
      (r) => r.emoji === emoji && r.user_reacted,
    );

    if (existing) {
      await supabase
        .from("message_reactions")
        .delete()
        .eq("message_id", message.id)
        .eq("user_id", user.id)
        .eq("emoji", emoji);
    } else {
      const { error } = await supabase.from("message_reactions").insert({
        message_id: message.id,
        user_id: user.id,
        emoji,
      });
      if (error) toast.error("Impossible de réagir.");
    }
  }

  function handleDelete() {
    if (!confirm("Supprimer ce message pour tout le monde ?")) return;
    startDelete(async () => {
      const supabase = createClient();
      const { error } = await supabase
        .from("messages")
        .update({ deleted_at: new Date().toISOString() })
        .eq("id", message.id);
      if (error) toast.error("Suppression impossible.");
    });
  }

  return (
    <div
      className={cn(
        "group flex items-end gap-2",
        isOwn ? "justify-end" : "justify-start",
      )}
    >
      {!isOwn ? (
        <div className="w-8 shrink-0">
          {showAvatar ? (
            <Avatar src={senderAvatarUrl} fullName={senderName} size="sm" />
          ) : null}
        </div>
      ) : null}

      <div
        className={cn(
          "max-w-[78%] sm:max-w-[60%] flex flex-col relative",
          isOwn ? "items-end" : "items-start",
        )}
      >
        <div className="flex items-end gap-1.5 group/actions">
          {isOwn ? (
            <div className="opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1 mb-1">
              <ReactionPicker onPick={handleQuickReact} align="end" />
              <button
                type="button"
                onClick={onReply}
                aria-label="Répondre"
                className="w-7 h-7 rounded-full bg-white/95 border border-line text-night-muted hover:text-night hover:border-night/30 flex items-center justify-center shadow-soft"
              >
                <Reply className="w-3.5 h-3.5" aria-hidden />
              </button>
              <button
                type="button"
                onClick={handleDelete}
                disabled={pendingDelete}
                aria-label="Supprimer"
                className="w-7 h-7 rounded-full bg-white/95 border border-line text-red-500 hover:bg-red-50 flex items-center justify-center shadow-soft"
              >
                <Trash2 className="w-3.5 h-3.5" aria-hidden />
              </button>
            </div>
          ) : null}

          <div
            className={cn(
              "flex flex-col touch-manipulation",
              isOwn ? "items-end" : "items-start",
            )}
            {...longPressHandlers}
          >
            {replyContext ? (
              <ReplyPreview
                senderName={replyContext.sender_name}
                body={replyContext.body}
                attachmentType={replyContext.attachment_type}
                variant="bubble"
                isOwnBubble={isOwn}
              />
            ) : null}

            {hasImage ? (
              <ImageAttachment
                url={message.attachment_url!}
                width={message.attachment_width}
                height={message.attachment_height}
                isOwn={isOwn}
              />
            ) : null}

            {hasAudio ? (
              <AudioPlayer
                url={message.attachment_url!}
                durationMs={message.attachment_duration_ms}
                isOwn={isOwn}
              />
            ) : null}

            {hasFile ? (
              <FileAttachment
                url={message.attachment_url!}
                name={message.attachment_name ?? "fichier"}
                size={message.attachment_size}
                isOwn={isOwn}
              />
            ) : null}

            {message.body ? (
              <div
                className={cn(
                  "px-4 py-2.5 rounded-3xl text-sm leading-relaxed shadow-sm select-none",
                  hasImage || hasFile || hasAudio ? "mt-1.5" : "",
                  isOwn
                    ? "bg-night text-cream rounded-br-md"
                    : "bg-white text-night border border-line rounded-bl-md",
                )}
              >
                <p className="whitespace-pre-wrap break-words">
                  {message.body}
                </p>
              </div>
            ) : null}
          </div>

          {!isOwn ? (
            <div className="opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1 mb-1">
              <ReactionPicker onPick={handleQuickReact} align="start" />
              <button
                type="button"
                onClick={onReply}
                aria-label="Répondre"
                className="w-7 h-7 rounded-full bg-white/95 border border-line text-night-muted hover:text-night hover:border-night/30 flex items-center justify-center shadow-soft"
              >
                <Reply className="w-3.5 h-3.5" aria-hidden />
              </button>
            </div>
          ) : null}
        </div>

        <MessageReactions
          messageId={message.id}
          reactions={reactions}
          isOwn={isOwn}
        />

        {showTime ? (
          <time
            dateTime={message.created_at}
            className="text-[10px] text-muted mt-1 px-2"
          >
            {formatTimestamp(message.created_at)}
          </time>
        ) : null}
      </div>

      <MessageActionsSheet
        open={sheetOpen}
        onClose={() => setSheetOpen(false)}
        isOwn={isOwn}
        messageBody={message.body ?? null}
        onReact={handleQuickReact}
        onReply={onReply}
        onDelete={handleDelete}
      />
    </div>
  );
}

function ImageAttachment({
  url,
  width,
  height,
  isOwn,
}: {
  url: string;
  width: number | null;
  height: number | null;
  isOwn: boolean;
}) {
  const [open, setOpen] = useState(false);
  const aspect =
    width && height && width > 0 && height > 0
      ? `${width} / ${height}`
      : "4 / 3";

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={cn(
          "overflow-hidden rounded-3xl bg-night/5 border max-w-xs w-full",
          isOwn ? "border-night/30" : "border-line",
        )}
      >
        <span
          className="relative block w-full"
          style={{ aspectRatio: aspect, maxHeight: "320px" }}
        >
          <Image
            src={url}
            alt=""
            fill
            sizes="(max-width: 640px) 80vw, 320px"
            className="object-cover"
            unoptimized={url.includes("?")}
          />
        </span>
      </button>

      {open ? (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 bg-night/90 backdrop-blur-sm flex items-center justify-center p-4"
          onClick={() => setOpen(false)}
        >
          <button
            type="button"
            onClick={(event) => event.stopPropagation()}
            className="relative max-w-5xl max-h-[90vh] w-full"
          >
            <Image
              src={url}
              alt=""
              width={width ?? 1200}
              height={height ?? 800}
              className="w-full h-auto max-h-[90vh] object-contain rounded-2xl"
              unoptimized
            />
          </button>
        </div>
      ) : null}
    </>
  );
}

function FileAttachment({
  url,
  name,
  size,
  isOwn,
}: {
  url: string;
  name: string;
  size: number | null;
  isOwn: boolean;
}) {
  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      download={name}
      className={cn(
        "flex items-center gap-3 px-4 py-3 rounded-3xl text-sm shadow-sm",
        isOwn
          ? "bg-night text-cream rounded-br-md"
          : "bg-white text-night border border-line rounded-bl-md",
      )}
    >
      <span
        className={cn(
          "w-10 h-10 rounded-2xl flex items-center justify-center shrink-0",
          isOwn ? "bg-cream/15" : "bg-night/5",
        )}
      >
        <FileText className="w-4 h-4" aria-hidden />
      </span>
      <span className="flex-1 min-w-0">
        <span className="block font-semibold truncate">{name}</span>
        {size ? (
          <span className="block text-[11px] opacity-70">
            {formatBytes(size)}
          </span>
        ) : null}
      </span>
      <Download className="w-4 h-4 shrink-0 opacity-70" aria-hidden />
    </a>
  );
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} o`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} Ko`;
  return `${(bytes / 1024 / 1024).toFixed(1)} Mo`;
}
