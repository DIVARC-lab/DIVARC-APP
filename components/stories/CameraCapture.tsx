"use client";

import { RotateCcw, Square, X, Zap } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { cn } from "@/lib/utils/cn";

const MAX_VIDEO_MS = 60_000; // 60s max (aligné TikTok / migration 0124)

type PhotoResult = { kind: "photo"; blob: Blob };
type VideoResult = {
  kind: "video";
  blob: Blob;
  thumbnail: Blob;
  durationMs: number;
};
export type CaptureResult = PhotoResult | VideoResult;

type CameraCaptureProps = {
  onCapture: (result: CaptureResult) => void;
  onClose: () => void;
};

/** Fullscreen camera overlay : preview live via getUserMedia,
 *  capture photo (canvas → blob JPEG) ou vidéo (MediaRecorder, max 15s,
 *  WebM/MP4 selon support navigateur) avec thumbnail générée à t=0. */
export function CameraCapture({ onCapture, onClose }: CameraCaptureProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [facing, setFacing] = useState<"user" | "environment">("environment");
  const [mode, setMode] = useState<"photo" | "video">("photo");
  const [error, setError] = useState<string | null>(null);

  /* Photo preview state */
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);
  const [photoBlob, setPhotoBlob] = useState<Blob | null>(null);

  /* Video recording state */
  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const recordStartRef = useRef<number>(0);
  const recordTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [recording, setRecording] = useState(false);
  const [recordElapsed, setRecordElapsed] = useState(0);
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [videoBlob, setVideoBlob] = useState<Blob | null>(null);
  const [videoThumb, setVideoThumb] = useState<Blob | null>(null);
  const [videoDuration, setVideoDuration] = useState(0);

  const hasPreview = photoUrl !== null || videoUrl !== null;

  useEffect(() => {
    let mounted = true;
    let activeStream: MediaStream | null = null;

    async function start() {
      if (!navigator.mediaDevices?.getUserMedia) {
        setError("Caméra non supportée sur cet appareil.");
        return;
      }
      try {
        const constraints: MediaStreamConstraints = {
          video: { facingMode: facing, width: { ideal: 1080 } },
          /* Audio uniquement en mode vidéo. Toggle entraîne re-mount. */
          audio: mode === "video",
        };
        const s = await navigator.mediaDevices.getUserMedia(constraints);
        if (!mounted) {
          s.getTracks().forEach((t) => t.stop());
          return;
        }
        activeStream = s;
        setStream(s);
        if (videoRef.current) videoRef.current.srcObject = s;
      } catch (err) {
        const message = err instanceof Error ? err.message : "Erreur caméra";
        setError(
          message.includes("Permission")
            ? "Autorise l'accès à la caméra dans les réglages."
            : "Impossible d'ouvrir la caméra.",
        );
      }
    }

    if (!hasPreview) void start();

    return () => {
      mounted = false;
      if (activeStream) activeStream.getTracks().forEach((t) => t.stop());
    };
  }, [facing, mode, hasPreview]);

  function captureFrameToBlob(quality = 0.85): Promise<Blob | null> {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas) return Promise.resolve(null);
    const w = video.videoWidth;
    const h = video.videoHeight;
    if (w === 0 || h === 0) return Promise.resolve(null);
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext("2d");
    if (!ctx) return Promise.resolve(null);
    if (facing === "user") {
      ctx.translate(w, 0);
      ctx.scale(-1, 1);
    }
    ctx.drawImage(video, 0, 0, w, h);
    return new Promise((res) =>
      canvas.toBlob((blob) => res(blob), "image/jpeg", quality),
    );
  }

  async function capturePhoto() {
    const blob = await captureFrameToBlob(0.9);
    if (!blob) {
      toast.error("Caméra pas encore prête.");
      return;
    }
    setPhotoBlob(blob);
    setPhotoUrl(URL.createObjectURL(blob));
  }

  async function startRecording() {
    if (!stream) return;
    if (typeof MediaRecorder === "undefined") {
      toast.error("Enregistrement vidéo non supporté.");
      return;
    }
    /* Generate thumbnail BEFORE we start recording — captures the
       starting frame which is what users see in the archive. */
    const thumb = await captureFrameToBlob(0.7);
    if (thumb) setVideoThumb(thumb);

    const mimePref = ["video/webm;codecs=vp9,opus", "video/webm;codecs=vp8,opus", "video/webm", "video/mp4"];
    const mime = mimePref.find((m) => MediaRecorder.isTypeSupported(m)) ?? "";

    chunksRef.current = [];
    const recorder = mime
      ? new MediaRecorder(stream, { mimeType: mime })
      : new MediaRecorder(stream);
    recorderRef.current = recorder;

    recorder.ondataavailable = (e) => {
      if (e.data.size > 0) chunksRef.current.push(e.data);
    };
    recorder.onstop = () => {
      const blob = new Blob(chunksRef.current, {
        type: mime || "video/webm",
      });
      const duration = Date.now() - recordStartRef.current;
      setVideoBlob(blob);
      setVideoDuration(duration);
      setVideoUrl(URL.createObjectURL(blob));
      setRecording(false);
    };

    recordStartRef.current = Date.now();
    recorder.start(100);
    setRecording(true);
    setRecordElapsed(0);

    /* UI ticker */
    const tick = setInterval(() => {
      const elapsed = Date.now() - recordStartRef.current;
      setRecordElapsed(elapsed);
      if (elapsed >= MAX_VIDEO_MS) {
        clearInterval(tick);
        stopRecording();
      }
    }, 100);
    recordTimeoutRef.current = setTimeout(() => {
      clearInterval(tick);
      if (recorder.state === "recording") stopRecording();
    }, MAX_VIDEO_MS + 200);
  }

  function stopRecording() {
    const r = recorderRef.current;
    if (r && r.state !== "inactive") r.stop();
    if (recordTimeoutRef.current) {
      clearTimeout(recordTimeoutRef.current);
      recordTimeoutRef.current = null;
    }
  }

  function retake() {
    if (photoUrl) URL.revokeObjectURL(photoUrl);
    if (videoUrl) URL.revokeObjectURL(videoUrl);
    setPhotoUrl(null);
    setPhotoBlob(null);
    setVideoUrl(null);
    setVideoBlob(null);
    setVideoThumb(null);
    setVideoDuration(0);
    setRecordElapsed(0);
  }

  function confirm() {
    if (mode === "photo" && photoBlob) {
      onCapture({ kind: "photo", blob: photoBlob });
    } else if (mode === "video" && videoBlob && videoThumb) {
      onCapture({
        kind: "video",
        blob: videoBlob,
        thumbnail: videoThumb,
        durationMs: videoDuration,
      });
    }
  }

  function flipCamera() {
    if (stream) {
      stream.getTracks().forEach((t) => t.stop());
      setStream(null);
    }
    setFacing((f) => (f === "user" ? "environment" : "user"));
  }

  function switchMode(next: "photo" | "video") {
    if (recording) return;
    if (next === mode) return;
    /* Switch audio on/off requires restarting the stream — kill it
       and let useEffect re-acquire with the new constraints. */
    if (stream) {
      stream.getTracks().forEach((t) => t.stop());
      setStream(null);
    }
    setMode(next);
  }

  const seconds = Math.floor(recordElapsed / 1000);
  const remaining = Math.max(0, Math.ceil((MAX_VIDEO_MS - recordElapsed) / 1000));

  return (
    <div className="fixed inset-0 z-50 bg-night flex flex-col">
      {/* Top bar */}
      <div className="absolute top-0 inset-x-0 z-10 px-4 pt-12 pb-3 flex items-center justify-between gap-3">
        <button
          type="button"
          onClick={onClose}
          aria-label="Fermer"
          className="w-10 h-10 rounded-full bg-night/40 backdrop-blur-md text-cream flex items-center justify-center hover:bg-night/60 transition-colors"
        >
          <X className="w-5 h-5" aria-hidden />
        </button>
        {recording ? (
          <span className="px-3 h-7 rounded-full bg-red-500 text-white text-[11px] font-extrabold inline-flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-white animate-pulse" />
            REC · {seconds}s
            {remaining <= 5 ? (
              <span className="opacity-80">· {remaining}s restantes</span>
            ) : null}
          </span>
        ) : (
          <span className="text-[11px] font-extrabold uppercase tracking-[0.18em] text-gold">
            · Capture
          </span>
        )}
        {!hasPreview && !recording ? (
          <button
            type="button"
            onClick={flipCamera}
            aria-label="Inverser caméra"
            className="w-10 h-10 rounded-full bg-night/40 backdrop-blur-md text-cream flex items-center justify-center hover:bg-night/60 transition-colors"
          >
            <RotateCcw className="w-4 h-4" aria-hidden />
          </button>
        ) : (
          <span className="w-10" aria-hidden />
        )}
      </div>

      {/* Stream / preview */}
      <div className="flex-1 relative flex items-center justify-center overflow-hidden">
        {error ? (
          <div className="px-8 py-6 text-center max-w-md">
            <Zap
              className="w-10 h-10 text-gold mx-auto mb-3"
              aria-hidden
            />
            <p className="font-display italic text-2xl text-cream leading-tight">
              Caméra indisponible
            </p>
            <p className="mt-2 text-sm text-cream/65 leading-relaxed">
              {error}
            </p>
            <button
              type="button"
              onClick={onClose}
              className="mt-6 inline-flex items-center gap-2 h-11 px-5 rounded-full bg-gold text-night font-extrabold text-sm"
            >
              Retour
            </button>
          </div>
        ) : photoUrl ? (
          /* eslint-disable-next-line @next/next/no-img-element */
          <img
            src={photoUrl}
            alt="Capture"
            className="max-w-full max-h-full object-contain"
          />
        ) : videoUrl ? (
          <video
            src={videoUrl}
            controls
            playsInline
            className="max-w-full max-h-full object-contain"
          />
        ) : (
          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted
            className="max-w-full max-h-full object-contain"
            style={{
              transform: facing === "user" ? "scaleX(-1)" : undefined,
            }}
          />
        )}
        <canvas ref={canvasRef} className="hidden" aria-hidden />
      </div>

      {/* Mode tabs (hidden when reviewing or recording) */}
      {!hasPreview && !recording && !error ? (
        <div className="absolute bottom-[150px] inset-x-0 flex items-center justify-center gap-7 z-10">
          {(["photo", "video"] as const).map((m) => (
            <button
              key={m}
              type="button"
              onClick={() => switchMode(m)}
              className={cn(
                "text-xs font-extrabold uppercase tracking-[0.18em] pb-1.5 transition-colors",
                mode === m
                  ? "text-gold border-b-2 border-gold"
                  : "text-cream/50 border-b-2 border-transparent",
              )}
            >
              {m === "photo" ? "Photo" : "Vidéo · 15s"}
            </button>
          ))}
        </div>
      ) : null}

      {/* Bottom controls */}
      <div className="absolute bottom-0 inset-x-0 px-6 pb-10 pt-6 flex items-center justify-center gap-6">
        {hasPreview ? (
          <>
            <button
              type="button"
              onClick={retake}
              className="h-12 px-5 rounded-full bg-night/40 backdrop-blur-md text-cream font-semibold text-sm border border-cream/15 hover:bg-night/60 transition-colors"
            >
              Reprendre
            </button>
            <button
              type="button"
              onClick={confirm}
              className="h-12 px-7 rounded-full bg-gold text-night font-extrabold text-sm shadow-[0_8px_22px_rgba(244,185,66,0.5)] hover:bg-gold-soft transition-colors"
            >
              {mode === "video" ? "Utiliser cette vidéo" : "Utiliser cette photo"}
            </button>
          </>
        ) : !error ? (
          mode === "photo" ? (
            <button
              type="button"
              onClick={capturePhoto}
              disabled={!stream}
              aria-label="Prendre la photo"
              className="w-20 h-20 rounded-full bg-cream border-[5px] border-gold flex items-center justify-center disabled:opacity-50 hover:scale-105 transition-transform"
            >
              <span className="block w-14 h-14 rounded-full bg-gold" aria-hidden />
            </button>
          ) : recording ? (
            <button
              type="button"
              onClick={stopRecording}
              aria-label="Arrêter l'enregistrement"
              className="w-20 h-20 rounded-full bg-cream border-[5px] border-red-500 flex items-center justify-center hover:scale-105 transition-transform"
            >
              <Square className="w-8 h-8 text-red-500 fill-red-500" aria-hidden />
            </button>
          ) : (
            <button
              type="button"
              onClick={startRecording}
              disabled={!stream}
              aria-label="Démarrer l'enregistrement"
              className="w-20 h-20 rounded-full bg-cream border-[5px] border-red-500 flex items-center justify-center disabled:opacity-50 hover:scale-105 transition-transform"
            >
              <span className="block w-14 h-14 rounded-full bg-red-500" aria-hidden />
            </button>
          )
        ) : null}
      </div>
    </div>
  );
}
