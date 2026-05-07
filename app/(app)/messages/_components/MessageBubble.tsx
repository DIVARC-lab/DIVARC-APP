import { Sparkles } from "lucide-react";
import { Avatar } from "@/components/ui/Avatar";
import type { Message } from "@/lib/database.types";
import { formatTimestamp } from "@/lib/utils/relativeTime";

type MessageBubbleProps = {
  message: Message;
  isOwn: boolean;
  showAvatar: boolean;
  showTime: boolean;
  senderName: string | null;
  senderAvatarUrl: string | null;
};

export function MessageBubble({
  message,
  isOwn,
  showAvatar,
  showTime,
  senderName,
  senderAvatarUrl,
}: MessageBubbleProps) {
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

  return (
    <div
      className={`flex items-end gap-2 ${isOwn ? "justify-end" : "justify-start"}`}
    >
      {!isOwn ? (
        <div className="w-8 shrink-0">
          {showAvatar ? (
            <Avatar src={senderAvatarUrl} fullName={senderName} size="sm" />
          ) : null}
        </div>
      ) : null}

      <div
        className={`max-w-[78%] sm:max-w-[60%] flex flex-col ${
          isOwn ? "items-end" : "items-start"
        }`}
      >
        <div
          className={`px-4 py-2.5 rounded-3xl text-sm leading-relaxed shadow-sm ${
            isOwn
              ? "bg-night text-cream rounded-br-md"
              : "bg-white text-night border border-line rounded-bl-md"
          }`}
        >
          <p className="whitespace-pre-wrap break-words">{message.body}</p>
        </div>
        {showTime ? (
          <time
            dateTime={message.created_at}
            className="text-[10px] text-muted mt-1 px-2"
          >
            {formatTimestamp(message.created_at)}
          </time>
        ) : null}
      </div>
    </div>
  );
}
