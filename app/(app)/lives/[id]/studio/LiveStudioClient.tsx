"use client";

/* Étape 5 — Client Studio broadcaster pour le host.
 *
 * Flow :
 *  1. Fetch /api/lives/[id]/token (host → canPublish=true)
 *  2. PreJoin LiveKit pour preview cam/mic avant connexion
 *  3. Si session pas encore "live" : bouton "Démarrer le live" qui call
 *     startLiveStreamSession() puis connecte LiveKitRoom
 *  4. Une fois connecté : VideoConference + bouton "Terminer" qui call
 *     endLiveStreamSession + disconnect
 *
 * Réutilise VideoConference de @livekit/components-react pour rester
 * stable (cf. erreurs précédentes avec custom layout).
 */

import "@livekit/components-styles";

import {
  LiveKitRoom,
  PreJoin,
  VideoConference,
  type LocalUserChoices,
} from "@livekit/components-react";
import { Loader2, Radio, Square, Vote } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState, useTransition } from "react";
import { toast } from "sonner";
import {
  endLiveStreamSession,
  startLiveStreamSession,
} from "../../actions";
import { GiftAnimationOverlay } from "../GiftAnimationOverlay";
import { SuperChatTicker } from "../SuperChatTicker";
import { CreatePollModal } from "./CreatePollModal";

type Props = {
  sessionId: string;
  kind: "audio" | "video";
  title: string;
  currentStatus: "scheduled" | "live" | "ended" | "cancelled";
};

type TokenResponse = {
  token: string;
  wsUrl: string;
  canPublish: boolean;
  role: "host" | "viewer";
};

export function LiveStudioClient({
  sessionId,
  kind,
  currentStatus,
}: Props) {
  const router = useRouter();
  const [token, setToken] = useState<string | null>(null);
  const [wsUrl, setWsUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [choices, setChoices] = useState<LocalUserChoices | null>(null);
  const [status, setStatus] = useState(currentStatus);
  const [pollModalOpen, setPollModalOpen] = useState(false);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const res = await fetch(`/api/lives/${sessionId}/token`);
        if (!res.ok) {
          const data = (await res.json().catch(() => ({}))) as {
            error?: string;
          };
          if (alive) setError(data.error ?? "token_failed");
          return;
        }
        const data = (await res.json()) as TokenResponse;
        if (alive) {
          setToken(data.token);
          setWsUrl(data.wsUrl);
        }
      } catch {
        if (alive) setError("network_error");
      }
    })();
    return () => {
      alive = false;
    };
  }, [sessionId]);

  function handleStartLive() {
    startTransition(async () => {
      const res = await startLiveStreamSession({ sessionId });
      if (!res.ok) {
        toast.error(res.error);
        return;
      }
      setStatus("live");
      toast.success("Tu es en direct !");
    });
  }

  function handleEndLive() {
    if (!confirm("Terminer le live maintenant ?")) return;
    startTransition(async () => {
      const res = await endLiveStreamSession({ sessionId });
      if (!res.ok) {
        toast.error(res.error);
        return;
      }
      toast.success("Live terminé. Replay disponible bientôt.");
      window.setTimeout(() => {
        router.replace("/lives");
      }, 60);
    });
  }

  /* États dégradés. */
  if (error) {
    return (
      <div className="h-full flex flex-col items-center justify-center p-6 text-center">
        <p className="text-[14px] font-bold text-cream">
          Impossible d&apos;initialiser le studio.
        </p>
        <p className="mt-2 text-[12px] text-cream/60">Code : {error}</p>
        <button
          type="button"
          onClick={() => router.replace("/lives")}
          className="mt-4 h-9 px-4 rounded-full bg-cream text-night text-[12px] font-bold"
        >
          Retour
        </button>
      </div>
    );
  }

  if (!token || !wsUrl) {
    return (
      <div className="h-full flex flex-col items-center justify-center p-6 text-center">
        <Loader2 className="w-6 h-6 animate-spin text-cream" aria-hidden />
        <p className="mt-3 text-[12px] text-cream/60">
          Préparation du studio…
        </p>
      </div>
    );
  }

  /* PreJoin → choix mic/cam + preview. */
  if (!choices) {
    return (
      <div className="h-full flex items-center justify-center p-4 bg-night">
        <div
          className="w-full max-w-2xl rounded-3xl bg-cream/5 border border-cream/10 p-5"
          data-lk-theme="default"
        >
          <p className="text-[10px] font-extrabold uppercase tracking-[0.18em] text-gold mb-1.5">
            · STUDIO
          </p>
          <h2 className="text-[16px] font-bold text-cream mb-1">
            Prêt à briefer ton matériel ?
          </h2>
          <p className="text-[11.5px] text-cream/60 mb-4 leading-relaxed">
            Choisis ton micro{kind === "video" ? " et ta caméra" : ""} et
            vérifie le rendu avant de te lancer en direct.
          </p>
          <PreJoin
            defaults={{
              videoEnabled: kind === "video",
              audioEnabled: true,
            }}
            onSubmit={(values) => setChoices(values)}
            onError={(err) => {
              console.error("[PreJoin]", err);
              toast.error(
                "Accès micro/caméra refusé. Vérifie les permissions du navigateur.",
              );
            }}
          />
        </div>
      </div>
    );
  }

  /* Connecté au LiveKit room. Overlay de contrôle au-dessus. */
  return (
    <div
      data-live-immersive-target
      className="absolute inset-0 bg-night"
    >
      <LiveKitRoom
        token={token}
        serverUrl={wsUrl}
        connect={true}
        audio={choices.audioEnabled}
        video={kind === "video" ? choices.videoEnabled : false}
        data-lk-theme="default"
        className="h-full bg-night relative"
        onDisconnected={() => {
          /* defer pour laisser LiveKit cleanup les <video>/<audio>. */
          window.setTimeout(() => {
            router.replace("/lives");
          }, 60);
        }}
        onError={(err) => {
          console.error("[LiveKit]", err);
          toast.error(`Erreur studio : ${err.message}`);
        }}
      >
        <VideoConference />

        {/* Étape 14 — Ticker super-chats (overlay top-left, polling 5s) */}
        <div className="absolute top-3 left-3 z-30 w-72 max-w-[calc(100%-1.5rem)] pointer-events-auto">
          <SuperChatTicker sessionId={sessionId} />
        </div>

        {/* Étape 16 — Animations cadeaux (host voit aussi le flux entrant) */}
        <div className="absolute inset-0 z-20 pointer-events-none">
          <GiftAnimationOverlay sessionId={sessionId} />
        </div>

        {/* Overlay top-right : Nouveau sondage (si live) + Démarrer/Terminer */}
        <div className="absolute top-3 right-3 z-30 flex items-center gap-2">
          {status === "live" ? (
            <button
              type="button"
              onClick={() => setPollModalOpen(true)}
              className="inline-flex items-center gap-1.5 h-9 px-3.5 rounded-full bg-gold text-night text-[11px] font-bold hover:bg-gold/90 transition-colors"
            >
              <Vote className="w-3.5 h-3.5" aria-hidden />
              Sondage
            </button>
          ) : null}
          {status === "live" ? (
            <button
              type="button"
              onClick={handleEndLive}
              disabled={isPending}
              className="inline-flex items-center gap-1.5 h-9 px-3.5 rounded-full bg-night/80 text-rose-300 border border-rose-300/30 backdrop-blur text-[11px] font-bold hover:bg-night transition-colors"
            >
              {isPending ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Square className="w-3.5 h-3.5" aria-hidden />
              )}
              Terminer
            </button>
          ) : (
            <button
              type="button"
              onClick={handleStartLive}
              disabled={isPending}
              className="inline-flex items-center gap-1.5 h-9 px-3.5 rounded-full bg-rose-600 text-white text-[11px] font-bold hover:bg-rose-700 transition-colors disabled:opacity-60"
            >
              {isPending ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Radio className="w-3.5 h-3.5" aria-hidden />
              )}
              Démarrer le live
            </button>
          )}
        </div>
      </LiveKitRoom>

      {/* Modal création poll (host only, rendu en portal effectif via fixed) */}
      <CreatePollModal
        sessionId={sessionId}
        open={pollModalOpen}
        onClose={() => setPollModalOpen(false)}
      />
    </div>
  );
}
