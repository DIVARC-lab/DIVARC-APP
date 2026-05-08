"use client";

import { Sparkles, Trash2, Video } from "lucide-react";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/Button";
import { createClient } from "@/lib/supabase/client";
import type { Profile } from "@/lib/database.types";
import { removeIntroVideo, setIntroVideo } from "../pro-actions";
import { VideoRecorder, type RecordedVideo } from "./VideoRecorder";

type Props = {
  profile: Pick<
    Profile,
    | "id"
    | "intro_video_url"
    | "intro_video_thumbnail_url"
    | "intro_video_duration_ms"
  >;
};

export function IntroVideoCard({ profile }: Props) {
  const [recording, setRecording] = useState(false);
  const [pending, startTransition] = useTransition();

  const hasVideo = Boolean(profile.intro_video_url);

  async function handleSubmit(video: RecordedVideo) {
    const supabase = createClient();
    const ext = video.mimeType.includes("mp4") ? "mp4" : "webm";
    const baseName = `${profile.id}/intro-${crypto.randomUUID()}`;
    const videoPath = `${baseName}.${ext}`;
    const thumbPath = `${baseName}.jpg`;

    const { error: videoErr } = await supabase.storage
      .from("profile-videos")
      .upload(videoPath, video.blob, {
        contentType: video.mimeType,
        cacheControl: "3600",
      });
    if (videoErr) {
      toast.error("Échec de l'upload vidéo.");
      return;
    }

    const { error: thumbErr } = await supabase.storage
      .from("profile-videos")
      .upload(thumbPath, video.thumbnailBlob, {
        contentType: "image/jpeg",
        cacheControl: "86400",
      });
    if (thumbErr) {
      // On peut continuer sans vignette : on supprime la vidéo orpheline.
      await supabase.storage.from("profile-videos").remove([videoPath]);
      toast.error("Échec de l'upload de la vignette.");
      return;
    }

    const {
      data: { publicUrl: videoUrl },
    } = supabase.storage.from("profile-videos").getPublicUrl(videoPath);
    const {
      data: { publicUrl: thumbUrl },
    } = supabase.storage.from("profile-videos").getPublicUrl(thumbPath);

    const result = await setIntroVideo({
      url: videoUrl,
      thumbnail_url: thumbUrl,
      duration_ms: video.durationMs,
    });

    if (!result.ok) {
      // Cleanup
      await supabase.storage
        .from("profile-videos")
        .remove([videoPath, thumbPath]);
      toast.error(result.error);
      return;
    }

    toast.success("Vidéo publiée ✨");
    setRecording(false);
  }

  function handleDelete() {
    if (!hasVideo) return;
    if (!confirm("Supprimer ta vidéo de présentation ?")) return;

    const videoPath = extractStoragePath(profile.intro_video_url);
    const thumbPath = extractStoragePath(profile.intro_video_thumbnail_url);

    startTransition(async () => {
      const result = await removeIntroVideo({
        videoStoragePath: videoPath,
        thumbnailStoragePath: thumbPath,
      });
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      toast.success("Vidéo supprimée.");
    });
  }

  if (recording) {
    return (
      <article className="rounded-3xl border-2 border-night/20 bg-white p-6 sm:p-7 shadow-soft">
        <header className="flex items-center gap-3 mb-5">
          <span className="w-10 h-10 rounded-2xl bg-gradient-to-br from-cream to-gold/15 border border-gold/30 flex items-center justify-center shrink-0">
            <Video className="w-4 h-4 text-gold-deep" aria-hidden />
          </span>
          <div>
            <h3 className="font-display text-xl text-night">
              Enregistrement en cours
            </h3>
            <p className="mt-0.5 text-sm text-muted">
              Présente-toi en 60 secondes max.
            </p>
          </div>
        </header>
        <VideoRecorder
          onCancel={() => setRecording(false)}
          onSubmit={handleSubmit}
        />
      </article>
    );
  }

  return (
    <article className="rounded-3xl border border-line bg-white p-6 sm:p-7 shadow-soft">
      <header className="flex items-start justify-between gap-4 mb-5">
        <div className="flex items-start gap-3">
          <span className="w-10 h-10 rounded-2xl bg-gradient-to-br from-cream to-gold/15 border border-gold/30 flex items-center justify-center shrink-0">
            <Video className="w-4 h-4 text-gold-deep" aria-hidden />
          </span>
          <div>
            <h3 className="font-display text-xl text-night">
              Vidéo de présentation
              <span className="ml-2 text-[10px] font-bold uppercase tracking-widest px-2 py-0.5 rounded-full bg-gold/15 text-gold-deep align-middle">
                Nouveau
              </span>
            </h3>
            <p className="mt-0.5 text-sm text-muted">
              60 secondes pour te démarquer auprès des recruteurs et de la
              communauté.
            </p>
          </div>
        </div>
      </header>

      {hasVideo ? (
        <div className="space-y-4">
          <div className="relative rounded-3xl overflow-hidden bg-night aspect-[9/16] max-w-xs mx-auto">
            <video
              src={profile.intro_video_url ?? undefined}
              poster={profile.intro_video_thumbnail_url ?? undefined}
              controls
              playsInline
              className="w-full h-full object-cover"
            />
          </div>
          <div className="flex items-center justify-center gap-2">
            <Button variant="ghost" onClick={() => setRecording(true)}>
              <Video className="w-4 h-4" aria-hidden />
              Refaire
            </Button>
            <Button
              variant="secondary"
              onClick={handleDelete}
              disabled={pending}
              className="text-red-600 hover:bg-red-50"
            >
              <Trash2 className="w-4 h-4" aria-hidden />
              Supprimer
            </Button>
          </div>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => setRecording(true)}
          className="w-full p-8 rounded-3xl bg-gradient-to-br from-cream via-bg to-gold/10 border-2 border-dashed border-gold/40 hover:border-gold/60 transition-colors group"
        >
          <div className="flex flex-col items-center gap-3">
            <span className="w-14 h-14 rounded-2xl bg-white border border-gold/30 flex items-center justify-center group-hover:scale-110 transition-transform">
              <Sparkles className="w-6 h-6 text-gold-deep" aria-hidden />
            </span>
            <div className="text-center">
              <p className="font-display text-lg text-night">
                Enregistre ta vidéo de 60 secondes
              </p>
              <p className="text-sm text-muted mt-0.5">
                Format vertical · accès caméra requis · publié sur ton profil
              </p>
            </div>
          </div>
        </button>
      )}
    </article>
  );
}

function extractStoragePath(publicUrl: string | null): string | null {
  if (!publicUrl) return null;
  const marker = "/profile-videos/";
  const idx = publicUrl.indexOf(marker);
  if (idx === -1) return null;
  return publicUrl.slice(idx + marker.length);
}
