import { CornerDownRight, FileText, ImageIcon, Mic, X } from "lucide-react";
import { cn } from "@/lib/utils/cn";
import type { AttachmentType } from "@/lib/database.types";

type Variant = "composer" | "bubble";

type ReplyPreviewProps = {
  senderName: string | null;
  body: string | null;
  attachmentType: AttachmentType | null;
  variant: Variant;
  isOwnBubble?: boolean;
  onCancel?: () => void;
};

export function ReplyPreview({
  senderName,
  body,
  attachmentType,
  variant,
  isOwnBubble,
  onCancel,
}: ReplyPreviewProps) {
  let iconNode: React.ReactNode = null;
  if (attachmentType === "image") {
    iconNode = <ImageIcon className="w-3 h-3" aria-hidden />;
  } else if (attachmentType === "audio") {
    iconNode = <Mic className="w-3 h-3" aria-hidden />;
  } else if (attachmentType) {
    iconNode = <FileText className="w-3 h-3" aria-hidden />;
  }

  const teaser =
    body ??
    (attachmentType === "image"
      ? "Photo"
      : attachmentType === "audio"
        ? "Message vocal"
        : attachmentType
          ? "Pièce jointe"
          : "");

  if (variant === "composer") {
    return (
      <div className="flex items-start gap-3 p-3 rounded-2xl bg-night/5 border border-line">
        <CornerDownRight
          className="w-4 h-4 text-night-muted mt-0.5 shrink-0"
          aria-hidden
        />
        <div className="flex-1 min-w-0">
          <p className="text-[10px] font-bold uppercase tracking-widest text-gold-deep">
            Réponse à {senderName ?? "un message"}
          </p>
          <p className="mt-0.5 text-sm text-night-muted line-clamp-2 flex items-center gap-1">
            {iconNode}
            <span className="truncate">{teaser}</span>
          </p>
        </div>
        {onCancel ? (
          <button
            type="button"
            onClick={onCancel}
            aria-label="Annuler la réponse"
            className="w-7 h-7 rounded-full hover:bg-red-50 text-night-muted hover:text-red-500 flex items-center justify-center"
          >
            <X className="w-3.5 h-3.5" aria-hidden />
          </button>
        ) : null}
      </div>
    );
  }

  return (
    <div
      className={cn(
        "mb-1 px-3 py-2 rounded-2xl border-l-2 flex items-start gap-2 max-w-[90%]",
        isOwnBubble
          ? "bg-cream/10 border-gold text-cream/85"
          : "bg-night/5 border-night/40 text-night-muted",
      )}
    >
      <div className="flex-1 min-w-0">
        <p
          className={cn(
            "text-[10px] font-bold uppercase tracking-widest",
            isOwnBubble ? "text-gold" : "text-gold-deep",
          )}
        >
          {senderName ?? "Un message"}
        </p>
        <p className="mt-0.5 text-xs leading-snug line-clamp-2 flex items-center gap-1">
          {iconNode}
          <span className="truncate">{teaser}</span>
        </p>
      </div>
    </div>
  );
}
