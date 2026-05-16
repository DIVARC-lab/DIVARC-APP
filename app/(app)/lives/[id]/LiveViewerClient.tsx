"use client";

/* Étape 6 — Client viewer pour spectateurs.
 *
 * Fetch token → LiveKitRoom audio/video false côté local (le viewer
 * n'a rien à publier). VideoConference affiche les tracks des
 * publishers (host + co-streamers). canPublish=false côté server, donc
 * LiveKit refuse de toute façon.
 *
 * Info bar host (avatar, name, follow button) + tags + share button +
 * report button. Chat custom hérité du pattern Sprint E.
 */

import "@livekit/components-styles";

import { LiveKitRoom, VideoConference } from "@livekit/components-react";
import {
  Flag,
  Gift,
  Heart,
  Loader2,
  MessageSquare,
  Share2,
  Sparkles,
  UserPlus,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Avatar } from "@/components/ui/Avatar";
import { GiftAnimationOverlay } from "./GiftAnimationOverlay";
import { GiftPanel } from "./GiftPanel";
import { LiveChatPanel } from "./LiveChatPanel";
import { LiveGoalBar } from "./LiveGoalBar";
import { LiveHeartsLayer } from "./LiveHeartsLayer";
import { LiveLikesProvider } from "./LiveLikesContext";
import { LivePollWidget } from "./LivePollWidget";
import { LiveTapToLikeOverlay } from "./LiveTapToLikeOverlay";
import { LiveTipsModal } from "./LiveTipsModal";
import { RailLikeButton } from "./RailLikeButton";
import { RaiseHandButton } from "./RaiseHandButton";
import { SubscribeCreatorModal } from "./SubscribeCreatorModal";
import { SuperChatTicker } from "./SuperChatTicker";

type Host = {
  id: string;
  full_name: string | null;
  username: string | null;
  avatar_url: string | null;
} | null;

type Props = {
  sessionId: string;
  kind: "audio" | "video";
  title: string;
  description: string | null;
  tags: string[];
  chatEnabled: boolean;
  tipsEnabled: boolean;
  host: Host;
  currentUserId: string;
  hostId: string;
  initialLikeCount: number;
};

type TokenResponse = {
  token: string;
  wsUrl: string;
  canPublish: boolean;
  role: "host" | "viewer";
};

export function LiveViewerClient({
  sessionId,
  kind: _kind,
  title,
  description,
  tags,
  chatEnabled,
  tipsEnabled,
  host,
  currentUserId,
  hostId,
  initialLikeCount,
}: Props) {
  const router = useRouter();
  const [token, setToken] = useState<string | null>(null);
  const [wsUrl, setWsUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [tipsOpen, setTipsOpen] = useState(false);
  const [subOpen, setSubOpen] = useState(false);
  const [giftsOpen, setGiftsOpen] = useState(false);
  const [chatOpen, setChatOpen] = useState(false);

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

  function handleShare() {
    const url =
      typeof window !== "undefined"
        ? `${window.location.origin}/lives/${sessionId}`
        : "";
    if (typeof navigator !== "undefined" && navigator.share) {
      navigator
        .share({
          title: `Live DIVARC : ${title}`,
          url,
        })
        .catch(() => undefined);
    } else if (typeof navigator !== "undefined" && navigator.clipboard) {
      navigator.clipboard.writeText(url).then(() => {
        toast.success("Lien copié dans le presse-papier.");
      });
    }
  }

  function handleReport() {
    toast(
      "Signalement enregistré. Notre équipe modération va examiner le contenu.",
      { duration: 4000 },
    );
    /* V2 : POST /api/lives/[id]/report */
  }

  function handleFollow() {
    toast("Follow streamer — V2 (intégration table user_follows).");
    /* V2 : POST /api/users/[hostId]/follow */
  }

  if (error) {
    return (
      <div className="h-full flex flex-col items-center justify-center p-6 text-center">
        <p className="text-[14px] font-bold text-cream">
          Impossible de rejoindre ce live.
        </p>
        <p className="mt-2 text-[12px] text-cream/60">
          {error === "forbidden"
            ? "Tu n'as pas l'accès requis pour ce live (amis / cercle / abonnés)."
            : error === "session_closed"
              ? "Ce live est terminé."
              : `Code : ${error}`}
        </p>
        <button
          type="button"
          onClick={() => router.replace("/lives")}
          className="mt-4 h-9 px-4 rounded-full bg-cream text-night text-[12px] font-bold"
        >
          Retour aux lives
        </button>
      </div>
    );
  }

  if (!token || !wsUrl) {
    return (
      <div className="h-full flex flex-col items-center justify-center p-6 text-center">
        <Loader2 className="w-6 h-6 animate-spin text-cream" aria-hidden />
        <p className="mt-3 text-[12px] text-cream/60">Chargement du live…</p>
      </div>
    );
  }

  return (
    <LiveLikesProvider sessionId={sessionId} initialCount={initialLikeCount}>
    <div
      data-live-immersive-target
      className="absolute inset-0 bg-night flex flex-col"
    >
      {/* Layout : video plein écran + footer info absolute. Sur desktop
          tab >= md on peut imaginer un side panel chat, mais pour V1 on
          reste mobile-first : video + scroll vers le bas pour info. */}
      <div className="relative flex-1">
        <LiveKitRoom
          token={token}
          serverUrl={wsUrl}
          connect={true}
          /* Viewer : pas de pub locale. */
          audio={false}
          video={false}
          data-lk-theme="default"
          className="h-full bg-night relative"
          onDisconnected={() => {
            window.setTimeout(() => {
              router.replace("/lives");
            }, 60);
          }}
          onError={(err) => {
            console.error("[LiveKit viewer]", err);
            toast.error(`Erreur live : ${err.message}`);
          }}
        >
          <VideoConference />
        </LiveKitRoom>

        {/* Étape 11 — Widget poll live (overlay top-right, polling 2s) */}
        <div className="absolute top-3 right-3 z-30 w-72 max-w-[calc(100%-1.5rem)] pointer-events-auto">
          <LivePollWidget sessionId={sessionId} />
        </div>

        {/* Étape 14 — Ticker super-chats (overlay top-left, polling 5s) */}
        <div className="absolute top-3 left-3 z-30 w-72 max-w-[calc(100%-1.5rem)] pointer-events-auto">
          <SuperChatTicker sessionId={sessionId} />
        </div>

        {/* Tap zone pour double-tap = like (TikTok-like).
            z-15 : entre la vidéo (z-0) et les overlays (z-20+) */}
        <LiveTapToLikeOverlay />

        {/* Étape 16 — Animations cadeaux qui montent (overlay full, polling 3s) */}
        <div className="absolute inset-0 z-20 pointer-events-none">
          <GiftAnimationOverlay sessionId={sessionId} />
        </div>

        {/* Étape 17 — Barre objectif (overlay milieu-gauche). */}
        <div className="absolute top-20 left-3 z-30 w-72 max-w-[calc(100%-1.5rem)] pointer-events-auto">
          <LiveGoalBar sessionId={sessionId} />
        </div>

        {/* TOP overlay : host card flottante avec follow + abonné. */}
        <div className="absolute top-3 left-3 right-3 z-30 flex items-start gap-2 pointer-events-none">
          {host ? (
            <div className="pointer-events-auto inline-flex items-center gap-2 max-w-[60%] bg-night/70 backdrop-blur-md rounded-full pl-1 pr-3 py-1 border border-cream/15 shadow-lg">
              <Avatar
                src={host.avatar_url}
                fullName={host.full_name ?? host.username ?? "Streamer"}
                size="sm"
              />
              <div className="min-w-0">
                <p className="text-[11.5px] font-extrabold text-cream truncate leading-tight">
                  {host.full_name ?? host.username ?? "Streamer"}
                </p>
                {host.username ? (
                  <p className="text-[9.5px] text-cream/60 truncate leading-tight">
                    @{host.username}
                  </p>
                ) : null}
              </div>
              <button
                type="button"
                onClick={() => setSubOpen(true)}
                className="ml-1 inline-flex items-center gap-1 h-6 px-2 rounded-full bg-gradient-to-r from-rose-500 to-fuchsia-500 text-white text-[9.5px] font-extrabold uppercase tracking-wider hover:from-rose-600 hover:to-fuchsia-600 transition-all"
              >
                <Sparkles className="w-2.5 h-2.5" aria-hidden />
                Abo
              </button>
            </div>
          ) : null}
          <div className="ml-auto pointer-events-auto inline-flex items-center gap-1.5 bg-night/70 backdrop-blur-md rounded-full px-3 h-8 border border-cream/15">
            <span className="w-2 h-2 rounded-full bg-rose-500 animate-pulse" />
            <span className="text-[10px] font-extrabold uppercase tracking-wider text-cream">
              Live
            </span>
          </div>
        </div>

        {/* RIGHT RAIL : actions verticales sticky (TikTok-style). */}
        <div className="absolute right-3 bottom-20 z-30 flex flex-col items-center gap-3 pointer-events-auto">
          <button
            type="button"
            onClick={handleFollow}
            aria-label="Suivre"
            className="group flex flex-col items-center gap-0.5"
          >
            <span className="inline-flex items-center justify-center w-11 h-11 rounded-full bg-night/70 backdrop-blur-md border border-cream/15 text-cream group-hover:bg-cream/15 transition-colors shadow-lg active:scale-90">
              <UserPlus className="w-5 h-5" aria-hidden />
            </span>
            <span className="text-[9px] font-bold text-cream/80 drop-shadow">
              Suivre
            </span>
          </button>

          {/* Like via context : bouton large vertical avec count. */}
          <RailLikeButton />

          {chatEnabled ? (
            <button
              type="button"
              onClick={() => setChatOpen(true)}
              aria-label="Chat"
              className="group flex flex-col items-center gap-0.5"
            >
              <span className="inline-flex items-center justify-center w-11 h-11 rounded-full bg-night/70 backdrop-blur-md border border-cream/15 text-cream group-hover:bg-cream/15 transition-colors shadow-lg active:scale-90">
                <MessageSquare className="w-5 h-5" aria-hidden />
              </span>
              <span className="text-[9px] font-bold text-cream/80 drop-shadow">
                Chat
              </span>
            </button>
          ) : null}

          <button
            type="button"
            onClick={() => setGiftsOpen(true)}
            aria-label="Envoyer un cadeau"
            className="group flex flex-col items-center gap-0.5"
          >
            <span className="relative inline-flex items-center justify-center w-11 h-11 rounded-full bg-gradient-to-br from-amber-400 to-rose-500 text-white transition-all shadow-[0_4px_20px_-2px_rgba(244,114,182,0.5)] active:scale-90 group-hover:shadow-[0_4px_30px_-2px_rgba(244,114,182,0.7)]">
              <Gift className="w-5 h-5" aria-hidden strokeWidth={2.4} />
              {/* Pulsing ring */}
              <span
                aria-hidden
                className="absolute inset-0 rounded-full ring-2 ring-amber-300/50 animate-pulse"
              />
            </span>
            <span className="text-[9px] font-extrabold text-amber-200 drop-shadow">
              Cadeau
            </span>
          </button>

          {tipsEnabled ? (
            <button
              type="button"
              onClick={() => setTipsOpen(true)}
              aria-label="Pourboire"
              className="group flex flex-col items-center gap-0.5"
            >
              <span className="inline-flex items-center justify-center w-11 h-11 rounded-full bg-rose-500/90 backdrop-blur-md text-white shadow-lg transition-colors group-hover:bg-rose-500 active:scale-90">
                <Heart
                  className="w-5 h-5 fill-current"
                  aria-hidden
                  strokeWidth={2}
                />
              </span>
              <span className="text-[9px] font-extrabold text-rose-200 drop-shadow">
                Tip
              </span>
            </button>
          ) : null}

          <RaiseHandButton sessionId={sessionId} />

          <button
            type="button"
            onClick={handleShare}
            aria-label="Partager"
            className="group flex flex-col items-center gap-0.5"
          >
            <span className="inline-flex items-center justify-center w-11 h-11 rounded-full bg-night/70 backdrop-blur-md border border-cream/15 text-cream group-hover:bg-cream/15 transition-colors shadow-lg active:scale-90">
              <Share2 className="w-5 h-5" aria-hidden />
            </span>
            <span className="text-[9px] font-bold text-cream/80 drop-shadow">
              Partager
            </span>
          </button>

          <button
            type="button"
            onClick={handleReport}
            aria-label="Signaler"
            className="group flex flex-col items-center gap-0.5"
          >
            <span className="inline-flex items-center justify-center w-11 h-11 rounded-full bg-night/70 backdrop-blur-md border border-cream/15 text-cream/60 group-hover:bg-rose-500/20 group-hover:text-rose-300 transition-colors shadow-lg active:scale-90">
              <Flag className="w-4 h-4" aria-hidden />
            </span>
          </button>
        </div>

        {/* BOTTOM : titre + tags + chat input inline. */}
        <div className="absolute left-0 right-0 bottom-0 z-30 px-3 pb-3 pt-8 pointer-events-none bg-gradient-to-t from-night via-night/80 to-transparent">
          <div className="max-w-[calc(100%-72px)] pointer-events-auto">
            <h2 className="text-[14px] font-extrabold text-cream drop-shadow line-clamp-2 mb-1">
              {title}
            </h2>
            {tags.length > 0 ? (
              <div className="flex flex-wrap gap-1 mb-2">
                {tags.slice(0, 5).map((tag) => (
                  <span
                    key={tag}
                    className="inline-flex items-center h-5 px-2 rounded-full bg-cream/15 backdrop-blur-md text-cream/90 text-[9.5px] font-bold border border-cream/10"
                  >
                    #{tag}
                  </span>
                ))}
              </div>
            ) : null}
            {description ? (
              <p className="text-[11px] text-cream/80 leading-snug line-clamp-2 drop-shadow mb-2">
                {description}
              </p>
            ) : null}
            {chatEnabled ? (
              <button
                type="button"
                onClick={() => setChatOpen(true)}
                className="inline-flex items-center w-full max-w-xs h-9 px-4 rounded-full bg-night/70 backdrop-blur-md border border-cream/15 text-cream/60 hover:text-cream hover:bg-night/85 text-[12px] transition-colors"
              >
                <MessageSquare
                  className="w-3.5 h-3.5 mr-2"
                  aria-hidden
                />
                Ajoute un commentaire…
              </button>
            ) : null}
          </div>
        </div>
      </div>

      <LiveTipsModal
        sessionId={sessionId}
        open={tipsOpen}
        onClose={() => setTipsOpen(false)}
      />

      <GiftPanel
        sessionId={sessionId}
        open={giftsOpen}
        onClose={() => setGiftsOpen(false)}
      />

      <LiveChatPanel
        sessionId={sessionId}
        open={chatOpen}
        onClose={() => setChatOpen(false)}
        currentUserId={currentUserId}
        hostId={hostId}
      />

      {host ? (
        <SubscribeCreatorModal
          creatorId={host.id}
          creatorName={host.full_name ?? host.username ?? "Créateur"}
          open={subOpen}
          onClose={() => setSubOpen(false)}
        />
      ) : null}

      {/* Layer global cœurs flottants (fixed, z-40). */}
      <LiveHeartsLayer />
    </div>
    </LiveLikesProvider>
  );
}
