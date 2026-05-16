"use client";

/* Étape 31/60 — Studio host V2 (refondu TikTok).
 *
 * Compose :
 *   LiveTopBar (avec viewers count + close)
 *   LiveCanvas (host pleine vidéo si solo, panel multi-tile sinon)
 *   HostNotificationsArea (cards guest request en haut)
 *   LiveStatsHostOverlay (stats compact en top-right)
 *   TopGiftersPanel
 *   CommentsStream (host voit le chat)
 *   GiftCinematicOverlay (animations gifts reçus)
 *   FloatingLikesLayer
 *   LiveDurationBadge (chrono + REC) — V1 réutilisé
 *   Bouton Démarrer / Terminer le live */

import "@livekit/components-styles";
import {
  LiveKitRoom,
  PreJoin,
  type LocalUserChoices,
} from "@livekit/components-react";
import {
  Hand,
  Loader2,
  MessageSquare,
  Radio,
  Square,
  Target,
  Vote,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState, useTransition } from "react";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";
import {
  endLiveStreamSession,
  startLiveStreamSession,
} from "../../actions";
import { LiveLikesProvider } from "../LiveLikesContext";
import { LiveChatPanel } from "../LiveChatPanel";
import { LiveDurationBadge } from "../studio/LiveDurationBadge";
import { CreateGoalModal } from "../studio/CreateGoalModal";
import { CreatePollModal } from "../studio/CreatePollModal";
import { StageRequestsPanel } from "../studio/StageRequestsPanel";
import { CommentsStream } from "./CommentsStream";
import { FloatingLikesLayer } from "./FloatingLikesLayer";
import { GiftCinematicOverlay } from "./GiftCinematicOverlay";
import { HostNotificationsArea } from "./HostNotificationsArea";
import { LiveCanvas } from "./LiveCanvas";
import { LiveStatsHostOverlay } from "./LiveStatsHostOverlay";
import { LiveTopBar } from "./LiveTopBar";
import { TopGiftersPanel } from "./TopGiftersPanel";

type Host = {
  id: string;
  full_name: string | null;
  username: string | null;
  avatar_url: string | null;
};

type PanelGuest = {
  user_id: string;
  username: string | null;
  avatar_url: string | null;
  position: number;
  is_muted: boolean;
  is_video_off: boolean;
  gifts_received_during_session: number;
};

type Props = {
  sessionId: string;
  kind: "audio" | "video";
  title: string;
  host: Host;
  currentStatus: "scheduled" | "live" | "ended" | "cancelled";
  startedAt: string | null;
  isRecording: boolean;
  initialViewers: number;
  initialLikeCount: number;
  initialPeak: number;
  initialCoins: number;
  initialNewFollowers: number;
  layout:
    | "solo"
    | "panel_2"
    | "panel_4"
    | "panel_6"
    | "panel_8"
    | "audio_only";
  initialGuests: PanelGuest[];
};

type TokenResponse = {
  token: string;
  wsUrl: string;
  canPublish: boolean;
};

export function LiveStudioV2({
  sessionId,
  kind,
  title,
  host,
  currentStatus,
  startedAt: initialStartedAt,
  isRecording,
  initialViewers,
  initialLikeCount,
  initialPeak,
  initialCoins,
  initialNewFollowers,
  layout: initialLayout,
  initialGuests,
}: Props) {
  const router = useRouter();
  const [token, setToken] = useState<string | null>(null);
  const [wsUrl, setWsUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [choices, setChoices] = useState<LocalUserChoices | null>(null);
  const [status, setStatus] = useState(currentStatus);
  const [startedAt, setStartedAt] = useState<string | null>(initialStartedAt);
  const [layout, setLayout] = useState(initialLayout);
  const [guests, setGuests] = useState<PanelGuest[]>(initialGuests);
  const [viewersCount, setViewersCount] = useState(initialViewers);
  const [isPending, startTransition] = useTransition();
  const [pollOpen, setPollOpen] = useState(false);
  const [goalOpen, setGoalOpen] = useState(false);
  const [chatOpen, setChatOpen] = useState(false);
  const [stageOpen, setStageOpen] = useState(false);
  const [pendingRequestsCount, setPendingRequestsCount] = useState(0);

  /* Fetch token. */
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

  /* Realtime sync layout + viewers + guests. */
  useEffect(() => {
    const supabase = createClient();
    const channel = supabase
      .channel(`live-studio-${sessionId}`)
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "circle_live_rooms",
          filter: `id=eq.${sessionId}`,
        },
        (payload) => {
          /* eslint-disable-next-line @typescript-eslint/no-explicit-any */
          const r = payload.new as any;
          if (typeof r?.layout === "string") setLayout(r.layout);
          if (typeof r?.viewers_current === "number") {
            setViewersCount(r.viewers_current);
          } else if (typeof r?.participants_count === "number") {
            setViewersCount(r.participants_count);
          }
        },
      )
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "live_panel_participants",
          filter: `session_id=eq.${sessionId}`,
        },
        () => refreshGuests(supabase),
      )
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "live_panel_participants",
          filter: `session_id=eq.${sessionId}`,
        },
        () => refreshGuests(supabase),
      )
      .subscribe();

    async function refreshGuests(supabase: ReturnType<typeof createClient>) {
      /* eslint-disable-next-line @typescript-eslint/no-explicit-any */
      const { data } = await (supabase as any)
        .from("live_panel_participants")
        .select(
          "user_id, username, avatar_url, position, is_muted, is_video_off, gifts_received_during_session",
        )
        .eq("session_id", sessionId)
        .is("left_panel_at", null)
        .order("position", { ascending: true });
      setGuests((data ?? []) as PanelGuest[]);
    }

    return () => {
      void supabase.removeChannel(channel);
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
      setStartedAt(new Date().toISOString());
      const pieces = ["Tu es en direct"];
      if (isRecording) pieces.push("enregistrement actif");
      pieces.push("notifs envoyées aux followers");
      toast.success(`${pieces.join(" · ")} !`, { duration: 4000 });
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
      <div className="absolute inset-0 bg-black flex flex-col items-center justify-center p-6 text-center text-cream">
        <p className="text-[14px] font-bold">Studio indisponible.</p>
        <p className="text-[12px] text-cream/60 mt-2">{error}</p>
        <button
          type="button"
          onClick={() => router.replace("/lives")}
          className="mt-4 h-9 px-4 rounded-full bg-gold text-night text-[12px] font-bold"
        >
          Retour
        </button>
      </div>
    );
  }

  if (!token || !wsUrl) {
    return (
      <div className="absolute inset-0 bg-black flex flex-col items-center justify-center text-cream">
        <Loader2 className="w-6 h-6 animate-spin text-gold" aria-hidden />
        <p className="mt-3 text-[12px] text-cream/60">Chargement du studio…</p>
      </div>
    );
  }

  /* Avant choices : PreJoin pour cam/mic preview. */
  if (!choices) {
    return (
      <div className="absolute inset-0 bg-black flex flex-col items-center justify-center p-4 text-cream">
        <h2 className="text-[18px] font-display italic text-gold-soft mb-3 text-center">
          Prêt à passer en <em className="text-gold">live</em> ?
        </h2>
        <div className="w-full max-w-md">
          <PreJoin
            defaults={{
              videoEnabled: kind === "video",
              audioEnabled: true,
            }}
            onSubmit={(c) => setChoices(c)}
            data-lk-theme="default"
          />
        </div>
      </div>
    );
  }

  return (
    <LiveLikesProvider sessionId={sessionId} initialCount={initialLikeCount}>
      <div className="absolute inset-0 bg-black overflow-hidden">
        <LiveKitRoom
          token={token}
          serverUrl={wsUrl}
          connect={true}
          audio={choices.audioEnabled}
          video={kind === "video" ? choices.videoEnabled : false}
          data-lk-theme="default"
          className="absolute inset-0"
          onDisconnected={() => {
            window.setTimeout(() => {
              router.replace("/lives");
            }, 60);
          }}
          onError={(err) => {
            console.error("[LiveKit studio]", err);
            toast.error(`Erreur studio : ${err.message}`);
          }}
        >
          <LiveCanvas
            hostId={host.id}
            hostMeta={{
              user_id: host.id,
              username: host.full_name ?? host.username,
              avatar_url: host.avatar_url,
            }}
            layout={layout}
            guests={guests}
          />
        </LiveKitRoom>

        {/* TopBar */}
        <LiveTopBar
          host={host}
          viewersCount={viewersCount}
          isFollowing
          onFollow={() => undefined}
        />

        {/* Notifications guest requests slide depuis le haut. */}
        {status === "live" ? (
          <HostNotificationsArea sessionId={sessionId} />
        ) : null}

        {/* Stats live overlay top-right (sous le top bar). */}
        {status === "live" ? (
          <div className="absolute top-16 right-3 z-30 pointer-events-auto">
            <LiveStatsHostOverlay
              sessionId={sessionId}
              initial={{
                viewers_current: initialViewers,
                peak_participants: initialPeak,
                total_likes_count: initialLikeCount,
                total_gifts_coins: initialCoins,
                new_followers_count: initialNewFollowers,
              }}
            />
          </div>
        ) : null}

        {/* Durée live + REC center top. */}
        {status === "live" ? (
          <div className="absolute top-14 left-1/2 -translate-x-1/2 z-30 pointer-events-auto">
            <LiveDurationBadge
              startedAt={startedAt}
              isRecording={isRecording}
            />
          </div>
        ) : null}

        {/* Top gifters overlay left middle. */}
        {status === "live" ? (
          <div className="absolute left-2 top-1/3 z-20 pointer-events-none">
            <TopGiftersPanel sessionId={sessionId} />
          </div>
        ) : null}

        {/* Comments stream + animations gifts. */}
        {status === "live" ? (
          <>
            <div className="absolute left-2 right-24 bottom-20 z-25 pointer-events-none">
              <CommentsStream
                sessionId={sessionId}
                hostId={host.id}
                currentUserId={host.id}
              />
            </div>
            <GiftCinematicOverlay sessionId={sessionId} />
            <FloatingLikesLayer />
          </>
        ) : null}

        {/* Barre d'actions HOST (live actif) : Demandes, Sondage, Objectif, Chat. */}
        {status === "live" ? (
          <div
            className="absolute bottom-24 left-1/2 -translate-x-1/2 z-30 flex items-center gap-2 pointer-events-auto"
          >
            <HostActionPill
              icon={<Hand className="w-3.5 h-3.5" aria-hidden />}
              label="Demandes"
              onClick={() => setStageOpen(true)}
              badge={pendingRequestsCount}
            />
            <HostActionPill
              icon={<MessageSquare className="w-3.5 h-3.5" aria-hidden />}
              label="Chat"
              onClick={() => setChatOpen(true)}
            />
            <HostActionPill
              icon={<Vote className="w-3.5 h-3.5" aria-hidden />}
              label="Sondage"
              onClick={() => setPollOpen(true)}
            />
            <HostActionPill
              icon={<Target className="w-3.5 h-3.5" aria-hidden />}
              label="Objectif"
              onClick={() => setGoalOpen(true)}
            />
          </div>
        ) : null}

        {/* Bouton Démarrer / Terminer bottom-center. */}
        <div
          className="absolute bottom-6 left-1/2 -translate-x-1/2 z-30 pointer-events-auto"
          style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
        >
          {status === "live" ? (
            <button
              type="button"
              onClick={handleEndLive}
              disabled={isPending}
              className="inline-flex items-center gap-2 h-12 px-6 rounded-full bg-rose-600 hover:bg-rose-700 text-white text-[13px] font-extrabold transition-colors disabled:opacity-60 shadow-xl"
            >
              {isPending ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Square className="w-4 h-4 fill-current" aria-hidden />
              )}
              Terminer le live
            </button>
          ) : (
            <button
              type="button"
              onClick={handleStartLive}
              disabled={isPending}
              className="inline-flex items-center gap-2 h-14 px-8 rounded-full bg-gold text-night text-[14px] font-extrabold hover:bg-gold-soft transition-colors disabled:opacity-60 shadow-2xl shadow-gold/30"
            >
              {isPending ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Radio className="w-4 h-4" aria-hidden strokeWidth={2.6} />
              )}
              Démarrer le live
            </button>
          )}
        </div>

        {/* Modals admin */}
        <CreatePollModal
          sessionId={sessionId}
          open={pollOpen}
          onClose={() => setPollOpen(false)}
        />
        <CreateGoalModal
          sessionId={sessionId}
          open={goalOpen}
          onClose={() => setGoalOpen(false)}
        />
        <LiveChatPanel
          sessionId={sessionId}
          open={chatOpen}
          onClose={() => setChatOpen(false)}
          currentUserId={host.id}
          hostId={host.id}
        />
        <StageRequestsPanel
          sessionId={sessionId}
          open={stageOpen}
          onClose={() => setStageOpen(false)}
          onPendingCountChange={setPendingRequestsCount}
        />
      </div>
    </LiveLikesProvider>
  );
}

function HostActionPill({
  icon,
  label,
  onClick,
  badge,
}: {
  icon: React.ReactNode;
  label: string;
  onClick: () => void;
  badge?: number;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="relative inline-flex items-center gap-1.5 h-9 px-3.5 rounded-full bg-black/65 backdrop-blur-md border border-cream/15 text-cream hover:bg-black/80 text-[11px] font-bold transition-colors active:scale-95"
    >
      {icon}
      {label}
      {typeof badge === "number" && badge > 0 ? (
        <span className="absolute -top-1 -right-1 inline-flex items-center justify-center min-w-[18px] h-[18px] px-1 rounded-full bg-rose-500 text-white text-[9px] font-extrabold ring-2 ring-black">
          {badge > 9 ? "9+" : badge}
        </span>
      ) : null}
    </button>
  );
}
