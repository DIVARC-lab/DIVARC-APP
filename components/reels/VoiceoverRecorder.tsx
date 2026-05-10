"use client";

import { Loader2, Mic, Play, Square, Trash2, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils/cn";

/* VoiceoverRecorder — V3.7 plugin pour enregistrer une voix off et
 * régler les volumes vidéo / voix off / son.
 *
 * Workflow :
 *   1. User clique "Démarrer enregistrement" → getUserMedia + MediaRecorder
 *      en parallèle de la vidéo source qui joue (sync naturel)
 *   2. AudioContext.createAnalyser pour la waveform live (canvas)
 *   3. Stop → blob webm/opus → upload Supabase Storage (`reel-media` bucket)
 *   4. Preview : <audio> du voiceover + <video> du source en parallèle
 *   5. 2 sliders : volume vidéo (0..1), volume voix off (0..1)
 *
 * Limitations V3.7 :
 *   - pas de noise suppression / autotune (delégué au browser)
 *   - pas de trim/cut (V3.8 si demande)
 *   - durée max = durée vidéo (clamp côté enregistrement) */

const MAX_BYTES = 20 * 1024 * 1024; // 20 MB max audio
const MIME_PREFERRED = "audio/webm;codecs=opus";

type Props = {
  userId: string;
  videoUrl: string;
  durationSeconds: number;
  initial: {
    voiceover_url: string | null;
    video_volume: number;
    voiceover_volume: number;
  };
  onApply: (state: {
    voiceover_url: string | null;
    video_volume: number;
    voiceover_volume: number;
  }) => void;
  onClose: () => void;
};

export function VoiceoverRecorder({
  userId,
  videoUrl,
  durationSeconds,
  initial,
  onApply,
  onClose,
}: Props) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const audioRef = useRef<HTMLAudioElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const animationRef = useRef<number | null>(null);
  const intervalRef = useRef<number | null>(null);

  const [voiceoverUrl, setVoiceoverUrl] = useState<string | null>(
    initial.voiceover_url,
  );
  const [voiceoverPath, setVoiceoverPath] = useState<string | null>(null);
  const [videoVolume, setVideoVolume] = useState(initial.video_volume);
  const [voiceoverVolume, setVoiceoverVolume] = useState(
    initial.voiceover_volume,
  );
  const [recording, setRecording] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [elapsed, setElapsed] = useState(0);

  /* Cleanup audio context + canvas raf au démontage. */
  useEffect(() => {
    return () => {
      if (animationRef.current) cancelAnimationFrame(animationRef.current);
      if (intervalRef.current) window.clearInterval(intervalRef.current);
      audioCtxRef.current?.close().catch(() => {});
    };
  }, []);

  /* Sync volume des elements quand l'user joue les sliders. */
  useEffect(() => {
    if (videoRef.current) videoRef.current.volume = videoVolume;
  }, [videoVolume]);

  useEffect(() => {
    if (audioRef.current) audioRef.current.volume = voiceoverVolume;
  }, [voiceoverVolume]);

  /* Sync video + audio voix off (currentTime cohérent). */
  function handleVideoTimeUpdate(e: React.SyntheticEvent<HTMLVideoElement>) {
    if (!audioRef.current || !voiceoverUrl) return;
    const v = e.currentTarget;
    const drift = Math.abs((audioRef.current.currentTime ?? 0) - v.currentTime);
    if (drift > 0.25) {
      audioRef.current.currentTime = v.currentTime;
    }
  }

  function handleVideoPlay() {
    if (audioRef.current && voiceoverUrl) {
      audioRef.current.currentTime = videoRef.current?.currentTime ?? 0;
      void audioRef.current.play().catch(() => {});
    }
  }

  function handleVideoPause() {
    audioRef.current?.pause();
  }

  async function startRecording() {
    if (recording) return;
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: { echoCancellation: true, noiseSuppression: true },
      });

      /* Waveform analyser. */
      const ctx = new AudioContext();
      audioCtxRef.current = ctx;
      const source = ctx.createMediaStreamSource(stream);
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 256;
      source.connect(analyser);
      analyserRef.current = analyser;
      drawWaveform();

      /* MediaRecorder. */
      const mime = MediaRecorder.isTypeSupported(MIME_PREFERRED)
        ? MIME_PREFERRED
        : "audio/webm";
      const recorder = new MediaRecorder(stream, { mimeType: mime });
      mediaRecorderRef.current = recorder;
      const chunks: Blob[] = [];
      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunks.push(e.data);
      };
      recorder.onstop = async () => {
        stream.getTracks().forEach((t) => t.stop());
        if (animationRef.current) cancelAnimationFrame(animationRef.current);
        const blob = new Blob(chunks, { type: mime });
        if (blob.size > MAX_BYTES) {
          toast.error("Voix off trop longue.");
          return;
        }
        await uploadVoiceover(blob);
      };

      /* Démarre la vidéo en sync. */
      if (videoRef.current) {
        videoRef.current.currentTime = 0;
        await videoRef.current.play().catch(() => undefined);
      }

      recorder.start(100);
      setRecording(true);
      setElapsed(0);

      /* Auto-stop à la durée de la vidéo via setInterval (date diff).
         Date.now est OK ici car on est dans un handler d'event utilisateur,
         pas dans le body du render. */
      // eslint-disable-next-line react-hooks/purity
      const startTs = Date.now();
      const intervalId = window.setInterval(() => {
        const e = (Date.now() - startTs) / 1000;
        setElapsed(e);
        if (e >= durationSeconds) {
          window.clearInterval(intervalId);
          if (recorder.state === "recording") recorder.stop();
          setRecording(false);
        }
      }, 100);
      /* Stocke pour cleanup si l'user stop manuellement. */
      intervalRef.current = intervalId;
    } catch (err) {
      console.error("[voiceover:start]", err);
      toast.error("Microphone inaccessible.");
    }
  }

  function stopRecording() {
    if (!mediaRecorderRef.current || !recording) return;
    mediaRecorderRef.current.stop();
    setRecording(false);
    videoRef.current?.pause();
    if (intervalRef.current) {
      window.clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }

  async function uploadVoiceover(blob: Blob) {
    setUploading(true);
    try {
      const supabase = createClient();
      const ext = blob.type.includes("opus") ? "webm" : "webm";
      const path = `voiceovers/${userId}/${crypto.randomUUID()}.${ext}`;
      const { error } = await supabase.storage
        .from("post-photos")
        .upload(path, blob, { contentType: blob.type, upsert: false });
      if (error) throw error;
      const { data } = supabase.storage.from("post-photos").getPublicUrl(path);
      setVoiceoverUrl(data.publicUrl);
      setVoiceoverPath(path);
      toast.success("Voix off enregistrée.");
    } catch (err) {
      console.error("[voiceover:upload]", err);
      toast.error("Upload échoué.");
    } finally {
      setUploading(false);
    }
  }

  async function removeVoiceover() {
    if (voiceoverPath) {
      const supabase = createClient();
      await supabase.storage.from("post-photos").remove([voiceoverPath]);
    }
    setVoiceoverUrl(null);
    setVoiceoverPath(null);
  }

  function drawWaveform() {
    const canvas = canvasRef.current;
    const analyser = analyserRef.current;
    if (!canvas || !analyser) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const bufferLen = analyser.frequencyBinCount;
    const data = new Uint8Array(bufferLen);

    const render = () => {
      if (!analyserRef.current) return;
      analyserRef.current.getByteFrequencyData(data);
      ctx.fillStyle = "#0A1F44";
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      const barWidth = canvas.width / bufferLen;
      for (let i = 0; i < bufferLen; i++) {
        const value = data[i] ?? 0;
        const h = (value / 255) * canvas.height;
        ctx.fillStyle = `hsl(${(i / bufferLen) * 60 + 30}, 80%, 60%)`;
        ctx.fillRect(i * barWidth, canvas.height - h, barWidth - 1, h);
      }
      animationRef.current = requestAnimationFrame(render);
    };
    render();
  }

  function handleApply() {
    onApply({
      voiceover_url: voiceoverUrl,
      video_volume: videoVolume,
      voiceover_volume: voiceoverVolume,
    });
    onClose();
  }

  return (
    <div className="fixed inset-0 z-50 bg-black flex flex-col">
      <header className="flex items-center justify-between px-4 py-3 border-b border-white/10">
        <div>
          <h2 className="text-white text-base font-bold">Voix off & mix</h2>
          <p className="text-white/60 text-[11px] mt-0.5">
            Enregistre ta voix, règle les volumes
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onClose}
            aria-label="Fermer"
            className="w-9 h-9 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center"
          >
            <X className="w-4 h-4" aria-hidden />
          </button>
          <button
            type="button"
            onClick={handleApply}
            className="px-4 py-2 rounded-full bg-gold-deep text-white text-[13px] font-semibold hover:bg-gold transition-colors"
          >
            Appliquer
          </button>
        </div>
      </header>

      <div className="flex-1 flex flex-col lg:flex-row overflow-hidden">
        {/* Preview vidéo + audio sync. */}
        <div className="flex-1 flex items-center justify-center min-h-0 bg-black p-4">
          <div className="relative aspect-[9/16] h-full max-h-full max-w-full">
            <video
              ref={videoRef}
              src={videoUrl}
              controls
              playsInline
              onPlay={handleVideoPlay}
              onPause={handleVideoPause}
              onTimeUpdate={handleVideoTimeUpdate}
              className="absolute inset-0 w-full h-full object-contain"
            />
            {voiceoverUrl ? (
              <audio
                ref={audioRef}
                src={voiceoverUrl}
                preload="auto"
                className="sr-only"
              />
            ) : null}
          </div>
        </div>

        {/* Panel contrôles. */}
        <div className="lg:w-[380px] bg-white flex flex-col overflow-y-auto">
          {/* Bouton enregistrement */}
          <div className="px-5 py-4 border-b border-line">
            <p className="text-[11px] font-bold uppercase tracking-wider text-night-muted mb-2">
              Enregistrement
            </p>
            {recording ? (
              <button
                type="button"
                onClick={stopRecording}
                className="w-full h-12 rounded-full bg-red-500 text-white font-bold flex items-center justify-center gap-2 hover:bg-red-600 transition-colors"
              >
                <Square className="w-4 h-4" aria-hidden />
                Stop ({elapsed.toFixed(1)}s / {Math.round(durationSeconds)}s)
              </button>
            ) : voiceoverUrl ? (
              <div className="space-y-2">
                <div className="flex items-center justify-between px-3 py-2 rounded-xl bg-night/5 border border-line">
                  <span className="text-[12px] text-night-muted">
                    Voix off enregistrée
                  </span>
                  <button
                    type="button"
                    onClick={removeVoiceover}
                    className="text-[11px] font-semibold text-red-600 hover:text-red-700 flex items-center gap-1"
                  >
                    <Trash2 className="w-3 h-3" aria-hidden />
                    Supprimer
                  </button>
                </div>
                <button
                  type="button"
                  onClick={startRecording}
                  disabled={uploading}
                  className="w-full h-10 rounded-full bg-night text-cream font-semibold flex items-center justify-center gap-2 hover:bg-night-soft transition-colors"
                >
                  <Mic className="w-4 h-4" aria-hidden />
                  Réenregistrer
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={startRecording}
                disabled={uploading}
                className={cn(
                  "w-full h-12 rounded-full font-bold flex items-center justify-center gap-2 transition-colors",
                  uploading
                    ? "bg-night/10 text-night-muted cursor-wait"
                    : "bg-gold-deep text-white hover:bg-gold",
                )}
              >
                {uploading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" aria-hidden />
                    Upload…
                  </>
                ) : (
                  <>
                    <Mic className="w-4 h-4" aria-hidden />
                    Démarrer l&apos;enregistrement
                  </>
                )}
              </button>
            )}
            <p className="mt-2 text-[11px] text-night-dim">
              La vidéo se lance en sync. Stop auto à la fin.
            </p>
          </div>

          {/* Waveform live */}
          {recording ? (
            <div className="px-5 py-3 border-b border-line">
              <p className="text-[11px] font-bold uppercase tracking-wider text-night-muted mb-2">
                Niveau audio
              </p>
              <canvas
                ref={canvasRef}
                width={300}
                height={60}
                className="w-full h-15 rounded-lg bg-night"
              />
            </div>
          ) : null}

          {/* Sliders volume */}
          <div className="px-5 py-4 space-y-4 flex-1">
            <div>
              <div className="flex items-center justify-between mb-2">
                <p className="text-[11px] font-bold uppercase tracking-wider text-night-muted">
                  Volume vidéo
                </p>
                <span className="text-[11px] font-bold text-night tabular-nums">
                  {Math.round(videoVolume * 100)}%
                </span>
              </div>
              <input
                type="range"
                min={0}
                max={1}
                step={0.05}
                value={videoVolume}
                onChange={(e) => setVideoVolume(Number(e.target.value))}
                className="w-full accent-gold-deep"
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-2">
                <p className="text-[11px] font-bold uppercase tracking-wider text-night-muted">
                  Volume voix off
                </p>
                <span className="text-[11px] font-bold text-night tabular-nums">
                  {Math.round(voiceoverVolume * 100)}%
                </span>
              </div>
              <input
                type="range"
                min={0}
                max={1}
                step={0.05}
                value={voiceoverVolume}
                onChange={(e) => setVoiceoverVolume(Number(e.target.value))}
                disabled={!voiceoverUrl}
                className="w-full accent-gold-deep disabled:opacity-40"
              />
              {!voiceoverUrl ? (
                <p className="mt-1 text-[11px] text-night-dim">
                  Enregistre d&apos;abord une voix off pour activer ce
                  contrôle.
                </p>
              ) : null}
            </div>

            <button
              type="button"
              onClick={() => {
                if (videoRef.current) {
                  videoRef.current.currentTime = 0;
                  void videoRef.current.play().catch(() => undefined);
                }
              }}
              className="w-full h-10 rounded-full border border-line text-night text-[13px] font-semibold flex items-center justify-center gap-2 hover:bg-bg-soft transition-colors"
            >
              <Play className="w-4 h-4" aria-hidden />
              Tester le mix
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
