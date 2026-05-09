"use client";

import { Camera, ImagePlus, Loader2, Send, Type, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { useRef, useState, useTransition } from "react";
import { toast } from "sonner";
import {
  CameraCapture,
  type CaptureResult,
} from "@/components/stories/CameraCapture";
import { StoryOverlayEditor } from "@/components/stories/StoryOverlayEditor";
import { Button } from "@/components/ui/Button";
import { cn } from "@/lib/utils/cn";
import type {
  StoryCaptionPosition,
  StoryFilter,
  StorySticker,
} from "@/lib/database.types";
import { createClient } from "@/lib/supabase/client";
import { STORY_FILTERS, getFilterCss } from "@/lib/stories/filters";
import { createStory } from "../actions";

const MAX_SIZE_BYTES = 8 * 1024 * 1024;
const ALLOWED_MIME = ["image/jpeg", "image/png", "image/webp"];

const BACKGROUNDS = [
  { id: "from-night via-night-soft to-night-muted", label: "Nuit" },
  { id: "from-gold via-gold-soft to-gold-deep", label: "Or" },
  { id: "from-emerald-700 to-emerald-900", label: "Émeraude" },
  { id: "from-red-600 via-red-700 to-red-900", label: "Rubis" },
  { id: "from-night via-gold-deep to-gold", label: "Aube" },
] as const;

type ComposerMode = "photo" | "text";

const VIDEO_BUCKET = "story-videos";
const VIDEO_MAX_BYTES = 30 * 1024 * 1024; // 30 Mo cap soft

type StoryComposerProps = {
  userId: string;
  /** Mode embedded : pas de navigation à la publication (le shell modal
      externe gère via onPublished). Default false = comportement legacy
      (route /stories/new) avec redirect /feed. */
  embedded?: boolean;
  onPublished?: () => void;
};

export function StoryComposer({ userId, embedded = false, onPublished }: StoryComposerProps) {
  const router = useRouter();
  const [mode, setMode] = useState<ComposerMode>("photo");
  const [photo, setPhoto] = useState<{ url: string; storagePath: string } | null>(
    null,
  );
  const [video, setVideo] = useState<{
    url: string;
    storagePath: string;
    thumbnailUrl: string;
    thumbnailStoragePath: string;
    durationMs: number;
  } | null>(null);
  const [caption, setCaption] = useState("");
  const [background, setBackground] = useState<string>(BACKGROUNDS[0]!.id);
  const [filter, setFilter] = useState<StoryFilter>("original");
  const [captionPosition, setCaptionPosition] =
    useState<StoryCaptionPosition | null>(null);
  const [stickers, setStickers] = useState<StorySticker[]>([]);
  const [uploading, setUploading] = useState(false);
  const [showCamera, setShowCamera] = useState(false);
  const [pending, startTransition] = useTransition();
  const inputRef = useRef<HTMLInputElement>(null);

  /* Reuse the same Supabase upload pipeline whether the photo comes from
     a file picker (handleFile) or a live camera capture (handleCameraBlob)
     so both end with { url, storagePath } that the form action consumes. */
  async function uploadBlob(blob: Blob, ext: string) {
    setUploading(true);
    const supabase = createClient();
    const storagePath = `${userId}/${crypto.randomUUID()}.${ext}`;
    const { error } = await supabase.storage
      .from("stories")
      .upload(storagePath, blob, {
        contentType: blob.type || "image/jpeg",
        cacheControl: "3600",
      });

    if (error) {
      toast.error("Échec du téléversement.");
      setUploading(false);
      return;
    }
    const {
      data: { publicUrl },
    } = supabase.storage.from("stories").getPublicUrl(storagePath);
    setPhoto({ url: publicUrl, storagePath });
    setUploading(false);
  }

  async function handleCapture(result: CaptureResult) {
    setShowCamera(false);
    if (result.kind === "photo") {
      if (result.blob.size > MAX_SIZE_BYTES) {
        toast.error("Photo trop lourde, recommence.");
        return;
      }
      await uploadBlob(result.blob, "jpg");
      return;
    }

    /* Video upload : on stocke vidéo + thumbnail séparément. */
    if (result.blob.size > VIDEO_MAX_BYTES) {
      toast.error("Vidéo trop lourde (30 Mo max).");
      return;
    }

    setUploading(true);
    const supabase = createClient();
    const ext = (result.blob.type.includes("mp4") ? "mp4" : "webm");
    const base = `${userId}/${crypto.randomUUID()}`;
    const videoPath = `${base}.${ext}`;
    const thumbPath = `${base}.jpg`;

    const { error: vErr } = await supabase.storage
      .from(VIDEO_BUCKET)
      .upload(videoPath, result.blob, {
        contentType: result.blob.type || `video/${ext}`,
        cacheControl: "3600",
      });
    if (vErr) {
      toast.error("Échec téléversement vidéo.");
      setUploading(false);
      return;
    }
    const { error: tErr } = await supabase.storage
      .from(VIDEO_BUCKET)
      .upload(thumbPath, result.thumbnail, {
        contentType: "image/jpeg",
        cacheControl: "86400",
      });
    if (tErr) {
      await supabase.storage.from(VIDEO_BUCKET).remove([videoPath]);
      toast.error("Échec téléversement vignette.");
      setUploading(false);
      return;
    }

    const { data: vPub } = supabase.storage
      .from(VIDEO_BUCKET)
      .getPublicUrl(videoPath);
    const { data: tPub } = supabase.storage
      .from(VIDEO_BUCKET)
      .getPublicUrl(thumbPath);

    setVideo({
      url: vPub.publicUrl,
      storagePath: videoPath,
      thumbnailUrl: tPub.publicUrl,
      thumbnailStoragePath: thumbPath,
      durationMs: result.durationMs,
    });
    setUploading(false);
  }

  async function removeVideo() {
    if (!video) return;
    const supabase = createClient();
    await supabase.storage
      .from(VIDEO_BUCKET)
      .remove([video.storagePath, video.thumbnailStoragePath]);
    setVideo(null);
  }

  async function handleFile(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;

    if (!ALLOWED_MIME.includes(file.type)) {
      toast.error("Format invalide.");
      return;
    }
    if (file.size > MAX_SIZE_BYTES) {
      toast.error("Fichier trop lourd (8 Mo max).");
      return;
    }

    setUploading(true);
    const supabase = createClient();
    const ext = file.type.split("/")[1] ?? "jpg";
    const storagePath = `${userId}/${crypto.randomUUID()}.${ext}`;
    const { error } = await supabase.storage
      .from("stories")
      .upload(storagePath, file, {
        contentType: file.type,
        cacheControl: "3600",
      });

    if (error) {
      toast.error("Échec du téléversement.");
      setUploading(false);
      return;
    }

    const {
      data: { publicUrl },
    } = supabase.storage.from("stories").getPublicUrl(storagePath);

    setPhoto({ url: publicUrl, storagePath });
    setUploading(false);
  }

  async function removePhoto() {
    if (!photo) return;
    const supabase = createClient();
    await supabase.storage.from("stories").remove([photo.storagePath]);
    setPhoto(null);
  }

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    /* Vidéo l'emporte sur photo si les deux sont présents (typique :
       l'utilisateur capture vidéo, change d'avis et upload une photo).
       En pratique on dispatch sur ce que l'utilisateur voit. */
    const effectiveType = video ? "video" : mode;

    if (effectiveType === "photo" && !photo) {
      toast.error("Ajoute une photo.");
      return;
    }
    if (effectiveType === "text" && caption.trim().length === 0) {
      toast.error("Écris quelque chose.");
      return;
    }
    if (effectiveType === "video" && !video) {
      toast.error("Capture une vidéo.");
      return;
    }

    const formData = new FormData();
    formData.set("type", effectiveType);
    formData.set(
      "photo_url",
      effectiveType === "photo" ? photo?.url ?? "" : "",
    );
    formData.set(
      "video_url",
      effectiveType === "video" ? video?.url ?? "" : "",
    );
    formData.set(
      "video_thumbnail_url",
      effectiveType === "video" ? video?.thumbnailUrl ?? "" : "",
    );
    formData.set(
      "video_duration_ms",
      effectiveType === "video" && video ? String(video.durationMs) : "",
    );
    formData.set("caption", caption);
    formData.set("background", effectiveType === "text" ? background : "");
    formData.set(
      "filter",
      effectiveType === "photo" ? filter : "original",
    );
    /* Overlays sérialisés en JSON pour passer dans FormData. */
    formData.set(
      "caption_position",
      effectiveType === "photo" && captionPosition
        ? JSON.stringify(captionPosition)
        : "",
    );
    formData.set(
      "stickers",
      effectiveType === "photo" && stickers.length > 0
        ? JSON.stringify(stickers)
        : "[]",
    );

    startTransition(async () => {
      const result = await createStory(formData);
      if (result?.ok === false) {
        toast.error(result.error ?? "Publication impossible.");
        return;
      }
      toast.success("Story publiée ✨");
      if (embedded) {
        onPublished?.();
      } else {
        router.push("/feed");
      }
    });
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {showCamera ? (
        <CameraCapture
          onCapture={handleCapture}
          onClose={() => setShowCamera(false)}
        />
      ) : null}
      <div className="inline-flex p-1.5 rounded-2xl bg-night/5 border border-line">
        <button
          type="button"
          onClick={() => setMode("photo")}
          className={cn(
            "px-4 py-2 rounded-xl text-sm font-semibold transition-all flex items-center gap-2",
            mode === "photo"
              ? "bg-white text-night shadow-soft"
              : "text-night-muted hover:text-night",
          )}
        >
          <ImagePlus className="w-4 h-4" aria-hidden />
          Photo
        </button>
        <button
          type="button"
          onClick={() => setMode("text")}
          className={cn(
            "px-4 py-2 rounded-xl text-sm font-semibold transition-all flex items-center gap-2",
            mode === "text"
              ? "bg-white text-night shadow-soft"
              : "text-night-muted hover:text-night",
          )}
        >
          <Type className="w-4 h-4" aria-hidden />
          Texte
        </button>
      </div>

      {mode === "photo" ? (
        <div>
          {video ? (
            <div className="relative aspect-[9/16] w-full max-w-sm mx-auto rounded-3xl overflow-hidden bg-night border border-line">
              <video
                src={video.url}
                poster={video.thumbnailUrl}
                controls
                playsInline
                className="w-full h-full object-cover"
              />
              <button
                type="button"
                onClick={removeVideo}
                aria-label="Retirer la vidéo"
                className="absolute top-3 right-3 w-9 h-9 rounded-full bg-white/95 text-red-500 flex items-center justify-center"
              >
                <X className="w-4 h-4" aria-hidden />
              </button>
              <div className="absolute bottom-3 left-3 px-2.5 py-1 rounded-full bg-night/70 backdrop-blur-md text-cream text-[10px] font-extrabold tracking-wide">
                {Math.round(video.durationMs / 1000)} s
              </div>
            </div>
          ) : photo ? (
            <StoryOverlayEditor
              photoUrl={photo.url}
              imageFilter={getFilterCss(filter)}
              caption={caption}
              captionPosition={captionPosition}
              stickers={stickers}
              onChangeCaptionPosition={setCaptionPosition}
              onChangeStickers={setStickers}
              onRemovePhoto={removePhoto}
            />
          ) : (
            <div className="w-full max-w-sm mx-auto">
              <button
                type="button"
                onClick={() => setShowCamera(true)}
                disabled={uploading}
                className="w-full aspect-[4/5] sm:aspect-square rounded-3xl bg-gradient-to-br from-night via-night-soft to-night-muted text-cream flex flex-col items-center justify-center gap-3 hover:from-night-soft hover:to-night transition-colors shadow-[0_24px_60px_-28px_rgba(10,31,68,0.5)] relative overflow-hidden"
              >
                {uploading ? (
                  <Loader2 className="w-8 h-8 animate-spin" aria-hidden />
                ) : (
                  <Camera className="w-9 h-9 text-gold" aria-hidden />
                )}
                <span className="font-display italic text-2xl">
                  {uploading ? "Téléversement…" : "Prendre une photo"}
                </span>
                <span className="text-xs text-cream/60">
                  Caméra avant ou arrière
                </span>
              </button>
              <button
                type="button"
                onClick={() => inputRef.current?.click()}
                disabled={uploading}
                className="mt-3 w-full h-11 rounded-full border border-line bg-white text-night-muted text-sm font-semibold flex items-center justify-center gap-2 hover:border-night/30 hover:text-night transition-colors"
              >
                <ImagePlus className="w-4 h-4" aria-hidden />
                Choisir depuis la galerie · JPG, PNG, WebP · 8 Mo
              </button>
            </div>
          )}
          <input
            ref={inputRef}
            type="file"
            accept={ALLOWED_MIME.join(",")}
            onChange={handleFile}
            className="sr-only"
          />
          <input
            type="text"
            value={caption}
            onChange={(event) => setCaption(event.currentTarget.value)}
            placeholder="Ajoute une légende (facultatif)..."
            maxLength={280}
            className="mt-4 w-full max-w-sm mx-auto block h-11 rounded-xl border border-line bg-white px-4 text-sm focus:outline-none focus:border-night focus:ring-2 focus:ring-night/15"
          />

          {photo ? (
            <div className="mt-4 max-w-sm mx-auto">
              <p className="text-[10px] font-extrabold uppercase tracking-[0.16em] text-muted mb-2">
                Filtre
              </p>
              <div className="flex gap-2 overflow-x-auto pb-1 -mx-1 px-1">
                {STORY_FILTERS.map((f) => {
                  const active = f.id === filter;
                  return (
                    <button
                      key={f.id}
                      type="button"
                      onClick={() => setFilter(f.id)}
                      aria-pressed={active}
                      className="shrink-0 flex flex-col items-center gap-1.5"
                    >
                      <span
                        className={cn(
                          "block w-12 h-16 rounded-xl overflow-hidden bg-gradient-to-br ring-2 transition-all",
                          f.swatch,
                          active
                            ? "ring-gold scale-105"
                            : "ring-transparent hover:ring-line",
                        )}
                        style={{ filter: f.css || undefined }}
                      />
                      <span
                        className={cn(
                          "text-[10px] font-semibold",
                          active ? "text-gold-deep" : "text-night-muted",
                        )}
                      >
                        {f.label}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          ) : null}
        </div>
      ) : (
        <div className="space-y-4">
          <div
            className={cn(
              "relative aspect-[4/5] sm:aspect-square w-full max-w-sm mx-auto rounded-3xl overflow-hidden bg-gradient-to-br flex items-center justify-center px-6",
              background,
            )}
          >
            <textarea
              value={caption}
              onChange={(event) => setCaption(event.currentTarget.value)}
              placeholder="Écris quelque chose..."
              maxLength={280}
              rows={4}
              className="w-full bg-transparent text-cream font-display italic text-3xl sm:text-4xl text-center placeholder:text-cream/40 resize-none focus:outline-none leading-[1.05] tracking-[-0.02em]"
              style={{ textShadow: "0 4px 24px rgba(0,0,0,0.5)" }}
            />
          </div>
          <div>
            <p className="text-[10px] font-bold uppercase tracking-widest text-muted mb-2">
              Fond
            </p>
            <div className="flex flex-wrap gap-2">
              {BACKGROUNDS.map((bg) => (
                <button
                  key={bg.id}
                  type="button"
                  onClick={() => setBackground(bg.id)}
                  aria-pressed={background === bg.id}
                  className={cn(
                    "w-12 h-12 rounded-2xl bg-gradient-to-br transition-all border-2",
                    bg.id,
                    background === bg.id
                      ? "border-night scale-105"
                      : "border-transparent hover:scale-105",
                  )}
                  aria-label={bg.label}
                />
              ))}
            </div>
          </div>
        </div>
      )}

      <div className="flex items-center justify-between pt-2 max-w-sm mx-auto">
        <p className="text-xs text-muted">Visible 24 h par tes amis</p>
        <Button type="submit" loading={pending}>
          {!pending ? <Send className="w-4 h-4" aria-hidden /> : null}
          Publier
        </Button>
      </div>
    </form>
  );
}
