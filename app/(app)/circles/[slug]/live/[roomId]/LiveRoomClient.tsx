"use client";

/* Sprint E (LiveKit) — Salle Live avec VideoConference (composant tout-en-un)
 * + overlays personnalisés : Plein écran, Admin Panel.
 *
 * Pourquoi VideoConference plutôt qu'un assemblage custom :
 * - Plus robuste (auto-publish tracks, layouts adaptatifs, gestion errors)
 * - C'est cette version qui marchait dans les tests utilisateur
 * - L'AdminPanel + le bouton Fullscreen sont rendus en absolute overlay
 *   par-dessus, sans toucher au composant tout-en-un.
 *
 * Limitation connue V1 : labels ControlBar en anglais (mic/cam/share/leave).
 * Traduction FR = approche CSS override ou wrapper custom, à faire dans
 * un commit dédié (sans risquer de casser la salle qui marche). */

import "@livekit/components-styles";

import {
  LiveKitRoom,
  PreJoin,
  VideoConference,
  type LocalUserChoices,
} from "@livekit/components-react";
import {
  Loader2,
  Maximize2,
  MessageSquare,
  Minimize2,
  Shield,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { LiveAdminPanel } from "./LiveAdminPanel";
import { LiveCustomChat } from "./LiveCustomChat";

type Props = {
  roomId: string;
  roomTitle: string;
  roomKind: "audio" | "video";
  circleSlug: string;
  isModerator: boolean;
};

type TokenResponse = { token: string; wsUrl: string };

export function LiveRoomClient({
  roomId,
  roomKind,
  circleSlug,
  isModerator,
}: Props) {
  const router = useRouter();
  const [token, setToken] = useState<string | null>(null);
  const [wsUrl, setWsUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [choices, setChoices] = useState<LocalUserChoices | null>(null);
  const [adminOpen, setAdminOpen] = useState(false);
  const [chatOpen, setChatOpen] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [immersive, setImmersive] = useState(false);

  /* Fullscreen API natif (cache barre URL mobile + status bar).
     Listener pour sync l'état si l'user fait Échap. */
  useEffect(() => {
    function onChange() {
      const fs = Boolean(document.fullscreenElement);
      setIsFullscreen(fs);
      /* Synchronise le mode immersif CSS avec le vrai fullscreen :
         si l'user fait Échap pour quitter, on retire l'immersif. */
      if (!fs) setImmersive(false);
    }
    document.addEventListener("fullscreenchange", onChange);
    return () =>
      document.removeEventListener("fullscreenchange", onChange);
  }, []);

  /* Mode immersif = combine 2 effets pour vraiment couvrir l'écran :
     1. CSS fixed inset-0 z-[200] sur le wrapper LiveKitRoom →
        couvre tout le reste de l'app DIVARC (header, nav, etc.).
     2. requestFullscreen() natif quand dispo → cache aussi la barre
        URL du browser et la status bar (Android Chrome, desktop).
     iOS Safari : seul l'effet CSS s'applique (requestFullscreen
     non supporté sur les elements génériques), mais la barre URL
     se cache déjà au scroll. */
  async function toggleImmersive() {
    const wantImmersive = !immersive;
    setImmersive(wantImmersive);
    try {
      if (wantImmersive && !document.fullscreenElement) {
        await document.documentElement.requestFullscreen();
      } else if (!wantImmersive && document.fullscreenElement) {
        await document.exitFullscreen();
      }
    } catch (err) {
      /* Pas d'erreur visible : l'effet CSS suffit pour 95 % de l'UX. */
      console.warn("[fullscreen API]", err);
    }
  }

  /* Sprint Live UX — Toggle classe body pour activer le mode immersif
     via CSS (globals.css). On NE change PAS la className du wrapper
     interne (sinon LiveKit casse ses refs DOM imperative → erreur
     "insertBefore failed" en activant la cam ou en quittant). */
  useEffect(() => {
    if (immersive) {
      document.body.classList.add("divarc-live-immersive");
    } else {
      document.body.classList.remove("divarc-live-immersive");
    }
    return () => {
      document.body.classList.remove("divarc-live-immersive");
    };
  }, [immersive]);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const res = await fetch(`/api/circles/live/${roomId}/token`);
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
  }, [roomId]);

  if (error) {
    return (
      <div className="h-full flex flex-col items-center justify-center p-6 text-center">
        <p className="text-[14px] font-bold text-cream">
          Impossible de rejoindre cette salle.
        </p>
        <p className="mt-2 text-[12px] text-cream/60">Code : {error}</p>
        <button
          type="button"
          onClick={() => router.replace(`/circles/${circleSlug}/live`)}
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
          Préparation de la salle…
        </p>
      </div>
    );
  }

  if (!choices) {
    return (
      <div className="h-full flex items-center justify-center p-4 bg-night">
        <div
          className="w-full max-w-2xl rounded-3xl bg-cream/5 border border-cream/10 p-5"
          data-lk-theme="default"
        >
          <h2 className="text-[14px] font-bold text-cream mb-1 text-center">
            Prêt à rejoindre la salle ?
          </h2>
          <p className="text-[11.5px] text-cream/60 text-center mb-4">
            Vérifie ton micro{roomKind === "video" ? " et ta caméra" : ""} avant
            de te connecter.
          </p>
          <PreJoin
            defaults={{
              videoEnabled: roomKind === "video",
              audioEnabled: true,
            }}
            onSubmit={(values) => setChoices(values)}
            onError={(err) => {
              console.error("[PreJoin]", err);
              toast.error(
                "Impossible d'accéder au micro ou à la caméra. Vérifie les permissions du navigateur.",
              );
            }}
          />
        </div>
      </div>
    );
  }

  return (
    /* Sprint Live — Wrapper STABLE (className inchangée). Le mode
       immersif est appliqué via body.divarc-live-immersive +
       [data-live-immersive-target] dans globals.css. Le CSS pour
       cacher le chat natif est aussi dans globals.css.
       NE PAS changer la className conditionnellement ici, sinon
       LiveKit casse ses refs DOM imperatives (cam toggle → erreur
       insertBefore). */
    <div
      data-live-immersive-target
      className="absolute inset-0 bg-night"
    >
      <LiveKitRoom
        token={token}
        serverUrl={wsUrl}
        connect={true}
        audio={choices.audioEnabled}
        video={roomKind === "video" ? choices.videoEnabled : false}
        data-lk-theme="default"
        className="h-full bg-night relative"
        onDisconnected={() => {
          /* Defer la navigation au tick suivant pour laisser LiveKit
             finir de détacher ses <video>/<audio> imperativement avant
             que React démonte l'arbre. Sinon "insertBefore failed". */
          toast("Tu as quitté la salle.");
          window.setTimeout(() => {
            router.replace(`/circles/${circleSlug}/live`);
          }, 50);
        }}
        onError={(err) => {
          console.error("[LiveKit]", err);
          toast.error(`Erreur live : ${err.message}`);
        }}
      >
        <VideoConference chatMessageFormatter={undefined} />

        {/* Overlay top-right : Plein écran + Chat + Modération */}
        <div className="absolute top-3 right-3 z-30 flex items-center gap-2">
          <button
            type="button"
            onClick={toggleImmersive}
            aria-label={immersive ? "Quitter le plein écran" : "Plein écran"}
            title={immersive ? "Quitter le plein écran" : "Plein écran"}
            className="inline-flex items-center justify-center w-9 h-9 rounded-full bg-night/80 text-cream border border-cream/20 backdrop-blur hover:bg-night transition-colors"
          >
            {immersive ? (
              <Minimize2 className="w-4 h-4" aria-hidden />
            ) : (
              <Maximize2 className="w-4 h-4" aria-hidden />
            )}
          </button>
          <button
            type="button"
            onClick={() => setChatOpen((v) => !v)}
            aria-label="Chat"
            title="Chat"
            className={`inline-flex items-center justify-center w-9 h-9 rounded-full border border-cream/20 backdrop-blur transition-colors ${
              chatOpen
                ? "bg-cream text-night"
                : "bg-night/80 text-cream hover:bg-night"
            }`}
          >
            <MessageSquare className="w-4 h-4" aria-hidden />
          </button>
          {isModerator ? (
            <button
              type="button"
              onClick={() => setAdminOpen((v) => !v)}
              className="inline-flex items-center gap-1.5 h-9 px-3 rounded-full bg-night/80 text-cream border border-cream/20 backdrop-blur hover:bg-night transition-colors text-[11px] font-bold"
            >
              <Shield className="w-3.5 h-3.5" aria-hidden />
              {adminOpen ? "Fermer" : "Modération"}
            </button>
          ) : null}
        </div>

        {adminOpen && isModerator ? (
          <LiveAdminPanel
            roomId={roomId}
            onClose={() => setAdminOpen(false)}
          />
        ) : null}

        <LiveCustomChat
          open={chatOpen}
          onClose={() => setChatOpen(false)}
        />
      </LiveKitRoom>
    </div>
  );
}
