"use client";

import {
  Camera,
  Check,
  Loader2,
  RotateCw,
  Square,
  Trash2,
  Video,
  X,
} from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { cn } from "@/lib/utils/cn";
import { concatClips, loadFFmpeg } from "@/lib/reels/ffmpegConcat";

/* MultiClipRecorder — V3.10 capture multi-clips + concat ffmpeg.wasm.
 *
 * Workflow :
 *   1. Camera + MediaRecorder live (similaire à CameraCapture)
 *   2. Chaque "tap to record / release" enregistre un clip dans clips[]
 *   3. Bouton "Finaliser" → loadFFmpeg + concatClips → File MP4 unique
 *   4. onCapture(file, durationSeconds) callback final
 *
 * Différences vs CameraCapture (single-clip) :
 *   - clips[] cumulés en mémoire jusqu'à finalize
 *   - Indicateur de progression ffmpeg (download wasm + concat exec)
 *   - Bouton "Annuler dernier clip" pour reset
 *   - Total duration affiché vs limite (60s défaut, max 90s) */

const MAX_TOTAL_DURATION_S = 90;
const MIN_CLIP_DURATION_S = 0.5;

type Props = {
  onCapture: (file: File, durationSeconds: number) => void;
  onCancel: () => void;
};

type Clip = {
  id: string;
  blob: Blob;
  durationSeconds: number;
};

export function MultiClipRecorder({ onCapture, onCancel }: Props) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const clipStartRef = useRef<number | null>(null);

  const [permissionState, setPermissionState] = useState<
    "idle" | "requesting" | "granted" | "denied"
  >("idle");
  const [facingMode, setFacingMode] = useState<"user" | "environment">("user");
  const [recording, setRecording] = useState(false);
  const [clips, setClips] = useState<Clip[]>([]);
  const [clipElapsed, setClipElapsed] = useState(0);
  const [finalizing, setFinalizing] = useState(false);
  const [progress, setProgress] = useState(0);

  const totalDuration = clips.reduce((acc, c) => acc + c.durationSeconds, 0);
  const remaining = Math.max(0, MAX_TOTAL_DURATION_S - totalDuration);

  const startCamera = useCallback(async () => {
    setPermissionState("requesting");
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode,
          width: { ideal: 1080 },
          height: { ideal: 1920 },
          frameRate: { ideal: 30 },
        },
        audio: { echoCancellation: true, noiseSuppression: true },
      });
      if (streamRef.current) {
        for (const t of streamRef.current.getTracks()) t.stop();
      }
      streamRef.current = stream;
      if (videoRef.current) videoRef.current.srcObject = stream;
      setPermissionState("granted");
    } catch (err) {
      console.error("[multiclip:camera]", err);
      setPermissionState("denied");
    }
  }, [facingMode]);

  useEffect(() => {
    void startCamera();
    return () => {
      if (streamRef.current) {
        for (const t of streamRef.current.getTracks()) t.stop();
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (permissionState === "granted") void startCamera();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [facingMode]);

  /* Timer per clip. */
  useEffect(() => {
    if (!recording) return;
    const interval = setInterval(() => {
      if (clipStartRef.current !== null) {
        const elapsed = (Date.now() - clipStartRef.current) / 1000;
        setClipElapsed(elapsed);
        if (totalDuration + elapsed >= MAX_TOTAL_DURATION_S) {
          stopClipRecording();
        }
      }
    }, 100);
    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [recording, totalDuration]);

  function pickMime(): string | null {
    const candidates = [
      "video/webm;codecs=vp8,opus",
      "video/webm;codecs=vp9,opus",
      "video/webm",
      "video/mp4;codecs=h264,aac",
      "video/mp4",
    ];
    for (const c of candidates) {
      if (MediaRecorder.isTypeSupported(c)) return c;
    }
    return null;
  }

  function startClipRecording() {
    if (!streamRef.current || recording || remaining <= 0) return;
    const mime = pickMime();
    if (!mime) {
      toast.error("Codec non supporté.");
      return;
    }
    chunksRef.current = [];
    try {
      const recorder = new MediaRecorder(streamRef.current, {
        mimeType: mime,
        videoBitsPerSecond: 4_000_000,
      });
      recorder.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) chunksRef.current.push(e.data);
      };
      recorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: mime });
        const duration = clipElapsed;
        if (duration < MIN_CLIP_DURATION_S) {
          toast.error("Clip trop court.");
          return;
        }
        setClips((prev) => [
          ...prev,
          {
            id: crypto.randomUUID(),
            blob,
            durationSeconds: duration,
          },
        ]);
      };
      recorder.start(250);
      recorderRef.current = recorder;
      clipStartRef.current = Date.now();
      setRecording(true);
      setClipElapsed(0);
    } catch (err) {
      console.error("[multiclip:start]", err);
      toast.error("Erreur enregistrement.");
    }
  }

  function stopClipRecording() {
    if (!recorderRef.current || recorderRef.current.state === "inactive") return;
    try {
      recorderRef.current.stop();
    } catch {
      /* noop */
    }
    clipStartRef.current = null;
    setRecording(false);
  }

  function removeLastClip() {
    setClips((prev) => prev.slice(0, -1));
  }

  async function finalize() {
    if (clips.length === 0) {
      toast.error("Enregistre au moins un clip.");
      return;
    }
    setFinalizing(true);
    setProgress(0);
    try {
      /* Précharge ffmpeg.wasm si pas encore. */
      await loadFFmpeg((p) => setProgress(p));

      let blob: Blob;
      if (clips.length === 1) {
        blob = clips[0]!.blob;
      } else {
        blob = await concatClips(
          clips.map((c) => c.blob),
          (p) => setProgress(p),
        );
      }

      const ext = blob.type.includes("mp4") ? "mp4" : "webm";
      const file = new File([blob], `reel-${Date.now()}.${ext}`, {
        type: blob.type,
      });
      onCapture(file, totalDuration);
    } catch (err) {
      console.error("[multiclip:finalize]", err);
      toast.error("Concat échoué. Réessaie.");
    } finally {
      setFinalizing(false);
      setProgress(0);
    }
  }

  function flipCamera() {
    setFacingMode((m) => (m === "user" ? "environment" : "user"));
  }

  return (
    <div className="relative w-full h-full bg-black overflow-hidden">
      <video
        ref={videoRef}
        playsInline
        muted
        autoPlay
        className={cn(
          "absolute inset-0 w-full h-full object-cover",
          facingMode === "user" && "scale-x-[-1]",
        )}
      />

      {permissionState === "denied" ? (
        <div className="absolute inset-0 flex items-center justify-center px-6 text-center bg-black">
          <div className="max-w-sm">
            <Camera className="w-10 h-10 text-cream/50 mx-auto mb-3" aria-hidden />
            <p className="font-display italic text-[24px] text-cream mb-2">
              Accès caméra refusé
            </p>
            <button
              type="button"
              onClick={onCancel}
              className="mt-4 px-4 py-2 rounded-full bg-cream text-night text-[13px] font-bold"
            >
              Retour
            </button>
          </div>
        </div>
      ) : null}

      {finalizing ? (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/85 backdrop-blur-sm gap-3 px-6 text-center">
          <Loader2 className="w-8 h-8 animate-spin text-cream" aria-hidden />
          <p className="text-cream font-display italic text-[20px]">
            Concaténation en cours…
          </p>
          <div className="w-64 h-1.5 rounded-full bg-cream/15 overflow-hidden">
            <div
              className="h-full bg-gold transition-all"
              style={{ width: `${Math.round(progress * 100)}%` }}
            />
          </div>
          <p className="text-cream/60 text-[11px]">
            {Math.round(progress * 100)}% — chargement ffmpeg + concat
          </p>
        </div>
      ) : null}

      {/* Bandeau top : clips + total */}
      <header className="absolute top-0 inset-x-0 z-10 px-4 py-3 bg-gradient-to-b from-black/60 to-transparent">
        <div className="flex items-center justify-between">
          <button
            type="button"
            onClick={onCancel}
            className="w-9 h-9 rounded-full bg-cream/10 text-cream flex items-center justify-center"
            aria-label="Fermer"
          >
            <X className="w-4 h-4" aria-hidden />
          </button>
          <div className="text-cream text-center">
            <p className="text-[11px] uppercase tracking-wider font-bold text-cream/60">
              Multi-clips
            </p>
            <p className="font-display italic text-[16px] tabular-nums">
              {totalDuration.toFixed(1)}s /{" "}
              {recording ? `+${clipElapsed.toFixed(1)}s` : `${MAX_TOTAL_DURATION_S}s`}
            </p>
          </div>
          <button
            type="button"
            onClick={flipCamera}
            className="w-9 h-9 rounded-full bg-cream/10 text-cream flex items-center justify-center"
            aria-label="Caméra avant/arrière"
            disabled={recording}
          >
            <RotateCw className="w-4 h-4" aria-hidden />
          </button>
        </div>

        {/* Clips dots */}
        {clips.length > 0 ? (
          <div className="mt-3 flex gap-1.5">
            {clips.map((c) => (
              <div
                key={c.id}
                className="h-1 rounded-full bg-cream flex-1 min-w-[12px]"
                style={{ maxWidth: `${(c.durationSeconds / MAX_TOTAL_DURATION_S) * 100}%` }}
              />
            ))}
            {recording ? (
              <div
                className="h-1 rounded-full bg-rose-500 animate-pulse"
                style={{ width: `${(clipElapsed / MAX_TOTAL_DURATION_S) * 100}%` }}
              />
            ) : null}
          </div>
        ) : null}
      </header>

      {/* Contrôles bas */}
      <footer className="absolute bottom-0 inset-x-0 z-10 px-4 py-6 bg-gradient-to-t from-black/70 to-transparent">
        <div className="flex items-center justify-between gap-3">
          {/* Annuler dernier clip */}
          <button
            type="button"
            onClick={removeLastClip}
            disabled={clips.length === 0 || recording}
            aria-label="Annuler dernier clip"
            className="w-12 h-12 rounded-full bg-cream/10 text-cream flex items-center justify-center disabled:opacity-30"
          >
            <Trash2 className="w-5 h-5" aria-hidden />
          </button>

          {/* Record/stop principal */}
          {recording ? (
            <button
              type="button"
              onClick={stopClipRecording}
              aria-label="Stop ce clip"
              className="w-20 h-20 rounded-full bg-rose-500 ring-4 ring-cream flex items-center justify-center hover:bg-rose-600"
            >
              <Square className="w-7 h-7 text-cream fill-cream" aria-hidden />
            </button>
          ) : (
            <button
              type="button"
              onClick={startClipRecording}
              disabled={remaining <= 0}
              aria-label="Enregistrer un clip"
              className="w-20 h-20 rounded-full bg-rose-500 ring-4 ring-cream flex items-center justify-center disabled:opacity-40 hover:bg-rose-600"
            >
              <Video className="w-7 h-7 text-cream" aria-hidden />
            </button>
          )}

          {/* Finaliser */}
          <button
            type="button"
            onClick={finalize}
            disabled={clips.length === 0 || recording || finalizing}
            aria-label="Finaliser le montage"
            className="w-12 h-12 rounded-full bg-gold text-night flex items-center justify-center disabled:opacity-30 hover:bg-gold-deep"
          >
            <Check className="w-5 h-5" aria-hidden />
          </button>
        </div>
        <p className="mt-3 text-center text-cream/60 text-[11px]">
          {clips.length === 0
            ? "Appuie sur le bouton rouge pour ton premier clip"
            : `${clips.length} clip${clips.length > 1 ? "s" : ""} · ✓ pour finaliser`}
        </p>
      </footer>
    </div>
  );
}
