"use client";

/* PostComposer — refonte audit S3 (handoff feed-mobile-bold L57-81 chip
 * + L233-287 BoldComposerScreen modal).
 *
 * Architecture en 2 vues :
 * - Chip teaser inline (toujours visible dans le feed) : avatar + texte
 *   d'invitation Instrument Serif italic + 3 pills (Photo / Moment / Amis)
 * - Modal full-screen ouverte au clic sur le chip (ou sur une pill) avec
 *   tout le composer Bold : top bar + card + toolbar
 *
 * État ouvert/fermé géré localement (useState `open`). Auto-close on
 * publish success. ESC + click backdrop ferment.
 *
 * Toute la logique upload/visibility/server-action préservée.
 */
import {
  ArrowLeft,
  ChevronDown,
  Globe,
  ImagePlus,
  Loader2,
  Lock,
  MapPin,
  Send,
  Sparkles,
  Users,
  Video,
  X,
} from "lucide-react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useActionState, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { Avatar } from "@/components/ui/Avatar";
import { SentimentPicker } from "@/components/creator/plugins/SentimentPicker";
import { useKeyboardInset } from "@/lib/hooks/useVisualViewport";
import { cn } from "@/lib/utils/cn";
import { createClient } from "@/lib/supabase/client";
import type { PostBackgroundColor, PostVisibility } from "@/lib/database.types";
import {
  THOUGHT_MODE_MAX_CHARS,
  getPalette,
  nextBackgroundColor,
} from "@/lib/posts/backgroundColors";
import {
  ACTIVITIES,
  formatMomentLine,
  type ActivitySelection,
  type SentimentSelection,
} from "@/lib/posts/sentiments";
import { createPost, type PostFormState } from "../actions";

const INITIAL: PostFormState = { status: "idle" };
const MAX_PHOTOS = 4;
const MAX_SIZE_BYTES = 8 * 1024 * 1024;
const MAX_VIDEO_BYTES = 50 * 1024 * 1024;
const MAX_VIDEO_DURATION_S = 60;
const ALLOWED_MIME = ["image/jpeg", "image/png", "image/webp"];
const ALLOWED_VIDEO_MIME = ["video/mp4", "video/webm", "video/quicktime"];

type Photo = { url: string; position: number; storagePath: string };

type VideoUpload = {
  url: string;
  thumbnail_url: string;
  duration_ms: number;
  width: number | null;
  height: number | null;
  storagePath: string;
  thumbStoragePath: string;
};

type PostComposerProps = {
  userId: string;
  authorName: string | null;
  authorAvatarUrl: string | null;
  /** Mode "embedded" : skipper ChipTeaser + Modal interne. Le composant
      rend juste le contenu formulaire, à plugger dans un shell modal
      externe (ContentCreatorModal). Default false = comportement legacy
      avec chip + modal. */
  embedded?: boolean;
  /** Callback quand le post est publié avec succès — utilisé en embedded
      pour fermer le modal externe. */
  onPublished?: () => void;
};

export function PostComposer({
  userId,
  authorName,
  authorAvatarUrl,
  embedded = false,
  onPublished,
}: PostComposerProps) {
  const router = useRouter();
  const [state, formAction, pending] = useActionState<
    PostFormState,
    FormData
  >(createPost, INITIAL);

  const [open, setOpen] = useState(false);
  const [body, setBody] = useState("");
  const [visibility, setVisibility] = useState<PostVisibility>("friends");
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [video, setVideo] = useState<VideoUpload | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadingVideo, setUploadingVideo] = useState(false);
  /* Mode "pensée rapide" — gradient de fond pour textes courts. La
     valeur n'a d'effet visuel/serveur que si body est court ET aucun
     média n'est attaché. Sinon le mode est désactivé automatiquement. */
  const [backgroundColor, setBackgroundColor] =
    useState<PostBackgroundColor | null>(null);
  /* Plugin "Moment" : sentiment XOR activité (jamais les deux). */
  const [sentiment, setSentiment] = useState<SentimentSelection | null>(null);
  const [activity, setActivity] = useState<ActivitySelection | null>(null);
  const [sentimentPickerOpen, setSentimentPickerOpen] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const videoInputRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  /* On success : reset + auto-close modal.
     React 19 strict bloque les setState synchrones en effet (cascading
     render). On déplace le reset dans queueMicrotask : callback async, pas
     de cascade, et la garde de dédup `lastHandledStateRef` évite de
     ré-appliquer le même résultat plusieurs fois. */
  const lastHandledStateRef = useRef<typeof state | null>(null);
  useEffect(() => {
    if (lastHandledStateRef.current === state) return;
    lastHandledStateRef.current = state;
    queueMicrotask(() => {
      if (state.status === "success") {
        setBody("");
        setPhotos([]);
        setVideo(null);
        setVisibility("friends");
        setBackgroundColor(null);
        setSentiment(null);
        setActivity(null);
        setOpen(false);
        toast.success("Post publié ✨");
        router.refresh();
        /* En embedded, signaler au parent (ContentCreatorModal) qu'il
           peut se fermer. */
        onPublished?.();
      }
      if (state.status === "error" && state.message) {
        toast.error(state.message);
      }
    });
  }, [state, router, onPublished]);

  /* ESC key ferme la modale. Body scroll lock when open. */
  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("keydown", handler);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", handler);
      document.body.style.overflow = "";
    };
  }, [open]);

  function autosize() {
    const ta = textareaRef.current;
    if (!ta) return;
    ta.style.height = "auto";
    ta.style.height = `${Math.min(ta.scrollHeight, 280)}px`;
  }

  async function handleFiles(event: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(event.target.files ?? []);
    event.target.value = "";

    if (files.length === 0) return;
    if (photos.length + files.length > MAX_PHOTOS) {
      toast.error(`${MAX_PHOTOS} photos maximum.`);
      return;
    }

    setUploading(true);
    const supabase = createClient();
    const uploaded: Photo[] = [];

    for (const file of files) {
      if (!ALLOWED_MIME.includes(file.type)) {
        toast.error(`Format invalide pour ${file.name}.`);
        continue;
      }
      if (file.size > MAX_SIZE_BYTES) {
        toast.error(`${file.name} trop lourde.`);
        continue;
      }

      const ext = file.type.split("/")[1] ?? "jpg";
      const storagePath = `${userId}/${crypto.randomUUID()}.${ext}`;
      const { error } = await supabase.storage
        .from("posts")
        .upload(storagePath, file, {
          contentType: file.type,
          cacheControl: "3600",
        });
      if (error) {
        toast.error(`Échec : ${file.name}`);
        continue;
      }
      const {
        data: { publicUrl },
      } = supabase.storage.from("posts").getPublicUrl(storagePath);
      uploaded.push({
        url: publicUrl,
        position: photos.length + uploaded.length,
        storagePath,
      });
    }

    if (uploaded.length > 0) setPhotos([...photos, ...uploaded]);
    setUploading(false);
  }

  async function removePhoto(photo: Photo) {
    const supabase = createClient();
    await supabase.storage.from("posts").remove([photo.storagePath]);
    setPhotos((prev) =>
      prev
        .filter((p) => p.storagePath !== photo.storagePath)
        .map((p, idx) => ({ ...p, position: idx })),
    );
  }

  async function probeVideo(file: File): Promise<{
    durationMs: number;
    width: number;
    height: number;
    thumbnailBlob: Blob;
  } | null> {
    return new Promise((resolve) => {
      const url = URL.createObjectURL(file);
      const v = document.createElement("video");
      v.preload = "metadata";
      v.muted = true;
      v.playsInline = true;
      v.src = url;

      const cleanup = () => URL.revokeObjectURL(url);
      let done = false;

      v.addEventListener("loadedmetadata", () => {
        try {
          v.currentTime = Math.min(0.1, (v.duration || 1) / 2);
        } catch {
          // ignore
        }
      });
      v.addEventListener("seeked", () => {
        if (done) return;
        done = true;
        try {
          const w = v.videoWidth || 720;
          const h = v.videoHeight || 1280;
          const canvas = document.createElement("canvas");
          canvas.width = w;
          canvas.height = h;
          const ctx = canvas.getContext("2d");
          if (!ctx) {
            cleanup();
            resolve(null);
            return;
          }
          ctx.drawImage(v, 0, 0, w, h);
          canvas.toBlob(
            (blob) => {
              cleanup();
              if (!blob) {
                resolve(null);
                return;
              }
              resolve({
                durationMs: Math.round((v.duration || 0) * 1000),
                width: w,
                height: h,
                thumbnailBlob: blob,
              });
            },
            "image/jpeg",
            0.85,
          );
        } catch {
          cleanup();
          resolve(null);
        }
      });
      v.addEventListener("error", () => {
        cleanup();
        resolve(null);
      });
      setTimeout(() => {
        if (!done) {
          cleanup();
          resolve(null);
        }
      }, 6000);
    });
  }

  async function handleVideoFile(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;

    if (!ALLOWED_VIDEO_MIME.includes(file.type)) {
      toast.error("Format vidéo non supporté (MP4, WebM, MOV).");
      return;
    }
    if (file.size > MAX_VIDEO_BYTES) {
      toast.error("Vidéo trop lourde (50 Mo max).");
      return;
    }

    setUploadingVideo(true);
    try {
      const probe = await probeVideo(file);
      if (!probe) {
        toast.error("Impossible de lire la vidéo.");
        return;
      }
      if (probe.durationMs > MAX_VIDEO_DURATION_S * 1000 + 500) {
        toast.error(
          `Vidéo trop longue (${MAX_VIDEO_DURATION_S} s max, ${Math.round(probe.durationMs / 1000)} s détectée).`,
        );
        return;
      }

      const supabase = createClient();
      const ext = file.type.includes("webm")
        ? "webm"
        : file.type.includes("quicktime")
          ? "mov"
          : "mp4";
      const baseName = `${userId}/${crypto.randomUUID()}`;
      const videoPath = `${baseName}.${ext}`;
      const thumbPath = `${baseName}.jpg`;

      const { error: vErr } = await supabase.storage
        .from("post-videos")
        .upload(videoPath, file, {
          contentType: file.type,
          cacheControl: "3600",
        });
      if (vErr) {
        toast.error("Échec de l'upload vidéo.");
        return;
      }
      const { error: tErr } = await supabase.storage
        .from("post-videos")
        .upload(thumbPath, probe.thumbnailBlob, {
          contentType: "image/jpeg",
          cacheControl: "86400",
        });
      if (tErr) {
        await supabase.storage.from("post-videos").remove([videoPath]);
        toast.error("Échec de l'upload de la vignette.");
        return;
      }

      const {
        data: { publicUrl: videoUrl },
      } = supabase.storage.from("post-videos").getPublicUrl(videoPath);
      const {
        data: { publicUrl: thumbUrl },
      } = supabase.storage.from("post-videos").getPublicUrl(thumbPath);

      setVideo({
        url: videoUrl,
        thumbnail_url: thumbUrl,
        duration_ms: probe.durationMs,
        width: probe.width,
        height: probe.height,
        storagePath: videoPath,
        thumbStoragePath: thumbPath,
      });
    } finally {
      setUploadingVideo(false);
    }
  }

  async function removeVideo() {
    if (!video) return;
    const supabase = createClient();
    await supabase.storage
      .from("post-videos")
      .remove([video.storagePath, video.thumbStoragePath]);
    setVideo(null);
  }

  const canSubmit =
    (body.trim().length > 0 || photos.length > 0 || video !== null) &&
    !pending &&
    !uploading &&
    !uploadingVideo;

  /* Le mode "pensée rapide" est actif quand :
     - une background color est sélectionnée
     - le texte est court (≤ 130 chars)
     - aucun média n'est attaché
     Sinon le gradient est masqué et l'UI revient en textarea standard
     (le state backgroundColor est conservé, l'user peut le réactiver
     en raccourcissant son texte ou retirant les médias). */
  const palette = getPalette(backgroundColor);
  const isThoughtModeActive =
    palette !== null &&
    body.length <= THOUGHT_MODE_MAX_CHARS &&
    photos.length === 0 &&
    !video;

  const firstName = authorName?.split(" ")[0] ?? null;

  /* Hauteur du clavier mobile pour caler un sticky CTA au-dessus.
     Sur desktop (pas de visualViewport API actif), reste 0 → pas d'impact. */
  const keyboardInset = useKeyboardInset();

  /* Form interne réutilisable — extrait pour pouvoir être rendu soit
     dans le Modal interne legacy, soit pluggé dans ContentCreatorModal
     (embedded=true) sans le wrapper modal. */
  const formContent = (
          <form action={formAction} className="contents">
            <input type="hidden" name="visibility" value={visibility} />
            <input
              type="hidden"
              name="photos"
              value={JSON.stringify(
                photos.map((p) => ({ url: p.url, position: p.position })),
              )}
            />
            <input
              type="hidden"
              name="video"
              value={
                video
                  ? JSON.stringify({
                      url: video.url,
                      thumbnail_url: video.thumbnail_url,
                      duration_ms: video.duration_ms,
                      width: video.width,
                      height: video.height,
                    })
                  : ""
              }
            />
            <input
              type="hidden"
              name="background_color"
              value={isThoughtModeActive ? (backgroundColor ?? "") : ""}
            />
            <input
              type="hidden"
              name="sentiment_emoji"
              value={!activity && sentiment ? sentiment.emoji : ""}
            />
            <input
              type="hidden"
              name="sentiment_label"
              value={!activity && sentiment ? sentiment.label : ""}
            />
            <input
              type="hidden"
              name="activity_type"
              value={activity?.type ?? ""}
            />
            <input
              type="hidden"
              name="activity_detail"
              value={activity?.detail ?? ""}
            />

            {/* Top bar : Back + Nouveau post + Publier */}
            <header className="relative flex items-center justify-between gap-3 px-[18px] pt-12 sm:pt-14 pb-2">
              <button
                type="button"
                onClick={() => setOpen(false)}
                aria-label="Fermer"
                className="flex h-[38px] w-[38px] items-center justify-center rounded-full bg-white border border-line text-night hover:border-night/30 transition-colors"
              >
                <ArrowLeft className="w-4 h-4" aria-hidden />
              </button>
              <h2 className="font-display italic text-[20px] text-night leading-none">
                Nouveau post
              </h2>
              <button
                type="submit"
                disabled={!canSubmit}
                className={cn(
                  "inline-flex items-center gap-1.5 h-[38px] px-[18px] rounded-[19px] font-bold text-[13px] transition-opacity",
                  canSubmit
                    ? "bg-gradient-to-br from-gold to-gold-deep text-night shadow-[0_8px_20px_-8px_rgba(244,185,66,0.7)]"
                    : "bg-gold/30 text-night/50 cursor-not-allowed",
                )}
              >
                {pending ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" aria-hidden />
                ) : (
                  <Send className="w-3.5 h-3.5" aria-hidden />
                )}
                Publier
              </button>
            </header>

            {/* Card content : avatar + visibility + textarea + media */}
            <div className="relative mx-3.5 mt-3.5 rounded-[28px] bg-white p-[18px] shadow-[0_20px_50px_-24px_rgba(10,31,68,0.22)]">
              {/* Barre dorée top — signature Bold */}
              <span
                aria-hidden
                className="absolute top-0 left-8 w-16 h-1 rounded-b-md bg-gold"
              />

              <div className="flex items-center gap-3 mb-3.5">
                <Avatar
                  src={authorAvatarUrl}
                  fullName={authorName}
                  size="md-bold"
                />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold text-night truncate">
                    {authorName ?? "Toi"}
                    {(() => {
                      const line = formatMomentLine({
                        firstName: "",
                        sentiment,
                        activity,
                      });
                      if (!line) return null;
                      const trimmed = line.trim();
                      return (
                        <span className="font-normal text-night-soft italic">
                          {" "}
                          {trimmed}
                        </span>
                      );
                    })()}
                  </p>
                  <VisibilityChip
                    value={visibility}
                    onChange={setVisibility}
                  />
                </div>
              </div>

              {isThoughtModeActive && palette ? (
                /* Mode "pensée rapide" : carte gradient + Cormorant grand
                   format centré. textarea reste invisible mais focused
                   pour ne pas perdre la saisie clavier. */
                <div
                  className={cn(
                    "relative rounded-2xl overflow-hidden",
                    palette.bg,
                  )}
                >
                  <textarea
                    ref={textareaRef}
                    name="body"
                    value={body}
                    onChange={(event) => {
                      setBody(event.currentTarget.value);
                      autosize();
                    }}
                    placeholder={
                      firstName
                        ? `Une pensée, ${firstName} ?`
                        : "Quelle est ta pensée ?"
                    }
                    rows={4}
                    maxLength={THOUGHT_MODE_MAX_CHARS}
                    autoFocus
                    className={cn(
                      "w-full resize-none border-0 bg-transparent text-center font-display italic text-[28px] sm:text-[32px] leading-[1.2] focus:outline-none px-6 py-12 min-h-[220px]",
                      palette.text === "cream"
                        ? "text-cream placeholder:text-cream/50"
                        : "text-night placeholder:text-night/40",
                    )}
                  />
                  <p
                    className={cn(
                      "absolute bottom-2 right-3 text-[10.5px] font-mono tabular-nums",
                      palette.text === "cream"
                        ? "text-cream/60"
                        : "text-night/50",
                    )}
                  >
                    {body.length}/{THOUGHT_MODE_MAX_CHARS}
                  </p>
                </div>
              ) : (
                <textarea
                  ref={textareaRef}
                  name="body"
                  value={body}
                  onChange={(event) => {
                    setBody(event.currentTarget.value);
                    autosize();
                  }}
                  placeholder={
                    firstName
                      ? `Quoi de neuf, ${firstName} ?`
                      : "Quoi de neuf ?"
                  }
                  rows={3}
                  maxLength={4000}
                  autoFocus
                  className="w-full resize-none border-0 bg-transparent font-display italic text-[19px] leading-[1.55] text-night placeholder:text-night-dim focus:outline-none min-h-[60px]"
                />
              )}

              {photos.length > 0 ? (
                <div
                  className={cn(
                    "mt-3.5 grid gap-1.5",
                    photos.length === 1 ? "grid-cols-1" : "grid-cols-2",
                  )}
                >
                  {photos.map((photo) => (
                    <div
                      key={photo.storagePath}
                      className="group relative aspect-square overflow-hidden rounded-2xl bg-night/5"
                    >
                      <Image
                        src={photo.url}
                        alt=""
                        fill
                        sizes="200px"
                        className="object-cover"
                        unoptimized
                      />
                      <button
                        type="button"
                        onClick={() => removePhoto(photo)}
                        aria-label="Retirer"
                        className="absolute top-1.5 right-1.5 flex h-7 w-7 items-center justify-center rounded-full bg-white/95 text-red-500 hover:bg-white"
                      >
                        <X className="w-4 h-4" aria-hidden />
                      </button>
                    </div>
                  ))}
                </div>
              ) : null}

              {video ? (
                <div className="group relative mt-3.5 aspect-[9/16] max-w-[220px] overflow-hidden rounded-2xl bg-night">
                  <video
                    src={video.url}
                    poster={video.thumbnail_url}
                    controls
                    playsInline
                    muted
                    className="h-full w-full object-cover"
                  />
                  <button
                    type="button"
                    onClick={removeVideo}
                    aria-label="Retirer la vidéo"
                    className="absolute top-1.5 right-1.5 flex h-7 w-7 items-center justify-center rounded-full bg-white/95 text-red-500 hover:bg-white"
                  >
                    <X className="w-4 h-4" aria-hidden />
                  </button>
                  <div className="absolute bottom-2 left-2 rounded-full bg-night/70 px-2 py-0.5 text-[10px] font-bold text-white">
                    {Math.round(video.duration_ms / 1000)} s
                  </div>
                </div>
              ) : null}
            </div>

            {/* Toolbar : Photos · 2/4 / Moment / Lieu (Vidéo en variante) */}
            <div className="mx-3.5 mt-3.5 flex flex-wrap items-center gap-2">
              <input
                ref={inputRef}
                type="file"
                accept={ALLOWED_MIME.join(",")}
                multiple
                onChange={handleFiles}
                className="sr-only"
              />
              <input
                ref={videoInputRef}
                type="file"
                accept={ALLOWED_VIDEO_MIME.join(",")}
                onChange={handleVideoFile}
                className="sr-only"
              />
              <ToolbarPill
                onClick={() => inputRef.current?.click()}
                disabled={
                  uploading ||
                  photos.length >= MAX_PHOTOS ||
                  video !== null
                }
                active={photos.length > 0}
                icon={
                  uploading ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" aria-hidden />
                  ) : (
                    <ImagePlus className="w-3.5 h-3.5" aria-hidden />
                  )
                }
                label={
                  photos.length > 0
                    ? `Photos · ${photos.length}/${MAX_PHOTOS}`
                    : "Photos"
                }
              />
              <ToolbarPill
                onClick={() => videoInputRef.current?.click()}
                disabled={uploadingVideo || video !== null || photos.length > 0}
                active={video !== null}
                icon={
                  uploadingVideo ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" aria-hidden />
                  ) : (
                    <Video className="w-3.5 h-3.5" aria-hidden />
                  )
                }
                label="Vidéo · 60 s"
              />
              {/* Mode "pensée rapide" — disabled tant qu'il y a un média
                  ou que le texte dépasse 130 chars (incompatibilité
                  visuelle assumée, on évite de cycler dans le vide). */}
              <ToolbarPill
                onClick={() =>
                  setBackgroundColor(nextBackgroundColor(backgroundColor))
                }
                disabled={
                  photos.length > 0 ||
                  video !== null ||
                  body.length > THOUGHT_MODE_MAX_CHARS
                }
                active={isThoughtModeActive}
                icon={
                  <span
                    className="inline-flex h-3.5 w-3.5 items-center justify-center font-display italic text-[12px] leading-none"
                    aria-hidden
                  >
                    Aa
                  </span>
                }
                label={palette ? palette.label : "Fond"}
              />
              <ToolbarPill
                onClick={() => setSentimentPickerOpen(true)}
                active={sentiment !== null || activity !== null}
                icon={<Sparkles className="w-3.5 h-3.5" aria-hidden />}
                label={
                  activity
                    ? ACTIVITIES.find((a) => a.type === activity.type)?.verb ??
                      "Activité"
                    : sentiment
                      ? sentiment.label
                      : "Moment"
                }
              />
              <ToolbarPill
                disabled
                icon={<MapPin className="w-3.5 h-3.5" aria-hidden />}
                label="Lieu"
              />
              <span className="ml-auto self-center text-[11px] text-muted tabular-nums">
                {body.length}/4000
              </span>
            </div>

            {/* Footer sticky mobile : bouton Publier qui se hisse au-dessus
                du clavier (visualViewport API). Le bouton du top bar reste
                visible sur desktop ; ce footer cible mobile uniquement
                (sm:hidden). */}
            <div
              className="sm:hidden fixed left-0 right-0 z-40 px-4 pt-2 pb-[max(env(safe-area-inset-bottom,0px),12px)] bg-bg-soft/95 backdrop-blur-md border-t border-line transition-transform"
              style={{
                bottom: 0,
                transform: `translateY(-${keyboardInset}px)`,
              }}
            >
              <button
                type="submit"
                disabled={!canSubmit}
                className={cn(
                  "w-full inline-flex items-center justify-center gap-2 h-12 rounded-full font-bold text-sm transition-opacity",
                  canSubmit
                    ? "bg-gradient-to-br from-gold to-gold-deep text-night shadow-[0_8px_22px_-8px_rgba(244,185,66,0.7)]"
                    : "bg-gold/30 text-night/50 cursor-not-allowed",
                )}
              >
                {pending ? (
                  <Loader2 className="w-4 h-4 animate-spin" aria-hidden />
                ) : (
                  <Send className="w-4 h-4" aria-hidden />
                )}
                Publier
              </button>
            </div>
            {/* Spacer pour que le contenu scroll ne passe pas sous le sticky footer mobile. */}
            <div className="sm:hidden h-20" aria-hidden />

            {/* Plugin Sentiment / Activité — overlay modal au-dessus du
                composer. Le SentimentPicker est rendu ici pour avoir
                accès au state (sentiment / activity / setters). */}
            {sentimentPickerOpen ? (
              <div
                className="fixed inset-0 z-50 bg-black/40 flex items-end sm:items-center justify-center p-0 sm:p-4"
                role="dialog"
                aria-modal="true"
                onClick={(e) => {
                  if (e.target === e.currentTarget) {
                    setSentimentPickerOpen(false);
                  }
                }}
              >
                <div className="w-full max-w-md max-h-[85vh] sm:max-h-[80vh] flex flex-col">
                  <SentimentPicker
                    initialSentiment={sentiment}
                    initialActivity={activity}
                    onApply={(s, a) => {
                      setSentiment(s);
                      setActivity(a);
                    }}
                    onClose={() => setSentimentPickerOpen(false)}
                  />
                </div>
              </div>
            ) : null}
          </form>
  );

  /* En embedded, on retourne juste le formulaire (le shell modal externe
     gère backdrop / fermeture / a11y). */
  if (embedded) {
    return formContent;
  }

  return (
    <>
      <ChipTeaser
        authorName={authorName}
        authorAvatarUrl={authorAvatarUrl}
        firstName={firstName}
        onOpen={() => setOpen(true)}
        onOpenWithPhotos={() => {
          setOpen(true);
          /* Open file picker after the modal mount tick. */
          setTimeout(() => inputRef.current?.click(), 50);
        }}
      />

      {open ? <Modal onClose={() => setOpen(false)}>{formContent}</Modal> : null}
    </>
  );
}

/* Chip teaser : carte inline cliquable. Avatar + texte d'invitation
   "Quoi de neuf, X ?" + 3 pills (Photo / Moment / Amis). */
function ChipTeaser({
  authorName,
  authorAvatarUrl,
  firstName,
  onOpen,
  onOpenWithPhotos,
}: {
  authorName: string | null;
  authorAvatarUrl: string | null;
  firstName: string | null;
  onOpen: () => void;
  onOpenWithPhotos: () => void;
}) {
  return (
    <article className="relative overflow-hidden rounded-[28px] bg-white shadow-[0_1px_2px_rgba(10,31,68,0.04),0_16px_40px_-20px_rgba(10,31,68,0.18)]">
      {/* Barre dorée top — signature Bold (proto L59) */}
      <span
        aria-hidden
        className="pointer-events-none absolute top-0 left-7 w-[60px] h-1 rounded-b-md bg-gold"
      />

      <button
        type="button"
        onClick={onOpen}
        className="flex items-center gap-3 w-full px-4 pt-4 pb-3 text-left"
        aria-label="Composer un post"
      >
        <Avatar
          src={authorAvatarUrl}
          fullName={authorName}
          size="md-bold"
        />
        <div className="flex-1 min-w-0 text-[14px] leading-tight">
          <span className="font-display italic text-[17px] text-night">
            Quoi de neuf
          </span>
          {firstName ? (
            <span className="text-night-dim">, {firstName} ?</span>
          ) : (
            <span className="text-night-dim"> ?</span>
          )}
        </div>
      </button>

      {/* 3 pills flex-1 : Photo (cream/gold) / Moment (bg-soft) / Amis (bg-soft) */}
      <div className="flex gap-2 px-4 pb-4">
        <ChipPill
          onClick={onOpenWithPhotos}
          tone="gold"
          icon={<ImagePlus className="w-3 h-3" aria-hidden />}
          label="Photo"
        />
        <ChipPill
          onClick={onOpen}
          tone="muted"
          icon={<Sparkles className="w-3 h-3" aria-hidden />}
          label="Moment"
        />
        <ChipPill
          onClick={onOpen}
          tone="muted"
          icon={<Users className="w-3 h-3" aria-hidden />}
          label="Amis"
        />
      </div>
    </article>
  );
}

function ChipPill({
  onClick,
  tone,
  icon,
  label,
}: {
  onClick: () => void;
  tone: "gold" | "muted";
  icon: React.ReactNode;
  label: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "flex-1 inline-flex items-center justify-center gap-1.5 h-9 rounded-[18px] text-[12px] font-semibold transition-colors",
        tone === "gold"
          ? "bg-cream text-gold-deep hover:brightness-105"
          : "bg-bg-soft text-night-soft hover:bg-night/5",
      )}
    >
      {icon}
      {label}
    </button>
  );
}

/* Modal full-screen : fond bg-soft (proto), backdrop fermable au clic. */
function Modal({
  children,
  onClose,
}: {
  children: React.ReactNode;
  onClose: () => void;
}) {
  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Nouveau post"
      className="fixed inset-0 z-50 bg-bg-soft overflow-y-auto"
    >
      {/* Backdrop click handler — invisible button derrière le contenu */}
      <button
        type="button"
        onClick={onClose}
        aria-hidden
        tabIndex={-1}
        className="absolute inset-0 cursor-default"
      />
      <div className="relative">{children}</div>
    </div>
  );
}

function ToolbarPill({
  onClick,
  disabled = false,
  active = false,
  icon,
  label,
}: {
  onClick?: () => void;
  disabled?: boolean;
  active?: boolean;
  icon: React.ReactNode;
  label: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={cn(
        "inline-flex items-center gap-1.5 h-9 px-[14px] rounded-[18px] text-[12px] font-bold transition-colors",
        active
          ? "bg-night text-cream"
          : "bg-white text-night-soft border border-line hover:border-night/30",
        disabled && !active ? "opacity-60 cursor-not-allowed" : "",
      )}
    >
      {icon}
      {label}
    </button>
  );
}

function VisibilityChip({
  value,
  onChange,
}: {
  value: PostVisibility;
  onChange: (next: PostVisibility) => void;
}) {
  const meta: Record<
    PostVisibility,
    { label: string; icon: typeof Globe }
  > = {
    friends: { label: "Amis", icon: Users },
    public: { label: "Public", icon: Globe },
    private: { label: "Moi", icon: Lock },
  };
  const order: PostVisibility[] = ["friends", "public", "private"];
  const Icon = meta[value].icon;

  function cycle() {
    const idx = order.indexOf(value);
    onChange(order[(idx + 1) % order.length]!);
  }

  return (
    <button
      type="button"
      onClick={cycle}
      aria-label={`Visibilité : ${meta[value].label}. Cliquer pour changer.`}
      className="mt-0.5 inline-flex items-center gap-1.5 h-[22px] px-2.5 rounded-[10px] bg-cream text-gold-deep text-[11px] font-bold hover:brightness-105 transition"
    >
      <Icon className="w-2.5 h-2.5" aria-hidden />
      {meta[value].label}
      <ChevronDown className="w-2.5 h-2.5" aria-hidden />
    </button>
  );
}
