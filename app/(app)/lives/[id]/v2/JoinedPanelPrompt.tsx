"use client";

/* Modal qui apparaît côté viewer quand sa demande de prise de parole
 * est ACCEPTÉE par le host. Permet de choisir d'activer ou non sa
 * caméra et son micro avant de publish dans LiveKit.
 *
 * Utilise localParticipant.setCameraEnabled / setMicrophoneEnabled
 * directement — le grant_publish a déjà été fait côté server. */

import { useRoomContext } from "@livekit/components-react";
import { Camera, CameraOff, Loader2, Mic, MicOff, Sparkles, X } from "lucide-react";
import { useEffect, useState, useTransition } from "react";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";
import { leavePanel } from "../../session-actions";

type Props = {
  sessionId: string;
  /* Si true → display le prompt initial avec choix cam/mic.
     Le user peut activer ses tracks ou refuser de monter. */
};

type StageStatus =
  | "idle"
  | "pending"
  | "approved"
  | "denied"
  | "cancelled"
  | "revoked";

export function JoinedPanelPrompt({ sessionId }: Props) {
  const room = useRoomContext();
  const [status, setStatus] = useState<StageStatus>("idle");
  const [shown, setShown] = useState(false);
  const [acceptedNotPublished, setAcceptedNotPublished] = useState(false);
  const [cameraOn, setCameraOn] = useState(true);
  const [micOn, setMicOn] = useState(true);
  const [isPending, startTransition] = useTransition();

  /* Polling stage status (4s). */
  useEffect(() => {
    let alive = true;
    async function refresh() {
      try {
        const supabase = createClient();
        /* eslint-disable-next-line @typescript-eslint/no-explicit-any */
        const { data } = await (supabase as any).rpc(
          "get_my_stage_request_status",
          { p_session_id: sessionId },
        );
        if (!alive) return;
        const s = (data as StageStatus | null) ?? "idle";
        setStatus(s);
      } catch {
        /* silencieux */
      }
    }
    void refresh();
    const id = window.setInterval(refresh, 4000);
    return () => {
      alive = false;
      window.clearInterval(id);
    };
  }, [sessionId]);

  /* Détecte la transition pending/idle → approved. */
  useEffect(() => {
    if (status === "approved" && !shown) {
      setAcceptedNotPublished(true);
      setShown(true);
    }
    if (status !== "approved") {
      /* Reset si revoked / denied. */
      setShown(false);
      setAcceptedNotPublished(false);
    }
  }, [status, shown]);

  async function handleJoin() {
    if (!room) {
      toast.error("Connexion au live perdue.");
      return;
    }
    startTransition(async () => {
      try {
        await room.localParticipant.setCameraEnabled(cameraOn);
        await room.localParticipant.setMicrophoneEnabled(micOn);
        setAcceptedNotPublished(false);
        toast.success(
          cameraOn || micOn
            ? "Tu es sur scène !"
            : "Tu es sur le panel (audio/vidéo coupés)",
        );
      } catch (err) {
        console.error("[JoinedPanelPrompt] publish failed", err);
        toast.error("Impossible d'activer la caméra/micro.");
      }
    });
  }

  function handleDecline() {
    startTransition(async () => {
      const res = await leavePanel({ sessionId });
      if (!res.ok) {
        toast.error(res.error);
        return;
      }
      setAcceptedNotPublished(false);
      toast("Tu as refusé de monter sur le panel.");
    });
  }

  if (!acceptedNotPublished) return null;

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-night/80 backdrop-blur-md p-4">
      <div className="w-full max-w-md rounded-3xl bg-night border-2 border-gold/40 text-cream p-5 shadow-[0_20px_80px_-10px_rgba(244,185,66,0.4)]">
        <header className="flex items-start gap-2 mb-3">
          <Sparkles
            className="w-5 h-5 text-gold shrink-0 mt-0.5"
            aria-hidden
            strokeWidth={2.4}
          />
          <div className="flex-1">
            <p className="text-[10px] font-extrabold uppercase tracking-[0.18em] text-gold-deep">
              Demande acceptée
            </p>
            <h2 className="text-[18px] font-display italic text-cream mt-0.5">
              Tu es invité·e sur le <em className="text-gold">live</em>
            </h2>
            <p className="text-[12.5px] text-cream/70 mt-2 leading-relaxed">
              Choisis comment tu apparais. Tu peux changer plus tard depuis
              les contrôles LiveKit.
            </p>
          </div>
          <button
            type="button"
            onClick={() => setAcceptedNotPublished(false)}
            aria-label="Plus tard"
            className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-cream/10 hover:bg-cream/20 text-cream/60"
          >
            <X className="w-3.5 h-3.5" aria-hidden />
          </button>
        </header>

        {/* Toggles cam / mic */}
        <div className="space-y-2 mb-5">
          <ToggleRow
            label="Caméra"
            description={cameraOn ? "Allumée — visible à tous" : "Coupée"}
            checked={cameraOn}
            onChange={setCameraOn}
            IconOn={Camera}
            IconOff={CameraOff}
          />
          <ToggleRow
            label="Micro"
            description={micOn ? "Activé — voix audible" : "Coupé"}
            checked={micOn}
            onChange={setMicOn}
            IconOn={Mic}
            IconOff={MicOff}
          />
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleDecline}
            disabled={isPending}
            className="flex-1 inline-flex items-center justify-center h-11 rounded-full bg-cream/10 text-cream/70 hover:bg-rose-500/20 hover:text-rose-200 text-[12px] font-bold transition-colors disabled:opacity-60"
          >
            Quitter le panel
          </button>
          <button
            type="button"
            onClick={handleJoin}
            disabled={isPending}
            className="flex-1 inline-flex items-center justify-center gap-1.5 h-11 rounded-full bg-gold text-night text-[12.5px] font-extrabold hover:bg-gold-soft transition-colors disabled:opacity-60 shadow-lg shadow-gold/30"
          >
            {isPending ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" aria-hidden />
            ) : (
              <Sparkles
                className="w-3.5 h-3.5"
                aria-hidden
                strokeWidth={2.6}
              />
            )}
            Monter sur scène
          </button>
        </div>

        <p className="mt-3 text-[10px] text-cream/40 text-center">
          Tu peux quitter le panel à tout moment depuis le bouton micro.
        </p>
      </div>
    </div>
  );
}

function ToggleRow({
  label,
  description,
  checked,
  onChange,
  IconOn,
  IconOff,
}: {
  label: string;
  description: string;
  checked: boolean;
  onChange: (v: boolean) => void;
  IconOn: typeof Camera;
  IconOff: typeof CameraOff;
}) {
  const Icon = checked ? IconOn : IconOff;
  return (
    <button
      type="button"
      onClick={() => onChange(!checked)}
      className={`w-full flex items-center gap-3 p-3 rounded-2xl border transition-colors text-left ${
        checked
          ? "bg-gold/15 border-gold/40 text-cream"
          : "bg-cream/5 border-cream/10 text-cream/70 hover:bg-cream/10"
      }`}
      aria-pressed={checked}
    >
      <span
        className={`inline-flex items-center justify-center w-10 h-10 rounded-full shrink-0 ${
          checked ? "bg-gold text-night" : "bg-cream/15 text-cream"
        }`}
      >
        <Icon className="w-4 h-4" aria-hidden strokeWidth={2.4} />
      </span>
      <div className="flex-1 min-w-0">
        <p className="text-[13px] font-extrabold">{label}</p>
        <p className="text-[11px] text-cream/60">{description}</p>
      </div>
      <span
        className={`inline-flex items-center w-11 h-6 rounded-full transition-colors shrink-0 ${
          checked ? "bg-gold" : "bg-cream/20"
        }`}
      >
        <span
          className={`w-5 h-5 rounded-full bg-cream transition-transform shadow ${
            checked ? "translate-x-5" : "translate-x-0.5"
          }`}
        />
      </span>
    </button>
  );
}
