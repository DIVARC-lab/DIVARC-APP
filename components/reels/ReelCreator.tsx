"use client";

import {
  ArrowLeft,
  Camera,
  Check,
  Globe,
  Loader2,
  Lock,
  Music,
  Upload,
  Users,
  Video,
  X,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, useTransition } from "react";
import { toast } from "sonner";
import { CameraCapture } from "@/components/reels/CameraCapture";
import { MultiClipRecorder } from "@/components/reels/MultiClipRecorder";
import {
  SoundLibrary,
  type SoundLibraryItem,
} from "@/components/reels/SoundLibrary";
import { StickersEditor } from "@/components/reels/StickersEditor";
import { TextOverlaysEditor } from "@/components/reels/TextOverlaysEditor";
import { TimelineEditor } from "@/components/reels/TimelineEditor";
import { VoiceoverRecorder } from "@/components/reels/VoiceoverRecorder";
import type { Sticker } from "@/lib/reels/stickers";
import type { TextOverlay } from "@/lib/reels/textOverlays";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils/cn";
import {
  createReel,
  redirectToReel,
} from "@/app/(app)/reels/new/actions";

/* ReelCreator V1 — modal fullscreen pour créer un reel.
 *
 * Flow simplifié V1 :
 *   1. Upload vidéo MP4 (max 100MB, max 90s, ratio 9:16 conseillé)
 *   2. Génération automatique de la poster frame (canvas screenshot)
 *   3. Form : description + hashtags + audience + permissions + son
 *   4. Submit → server action createReel
 *
 * V1.5 : capture caméra live, multi-clips, effets AR, édition timeline,
 * voix off, stickers, transitions.
 *
 * Stack : Supabase Storage pour l'upload, server action pour l'insert.
 */

const MAX_BYTES = 100 * 1024 * 1024;
const MAX_DURATION_S = 90;
const ALLOWED_MIME = ["video/mp4", "video/webm", "video/quicktime"];

type SoundPick = {
  id: string;
  title: string;
  artist: string;
  audio_url: string;
} | null;

type DuetSourceInit = {
  reelId: string;
  videoUrl: string;
  videoMp4Fallback: string | null;
  layout: "right" | "left" | "top" | "bottom";
};

type Props = {
  userId: string;
  preselectedSound: SoundPick;
  /** V3.8 — mode Duo : si présent, démarre directement en step camera
   *  avec la vidéo source en parallèle. */
  duetSource?: DuetSourceInit | null;
};

type Step = "upload" | "camera" | "multiclip" | "compose";

type UploadedVideo = {
  url: string;
  storagePath: string;
  duration_seconds: number;
  poster_url: string | null;
  posterStoragePath: string | null;
};

export function ReelCreator({
  userId,
  preselectedSound,
  duetSource = null,
}: Props) {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);

  /* Si on arrive en mode Duo, on saute directement à la caméra. */
  const [step, setStep] = useState<Step>(duetSource ? "camera" : "upload");
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [video, setVideo] = useState<UploadedVideo | null>(null);
  const [description, setDescription] = useState("");
  const [audience, setAudience] = useState<"public" | "friends" | "private">(
    "public",
  );
  const [allowComments, setAllowComments] = useState(true);
  const [allowDuets, setAllowDuets] = useState(true);
  const [allowStitches, setAllowStitches] = useState(true);
  const [allowDownloads, setAllowDownloads] = useState(false);
  const [textOverlays, setTextOverlays] = useState<TextOverlay[]>([]);
  const [textEditorOpen, setTextEditorOpen] = useState(false);
  const [voiceoverUrl, setVoiceoverUrl] = useState<string | null>(null);
  const [videoVolume, setVideoVolume] = useState(1.0);
  const [voiceoverVolume, setVoiceoverVolume] = useState(1.0);
  const [voiceoverOpen, setVoiceoverOpen] = useState(false);
  const [stickers, setStickers] = useState<Sticker[]>([]);
  const [stickersOpen, setStickersOpen] = useState(false);
  const [timelineOpen, setTimelineOpen] = useState(false);
  const [pending, startTransition] = useTransition();

  /* Son sélectionné — peut être pré-rempli via ?sound= ou choisi
     depuis SoundLibrary. */
  const [selectedSound, setSelectedSound] = useState<SoundLibraryItem | null>(
    preselectedSound
      ? {
          id: preselectedSound.id,
          title: preselectedSound.title,
          artist: preselectedSound.artist,
          duration_seconds: 30, // approximation V1
          audio_url: preselectedSound.audio_url,
          artwork_url: null,
          source: "user_original",
          usage_count: 0,
          is_explicit: false,
        }
      : null,
  );
  const [soundLibraryOpen, setSoundLibraryOpen] = useState(false);

  /* Hashtags : extraits du body au moment du submit. */
  function extractHashtags(text: string): string[] {
    const matches = text.match(/#([a-z0-9_]{2,40})/gi) ?? [];
    return Array.from(
      new Set(matches.map((m) => m.slice(1).toLowerCase())),
    ).slice(0, 20);
  }

  async function processVideoFile(
    file: File,
    knownDurationSeconds?: number,
  ) {
    if (!ALLOWED_MIME.includes(file.type)) {
      /* Camera capture fournit parfois video/webm;codecs=... — accepte
         tout ce qui commence par video/. */
      if (!file.type.startsWith("video/")) {
        toast.error("Format non supporté.");
        return;
      }
    }
    if (file.size > MAX_BYTES) {
      toast.error(
        `Vidéo trop lourde (${Math.round(file.size / 1024 / 1024)}MB). Max ${MAX_BYTES / 1024 / 1024}MB.`,
      );
      return;
    }

    setUploading(true);
    setUploadProgress(0);
    try {
      const probe = await probeVideo(file);
      const durationSeconds =
        knownDurationSeconds ?? probe.durationSeconds;
      if (durationSeconds > MAX_DURATION_S + 0.5) {
        toast.error(
          `Vidéo trop longue (${Math.round(durationSeconds)}s). Max ${MAX_DURATION_S}s.`,
        );
        return;
      }

      const supabase = createClient();
      const ext = file.name.split(".").pop() ?? "mp4";
      const videoPath = `reels/${userId}/${crypto.randomUUID()}.${ext}`;
      const { error: vErr } = await supabase.storage
        .from("post-photos")
        .upload(videoPath, file, {
          contentType: file.type,
          upsert: false,
        });
      if (vErr) throw vErr;
      const {
        data: { publicUrl: videoUrl },
      } = supabase.storage.from("post-photos").getPublicUrl(videoPath);

      setUploadProgress(70);

      let posterUrl: string | null = null;
      let posterPath: string | null = null;
      if (probe.posterBlob) {
        const posterStoragePath = `reels/${userId}/${crypto.randomUUID()}-poster.jpg`;
        const { error: pErr } = await supabase.storage
          .from("post-photos")
          .upload(posterStoragePath, probe.posterBlob, {
            contentType: "image/jpeg",
            upsert: false,
          });
        if (!pErr) {
          posterPath = posterStoragePath;
          posterUrl = supabase.storage
            .from("post-photos")
            .getPublicUrl(posterStoragePath).data.publicUrl;
        }
      }

      setUploadProgress(100);
      setVideo({
        url: videoUrl,
        storagePath: videoPath,
        duration_seconds: durationSeconds,
        poster_url: posterUrl,
        posterStoragePath: posterPath,
      });
      setStep("compose");
    } catch (err) {
      console.error("[reels:upload]", err);
      toast.error("Upload échoué. Réessaie.");
    } finally {
      setUploading(false);
    }
  }

  /* V3.11 — replace la vidéo après un trim. Upload le nouveau blob sans
     repasser par le step upload. L'ancien fichier reste en storage (V4 :
     remove). */
  async function replaceVideoWithTrim(blob: Blob, newDuration: number) {
    if (!video) return;
    try {
      const supabase = createClient();
      const ext = blob.type.includes("mp4") ? "mp4" : "webm";
      const newPath = `reels/${userId}/${crypto.randomUUID()}.${ext}`;
      const file = new File([blob], `trim-${Date.now()}.${ext}`, {
        type: blob.type,
      });
      const { error } = await supabase.storage
        .from("post-photos")
        .upload(newPath, file, { contentType: blob.type, upsert: false });
      if (error) throw error;
      const {
        data: { publicUrl },
      } = supabase.storage.from("post-photos").getPublicUrl(newPath);
      setVideo({
        ...video,
        url: publicUrl,
        storagePath: newPath,
        duration_seconds: newDuration,
      });
      toast.success("Vidéo trimmée.");
    } catch (err) {
      console.error("[reels:trim:upload]", err);
      toast.error("Sauvegarde du trim échouée.");
    }
  }

  async function handleFileSelect(
    event: React.ChangeEvent<HTMLInputElement>,
  ) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    await processVideoFile(file);
  }

  async function handleCameraCapture(file: File, durationSeconds: number) {
    setStep("upload");
    await processVideoFile(file, durationSeconds);
  }

  async function removeVideo() {
    if (!video) return;
    const supabase = createClient();
    const paths = [video.storagePath];
    if (video.posterStoragePath) paths.push(video.posterStoragePath);
    await supabase.storage.from("post-photos").remove(paths).catch(() => undefined);
    setVideo(null);
    setStep("upload");
  }

  function submit() {
    if (!video) return;
    startTransition(async () => {
      const result = await createReel({
        video_url: video.url,
        duration_seconds: video.duration_seconds,
        poster_url: video.poster_url,
        description: description.trim() || undefined,
        hashtags: extractHashtags(description),
        sound_id: selectedSound?.id ?? null,
        has_voiceover: voiceoverUrl !== null,
        audience,
        allow_comments: allowComments,
        allow_duets: allowDuets,
        allow_stitches: allowStitches,
        allow_downloads: allowDownloads,
        text_overlays: textOverlays,
        voiceover_url: voiceoverUrl,
        video_volume: videoVolume,
        voiceover_volume: voiceoverVolume,
        duet_source_reel_id: duetSource?.reelId ?? null,
        duet_layout: duetSource?.layout ?? null,
        stickers,
      });
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      toast.success("Reel publié ✨");
      await redirectToReel(result.reel_id);
    });
  }

  return (
    <div className="relative w-full h-full bg-night text-cream">
      {/* Header. */}
      <header className="sticky top-0 z-10 flex items-center justify-between px-4 py-3 border-b border-cream/10 bg-night/95 backdrop-blur-sm">
        <button
          type="button"
          onClick={() => {
            if (step === "compose") {
              if (
                window.confirm(
                  "Quitter sans publier ? Ta vidéo sera supprimée.",
                )
              ) {
                void removeVideo();
                router.push("/reels");
              }
            } else {
              router.push("/reels");
            }
          }}
          className="w-10 h-10 rounded-full bg-cream/10 hover:bg-cream/20 flex items-center justify-center"
          aria-label="Fermer"
        >
          {step === "compose" ? (
            <ArrowLeft className="w-4 h-4" aria-hidden />
          ) : (
            <X className="w-4 h-4" aria-hidden />
          )}
        </button>
        <p className="font-display italic text-[18px]">
          {step === "upload" ? "Nouveau reel" : "Détails"}
        </p>
        {step === "compose" ? (
          <button
            type="button"
            onClick={submit}
            disabled={pending || !video}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full bg-gradient-to-br from-gold to-gold-deep text-night text-[12.5px] font-bold disabled:opacity-50"
          >
            {pending ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" aria-hidden />
            ) : (
              <Check className="w-3.5 h-3.5" aria-hidden />
            )}
            Publier
          </button>
        ) : (
          <span className="w-10" aria-hidden />
        )}
      </header>

      <input
        ref={fileInputRef}
        type="file"
        accept={ALLOWED_MIME.join(",")}
        onChange={handleFileSelect}
        className="sr-only"
      />

      {step === "upload" ? (
        <UploadStep
          uploading={uploading}
          progress={uploadProgress}
          onPick={() => fileInputRef.current?.click()}
          onOpenCamera={() => setStep("camera")}
          onOpenMultiClip={() => setStep("multiclip")}
        />
      ) : null}

      {step === "camera" ? (
        <CameraCapture
          onCapture={handleCameraCapture}
          onCancel={() => setStep("upload")}
          duetSource={duetSource}
        />
      ) : null}

      {step === "multiclip" ? (
        <MultiClipRecorder
          onCapture={handleCameraCapture}
          onCancel={() => setStep("upload")}
        />
      ) : null}

      {step === "compose" && video ? (
        <ComposeStep
          video={video}
          description={description}
          onDescriptionChange={setDescription}
          audience={audience}
          onAudienceChange={setAudience}
          allowComments={allowComments}
          onAllowCommentsChange={setAllowComments}
          allowDuets={allowDuets}
          onAllowDuetsChange={setAllowDuets}
          allowStitches={allowStitches}
          onAllowStitchesChange={setAllowStitches}
          allowDownloads={allowDownloads}
          onAllowDownloadsChange={setAllowDownloads}
          sound={selectedSound}
          onOpenSoundLibrary={() => setSoundLibraryOpen(true)}
          onRemoveVideo={removeVideo}
          textOverlaysCount={textOverlays.length}
          onOpenTextEditor={() => setTextEditorOpen(true)}
          hasVoiceover={voiceoverUrl !== null}
          onOpenVoiceover={() => setVoiceoverOpen(true)}
          stickersCount={stickers.length}
          onOpenStickers={() => setStickersOpen(true)}
          onOpenTimeline={() => setTimelineOpen(true)}
        />
      ) : null}

      {soundLibraryOpen ? (
        <SoundLibrary
          initialSelectedId={selectedSound?.id ?? null}
          onPick={(sound) => setSelectedSound(sound)}
          onClose={() => setSoundLibraryOpen(false)}
        />
      ) : null}

      {textEditorOpen && video ? (
        <TextOverlaysEditor
          videoUrl={video.url}
          durationSeconds={video.duration_seconds}
          initial={textOverlays}
          onApply={setTextOverlays}
          onClose={() => setTextEditorOpen(false)}
        />
      ) : null}

      {voiceoverOpen && video ? (
        <VoiceoverRecorder
          userId={userId}
          videoUrl={video.url}
          durationSeconds={video.duration_seconds}
          initial={{
            voiceover_url: voiceoverUrl,
            video_volume: videoVolume,
            voiceover_volume: voiceoverVolume,
          }}
          onApply={(state) => {
            setVoiceoverUrl(state.voiceover_url);
            setVideoVolume(state.video_volume);
            setVoiceoverVolume(state.voiceover_volume);
          }}
          onClose={() => setVoiceoverOpen(false)}
        />
      ) : null}

      {stickersOpen && video ? (
        <StickersEditor
          videoUrl={video.url}
          durationSeconds={video.duration_seconds}
          initial={stickers}
          onApply={setStickers}
          onClose={() => setStickersOpen(false)}
        />
      ) : null}

      {timelineOpen && video ? (
        <TimelineEditorLoader
          videoUrl={video.url}
          durationSeconds={video.duration_seconds}
          onApply={async (blob, newDuration) => {
            setTimelineOpen(false);
            await replaceVideoWithTrim(blob, newDuration);
          }}
          onClose={() => setTimelineOpen(false)}
        />
      ) : null}
    </div>
  );
}

/* Wrapper qui fetch le blob depuis videoUrl avant de monter TimelineEditor.
 * Évite de stocker le blob en state ReelCreator (cleanup auto à la fermeture). */
function TimelineEditorLoader({
  videoUrl,
  durationSeconds,
  onApply,
  onClose,
}: {
  videoUrl: string;
  durationSeconds: number;
  onApply: (blob: Blob, newDuration: number) => Promise<void> | void;
  onClose: () => void;
}) {
  const [blob, setBlob] = useState<Blob | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(videoUrl);
        if (!res.ok) throw new Error("fetch failed");
        const b = await res.blob();
        if (!cancelled) setBlob(b);
      } catch {
        if (!cancelled) setError("Impossible de charger la vidéo.");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [videoUrl]);

  if (error) {
    return (
      <div className="fixed inset-0 z-50 bg-black flex items-center justify-center px-6">
        <div className="text-center text-cream">
          <p className="font-display italic text-[20px] mb-2">Erreur</p>
          <p className="text-[12.5px] text-cream/70 mb-4">{error}</p>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-full bg-cream text-night text-[13px] font-bold"
          >
            Fermer
          </button>
        </div>
      </div>
    );
  }

  if (!blob) {
    return (
      <div className="fixed inset-0 z-50 bg-black flex items-center justify-center text-cream">
        <Loader2 className="w-8 h-8 animate-spin" aria-hidden />
      </div>
    );
  }

  return (
    <TimelineEditor
      videoUrl={videoUrl}
      videoBlob={blob}
      durationSeconds={durationSeconds}
      onApply={onApply}
      onClose={onClose}
    />
  );
}

/* === Step 1 : Upload vidéo + camera switch === */
function UploadStep({
  uploading,
  progress,
  onPick,
  onOpenCamera,
  onOpenMultiClip,
}: {
  uploading: boolean;
  progress: number;
  onPick: () => void;
  onOpenCamera: () => void;
  onOpenMultiClip: () => void;
}) {
  return (
    <div className="flex flex-col items-center justify-center px-6 py-12 min-h-[calc(100vh-60px)] text-center">
      <div className="w-24 h-24 rounded-full bg-cream/5 border-2 border-dashed border-cream/30 flex items-center justify-center mb-5">
        {uploading ? (
          <Loader2 className="w-9 h-9 text-cream/60 animate-spin" aria-hidden />
        ) : (
          <Video className="w-9 h-9 text-cream/60" aria-hidden />
        )}
      </div>

      <p className="font-display italic text-[28px] text-cream mb-2">
        {uploading ? "Téléchargement…" : "Crée ton reel"}
      </p>
      <p className="text-[12.5px] text-cream/60 max-w-md mb-6 leading-relaxed">
        {uploading
          ? `Préparation en cours (${progress}%)`
          : "Capture en direct ou importe une vidéo · max 90 secondes · format vertical 9:16 recommandé."}
      </p>

      {!uploading ? (
        <div className="flex flex-col items-center gap-3 w-full max-w-xs">
          {/* CTA principal : caméra live (V1.5). */}
          <button
            type="button"
            onClick={onOpenCamera}
            className="w-full inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-full bg-gradient-to-br from-gold to-gold-deep text-night text-[14px] font-bold hover:scale-105 transition-transform shadow-[0_8px_24px_-8px_rgba(244,185,66,0.7)]"
          >
            <Camera className="w-4 h-4" aria-hidden />
            Filmer maintenant
          </button>
          {/* V3.10 — multi-clip + ffmpeg.wasm concat */}
          <button
            type="button"
            onClick={onOpenMultiClip}
            className="w-full inline-flex items-center justify-center gap-2 px-6 py-3 rounded-full bg-cream/10 hover:bg-cream/20 text-cream text-[13px] font-bold border border-cream/20"
          >
            <Video className="w-4 h-4" aria-hidden />
            Multi-clips (concat)
          </button>
          {/* Secondaire : import. */}
          <button
            type="button"
            onClick={onPick}
            className="w-full inline-flex items-center justify-center gap-2 px-6 py-3 rounded-full bg-cream/10 hover:bg-cream/20 text-cream text-[13px] font-bold border border-cream/20"
          >
            <Upload className="w-4 h-4" aria-hidden />
            Importer une vidéo
          </button>
        </div>
      ) : (
        <div className="w-full max-w-xs">
          <div className="h-1.5 rounded-full bg-cream/10 overflow-hidden">
            <div
              className="h-full bg-gold transition-all"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
      )}

      <p className="mt-8 text-[10.5px] text-cream/40 leading-snug max-w-md">
        💡 Effets AR temps réel (filtres, masques visage), édition timeline et
        bibliothèque musicale arrivent en V2.
      </p>
    </div>
  );
}

/* === Step 2 : Composition (description, audience, permissions) === */
function ComposeStep({
  video,
  description,
  onDescriptionChange,
  audience,
  onAudienceChange,
  allowComments,
  onAllowCommentsChange,
  allowDuets,
  onAllowDuetsChange,
  allowStitches,
  onAllowStitchesChange,
  allowDownloads,
  onAllowDownloadsChange,
  sound,
  onOpenSoundLibrary,
  onRemoveVideo,
  textOverlaysCount,
  onOpenTextEditor,
  hasVoiceover,
  onOpenVoiceover,
  stickersCount,
  onOpenStickers,
  onOpenTimeline,
}: {
  video: UploadedVideo;
  description: string;
  onDescriptionChange: (s: string) => void;
  audience: "public" | "friends" | "private";
  onAudienceChange: (a: "public" | "friends" | "private") => void;
  allowComments: boolean;
  onAllowCommentsChange: (v: boolean) => void;
  allowDuets: boolean;
  onAllowDuetsChange: (v: boolean) => void;
  allowStitches: boolean;
  onAllowStitchesChange: (v: boolean) => void;
  allowDownloads: boolean;
  onAllowDownloadsChange: (v: boolean) => void;
  sound: SoundLibraryItem | null;
  onOpenSoundLibrary: () => void;
  onRemoveVideo: () => void;
  textOverlaysCount: number;
  onOpenTextEditor: () => void;
  hasVoiceover: boolean;
  onOpenVoiceover: () => void;
  stickersCount: number;
  onOpenStickers: () => void;
  onOpenTimeline: () => void;
}) {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-[280px_1fr] gap-6 p-4 sm:p-6 max-w-4xl mx-auto">
      {/* Preview vidéo. */}
      <div className="relative mx-auto w-full max-w-[280px]">
        <div className="aspect-[9/16] rounded-2xl overflow-hidden bg-night-soft relative">
          <video
            src={video.url}
            poster={video.poster_url ?? undefined}
            controls
            playsInline
            loop
            muted
            className="w-full h-full object-cover"
          />
          <button
            type="button"
            onClick={onRemoveVideo}
            className="absolute top-2 right-2 w-8 h-8 rounded-full bg-black/70 hover:bg-black text-cream flex items-center justify-center"
            aria-label="Supprimer cette vidéo"
          >
            <X className="w-4 h-4" aria-hidden />
          </button>
        </div>
        <p className="mt-2 text-[10.5px] text-cream/60 text-center font-mono">
          {Math.round(video.duration_seconds)}s
        </p>
      </div>

      {/* Form composition. */}
      <div className="space-y-4">
        <div>
          <label className="block text-[10.5px] font-bold uppercase tracking-wider text-cream/60 mb-1.5">
            Description
          </label>
          <textarea
            value={description}
            onChange={(e) => onDescriptionChange(e.target.value)}
            maxLength={2200}
            rows={4}
            placeholder="Décris ton reel, ajoute des #hashtags et @mentions…"
            autoFocus
            className="w-full px-3 py-2 rounded-xl bg-cream/5 border border-cream/10 text-cream placeholder:text-cream/40 text-[13.5px] focus:outline-none focus:border-cream/30"
          />
          <p className="mt-1 text-[10.5px] text-cream/40 text-right tabular-nums">
            {description.length}/2200
          </p>
        </div>

        {/* Son — toujours affiché, clickable pour ouvrir la library. */}
        <button
          type="button"
          onClick={onOpenSoundLibrary}
          className={cn(
            "w-full rounded-xl border p-3 flex items-center gap-3 transition-colors text-left",
            sound
              ? "bg-cream/5 border-cream/10 hover:border-cream/30"
              : "bg-cream/5 border-dashed border-cream/30 hover:border-cream/60",
          )}
        >
          <span className="w-9 h-9 rounded-full bg-gold/15 text-gold flex items-center justify-center shrink-0">
            <Music className="w-4 h-4" aria-hidden />
          </span>
          <div className="min-w-0 flex-1">
            {sound ? (
              <>
                <p className="text-[13px] font-bold text-cream truncate">
                  {sound.title}
                </p>
                <p className="text-[11px] text-cream/60 truncate">
                  {sound.artist} ·{" "}
                  {Math.round(sound.duration_seconds)}s
                </p>
              </>
            ) : (
              <>
                <p className="text-[13px] font-bold text-cream">
                  Ajouter un son
                </p>
                <p className="text-[11px] text-cream/60">
                  Tendances · Pixabay · sons originaux
                </p>
              </>
            )}
          </div>
          <span className="text-[11px] font-bold text-gold shrink-0">
            {sound ? "Changer" : "Choisir"}
          </span>
        </button>

        {/* Text overlays — opens TextOverlaysEditor */}
        <button
          type="button"
          onClick={onOpenTextEditor}
          className={cn(
            "w-full rounded-xl border p-3 flex items-center gap-3 transition-colors text-left",
            textOverlaysCount > 0
              ? "bg-cream/5 border-cream/10 hover:border-cream/30"
              : "bg-cream/5 border-dashed border-cream/30 hover:border-cream/60",
          )}
        >
          <span className="w-9 h-9 rounded-full bg-gold/15 text-gold flex items-center justify-center shrink-0">
            <span aria-hidden className="text-[14px] font-extrabold">Aa</span>
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-[13px] font-bold text-cream">
              {textOverlaysCount > 0
                ? `${textOverlaysCount} texte${textOverlaysCount > 1 ? "s" : ""} ajouté${textOverlaysCount > 1 ? "s" : ""}`
                : "Ajouter du texte"}
            </p>
            <p className="text-[11px] text-cream/60">
              Position, timing, couleur, taille
            </p>
          </div>
          <span className="text-[11px] font-bold text-gold shrink-0">
            {textOverlaysCount > 0 ? "Éditer" : "Ouvrir"}
          </span>
        </button>

        {/* V3.11 — Trim (ffmpeg.wasm) */}
        <button
          type="button"
          onClick={onOpenTimeline}
          className="w-full rounded-xl border p-3 flex items-center gap-3 transition-colors text-left bg-cream/5 border-cream/10 hover:border-cream/30"
        >
          <span className="w-9 h-9 rounded-full bg-gold/15 text-gold flex items-center justify-center shrink-0">
            <span aria-hidden className="text-[14px] font-extrabold">✂</span>
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-[13px] font-bold text-cream">Trim la vidéo</p>
            <p className="text-[11px] text-cream/60">
              Coupe début/fin · re-encode ffmpeg
            </p>
          </div>
          <span className="text-[11px] font-bold text-gold shrink-0">
            Ouvrir
          </span>
        </button>

        {/* Stickers — opens StickersEditor */}
        <button
          type="button"
          onClick={onOpenStickers}
          className={cn(
            "w-full rounded-xl border p-3 flex items-center gap-3 transition-colors text-left",
            stickersCount > 0
              ? "bg-cream/5 border-cream/10 hover:border-cream/30"
              : "bg-cream/5 border-dashed border-cream/30 hover:border-cream/60",
          )}
        >
          <span className="w-9 h-9 rounded-full bg-gold/15 text-gold flex items-center justify-center shrink-0">
            <span aria-hidden className="text-[16px]">🎨</span>
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-[13px] font-bold text-cream">
              {stickersCount > 0
                ? `${stickersCount} sticker${stickersCount > 1 ? "s" : ""}`
                : "Ajouter des stickers"}
            </p>
            <p className="text-[11px] text-cream/60">
              Emojis · drag, pinch, rotate
            </p>
          </div>
          <span className="text-[11px] font-bold text-gold shrink-0">
            {stickersCount > 0 ? "Éditer" : "Ouvrir"}
          </span>
        </button>

        {/* Voix off + mix audio */}
        <button
          type="button"
          onClick={onOpenVoiceover}
          className={cn(
            "w-full rounded-xl border p-3 flex items-center gap-3 transition-colors text-left",
            hasVoiceover
              ? "bg-cream/5 border-cream/10 hover:border-cream/30"
              : "bg-cream/5 border-dashed border-cream/30 hover:border-cream/60",
          )}
        >
          <span className="w-9 h-9 rounded-full bg-gold/15 text-gold flex items-center justify-center shrink-0">
            <span aria-hidden className="text-[14px] font-extrabold">🎙</span>
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-[13px] font-bold text-cream">
              {hasVoiceover ? "Voix off enregistrée" : "Voix off & mix audio"}
            </p>
            <p className="text-[11px] text-cream/60">
              MediaRecorder + volumes vidéo/voix
            </p>
          </div>
          <span className="text-[11px] font-bold text-gold shrink-0">
            {hasVoiceover ? "Réécouter" : "Enregistrer"}
          </span>
        </button>

        {/* Audience. */}
        <div>
          <label className="block text-[10.5px] font-bold uppercase tracking-wider text-cream/60 mb-1.5">
            Audience
          </label>
          <div className="grid grid-cols-3 gap-1.5">
            <AudienceBtn
              active={audience === "public"}
              onClick={() => onAudienceChange("public")}
              icon={<Globe className="w-4 h-4" aria-hidden />}
              label="Public"
            />
            <AudienceBtn
              active={audience === "friends"}
              onClick={() => onAudienceChange("friends")}
              icon={<Users className="w-4 h-4" aria-hidden />}
              label="Amis"
            />
            <AudienceBtn
              active={audience === "private"}
              onClick={() => onAudienceChange("private")}
              icon={<Lock className="w-4 h-4" aria-hidden />}
              label="Privé"
            />
          </div>
        </div>

        {/* Permissions. */}
        <div>
          <label className="block text-[10.5px] font-bold uppercase tracking-wider text-cream/60 mb-1.5">
            Permissions
          </label>
          <ul className="space-y-1.5">
            <PermRow
              label="Autoriser les commentaires"
              checked={allowComments}
              onChange={onAllowCommentsChange}
            />
            <PermRow
              label="Autoriser les duets"
              checked={allowDuets}
              onChange={onAllowDuetsChange}
            />
            <PermRow
              label="Autoriser les stitches"
              checked={allowStitches}
              onChange={onAllowStitchesChange}
            />
            <PermRow
              label="Autoriser le téléchargement"
              checked={allowDownloads}
              onChange={onAllowDownloadsChange}
            />
          </ul>
        </div>

        <p className="text-[10.5px] text-cream/40 leading-snug">
          💡 La modération automatique vérifie ton reel avant diffusion publique
          (≤ 60s en moyenne).
        </p>
      </div>
    </div>
  );
}

function AudienceBtn({
  active,
  onClick,
  icon,
  label,
}: {
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  label: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "flex flex-col items-center gap-1 px-2 py-2.5 rounded-xl border transition-colors",
        active
          ? "bg-gold/15 border-gold text-gold"
          : "bg-cream/5 border-cream/10 text-cream/70 hover:border-cream/30",
      )}
    >
      {icon}
      <span className="text-[11px] font-bold">{label}</span>
    </button>
  );
}

function PermRow({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <li className="flex items-center justify-between gap-3 px-3 py-2 rounded-lg bg-cream/5 border border-cream/10">
      <span className="text-[12.5px] text-cream">{label}</span>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        aria-label={label}
        onClick={() => onChange(!checked)}
        className={cn(
          "relative w-10 h-6 rounded-full transition-colors shrink-0",
          checked ? "bg-gold" : "bg-cream/15",
        )}
      >
        <span
          className={cn(
            "absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-cream transition-transform",
            checked && "translate-x-4",
          )}
          aria-hidden
        />
      </button>
    </li>
  );
}

/* Helper : lit une vidéo pour récupérer durée + poster frame.
 * Utilise un <video> off-DOM + canvas screenshot à 0.5s. */
async function probeVideo(file: File): Promise<{
  durationSeconds: number;
  posterBlob: Blob | null;
}> {
  return new Promise((resolve) => {
    const url = URL.createObjectURL(file);
    const video = document.createElement("video");
    video.src = url;
    video.preload = "metadata";
    video.muted = true;
    video.playsInline = true;

    let done = false;
    function finish(durationSeconds: number, posterBlob: Blob | null) {
      if (done) return;
      done = true;
      URL.revokeObjectURL(url);
      resolve({ durationSeconds, posterBlob });
    }

    const timeout = setTimeout(() => finish(0, null), 8000);

    video.addEventListener("loadedmetadata", () => {
      const dur = video.duration;
      /* Seek à 0.5s pour avoir une frame représentative. */
      video.currentTime = Math.min(0.5, Math.max(0.1, dur / 2));
    });

    video.addEventListener("seeked", async () => {
      clearTimeout(timeout);
      try {
        const canvas = document.createElement("canvas");
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        const ctx = canvas.getContext("2d");
        if (!ctx) {
          finish(video.duration, null);
          return;
        }
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        canvas.toBlob(
          (blob) => finish(video.duration, blob),
          "image/jpeg",
          0.85,
        );
      } catch {
        finish(video.duration, null);
      }
    });

    video.addEventListener("error", () => {
      clearTimeout(timeout);
      finish(0, null);
    });
  });
}
