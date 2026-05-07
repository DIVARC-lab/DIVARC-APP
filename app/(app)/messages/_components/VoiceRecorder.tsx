"use client";

import { Mic, Send, Square, Trash2 } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { cn } from "@/lib/utils/cn";

const MAX_DURATION_MS = 5 * 60 * 1000; // 5 minutes
const PREFERRED_MIME_TYPES = [
  "audio/webm;codecs=opus",
  "audio/webm",
  "audio/mp4",
  "audio/aac",
  "audio/ogg",
];

type RecorderState =
  | { kind: "idle" }
  | { kind: "recording"; startedAt: number }
  | { kind: "preview"; blob: Blob; durationMs: number; previewUrl: string };

export type RecordedAudio = {
  blob: Blob;
  durationMs: number;
  mimeType: string;
};

type VoiceRecorderProps = {
  onCancel: () => void;
  onSend: (audio: RecordedAudio) => Promise<void>;
};

export function VoiceRecorder({ onCancel, onSend }: VoiceRecorderProps) {
  const [state, setState] = useState<RecorderState>({ kind: "idle" });
  const [elapsedMs, setElapsedMs] = useState(0);
  const [sending, setSending] = useState(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);
  const startedAtRef = useRef<number>(0);

  useEffect(() => {
    void startRecording();
    return () => {
      void stopStream();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Tick for elapsed time
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

  async function startRecording() {
    if (!navigator.mediaDevices?.getUserMedia) {
      toast.error("Le navigateur ne permet pas l'enregistrement audio.");
      onCancel();
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      });
      streamRef.current = stream;

      const mimeType = pickMimeType();
      const recorder = new MediaRecorder(
        stream,
        mimeType ? { mimeType } : undefined,
      );
      chunksRef.current = [];
      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) chunksRef.current.push(event.data);
      };
      recorder.onstop = () => {
        const blob = new Blob(chunksRef.current, {
          type: mimeType || "audio/webm",
        });
        const durationMs = Date.now() - startedAtRef.current;
        const previewUrl = URL.createObjectURL(blob);
        setState({ kind: "preview", blob, durationMs, previewUrl });
        void stopStream();
      };

      mediaRecorderRef.current = recorder;
      const startedAt = Date.now();
      startedAtRef.current = startedAt;
      recorder.start(100);
      setState({ kind: "recording", startedAt });
    } catch (err) {
      const message =
        err instanceof Error
          ? err.message
          : "Microphone non accessible.";
      toast.error(message);
      onCancel();
    }
  }

  async function stopStream() {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
  }

  async function stopRecording() {
    const recorder = mediaRecorderRef.current;
    if (recorder && recorder.state !== "inactive") {
      recorder.stop();
    }
  }

  async function handleCancel() {
    if (state.kind === "preview") URL.revokeObjectURL(state.previewUrl);
    await stopRecording();
    await stopStream();
    onCancel();
  }

  async function handleSend() {
    if (state.kind !== "preview") return;
    setSending(true);
    try {
      await onSend({
        blob: state.blob,
        durationMs: state.durationMs,
        mimeType: state.blob.type,
      });
      URL.revokeObjectURL(state.previewUrl);
    } catch {
      setSending(false);
      toast.error("Échec de l'envoi.");
      return;
    }
  }

  if (state.kind === "preview") {
    return (
      <div className="flex items-center gap-2 w-full">
        <button
          type="button"
          onClick={handleCancel}
          disabled={sending}
          aria-label="Supprimer"
          className="w-10 h-10 rounded-full bg-red-50 text-red-600 hover:bg-red-100 flex items-center justify-center"
        >
          <Trash2 className="w-4 h-4" aria-hidden />
        </button>
        <div className="flex-1 flex items-center gap-2 px-4 h-12 rounded-2xl bg-bg border border-line">
          <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
          <span className="text-sm font-semibold text-night">
            Message vocal prêt
          </span>
          <span className="text-xs text-muted ml-auto">
            {formatTime(state.durationMs)}
          </span>
        </div>
        <button
          type="button"
          onClick={handleSend}
          disabled={sending}
          aria-label="Envoyer"
          className={cn(
            "shrink-0 w-12 h-12 rounded-full bg-night text-cream flex items-center justify-center hover:bg-night-soft transition disabled:opacity-60",
          )}
        >
          {sending ? (
            <span className="w-4 h-4 border-2 border-cream border-t-transparent rounded-full animate-spin" />
          ) : (
            <Send className="w-4 h-4" aria-hidden />
          )}
        </button>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2 w-full">
      <button
        type="button"
        onClick={handleCancel}
        aria-label="Annuler"
        className="w-10 h-10 rounded-full bg-red-50 text-red-600 hover:bg-red-100 flex items-center justify-center"
      >
        <Trash2 className="w-4 h-4" aria-hidden />
      </button>
      <div className="flex-1 flex items-center gap-3 px-4 h-12 rounded-2xl bg-red-50 border border-red-200">
        <span className="relative flex w-2.5 h-2.5">
          <span className="absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75 animate-ping" />
          <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-red-500" />
        </span>
        <span className="text-sm font-semibold text-red-900">
          Enregistrement…
        </span>
        <span className="ml-auto text-sm font-mono text-red-700 tabular-nums">
          {formatTime(elapsedMs)}
        </span>
      </div>
      <button
        type="button"
        onClick={stopRecording}
        aria-label="Arrêter"
        className="shrink-0 w-12 h-12 rounded-full bg-night text-cream hover:bg-night-soft flex items-center justify-center"
      >
        <Square className="w-4 h-4 fill-current" aria-hidden />
      </button>
    </div>
  );
}

function formatTime(ms: number): string {
  const totalSeconds = Math.max(0, Math.round(ms / 1000));
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${seconds.toString().padStart(2, "0")}`;
}

export const VoiceRecorderTrigger = Mic;
