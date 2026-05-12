"use client";

import {
  Check,
  Download,
  Eye,
  EyeOff,
  FileText,
  Lock,
  Pin,
  Reply,
  Sparkles,
  Trash2,
  X,
} from "lucide-react";
import Image from "next/image";
import { useEffect, useState, useTransition } from "react";
import { toast } from "sonner";
import { Avatar } from "@/components/ui/Avatar";
import type {
  Message,
  MessageReplyContext,
  MessageReactionSummary,
} from "@/lib/database.types";
import type { EncryptedPayload } from "@/lib/crypto/types";
import { useConfirm } from "@/components/ui/ConfirmDialog";
import { useLongPress } from "@/lib/hooks/useLongPress";
import { cn } from "@/lib/utils/cn";
import { createClient } from "@/lib/supabase/client";
import { formatTimestamp } from "@/lib/utils/relativeTime";
import { markViewOnceViewed } from "../eclats-actions";
import {
  editOwnMessage,
  togglePinInConv,
} from "../message-actions";
import { AudioPlayer } from "./AudioPlayer";
import { ForwardPicker } from "./ForwardPicker";
import { MessageActionsSheet } from "./MessageActionsSheet";
import { MessageReactions } from "./MessageReactions";
import { ReactionPicker } from "./ReactionPicker";
import { ReplyPreview } from "./ReplyPreview";

type MessageBubbleProps = {
  message: Message;
  isOwn: boolean;
  currentUserId: string;
  showAvatar: boolean;
  showTime: boolean;
  senderName: string | null;
  senderAvatarUrl: string | null;
  reactions: MessageReactionSummary[];
  replyContext: MessageReplyContext | null;
  onReply: () => void;
  /* Si conv en mode secret effectif : fonction de déchiffrement. Si
     non fourni mais message.is_secret, on affiche un placeholder
     "verrouillé". */
  decryptFn?: (payload: EncryptedPayload) => Promise<string>;
  /* Décrypt des médias E2E. */
  decryptBytesFn?: (ciphertext: ArrayBuffer, iv: string) => Promise<ArrayBuffer>;
  /* Chantier 3 : couleurs des bulles depuis le thème. Si non fourni,
     fallback vers les couleurs night/cream/white par défaut. */
  bubbleStyle?: {
    ownBg: string;
    ownText: string;
    otherBg: string;
    otherText: string;
  };
};

/* Détecte si un body de message est un "sticker" : 1-3 emojis seuls
 * (avec éventuels modifiers/ZWJ pour emojis composés type 👨‍👩‍👧). Si oui,
 * on rend le message en XL sans bulle pour un effet "sticker WhatsApp/
 * Telegram". */
function isStickerBody(body: string | null): boolean {
  if (!body) return false;
  const trimmed = body.trim();
  if (trimmed.length === 0 || trimmed.length > 30) return false;
  /* Regex : autorise emojis (large unicode property "Emoji"), variation
     selectors (️), ZWJ (‍), modificateurs skin tone, et
     espaces blancs entre. Refuse tout autre char. */
  const onlyEmojis = /^(?:\p{Emoji}|️|‍|\s)+$/u.test(trimmed);
  if (!onlyEmojis) return false;
  /* Compte les "emoji grapheme clusters" (= un emoji visible = un cluster). */
  const segmenter =
    typeof Intl !== "undefined" && "Segmenter" in Intl
      ? new Intl.Segmenter(undefined, { granularity: "grapheme" })
      : null;
  if (!segmenter) return trimmed.length <= 8; // fallback raisonnable
  let count = 0;
  for (const seg of segmenter.segment(trimmed)) {
    if (seg.segment.trim().length > 0) count++;
    if (count > 3) return false;
  }
  return count >= 1 && count <= 3;
}

/* Extrait le sous-objet media de encryption_metadata si présent et valide. */
function asMediaPayload(
  meta: Record<string, unknown> | null,
): { iv: string; contentType: string } | null {
  if (!meta) return null;
  const media = (meta as Record<string, unknown>).media;
  if (!media || typeof media !== "object") return null;
  const { iv, contentType } = media as Record<string, unknown>;
  if (typeof iv === "string" && typeof contentType === "string") {
    return { iv, contentType };
  }
  return null;
}

/* Tente d'extraire un EncryptedPayload valide depuis encryption_metadata
   (jsonb côté DB, donc Record<string,unknown> côté TS). */
function asEncryptedPayload(
  meta: Record<string, unknown> | null,
): EncryptedPayload | null {
  if (!meta) return null;
  const { ciphertext, iv, sessionKeyHash, version } = meta as Record<
    string,
    unknown
  >;
  if (
    typeof ciphertext === "string" &&
    typeof iv === "string" &&
    typeof sessionKeyHash === "string" &&
    version === 1
  ) {
    return { ciphertext, iv, sessionKeyHash, version: 1 };
  }
  return null;
}

type DecryptState =
  | { status: "plain"; text: string | null }
  | { status: "pending" }
  | { status: "ok"; text: string }
  | { status: "locked" }
  | { status: "error" };

export function MessageBubble({
  message,
  isOwn,
  currentUserId,
  showAvatar,
  showTime,
  senderName,
  senderAvatarUrl,
  reactions,
  replyContext,
  onReply,
  decryptFn,
  decryptBytesFn,
  bubbleStyle,
}: MessageBubbleProps) {
  /* Couleurs des bulles depuis le thème (fallback aux valeurs par défaut). */
  const bubbleColors = bubbleStyle
    ? isOwn
      ? { backgroundColor: bubbleStyle.ownBg, color: bubbleStyle.ownText }
      : { backgroundColor: bubbleStyle.otherBg, color: bubbleStyle.otherText }
    : undefined;
  const confirm = useConfirm();
  const [pendingDelete, startDelete] = useTransition();
  const [, startMutation] = useTransition();
  const [sheetOpen, setSheetOpen] = useState(false);
  const [forwardOpen, setForwardOpen] = useState(false);
  const [editing, setEditing] = useState(false);
  const [editValue, setEditValue] = useState<string>(message.body ?? "");

  /* Déchiffrement asynchrone si message secret. Pour les messages clairs
     on saute direct au status "plain". */
  const payload = message.is_secret
    ? asEncryptedPayload(message.encryption_metadata)
    : null;
  const [decryptState, setDecryptState] = useState<DecryptState>(() =>
    message.is_secret
      ? payload && decryptFn
        ? { status: "pending" }
        : { status: "locked" }
      : { status: "plain", text: message.body },
  );

  useEffect(() => {
    if (!message.is_secret) {
      setDecryptState({ status: "plain", text: message.body });
      return;
    }
    if (!payload || !decryptFn) {
      setDecryptState({ status: "locked" });
      return;
    }
    let cancelled = false;
    setDecryptState({ status: "pending" });
    decryptFn(payload)
      .then((text) => {
        if (!cancelled) setDecryptState({ status: "ok", text });
      })
      .catch(() => {
        if (!cancelled) setDecryptState({ status: "error" });
      });
    return () => {
      cancelled = true;
    };
    /* On dépend du sessionKeyHash (change si la session crypto change) et
       du ciphertext, mais pas de l'objet payload entier (référence change
       à chaque render). decryptFn est stable via useCallback côté hook. */
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    message.is_secret,
    message.body,
    payload?.ciphertext,
    payload?.sessionKeyHash,
    decryptFn,
  ]);

  /* Corps à afficher en bulle (null = pas de bulle texte). */
  const displayBody: string | null = (() => {
    switch (decryptState.status) {
      case "plain":
      case "ok":
        return decryptState.text;
      case "pending":
        return "⏳ Déchiffrement…";
      case "locked":
        return "🔒 Conversation secrète — déverrouille le coffre";
      case "error":
        return "🔒 Impossible de déchiffrer ce message";
    }
  })();
  const isCipherPlaceholder =
    decryptState.status === "pending" ||
    decryptState.status === "locked" ||
    decryptState.status === "error";

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

  const hasTextBubble = displayBody !== null && displayBody !== "";

  const isViewOnce = message.view_once === true;
  const viewOnceConsumed = isViewOnce && message.view_once_viewed_at !== null;
  const [eclatOverlayOpen, setEclatOverlayOpen] = useState(false);

  /* Si le média est chiffré (encryption_metadata.media) et qu'on a un
     decryptBytesFn : fetch+decrypt+blob URL. Sinon on garde l'URL
     directe. */
  const mediaPayload = message.is_secret
    ? asMediaPayload(message.encryption_metadata)
    : null;
  type MediaState =
    | { kind: "direct"; url: string | null }
    | { kind: "decrypting" }
    | { kind: "ok"; url: string; contentType: string }
    | { kind: "error" };
  const [mediaState, setMediaState] = useState<MediaState>(() =>
    mediaPayload
      ? { kind: "decrypting" }
      : { kind: "direct", url: message.attachment_url },
  );

  useEffect(() => {
    if (!mediaPayload || !message.attachment_url) {
      setMediaState({ kind: "direct", url: message.attachment_url });
      return;
    }
    if (!decryptBytesFn) {
      /* Pas de session crypto → impossible d'afficher le média. */
      setMediaState({ kind: "error" });
      return;
    }

    let cancelled = false;
    let createdUrl: string | null = null;
    setMediaState({ kind: "decrypting" });
    (async () => {
      try {
        const res = await fetch(message.attachment_url!);
        if (!res.ok) throw new Error("Fetch media failed");
        const buffer = await res.arrayBuffer();
        const plaintext = await decryptBytesFn(buffer, mediaPayload.iv);
        if (cancelled) return;
        const blob = new Blob([plaintext], { type: mediaPayload.contentType });
        const url = URL.createObjectURL(blob);
        createdUrl = url;
        setMediaState({ kind: "ok", url, contentType: mediaPayload.contentType });
      } catch (err) {
        console.error("[MessageBubble:decrypt-media]", err);
        if (!cancelled) setMediaState({ kind: "error" });
      }
    })();

    return () => {
      cancelled = true;
      if (createdUrl) URL.revokeObjectURL(createdUrl);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [message.attachment_url, mediaPayload?.iv, decryptBytesFn]);

  /* URL effective à afficher dans les composants visuels. */
  const mediaUrl =
    mediaState.kind === "direct"
      ? mediaState.url
      : mediaState.kind === "ok"
        ? mediaState.url
        : null;
  const mediaLocked =
    mediaState.kind === "decrypting" || mediaState.kind === "error";

  const hasImage =
    message.attachment_type === "image" && mediaUrl !== null;
  const hasAudio =
    message.attachment_type === "audio" && mediaUrl !== null;
  const hasFile =
    mediaUrl !== null &&
    message.attachment_type !== "image" &&
    message.attachment_type !== "audio" &&
    message.attachment_type !== null;

  async function handleOpenEclat() {
    if (!isViewOnce || viewOnceConsumed || isOwn) return;
    setEclatOverlayOpen(true);
    /* Marquer comme vu côté serveur — l'utilisateur a explicitement
       cliqué pour ouvrir, donc on consume tout de suite (cohérence
       Telegram/WhatsApp). L'overlay reste ouvert tant que l'user
       n'a pas cliqué hors. */
    const res = await markViewOnceViewed(message.id);
    if (!res.ok) {
      toast.error(res.error);
    }
  }

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

  function handleTogglePin() {
    startMutation(async () => {
      const res = await togglePinInConv(message.id);
      if (!res.ok) toast.error(res.error);
    });
  }

  function handleStartEdit() {
    setEditValue(message.body ?? "");
    setEditing(true);
  }

  function handleCancelEdit() {
    setEditing(false);
    setEditValue(message.body ?? "");
  }

  function handleSaveEdit() {
    const trimmed = editValue.trim();
    if (trimmed.length === 0 || trimmed === message.body) {
      setEditing(false);
      return;
    }
    startMutation(async () => {
      const res = await editOwnMessage(message.id, trimmed);
      if (res.ok) {
        setEditing(false);
      } else {
        toast.error(res.error);
      }
    });
  }

  async function handleDelete() {
    const ok = await confirm({
      title: "Supprimer ce message ?",
      description: "Le message sera retiré pour tout le monde dans la conversation.",
      confirmLabel: "Supprimer",
      variant: "destructive",
    });
    if (!ok) return;
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

            {isViewOnce ? (
              <EclatCard
                isOwn={isOwn}
                consumed={viewOnceConsumed}
                attachmentType={message.attachment_type}
                onOpen={handleOpenEclat}
              />
            ) : mediaLocked ? (
              <EncryptedMediaPlaceholder
                isOwn={isOwn}
                state={mediaState.kind === "decrypting" ? "decrypting" : "error"}
                attachmentType={message.attachment_type}
              />
            ) : (
              <>
                {hasImage ? (
                  <ImageAttachment
                    url={mediaUrl!}
                    width={message.attachment_width}
                    height={message.attachment_height}
                    isOwn={isOwn}
                  />
                ) : null}

                {hasAudio ? (
                  <AudioPlayer
                    url={mediaUrl!}
                    durationMs={message.attachment_duration_ms}
                    isOwn={isOwn}
                  />
                ) : null}

                {hasFile ? (
                  <FileAttachment
                    url={mediaUrl!}
                    name={message.attachment_name ?? "fichier"}
                    size={message.attachment_size}
                    isOwn={isOwn}
                  />
                ) : null}
              </>
            )}

            {editing ? (
              <div
                style={bubbleColors}
                className={cn(
                  "px-3 py-2 rounded-3xl shadow-sm w-full",
                  isOwn
                    ? bubbleColors
                      ? "rounded-br-md"
                      : "bg-night text-cream rounded-br-md"
                    : bubbleColors
                      ? "border border-line rounded-bl-md"
                      : "bg-white text-night border border-line rounded-bl-md",
                )}
              >
                <textarea
                  autoFocus
                  value={editValue}
                  onChange={(e) => setEditValue(e.currentTarget.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault();
                      handleSaveEdit();
                    } else if (e.key === "Escape") {
                      e.preventDefault();
                      handleCancelEdit();
                    }
                  }}
                  rows={2}
                  maxLength={4000}
                  className={cn(
                    "w-full resize-none bg-transparent text-sm leading-relaxed outline-none placeholder:opacity-50",
                    isOwn
                      ? "text-cream placeholder:text-cream/40"
                      : "text-night placeholder:text-muted",
                  )}
                />
                <div className="flex items-center gap-2 mt-2">
                  <button
                    type="button"
                    onClick={handleCancelEdit}
                    aria-label="Annuler"
                    className={cn(
                      "px-3 h-7 rounded-full text-[11px] font-bold",
                      isOwn
                        ? "bg-cream/15 text-cream hover:bg-cream/25"
                        : "bg-night/5 text-night-muted hover:bg-night/10",
                    )}
                  >
                    <X className="w-3 h-3 inline mr-1" aria-hidden />
                    Annuler
                  </button>
                  <button
                    type="button"
                    onClick={handleSaveEdit}
                    aria-label="Enregistrer"
                    className="px-3 h-7 rounded-full text-[11px] font-bold bg-gold text-night hover:bg-gold-soft"
                  >
                    <Check className="w-3 h-3 inline mr-1" aria-hidden />
                    Enregistrer
                  </button>
                </div>
              </div>
            ) : hasTextBubble &&
              !isCipherPlaceholder &&
              !hasImage &&
              !hasFile &&
              !hasAudio &&
              isStickerBody(displayBody) ? (
              /* Mode "sticker" : 1-3 emojis seuls → rendu XL sans bulle
                 (style WhatsApp/Telegram). */
              <div
                className={cn(
                  "select-none leading-none px-1",
                  isOwn ? "text-right" : "text-left",
                )}
              >
                <span className="text-6xl sm:text-7xl">{displayBody}</span>
                {message.edited_at ? (
                  <p className="text-[10px] mt-1 italic text-muted">
                    (modifié)
                  </p>
                ) : null}
              </div>
            ) : hasTextBubble ? (
              <div
                style={bubbleColors}
                className={cn(
                  "px-4 py-2.5 rounded-3xl text-sm leading-relaxed shadow-sm select-none",
                  hasImage || hasFile || hasAudio ? "mt-1.5" : "",
                  isOwn
                    ? bubbleColors
                      ? "rounded-br-md"
                      : "bg-night text-cream rounded-br-md"
                    : bubbleColors
                      ? "border border-line rounded-bl-md"
                      : "bg-white text-night border border-line rounded-bl-md",
                  isCipherPlaceholder ? "italic opacity-80" : "",
                )}
              >
                <div className="flex items-center gap-1.5 mb-1">
                  {message.is_secret && !isCipherPlaceholder ? (
                    <span
                      className={cn(
                        "inline-flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wider opacity-70",
                      )}
                    >
                      <Lock className="w-2.5 h-2.5" aria-hidden />
                      Secret
                    </span>
                  ) : null}
                  {message.is_pinned_in_conv ? (
                    <span
                      className={cn(
                        "inline-flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wider opacity-70",
                      )}
                      aria-label="Épinglé"
                    >
                      <Pin className="w-2.5 h-2.5" aria-hidden />
                      Épinglé
                    </span>
                  ) : null}
                </div>
                <p className="whitespace-pre-wrap break-words">
                  {displayBody}
                </p>
                {message.edited_at ? (
                  <p
                    className={cn(
                      "text-[10px] mt-1 italic",
                      isOwn ? "text-cream/50" : "text-muted",
                    )}
                  >
                    (modifié)
                  </p>
                ) : null}
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
        messageBody={isCipherPlaceholder ? null : displayBody}
        onReact={handleQuickReact}
        onReply={onReply}
        onDelete={handleDelete}
        onForward={() => setForwardOpen(true)}
        onTogglePin={handleTogglePin}
        onEdit={handleStartEdit}
        isPinnedInConv={message.is_pinned_in_conv}
        canEdit={
          isOwn &&
          !message.is_secret &&
          !isViewOnce &&
          message.body !== null
        }
        canForward={!message.is_secret && !isViewOnce}
      />

      <ForwardPicker
        open={forwardOpen}
        onClose={() => setForwardOpen(false)}
        messageId={message.id}
        currentUserId={currentUserId}
      />

      {eclatOverlayOpen && message.attachment_url ? (
        <EclatOverlay
          url={message.attachment_url}
          attachmentType={message.attachment_type}
          width={message.attachment_width}
          height={message.attachment_height}
          durationMs={message.attachment_duration_ms}
          onClose={() => setEclatOverlayOpen(false)}
        />
      ) : null}
    </div>
  );
}

/* Placeholder pour les médias chiffrés en cours de déchiffrement ou en
 * erreur (session crypto manquante). */
function EncryptedMediaPlaceholder({
  isOwn,
  state,
  attachmentType,
}: {
  isOwn: boolean;
  state: "decrypting" | "error";
  attachmentType: Message["attachment_type"];
}) {
  const label =
    attachmentType === "image"
      ? "Photo chiffrée"
      : attachmentType === "audio"
        ? "Message vocal chiffré"
        : "Fichier chiffré";
  const message =
    state === "decrypting"
      ? "⏳ Déchiffrement…"
      : "🔒 Déchiffrement impossible (session crypto manquante)";

  return (
    <div
      className={cn(
        "flex items-center gap-2 px-4 py-3 rounded-3xl text-sm italic shadow-sm",
        isOwn
          ? "bg-night/80 text-cream/90 rounded-br-md"
          : "bg-white/80 text-night-muted border border-line rounded-bl-md",
      )}
    >
      <Lock className="w-3.5 h-3.5" aria-hidden />
      <span>
        {label} · {message}
      </span>
    </div>
  );
}

/* Card affichée dans la bulle pour un message view-once :
 * - Côté sender : statut envoyé / ouvert
 * - Côté receiver : bouton "Voir l'éclat" tant que non consommé, sinon
 *   placeholder "Éclat consommé" */
function EclatCard({
  isOwn,
  consumed,
  attachmentType,
  onOpen,
}: {
  isOwn: boolean;
  consumed: boolean;
  attachmentType: Message["attachment_type"];
  onOpen: () => void;
}) {
  const mediaLabel =
    attachmentType === "image"
      ? "photo"
      : attachmentType === "audio"
        ? "message vocal"
        : "fichier";

  if (isOwn) {
    return (
      <div
        className={cn(
          "flex items-center gap-2 px-4 py-3 rounded-3xl text-sm shadow-sm rounded-br-md italic",
          consumed
            ? "bg-night/40 text-cream/80 border border-night/30"
            : "bg-night text-cream",
        )}
      >
        <Eye className="w-4 h-4" aria-hidden />
        <span>
          {consumed
            ? `Éclat ouvert · ${mediaLabel}`
            : `Éclat envoyé · ${mediaLabel}`}
        </span>
      </div>
    );
  }

  if (consumed) {
    return (
      <div className="flex items-center gap-2 px-4 py-3 rounded-3xl rounded-bl-md text-sm shadow-sm bg-white/60 border border-line text-night-muted italic">
        <EyeOff className="w-4 h-4" aria-hidden />
        <span>Éclat consommé — vu une fois</span>
      </div>
    );
  }

  return (
    <button
      type="button"
      onClick={onOpen}
      className="group flex items-center gap-3 px-4 py-3 rounded-3xl rounded-bl-md text-sm shadow-sm bg-gradient-to-br from-gold/10 via-cream to-bg border border-gold/30 hover:border-gold/60 transition-colors text-night"
    >
      <span className="w-10 h-10 rounded-2xl bg-gold/20 text-gold-deep flex items-center justify-center group-hover:bg-gold/30 transition-colors">
        <Eye className="w-5 h-5" aria-hidden />
      </span>
      <span className="flex flex-col items-start">
        <span className="font-bold text-night">Éclat reçu</span>
        <span className="text-[11px] text-night-muted">
          Touche pour voir une fois ({mediaLabel})
        </span>
      </span>
    </button>
  );
}

/* Overlay fullscreen pour visionner un éclat. Une fois fermé, l'user
 * ne peut plus revenir dessus. */
function EclatOverlay({
  url,
  attachmentType,
  width,
  height,
  durationMs,
  onClose,
}: {
  url: string;
  attachmentType: Message["attachment_type"];
  width: number | null;
  height: number | null;
  durationMs: number | null;
  onClose: () => void;
}) {
  useEffect(() => {
    function handleKey(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
    }
    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, [onClose]);

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Éclat"
      onClick={onClose}
      className="fixed inset-0 z-[60] bg-night/95 backdrop-blur-md flex items-center justify-center p-6"
    >
      <button
        type="button"
        onClick={onClose}
        aria-label="Fermer l'éclat"
        className="absolute top-4 right-4 w-11 h-11 rounded-full bg-white/10 text-cream hover:bg-white/20 flex items-center justify-center"
      >
        <Trash2 className="w-4 h-4" aria-hidden />
      </button>
      <div
        className="relative max-w-3xl w-full max-h-[80vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {attachmentType === "image" ? (
          <Image
            src={url}
            alt="Éclat"
            width={width ?? 1200}
            height={height ?? 800}
            className="w-full h-auto max-h-[80vh] object-contain rounded-2xl shadow-2xl"
            unoptimized
          />
        ) : attachmentType === "audio" ? (
          <div className="rounded-3xl bg-white p-6 shadow-2xl">
            <AudioPlayer
              url={url}
              durationMs={durationMs}
              isOwn={false}
            />
          </div>
        ) : (
          <div className="rounded-3xl bg-white p-8 text-center shadow-2xl">
            <FileText
              className="w-10 h-10 text-night-muted mx-auto mb-3"
              aria-hidden
            />
            <a
              href={url}
              target="_blank"
              rel="noopener noreferrer"
              download
              className="inline-flex items-center gap-2 px-5 h-11 rounded-full bg-night text-cream text-sm font-bold"
            >
              <Download className="w-4 h-4" aria-hidden />
              Télécharger maintenant
            </a>
            <p className="mt-2 text-[11px] text-muted">
              Tu ne pourras plus accéder à ce fichier après cette fenêtre.
            </p>
          </div>
        )}
      </div>
      <p className="absolute bottom-6 left-1/2 -translate-x-1/2 text-[11px] text-cream/70 italic">
        Cet éclat ne sera plus visible une fois fermé.
      </p>
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
