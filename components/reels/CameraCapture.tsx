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
  Zap,
} from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { cn } from "@/lib/utils/cn";

/* CameraCapture — capture caméra live multi-clips pour ReelCreator V1.5.
 *
 * Stack :
 *   - navigator.mediaDevices.getUserMedia() : flux vidéo + audio
 *   - MediaRecorder : enregistre par segments (clips)
 *   - Concaténation : pour V1.5 on stocke les blobs séparément et on
 *     les concatène côté client via une seconde passe (MediaSource API)
 *     OU on encode chaque clip et le serveur les assemble (V2 via Mux
 *     stitching API).
 *
 * V1.5 : on enregistre 1 clip continu (appui maintenu = enregistre,
 * relâche = stop). Multi-clips arrive en V1.6 quand on aura un encoder
 * client (ffmpeg.wasm) pour la concat.
 *
 * Limites V1.5 :
 *   - 1 clip par capture (pas de multi-clips concat)
 *   - Pas d'effets temps réel (filters CSS uniquement, AR mediapipe en V2)
 *   - Switch caméra front/back via constraint facingMode
 *   - Vitesse via playbackRate à la lecture (pas re-encoding)
 */

const MAX_DURATION_S = 90;
const MIN_DURATION_S = 1;

type FacingMode = "user" | "environment";
type Speed = 0.5 | 1 | 2;

type Props = {
  onCapture: (file: File, durationSeconds: number) => void;
  onCancel: () => void;
};

export function CameraCapture({ onCapture, onCancel }: Props) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const recordStartRef = useRef<number | null>(null);
  const [permissionState, setPermissionState] = useState<
    "idle" | "requesting" | "granted" | "denied"
  >("idle");
  const [facingMode, setFacingMode] = useState<FacingMode>("user");
  const [recording, setRecording] = useState(false);
  const [recordedSeconds, setRecordedSeconds] = useState(0);
  const [speed, setSpeed] = useState<Speed>(1);
  const [maxDuration, setMaxDuration] = useState<15 | 30 | 60 | 90>(60);

  /* Demande accès caméra + audio + attache au <video>. */
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
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
        },
      });
      /* Cleanup ancien stream si switch caméra. */
      if (streamRef.current) {
        for (const track of streamRef.current.getTracks()) track.stop();
      }
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play().catch(() => undefined);
      }
      setPermissionState("granted");
    } catch (err) {
      console.warn("[reels:camera]", err);
      setPermissionState("denied");
    }
  }, [facingMode]);

  /* Setup au mount. */
  useEffect(() => {
    void startCamera();
    return () => {
      if (streamRef.current) {
        for (const track of streamRef.current.getTracks()) track.stop();
      }
      if (recorderRef.current && recorderRef.current.state !== "inactive") {
        try {
          recorderRef.current.stop();
        } catch {
          /* noop */
        }
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /* Re-init au switch caméra. */
  useEffect(() => {
    if (permissionState === "granted") {
      void startCamera();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [facingMode]);

  /* Timer recording. */
  useEffect(() => {
    if (!recording) return;
    const interval = setInterval(() => {
      if (recordStartRef.current !== null) {
        const elapsed = (Date.now() - recordStartRef.current) / 1000;
        setRecordedSeconds(elapsed);
        if (elapsed >= maxDuration) {
          stopRecording(true);
        }
      }
    }, 100);
    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [recording, maxDuration]);

  function startRecording() {
    if (!streamRef.current || recording) return;
    chunksRef.current = [];
    /* Choix du codec : webm en priorité (chromium), mp4 fallback Safari. */
    const mimeType = pickSupportedMime();
    if (!mimeType) {
      toast.error("Codec vidéo non supporté par ce navigateur.");
      return;
    }
    try {
      const recorder = new MediaRecorder(streamRef.current, {
        mimeType,
        videoBitsPerSecond: 4_000_000,
      });
      recorder.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) chunksRef.current.push(e.data);
      };
      recorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: mimeType });
        const durationSeconds = recordedSeconds;
        if (durationSeconds < MIN_DURATION_S) {
          toast.error("Vidéo trop courte. Maintiens plus longtemps.");
          return;
        }
        const ext = mimeType.includes("mp4") ? "mp4" : "webm";
        const file = new File([blob], `reel-${Date.now()}.${ext}`, {
          type: mimeType,
        });
        onCapture(file, durationSeconds);
      };
      recorder.start(250); // chunks toutes 250ms pour avoir du buffer si crash
      recorderRef.current = recorder;
      recordStartRef.current = Date.now();
      setRecording(true);
      setRecordedSeconds(0);
    } catch (err) {
      console.error("[reels:camera:record]", err);
      toast.error("Erreur lors de l'enregistrement.");
    }
  }

  function stopRecording(autoStop = false) {
    if (!recorderRef.current || recorderRef.current.state === "inactive") return;
    try {
      recorderRef.current.stop();
    } catch {
      /* noop */
    }
    recordStartRef.current = null;
    setRecording(false);
    if (autoStop) {
      toast.success("Durée max atteinte — clip prêt !");
    }
  }

  function discardRecording() {
    chunksRef.current = [];
    setRecordedSeconds(0);
    if (recording) stopRecording();
  }

  function flipCamera() {
    setFacingMode((m) => (m === "user" ? "environment" : "user"));
  }

  return (
    <div className="relative w-full h-full bg-black overflow-hidden">
      {/* Preview caméra fullscreen. */}
      <video
        ref={videoRef}
        playsInline
        muted
        autoPlay
        className={cn(
          "absolute inset-0 w-full h-full object-cover",
          facingMode === "user" && "scale-x-[-1]", // mirror selfie
        )}
        style={{
          filter:
            speed === 0.5
              ? "brightness(1.05) saturate(1.1)"
              : speed === 2
                ? "contrast(1.1) saturate(1.2)"
                : undefined,
        }}
      />

      {/* Permission denied state. */}
      {permissionState === "denied" ? (
        <div className="absolute inset-0 flex items-center justify-center px-6 text-center bg-black">
          <div className="max-w-sm">
            <Camera className="w-10 h-10 text-cream/50 mx-auto mb-3" aria-hidden />
            <p className="font-display italic text-[24px] text-cream mb-2">
              Accès caméra refusé
            </p>
            <p className="text-[12.5px] text-cream/60 leading-relaxed mb-4">
              Active l&apos;autorisation caméra + micro dans les paramètres
              de ton navigateur, puis recharge la page.
            </p>
            <button
              type="button"
              onClick={onCancel}
              className="px-4 py-2 rounded-full bg-cream/10 text-cream text-[12.5px] font-bold hover:bg-cream/20"
            >
              Retour
            </button>
          </div>
        </div>
      ) : null}

      {permissionState === "requesting" ? (
        <div className="absolute inset-0 flex items-center justify-center bg-black">
          <Loader2 className="w-10 h-10 text-cream animate-spin" aria-hidden />
        </div>
      ) : null}

      {permissionState === "granted" ? (
        <>
          {/* Header — close + duration selector. */}
          <header className="absolute top-0 left-0 right-0 z-10 flex items-center justify-between gap-3 px-4 py-3 bg-gradient-to-b from-black/60 to-transparent">
            <button
              type="button"
              onClick={onCancel}
              className="w-10 h-10 rounded-full bg-black/40 hover:bg-black/60 text-cream flex items-center justify-center backdrop-blur-sm"
              aria-label="Fermer"
            >
              <X className="w-5 h-5" aria-hidden />
            </button>

            <div className="flex items-center gap-1 px-1 py-1 rounded-full bg-black/40 backdrop-blur-sm">
              {([15, 30, 60, 90] as const).map((d) => (
                <button
                  key={d}
                  type="button"
                  onClick={() => setMaxDuration(d)}
                  disabled={recording}
                  className={cn(
                    "px-3 py-1 rounded-full text-[11.5px] font-bold transition-colors disabled:opacity-50",
                    maxDuration === d
                      ? "bg-cream text-night"
                      : "text-cream/70 hover:text-cream",
                  )}
                >
                  {d}s
                </button>
              ))}
            </div>

            <button
              type="button"
              onClick={flipCamera}
              disabled={recording}
              className="w-10 h-10 rounded-full bg-black/40 hover:bg-black/60 text-cream flex items-center justify-center backdrop-blur-sm disabled:opacity-50"
              aria-label="Retourner la caméra"
            >
              <RotateCw className="w-4 h-4" aria-hidden />
            </button>
          </header>

          {/* Side controls (left) — vitesse. */}
          <div className="absolute left-3 top-1/3 z-10 flex flex-col items-center gap-2">
            <SideBtn
              active={speed === 0.5}
              onClick={() => setSpeed(0.5)}
              disabled={recording}
              icon={<span className="text-[10px] font-bold">.5x</span>}
              label="Slow-mo"
            />
            <SideBtn
              active={speed === 1}
              onClick={() => setSpeed(1)}
              disabled={recording}
              icon={<span className="text-[10px] font-bold">1x</span>}
              label="Normal"
            />
            <SideBtn
              active={speed === 2}
              onClick={() => setSpeed(2)}
              disabled={recording}
              icon={<Zap className="w-3.5 h-3.5" aria-hidden />}
              label="Fast"
            />
          </div>

          {/* Recording indicator + progress bar. */}
          {recording ? (
            <div className="absolute top-16 left-1/2 -translate-x-1/2 z-10 flex flex-col items-center gap-1">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-red-500 text-white text-[11px] font-bold">
                <span className="w-2 h-2 rounded-full bg-white animate-pulse" />
                REC · {recordedSeconds.toFixed(1)}s
              </span>
              <div className="w-32 h-1 rounded-full bg-cream/20 overflow-hidden">
                <div
                  className="h-full bg-red-500 transition-all"
                  style={{
                    width: `${(recordedSeconds / maxDuration) * 100}%`,
                  }}
                />
              </div>
            </div>
          ) : null}

          {/* Bottom controls — capture button + side actions. */}
          <div className="absolute bottom-8 left-0 right-0 z-10 flex items-center justify-between px-8">
            <span className="w-12" aria-hidden />

            {/* Capture button : tap pour start, tap pour stop. */}
            <button
              type="button"
              onClick={recording ? () => stopRecording() : startRecording}
              aria-label={
                recording ? "Arrêter l'enregistrement" : "Enregistrer"
              }
              className={cn(
                "relative w-20 h-20 rounded-full border-4 flex items-center justify-center transition-all",
                recording
                  ? "border-red-500 bg-red-500"
                  : "border-cream bg-cream/20 hover:scale-110",
              )}
            >
              {recording ? (
                <Square
                  className="w-7 h-7 text-cream fill-cream"
                  aria-hidden
                />
              ) : (
                <span className="w-14 h-14 rounded-full bg-red-500" />
              )}
            </button>

            {/* Discard. */}
            {recordedSeconds > 0 && !recording ? (
              <button
                type="button"
                onClick={discardRecording}
                aria-label="Supprimer l'enregistrement"
                className="w-12 h-12 rounded-full bg-black/40 text-cream flex items-center justify-center backdrop-blur-sm"
              >
                <Trash2 className="w-5 h-5" aria-hidden />
              </button>
            ) : (
              <span className="w-12" aria-hidden />
            )}
          </div>

          <p className="absolute bottom-1 left-0 right-0 text-center text-[10.5px] text-cream/50">
            Tap pour démarrer · tap pour arrêter
          </p>
        </>
      ) : null}
    </div>
  );
}

function SideBtn({
  active,
  onClick,
  disabled,
  icon,
  label,
}: {
  active: boolean;
  onClick: () => void;
  disabled?: boolean;
  icon: React.ReactNode;
  label: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      className={cn(
        "w-9 h-9 rounded-full backdrop-blur-sm flex items-center justify-center transition-colors disabled:opacity-30",
        active
          ? "bg-cream text-night"
          : "bg-black/40 text-cream hover:bg-black/60",
      )}
    >
      {icon}
    </button>
  );
}

function pickSupportedMime(): string | null {
  /* Ordre : codecs modernes d'abord (h264 partout), webm/opus second. */
  const candidates = [
    "video/mp4;codecs=h264,aac",
    "video/mp4",
    "video/webm;codecs=vp9,opus",
    "video/webm;codecs=vp8,opus",
    "video/webm",
  ];
  for (const c of candidates) {
    if (
      typeof MediaRecorder !== "undefined" &&
      MediaRecorder.isTypeSupported(c)
    ) {
      return c;
    }
  }
  return null;
}
