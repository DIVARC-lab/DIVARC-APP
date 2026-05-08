"use client";

import { Camera, RotateCcw, X, Zap } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";

type CameraCaptureProps = {
  onCapture: (blob: Blob) => void;
  onClose: () => void;
};

/** Fullscreen camera overlay : preview live via getUserMedia, capture
 *  vers canvas → blob JPEG. Pas de vidéo ni boomerang dans cette V1.
 *  Utilise l'API caméra native du navigateur (HTTPS only, sauf localhost). */
export function CameraCapture({ onCapture, onClose }: CameraCaptureProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [facing, setFacing] = useState<"user" | "environment">("environment");
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [previewBlob, setPreviewBlob] = useState<Blob | null>(null);
  const [error, setError] = useState<string | null>(null);

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
          audio: false,
        };
        const s = await navigator.mediaDevices.getUserMedia(constraints);
        if (!mounted) {
          s.getTracks().forEach((t) => t.stop());
          return;
        }
        activeStream = s;
        setStream(s);
        if (videoRef.current) {
          videoRef.current.srcObject = s;
        }
      } catch (err) {
        const message = err instanceof Error ? err.message : "Erreur caméra";
        setError(
          message.includes("Permission")
            ? "Autorise l'accès à la caméra dans les réglages."
            : "Impossible d'ouvrir la caméra.",
        );
      }
    }

    if (!previewUrl) {
      void start();
    }

    return () => {
      mounted = false;
      if (activeStream) {
        activeStream.getTracks().forEach((t) => t.stop());
      }
    };
  }, [facing, previewUrl]);

  function capture() {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas) return;

    const w = video.videoWidth;
    const h = video.videoHeight;
    if (w === 0 || h === 0) {
      toast.error("Caméra pas encore prête.");
      return;
    }

    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    /* Mirror selfie shots so they match the preview the user saw. */
    if (facing === "user") {
      ctx.translate(w, 0);
      ctx.scale(-1, 1);
    }
    ctx.drawImage(video, 0, 0, w, h);

    canvas.toBlob(
      (blob) => {
        if (!blob) {
          toast.error("Échec de la capture.");
          return;
        }
        setPreviewBlob(blob);
        setPreviewUrl(URL.createObjectURL(blob));
      },
      "image/jpeg",
      0.9,
    );
  }

  function retake() {
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setPreviewUrl(null);
    setPreviewBlob(null);
  }

  function confirm() {
    if (previewBlob) onCapture(previewBlob);
  }

  function flipCamera() {
    if (stream) {
      stream.getTracks().forEach((t) => t.stop());
      setStream(null);
    }
    setFacing((f) => (f === "user" ? "environment" : "user"));
  }

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
        <span className="text-[11px] font-extrabold uppercase tracking-[0.18em] text-gold">
          · Capture
        </span>
        {!previewUrl ? (
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
        ) : previewUrl ? (
          /* eslint-disable-next-line @next/next/no-img-element */
          <img
            src={previewUrl}
            alt="Capture"
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

      {/* Bottom controls */}
      <div className="absolute bottom-0 inset-x-0 px-6 pb-10 pt-6 flex items-center justify-center gap-6">
        {previewUrl ? (
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
              Utiliser cette photo
            </button>
          </>
        ) : !error ? (
          <button
            type="button"
            onClick={capture}
            disabled={!stream}
            aria-label="Prendre la photo"
            className="w-20 h-20 rounded-full bg-cream border-[5px] border-gold flex items-center justify-center disabled:opacity-50 hover:scale-105 transition-transform"
          >
            <span className="block w-14 h-14 rounded-full bg-gold" aria-hidden />
          </button>
        ) : null}
      </div>
    </div>
  );
}
