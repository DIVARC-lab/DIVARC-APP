"use client";

import {
  Image as ImageIcon,
  Loader2,
  Mic,
  Paperclip,
  Send,
  X,
} from "lucide-react";
import Image from "next/image";
import { useEffect, useRef, useState, useTransition } from "react";
import { toast } from "sonner";
import type { MessageReplyContext } from "@/lib/database.types";
import type { EncryptedPayload } from "@/lib/crypto/types";
import { cn } from "@/lib/utils/cn";
import { createClient } from "@/lib/supabase/client";
import { useTypingChannel } from "@/lib/hooks/useTypingChannel";
import { ReplyPreview } from "./ReplyPreview";
import { VoiceRecorder, type RecordedAudio } from "./VoiceRecorder";

const MAX_LENGTH = 4000;
const MAX_IMAGE_BYTES = 10 * 1024 * 1024;
const MAX_FILE_BYTES = 25 * 1024 * 1024;
const IMAGE_MIME = ["image/jpeg", "image/png", "image/webp", "image/gif"];

type Attachment = {
  url: string;
  storagePath: string;
  type: "image" | "file";
  name: string;
  size: number;
  width: number | null;
  height: number | null;
};

type MessageComposerProps = {
  conversationId: string;
  senderId: string;
  replyTo: MessageReplyContext | null;
  onClearReply: () => void;
  /* Si fourni : conv en mode secret effectif. Le composer chiffrera
     le texte avant insert et marquera is_secret=true. */
  encryptFn?: (text: string) => Promise<EncryptedPayload>;
  /* Label visuel pour le mode secret (affiché au-dessus du composer). */
  secretLabel?: string | null;
};

function draftKey(conversationId: string) {
  return `divarc:draft:${conversationId}`;
}

export function MessageComposer({
  conversationId,
  senderId,
  replyTo,
  onClearReply,
  encryptFn,
  secretLabel,
}: MessageComposerProps) {
  const [body, setBody] = useState("");
  const [attachment, setAttachment] = useState<Attachment | null>(null);
  const [uploading, setUploading] = useState(false);
  const [recording, setRecording] = useState(false);
  const [pending, startTransition] = useTransition();
  const { notifyTyping } = useTypingChannel(conversationId, senderId, null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  /* Restore le draft depuis localStorage. queueMicrotask évite le
     cascading render synchrone (set-state-in-effect, React 19 strict). */
  useEffect(() => {
    if (typeof window === "undefined") return;
    queueMicrotask(() => {
      try {
        const stored = window.localStorage.getItem(draftKey(conversationId));
        if (stored) {
          setBody(stored);
          requestAnimationFrame(() => resize());
        }
      } catch {
        /* ignore */
      }
    });

  }, [conversationId]);

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

  useEffect(() => {
    if (!recording) textareaRef.current?.focus();
  }, [recording]);

  useEffect(() => {
    if (replyTo) textareaRef.current?.focus();
  }, [replyTo]);

  /* Autosize 1-5 lignes : 1 ligne = 44px (text-sm leading-5 + py-3),
     chaque ligne ajoute ~20px → cap à 124px (~5 lignes). Au-delà
     overflow-y interne. */
  function resize() {
    const ta = textareaRef.current;
    if (!ta) return;
    ta.style.height = "auto";
    ta.style.height = `${Math.min(ta.scrollHeight, 124)}px`;
  }

  async function getImageDimensions(
    file: File,
  ): Promise<{ width: number; height: number } | null> {
    return new Promise((resolve) => {
      const img = new window.Image();
      const url = URL.createObjectURL(file);
      img.onload = () => {
        URL.revokeObjectURL(url);
        resolve({ width: img.naturalWidth, height: img.naturalHeight });
      };
      img.onerror = () => {
        URL.revokeObjectURL(url);
        resolve(null);
      };
      img.src = url;
    });
  }

  async function uploadFile(file: File, kind: "image" | "file") {
    const supabase = createClient();
    const ext = file.name.split(".").pop()?.toLowerCase() ?? "bin";
    const storagePath = `${senderId}/${conversationId}/${crypto.randomUUID()}.${ext}`;

    const { error } = await supabase.storage
      .from("chat-media")
      .upload(storagePath, file, {
        contentType: file.type,
        cacheControl: "3600",
      });

    if (error) {
      toast.error("Échec du téléversement.");
      return null;
    }

    const {
      data: { publicUrl },
    } = supabase.storage.from("chat-media").getPublicUrl(storagePath);

    let dims: { width: number; height: number } | null = null;
    if (kind === "image") {
      dims = await getImageDimensions(file);
    }

    return {
      url: publicUrl,
      storagePath,
      type: kind,
      name: file.name,
      size: file.size,
      width: dims?.width ?? null,
      height: dims?.height ?? null,
    } satisfies Attachment;
  }

  async function handleImageSelect(
    event: React.ChangeEvent<HTMLInputElement>,
  ) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;

    if (!IMAGE_MIME.includes(file.type)) {
      toast.error("Format invalide. JPG, PNG, WebP ou GIF.");
      return;
    }
    if (file.size > MAX_IMAGE_BYTES) {
      toast.error("Image trop lourde (10 Mo max).");
      return;
    }

    setUploading(true);
    const result = await uploadFile(file, "image");
    setUploading(false);
    if (result) setAttachment(result);
  }

  async function handleFileSelect(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;

    if (file.size > MAX_FILE_BYTES) {
      toast.error("Fichier trop lourd (25 Mo max).");
      return;
    }

    setUploading(true);
    const result = await uploadFile(file, "file");
    setUploading(false);
    if (result) setAttachment(result);
  }

  async function removeAttachment() {
    if (!attachment) return;
    const supabase = createClient();
    await supabase.storage
      .from("chat-media")
      .remove([attachment.storagePath]);
    setAttachment(null);
  }

  async function handleVoiceSend(audio: RecordedAudio) {
    const supabase = createClient();
    const ext = audio.mimeType.includes("mp4")
      ? "m4a"
      : audio.mimeType.includes("mpeg")
        ? "mp3"
        : "webm";
    const storagePath = `${senderId}/${conversationId}/${crypto.randomUUID()}.${ext}`;

    const { error: uploadError } = await supabase.storage
      .from("chat-media")
      .upload(storagePath, audio.blob, {
        contentType: audio.mimeType || "audio/webm",
        cacheControl: "3600",
      });

    if (uploadError) {
      toast.error("Échec de l'envoi du message vocal.");
      throw uploadError;
    }

    const {
      data: { publicUrl },
    } = supabase.storage.from("chat-media").getPublicUrl(storagePath);

    const { error } = await supabase.from("messages").insert({
      conversation_id: conversationId,
      sender_id: senderId,
      attachment_url: publicUrl,
      attachment_type: "audio",
      attachment_size: audio.blob.size,
      attachment_duration_ms: Math.round(audio.durationMs),
      reply_to_message_id: replyTo?.id ?? null,
    });

    if (error) {
      await supabase.storage.from("chat-media").remove([storagePath]);
      toast.error("Échec de l'envoi.");
      throw error;
    }

    setRecording(false);
    onClearReply();
  }

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const trimmed = body.trim();
    if ((!trimmed && !attachment) || pending) return;

    const previousBody = body;
    const previousAttachment = attachment;
    const previousReply = replyTo;
    setBody("");
    setAttachment(null);
    onClearReply();
    requestAnimationFrame(resize);

    startTransition(async () => {
      const supabase = createClient();
      try {
        const basePayload = {
          conversation_id: conversationId,
          sender_id: senderId,
          body: trimmed.length > 0 ? trimmed : null,
          attachment_url: previousAttachment?.url ?? null,
          attachment_type: previousAttachment?.type ?? null,
          attachment_name: previousAttachment?.name ?? null,
          attachment_size: previousAttachment?.size ?? null,
          attachment_width: previousAttachment?.width ?? null,
          attachment_height: previousAttachment?.height ?? null,
          reply_to_message_id: previousReply?.id ?? null,
        };

        /* Mode secret : encrypt le texte avant insert. Les pièces
           jointes V1 ne sont pas chiffrées (1.2g future). */
        let result;
        if (encryptFn && trimmed.length > 0) {
          const encrypted = await encryptFn(trimmed);
          result = await supabase.from("messages").insert({
            ...basePayload,
            body: null,
            is_secret: true,
            encryption_metadata: {
              ciphertext: encrypted.ciphertext,
              iv: encrypted.iv,
              sessionKeyHash: encrypted.sessionKeyHash,
              version: encrypted.version,
            },
          });
        } else {
          result = await supabase.from("messages").insert(basePayload);
        }
        const { error } = result;

        if (error) {
          toast.error("Échec de l'envoi.");
          setBody(previousBody);
          setAttachment(previousAttachment);
          requestAnimationFrame(resize);
        }
      } catch (err) {
        console.error("[MessageComposer:send]", err);
        toast.error(
          err instanceof Error ? err.message : "Échec du chiffrement.",
        );
        setBody(previousBody);
        setAttachment(previousAttachment);
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

  const remaining = MAX_LENGTH - body.length;
  const tooLong = remaining < 0;
  const canSend =
    !pending && !tooLong && (body.trim().length > 0 || attachment !== null);

  return (
    <div className="border-t border-line bg-white px-4 py-3 sm:px-6 sm:py-4">
      <div className="max-w-3xl mx-auto">
        {secretLabel ? (
          <div className="mb-2 px-3 py-1.5 rounded-full bg-night/5 border border-line text-[11.5px] font-semibold text-night inline-flex items-center gap-1">
            {secretLabel}
          </div>
        ) : null}
        {recording ? (
          <VoiceRecorder
            onCancel={() => setRecording(false)}
            onSend={handleVoiceSend}
          />
        ) : (
          <form onSubmit={handleSubmit}>
            {replyTo ? (
              <div className="mb-3">
                <ReplyPreview
                  senderName={replyTo.sender_name}
                  body={replyTo.body}
                  attachmentType={replyTo.attachment_type}
                  variant="composer"
                  onCancel={onClearReply}
                />
              </div>
            ) : null}
            {attachment ? (
              <div className="mb-3 flex items-center gap-3 p-3 rounded-2xl bg-bg border border-line">
                {attachment.type === "image" ? (
                  <div className="relative w-16 h-16 rounded-xl overflow-hidden bg-night/5 shrink-0">
                    <Image
                      src={attachment.url}
                      alt=""
                      fill
                      sizes="64px"
                      className="object-cover"
                      unoptimized
                    />
                  </div>
                ) : (
                  <div className="w-12 h-12 rounded-xl bg-night/5 flex items-center justify-center shrink-0">
                    <Paperclip
                      className="w-5 h-5 text-night-muted"
                      aria-hidden
                    />
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-night truncate">
                    {attachment.name}
                  </p>
                  <p className="text-xs text-muted">
                    {formatBytes(attachment.size)}
                    {attachment.width && attachment.height
                      ? ` · ${attachment.width}×${attachment.height}`
                      : ""}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={removeAttachment}
                  aria-label="Retirer"
                  className="w-11 h-11 rounded-full hover:bg-red-50 text-red-500 flex items-center justify-center shrink-0"
                >
                  <X className="w-4 h-4" aria-hidden />
                </button>
              </div>
            ) : null}

            <div className="flex items-end gap-2">
              <div className="flex items-center gap-1 pb-1">
                <button
                  type="button"
                  onClick={() => imageInputRef.current?.click()}
                  disabled={uploading || attachment !== null}
                  aria-label="Ajouter une image"
                  className={cn(
                    "w-11 h-11 rounded-full flex items-center justify-center transition-colors",
                    attachment !== null
                      ? "text-muted/50 cursor-not-allowed"
                      : "text-night-muted hover:bg-night/5 hover:text-night",
                  )}
                >
                  {uploading ? (
                    <Loader2 className="w-4 h-4 animate-spin" aria-hidden />
                  ) : (
                    <ImageIcon className="w-5 h-5" aria-hidden />
                  )}
                </button>
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploading || attachment !== null}
                  aria-label="Ajouter un fichier"
                  className={cn(
                    "w-11 h-11 rounded-full flex items-center justify-center transition-colors",
                    attachment !== null
                      ? "text-muted/50 cursor-not-allowed"
                      : "text-night-muted hover:bg-night/5 hover:text-night",
                  )}
                >
                  <Paperclip className="w-4 h-4" aria-hidden />
                </button>
                <button
                  type="button"
                  onClick={() => setRecording(true)}
                  disabled={attachment !== null}
                  aria-label="Enregistrer un message vocal"
                  className={cn(
                    "w-11 h-11 rounded-full flex items-center justify-center transition-colors",
                    attachment !== null
                      ? "text-muted/50 cursor-not-allowed"
                      : "text-night-muted hover:bg-night/5 hover:text-night",
                  )}
                >
                  <Mic className="w-4 h-4" aria-hidden />
                </button>
              </div>

              <div className="flex-1 relative">
                <textarea
                  ref={textareaRef}
                  value={body}
                  onChange={(event) => {
                    setBody(event.currentTarget.value);
                    resize();
                    notifyTyping();
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
                disabled={!canSend}
                aria-label="Envoyer"
                className={cn(
                  "shrink-0 w-12 h-12 rounded-full flex items-center justify-center transition-all duration-200",
                  canSend
                    ? "bg-night text-cream hover:bg-night-soft scale-100"
                    : "bg-night/30 text-cream scale-95",
                  "disabled:opacity-40 disabled:cursor-not-allowed",
                )}
              >
                {pending ? (
                  <span className="w-4 h-4 border-2 border-cream border-t-transparent rounded-full animate-spin" />
                ) : (
                  <Send className="w-4 h-4" aria-hidden />
                )}
              </button>
            </div>

            <input
              ref={imageInputRef}
              type="file"
              accept={IMAGE_MIME.join(",")}
              onChange={handleImageSelect}
              className="sr-only"
            />
            <input
              ref={fileInputRef}
              type="file"
              onChange={handleFileSelect}
              className="sr-only"
            />

            <p className="mt-2 text-[10px] text-muted text-center">
              Entrée pour envoyer · Maj+Entrée pour aller à la ligne · 10 Mo
              (image), 25 Mo (fichier)
            </p>
          </form>
        )}
      </div>
    </div>
  );
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} o`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} Ko`;
  return `${(bytes / 1024 / 1024).toFixed(1)} Mo`;
}
