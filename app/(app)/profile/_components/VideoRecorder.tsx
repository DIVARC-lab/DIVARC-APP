"use client";

import {
  Camera,
  RefreshCw,
  Square,
  Upload,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/Button";

const MAX_DURATION_MS = 60_000;
const PREFERRED_MIME_TYPES = [
  "video/webm;codecs=vp9,opus",
  "video/webm;codecs=vp8,opus",
  "video/webm",
  "video/mp4",
];

export type RecordedVideo = {
  blob: Blob;
  thumbnailBlob: Blob;
  durationMs: number;
  mimeType: string;
};

type RecorderState =
  | { kind: "idle" }
  | { kind: "ready" } // camera streaming, user not yet recording
  | { kind: "recording"; startedAt: number }
  | {
      kind: "preview";
      blob: Blob;
      thumbnailBlob: Blob;
      durationMs: number;
      previewUrl: string;
      mimeType: string;
    };

type Props = {
  onCancel: () => void;
  onSubmit: (video: RecordedVideo) => Promise<void>;
};

export function VideoRecorder({ onCancel, onSubmit }: Props) {
  const [state, setState] = useState<RecorderState>({ kind: "idle" });
  const [elapsedMs, setElapsedMs] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const previewRef = useRef<HTMLVideoElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);

  useEffect(() => {
    void startCamera();
    return () => {
      stopStream();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (state.kind !== "recording") return;
    const interval = setInterval(() => {
      const elapsed = Date.now() - state.startedAt;
      setElapsedMs(elapsed);
      if (elapsed >= MAX_DURATION_MS) {
        void stopRecording();
      }
    }, 100);
    return () => clearInterval(interval);
  }, [state]);

  function pickMimeType(): string {
    if (typeof MediaRecorder === "undefined") return "";
    for (const type of PREFERRED_MIME_TYPES) {
      if (MediaRecorder.isTypeSupported(type)) return type;
    }
    return "";
  }

  async function startCamera() {
    if (!navigator.mediaDevices?.getUserMedia) {
      toast.error("Ton navigateur ne permet pas l'enregistrement vidéo.");
      onCancel();
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: "user",
          width: { ideal: 720 },
          height: { ideal: 1280 },
        },
        audio: { echoCancellation: true, noiseSuppression: true },
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play().catch(() => undefined);
      }
      setState({ kind: "ready" });
    } catch (error) {
      console.error("[VideoRecorder] camera denied", error);
      toast.error("Accès à la caméra refusé.");
      onCancel();
    }
  }

  function stopStream() {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    if (mediaRecorderRef.current?.state === "recording") {
      mediaRecorderRef.current.stop();
    }
    mediaRecorderRef.current = null;
  }

  async function startRecording() {
    const stream = streamRef.current;
    if (!stream) return;

    const mimeType = pickMimeType();
    if (!mimeType) {
      toast.error("Format vidéo non supporté par ce navigateur.");
      return;
    }

    chunksRef.current = [];
    const recorder = new MediaRecorder(stream, { mimeType });
    mediaRecorderRef.current = recorder;

    recorder.ondataavailable = (event) => {
      if (event.data.size > 0) chunksRef.current.push(event.data);
    };

    recorder.onstop = async () => {
      const blob = new Blob(chunksRef.current, { type: mimeType });
      const durationMs = Math.min(
        Date.now() - (state.kind === "recording" ? state.startedAt : Date.now()),
        MAX_DURATION_MS,
      );
      const previewUrl = URL.createObjectURL(blob);

      // Génère la vignette (1er frame) côté client
      let thumbnailBlob: Blob | null = null;
      try {
        thumbnailBlob = await captureThumbnail(previewUrl);
      } catch (error) {
        console.warn("[VideoRecorder] thumbnail failed", error);
      }
      if (!thumbnailBlob) {
        // Fallback : un placeholder transparent 1x1
        thumbnailBlob = await fallbackThumbnail();
      }

      setState({
        kind: "preview",
        blob,
        thumbnailBlob,
        durationMs,
        previewUrl,
        mimeType,
      });
    };

    recorder.start(250);
    setState({ kind: "recording", startedAt: Date.now() });
    setElapsedMs(0);
  }

  async function stopRecording() {
    const recorder = mediaRecorderRef.current;
    if (recorder && recorder.state === "recording") {
      recorder.stop();
    }
  }

  async function handleSubmit() {
    if (state.kind !== "preview") return;
    setSubmitting(true);
    try {
      await onSubmit({
        blob: state.blob,
        thumbnailBlob: state.thumbnailBlob,
        durationMs: state.durationMs,
        mimeType: state.mimeType,
      });
    } finally {
      setSubmitting(false);
    }
  }

  function handleRetry() {
    if (state.kind === "preview") {
      URL.revokeObjectURL(state.previewUrl);
    }
    setElapsedMs(0);
    setState({ kind: "ready" });
  }

  function handleCancel() {
    if (state.kind === "preview") {
      URL.revokeObjectURL(state.previewUrl);
    }
    stopStream();
    onCancel();
  }

  const remainingMs = Math.max(MAX_DURATION_MS - elapsedMs, 0);
  const progressPct = Math.min((elapsedMs / MAX_DURATION_MS) * 100, 100);

  return (
    <div className="space-y-4">
      <div className="relative rounded-3xl overflow-hidden bg-night aspect-[9/16] max-w-xs mx-auto">
        {/* Live camera */}
        {state.kind === "preview" ? (
          <video
            ref={previewRef}
            src={state.previewUrl}
            playsInline
            controls
            className="w-full h-full object-cover"
          />
        ) : (
          <video
            ref={videoRef}
            playsInline
            muted
            autoPlay
            className="w-full h-full object-cover"
          />
        )}

        {/* Recording indicator */}
        {state.kind === "recording" ? (
          <>
            <div className="absolute top-3 left-3 inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-red-500 text-white text-xs font-semibold">
              <span className="w-2 h-2 rounded-full bg-white animate-pulse" />
              REC · {formatTime(elapsedMs)}
            </div>
            <div className="absolute top-3 right-3 px-2.5 py-1 rounded-full bg-black/50 text-white text-xs font-semibold">
              {formatTime(remainingMs)}
            </div>
            <div className="absolute bottom-0 left-0 right-0 h-1 bg-white/20">
              <div
                className="h-full bg-red-500 transition-[width]"
                style={{ width: `${progressPct}%` }}
              />
            </div>
          </>
        ) : null}

        {state.kind === "preview" ? (
          <div className="absolute top-3 left-3 inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-500 text-white text-xs font-semibold">
            ✓ {formatTime(state.durationMs)}
          </div>
        ) : null}
      </div>

      <div className="flex items-center justify-center gap-3">
        {state.kind === "ready" ? (
          <>
            <Button variant="ghost" onClick={handleCancel}>
              Annuler
            </Button>
            <Button onClick={() => void startRecording()}>
              <Camera className="w-4 h-4" aria-hidden />
              Enregistrer
            </Button>
          </>
        ) : null}

        {state.kind === "recording" ? (
          <Button onClick={() => void stopRecording()} variant="danger">
            <Square className="w-4 h-4" aria-hidden />
            Arrêter
          </Button>
        ) : null}

        {state.kind === "preview" ? (
          <>
            <Button variant="ghost" onClick={handleRetry}>
              <RefreshCw className="w-4 h-4" aria-hidden />
              Refaire
            </Button>
            <Button onClick={handleSubmit} loading={submitting}>
              <Upload className="w-4 h-4" aria-hidden />
              Publier
            </Button>
          </>
        ) : null}
      </div>

      <p className="text-xs text-muted text-center">
        60 secondes max · format vertical 9:16. La vidéo apparaît sur ton
        profil public et boucle automatiquement.
      </p>
    </div>
  );
}

function formatTime(ms: number): string {
  const s = Math.floor(ms / 1000);
  const m = Math.floor(s / 60);
  const r = s % 60;
  return `${m}:${r.toString().padStart(2, "0")}`;
}

async function captureThumbnail(videoUrl: string): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const video = document.createElement("video");
    video.preload = "metadata";
    video.muted = true;
    video.playsInline = true;
    video.crossOrigin = "anonymous";
    video.src = videoUrl;

    video.addEventListener("loadeddata", () => {
      // Seek to 0.1s pour récupérer un vrai frame (pas un noir)
      try {
        video.currentTime = 0.1;
      } catch {
        // ignore
      }
    });

    video.addEventListener("seeked", () => {
      try {
        const w = video.videoWidth;
        const h = video.videoHeight;
        if (!w || !h) {
          reject(new Error("no video dimensions"));
          return;
        }
        const canvas = document.createElement("canvas");
        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext("2d");
        if (!ctx) {
          reject(new Error("no canvas context"));
          return;
        }
        ctx.drawImage(video, 0, 0, w, h);
        canvas.toBlob(
          (blob) => {
            if (blob) resolve(blob);
            else reject(new Error("toBlob failed"));
          },
          "image/jpeg",
          0.85,
        );
      } catch (error) {
        reject(error);
      }
    });

    video.addEventListener("error", () => reject(new Error("video error")));

    setTimeout(() => reject(new Error("thumbnail timeout")), 5000);
  });
}

async function fallbackThumbnail(): Promise<Blob> {
  const canvas = document.createElement("canvas");
  canvas.width = 720;
  canvas.height = 1280;
  const ctx = canvas.getContext("2d");
  if (ctx) {
    const grad = ctx.createLinearGradient(0, 0, 0, 1280);
    grad.addColorStop(0, "#0A1F44");
    grad.addColorStop(1, "#F4B942");
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 720, 1280);
  }
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (blob) resolve(blob);
        else reject(new Error("fallback failed"));
      },
      "image/jpeg",
      0.85,
    );
  });
}
