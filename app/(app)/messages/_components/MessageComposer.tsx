"use client";

import {
  Eye,
  EyeOff,
  Image as ImageIcon,
  Loader2,
  Mic,
  Paperclip,
  Plus,
  Send,
  Smile,
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
import { notifyNewMessage } from "../notify-actions";
import { ComposerExtrasSheet } from "./ComposerExtrasSheet";
import { EmojiPicker } from "./EmojiPicker";
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
  /* Si le fichier a été chiffré côté client avant upload : iv +
     contentType original (le blob uploadé est en application/octet-stream). */
  encryption: {
    iv: string;
    contentType: string;
  } | null;
};

type MessageComposerProps = {
  conversationId: string;
  senderId: string;
  replyTo: MessageReplyContext | null;
  onClearReply: () => void;
  /* Si fourni : conv en mode secret effectif. Le composer chiffrera
     le texte avant insert et marquera is_secret=true. */
  encryptFn?: (text: string) => Promise<EncryptedPayload>;
  /* Chiffrement des médias E2E (Chantier 1.7). Si fourni AND attachment
     présent → encrypt les bytes avant upload Supabase Storage. */
  encryptBytesFn?: (
    bytes: ArrayBuffer,
  ) => Promise<{ ciphertext: ArrayBuffer; iv: string; sessionKeyHash: string }>;
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
  encryptBytesFn,
  secretLabel,
}: MessageComposerProps) {
  const [body, setBody] = useState("");
  const [attachment, setAttachment] = useState<Attachment | null>(null);
  const [uploading, setUploading] = useState(false);
  const [recording, setRecording] = useState(false);
  const [emojiOpen, setEmojiOpen] = useState(false);
  const [extrasOpen, setExtrasOpen] = useState(false);
  /* Éclats : si toggle ON, le prochain attachment envoyé sera view-once
     (visible une seule fois). Reset après chaque envoi. */
  const [viewOnce, setViewOnce] = useState(false);
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
    /* Dimensions BEFORE encryption — il faut un Blob image lisible
       pour mesurer naturalWidth/Height. */
    let dims: { width: number; height: number } | null = null;
    if (kind === "image") {
      dims = await getImageDimensions(file);
    }

    /* Préparation du payload : si on est en mode secret, on chiffre le
       fichier côté client avant l'upload. Le ciphertext est uploadé
       comme application/octet-stream, et l'IV + contentType original
       voyagent dans encryption_metadata.media. */
    let bodyToUpload: Blob = file;
    let contentTypeForUpload = file.type;
    let encryption: { iv: string; contentType: string } | null = null;
    const useE2E = encryptBytesFn !== undefined;

    if (useE2E) {
      try {
        const buffer = await file.arrayBuffer();
        const { ciphertext, iv } = await encryptBytesFn(buffer);
        bodyToUpload = new Blob([ciphertext], {
          type: "application/octet-stream",
        });
        contentTypeForUpload = "application/octet-stream";
        encryption = { iv, contentType: file.type };
      } catch (err) {
        console.error("[uploadFile:encrypt]", err);
        toast.error("Échec du chiffrement du média.");
        return null;
      }
    }

    const ext = useE2E
      ? "bin" // ciphertext opaque, pas d'extension réelle
      : file.name.split(".").pop()?.toLowerCase() ?? "bin";
    const storagePath = `${senderId}/${conversationId}/${crypto.randomUUID()}.${ext}`;

    const { error } = await supabase.storage
      .from("chat-media")
      .upload(storagePath, bodyToUpload, {
        contentType: contentTypeForUpload,
        cacheControl: "3600",
      });

    if (error) {
      toast.error("Échec du téléversement.");
      return null;
    }

    const {
      data: { publicUrl },
    } = supabase.storage.from("chat-media").getPublicUrl(storagePath);

    return {
      url: publicUrl,
      storagePath,
      type: kind,
      name: file.name,
      size: file.size,
      width: dims?.width ?? null,
      height: dims?.height ?? null,
      encryption,
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
    const useE2E = encryptBytesFn !== undefined;

    /* Si mode secret : chiffre le blob audio avant upload. */
    let bodyToUpload: Blob = audio.blob;
    let contentTypeForUpload = audio.mimeType || "audio/webm";
    let mediaEncryption: { iv: string; contentType: string } | null = null;
    if (useE2E) {
      try {
        const buffer = await audio.blob.arrayBuffer();
        const { ciphertext, iv } = await encryptBytesFn(buffer);
        bodyToUpload = new Blob([ciphertext], {
          type: "application/octet-stream",
        });
        contentTypeForUpload = "application/octet-stream";
        mediaEncryption = { iv, contentType: audio.mimeType || "audio/webm" };
      } catch (err) {
        console.error("[handleVoiceSend:encrypt]", err);
        toast.error("Échec du chiffrement du message vocal.");
        throw err;
      }
    }

    const ext = useE2E
      ? "bin"
      : audio.mimeType.includes("mp4")
        ? "m4a"
        : audio.mimeType.includes("mpeg")
          ? "mp3"
          : "webm";
    const storagePath = `${senderId}/${conversationId}/${crypto.randomUUID()}.${ext}`;

    const { error: uploadError } = await supabase.storage
      .from("chat-media")
      .upload(storagePath, bodyToUpload, {
        contentType: contentTypeForUpload,
        cacheControl: "3600",
      });

    if (uploadError) {
      toast.error("Échec de l'envoi du message vocal.");
      throw uploadError;
    }

    const {
      data: { publicUrl },
    } = supabase.storage.from("chat-media").getPublicUrl(storagePath);

    const mediaMetadata = mediaEncryption
      ? {
          iv: mediaEncryption.iv,
          contentType: mediaEncryption.contentType,
          originalSize: audio.blob.size,
        }
      : null;

    const { error } = await supabase.from("messages").insert({
      conversation_id: conversationId,
      sender_id: senderId,
      attachment_url: publicUrl,
      attachment_type: "audio",
      attachment_size: audio.blob.size,
      attachment_duration_ms: Math.round(audio.durationMs),
      reply_to_message_id: replyTo?.id ?? null,
      ...(mediaMetadata
        ? {
            is_secret: true,
            encryption_metadata: { version: 1, media: mediaMetadata },
          }
        : {}),
    });

    if (error) {
      await supabase.storage.from("chat-media").remove([storagePath]);
      toast.error("Échec de l'envoi.");
      throw error;
    }

    /* Push notification fire-and-forget pour le message vocal. */
    void notifyNewMessage(conversationId, {
      isSecret: mediaMetadata !== null,
      attachmentType: "audio",
    });

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
    const previousViewOnce = viewOnce;
    setBody("");
    setAttachment(null);
    setViewOnce(false);
    onClearReply();
    requestAnimationFrame(resize);

    /* View-once V1 : effectif uniquement si attachment présent. Un
       message texte view-once n'a pas vraiment de sens UX (le bubble
       resterait en clair). */
    const isViewOnce = previousViewOnce && previousAttachment !== null;

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
          view_once: isViewOnce,
        };

        /* Mode secret : encrypt le texte ET marque le payload média
           chiffré dans encryption_metadata.media. Si pas de texte mais
           juste un média chiffré, on flag quand même is_secret=true. */
        const mediaMetadata = previousAttachment?.encryption
          ? {
              iv: previousAttachment.encryption.iv,
              contentType: previousAttachment.encryption.contentType,
              originalName: previousAttachment.name,
              originalSize: previousAttachment.size,
            }
          : null;

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
              ...(mediaMetadata ? { media: mediaMetadata } : {}),
            },
          });
        } else if (mediaMetadata) {
          /* Pas de texte mais média chiffré → marque le message
             is_secret pour que le bubble lance le decrypt. */
          result = await supabase.from("messages").insert({
            ...basePayload,
            is_secret: true,
            encryption_metadata: {
              version: 1,
              media: mediaMetadata,
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
        } else {
          /* Push notification fire-and-forget aux autres membres
             (respecte le mute par-conv côté Server Action). */
          void notifyNewMessage(conversationId, {
            body: trimmed.length > 0 ? trimmed : null,
            isSecret: encryptFn !== undefined && trimmed.length > 0,
            attachmentType: previousAttachment?.type ?? null,
          });
        }
      } catch (err) {
        console.error("[MessageComposer:send]", err);
        toast.error(
          err instanceof Error ? err.message : "Échec du chiffrement.",
        );
        setBody(previousBody);
        setAttachment(previousAttachment);
        setViewOnce(previousViewOnce);
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

  /* Insert l'emoji à la position du curseur (préserve les selections,
     déplace le caret après l'emoji inséré). Si pas de focus, append à
     la fin. */
  function insertEmoji(emoji: string) {
    const ta = textareaRef.current;
    if (!ta) {
      setBody((prev) => prev + emoji);
      return;
    }
    const start = ta.selectionStart ?? body.length;
    const end = ta.selectionEnd ?? body.length;
    const next = body.slice(0, start) + emoji + body.slice(end);
    setBody(next);
    /* Réapplique le caret après le render. */
    requestAnimationFrame(() => {
      const node = textareaRef.current;
      if (!node) return;
      const caret = start + emoji.length;
      node.focus();
      node.setSelectionRange(caret, caret);
      resize();
    });
  }

  const remaining = MAX_LENGTH - body.length;
  const tooLong = remaining < 0;
  const canSend =
    !pending && !tooLong && (body.trim().length > 0 || attachment !== null);

  return (
    <div className="border-t border-line bg-white px-2.5 sm:px-6 py-2 sm:py-4">
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
                  onClick={() => setViewOnce((v) => !v)}
                  aria-pressed={viewOnce}
                  aria-label={
                    viewOnce
                      ? "Désactiver le mode Éclat"
                      : "Activer le mode Éclat (vu une fois)"
                  }
                  title={
                    viewOnce
                      ? "Éclat ON — vu une seule fois"
                      : "Éclat OFF — message classique"
                  }
                  className={cn(
                    "w-11 h-11 rounded-full flex items-center justify-center shrink-0 transition-colors",
                    viewOnce
                      ? "bg-gold/20 text-gold-deep border border-gold/40"
                      : "hover:bg-night/5 text-night-muted hover:text-night",
                  )}
                >
                  {viewOnce ? (
                    <Eye className="w-4 h-4" aria-hidden />
                  ) : (
                    <EyeOff className="w-4 h-4" aria-hidden />
                  )}
                </button>
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
            {viewOnce && attachment ? (
              <div className="mb-3 flex items-center gap-2 px-3 py-2 rounded-full bg-gold/10 border border-gold/30 text-[11.5px] font-semibold text-gold-deep">
                <Eye className="w-3.5 h-3.5" aria-hidden />
                Éclat — visible une seule fois par le destinataire
              </div>
            ) : null}

            {/* Bar style WhatsApp : [+] [📷] [pill input avec emoji inside] [mic/send] */}
            <div className="flex items-end gap-1.5">
              {/* Bouton + : ouvre la sheet d'extras (fichier, localisation, etc.) */}
              <button
                type="button"
                onClick={() => setExtrasOpen(true)}
                disabled={attachment !== null}
                aria-label="Plus d'options"
                className={cn(
                  "shrink-0 w-10 h-10 rounded-full flex items-center justify-center transition-colors",
                  attachment !== null
                    ? "text-muted/50 cursor-not-allowed"
                    : "text-night-muted hover:bg-night/5 hover:text-night",
                )}
              >
                <Plus className="w-5 h-5" aria-hidden />
              </button>

              {/* Bouton Photo */}
              <button
                type="button"
                onClick={() => imageInputRef.current?.click()}
                disabled={uploading || attachment !== null}
                aria-label="Ajouter une photo"
                className={cn(
                  "shrink-0 w-10 h-10 rounded-full flex items-center justify-center transition-colors",
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

              {/* Pill input WhatsApp-style avec emoji intégré à droite.
                  Pas de transition au focus (animation que le user trouve
                  désagréable) — juste border statique. */}
              <div className="flex-1 min-w-0 relative flex items-end bg-bg rounded-3xl border border-line focus-within:border-night/40">
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
                  /* font-size:16px (text-base) sur mobile pour éviter
                     l'auto-zoom iOS Safari qui décale toute la page. */
                  className="flex-1 min-w-0 resize-none bg-transparent pl-4 pr-1 py-2.5 text-base sm:text-sm text-fg placeholder:text-muted/70 focus:outline-none disabled:opacity-60"
                  aria-label="Message"
                />
                <button
                  type="button"
                  onClick={() => setEmojiOpen((v) => !v)}
                  aria-label="Insérer un emoji"
                  aria-expanded={emojiOpen}
                  className={cn(
                    "shrink-0 w-9 h-9 mr-0.5 mb-0.5 rounded-full flex items-center justify-center transition-colors",
                    emojiOpen
                      ? "bg-night/5 text-night"
                      : "text-night-muted hover:bg-night/5 hover:text-night",
                  )}
                >
                  <Smile className="w-5 h-5" aria-hidden />
                </button>
                {emojiOpen ? (
                  <>
                    <button
                      type="button"
                      aria-label="Fermer le sélecteur d'emojis"
                      onClick={() => setEmojiOpen(false)}
                      className="fixed inset-0 z-30 cursor-default"
                    />
                    <EmojiPicker
                      onPick={(emoji) => {
                        insertEmoji(emoji);
                        notifyTyping();
                      }}
                      onClose={() => setEmojiOpen(false)}
                    />
                  </>
                ) : null}
                {tooLong ? (
                  <p className="absolute -top-5 right-2 text-[10px] text-red-600 bg-white px-1 rounded">
                    {remaining}
                  </p>
                ) : null}
              </div>

              {/* Mic (quand rien à envoyer) OU Send (quand texte/attachment) */}
              {canSend ? (
                <button
                  type="submit"
                  disabled={!canSend}
                  aria-label="Envoyer"
                  className="shrink-0 w-11 h-11 rounded-full bg-night text-cream flex items-center justify-center hover:bg-night-soft transition-colors active:scale-95"
                >
                  {pending ? (
                    <span className="w-4 h-4 border-2 border-cream border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <Send className="w-4 h-4" aria-hidden />
                  )}
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => setRecording(true)}
                  disabled={attachment !== null}
                  aria-label="Enregistrer un message vocal"
                  className={cn(
                    "shrink-0 w-11 h-11 rounded-full flex items-center justify-center transition-colors active:scale-95",
                    attachment !== null
                      ? "bg-night/20 text-cream/60 cursor-not-allowed"
                      : "bg-night text-cream hover:bg-night-soft",
                  )}
                >
                  <Mic className="w-4 h-4" aria-hidden />
                </button>
              )}
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
          </form>
        )}
      </div>

      <ComposerExtrasSheet
        open={extrasOpen}
        onClose={() => setExtrasOpen(false)}
        onPickFile={() => fileInputRef.current?.click()}
      />
    </div>
  );
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} o`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} Ko`;
  return `${(bytes / 1024 / 1024).toFixed(1)} Mo`;
}
