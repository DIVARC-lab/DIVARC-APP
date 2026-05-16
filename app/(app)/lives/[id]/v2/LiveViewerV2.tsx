"use client";

/* Étape 25/60 — Page viewer V2 assemblée TikTok-style.
 *
 * Compose tous les composants v2 :
 *   LiveTopBar — host info + viewers + close
 *   LiveCanvas — vidéo split-screen ou solo
 *   TopGiftersPanel — overlay gauche
 *   CommentsStream — défilement bottom-left
 *   FloatingLikesLayer — cœurs flottants
 *   LiveTapToLikeOverlay — tap to like
 *   GiftCinematicOverlay — animations 3 niveaux
 *   GiftPanel (V1 réutilisé) + LiveTipsModal + SubscribeCreatorModal
 *   LiveBottomBar — input + actions row
 *
 * Stage status synchronisé via RPC get_my_stage_request_status. */

import "@livekit/components-styles";
import { LiveKitRoom } from "@livekit/components-react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";
import { LiveLikesProvider } from "../LiveLikesContext";
import { LiveTapToLikeOverlay } from "../LiveTapToLikeOverlay";
import { LiveTipsModal } from "../LiveTipsModal";
import { SubscribeCreatorModal } from "../SubscribeCreatorModal";
import { GiftPanel } from "../GiftPanel";
import { CommentsStream } from "./CommentsStream";
import { FloatingLikesLayer } from "./FloatingLikesLayer";
import { GiftCinematicOverlay } from "./GiftCinematicOverlay";
import { LiveBottomBar } from "./LiveBottomBar";
import { LiveCanvas } from "./LiveCanvas";
import { LiveTopBar } from "./LiveTopBar";
import { TopGiftersPanel } from "./TopGiftersPanel";

type Host = {
  id: string;
  full_name: string | null;
  username: string | null;
  avatar_url: string | null;
  verified?: boolean;
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
  title: string;
  host: Host;
  chatEnabled: boolean;
  tipsEnabled: boolean;
  initialViewers: number;
  initialLikeCount: number;
  layout:
    | "solo"
    | "panel_2"
    | "panel_4"
    | "panel_6"
    | "panel_8"
    | "audio_only";
  initialGuests: PanelGuest[];
  currentUserId: string;
};

type StageStatus =
  | "idle"
  | "pending"
  | "approved"
  | "denied"
  | "cancelled"
  | "revoked";

type TokenResponse = {
  token: string;
  wsUrl: string;
  canPublish: boolean;
  role: "host" | "viewer";
};

export function LiveViewerV2({
  sessionId,
  title,
  host,
  chatEnabled,
  tipsEnabled,
  initialViewers,
  initialLikeCount,
  layout: initialLayout,
  initialGuests,
  currentUserId,
}: Props) {
  const router = useRouter();
  const [token, setToken] = useState<string | null>(null);
  const [wsUrl, setWsUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [viewersCount, setViewersCount] = useState(initialViewers);
  const [stageStatus, setStageStatus] = useState<StageStatus>("idle");
  const [layout, setLayout] = useState(initialLayout);
  const [guests, setGuests] = useState<PanelGuest[]>(initialGuests);

  const [giftsOpen, setGiftsOpen] = useState(false);
  const [tipsOpen, setTipsOpen] = useState(false);
  const [subOpen, setSubOpen] = useState(false);

  /* Fetch token LiveKit. */
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

  /* Sync stage status. */
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
        if (s === "denied" || s === "cancelled" || s === "revoked") {
          setStageStatus("idle");
        } else {
          setStageStatus(s);
        }
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

  /* Realtime : layout + viewers + guests live. */
  useEffect(() => {
    const supabase = createClient();
    const channel = supabase
      .channel(`live-state-${sessionId}`)
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
          const row = payload.new as any;
          if (typeof row?.viewers_current === "number") {
            setViewersCount(row.viewers_current);
          } else if (typeof row?.participants_count === "number") {
            setViewersCount(row.participants_count);
          }
          if (typeof row?.layout === "string") {
            setLayout(row.layout);
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
        async () => {
          await refreshGuests();
        },
      )
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "live_panel_participants",
          filter: `session_id=eq.${sessionId}`,
        },
        async () => {
          await refreshGuests();
        },
      )
      .subscribe();

    async function refreshGuests() {
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

  function handleShare() {
    const url =
      typeof window !== "undefined"
        ? `${window.location.origin}/lives/${sessionId}`
        : "";
    if (typeof navigator !== "undefined" && navigator.share) {
      navigator.share({ title: `Live · ${title}`, url }).catch(() => undefined);
    } else if (typeof navigator !== "undefined" && navigator.clipboard) {
      navigator.clipboard.writeText(url).then(() => {
        toast.success("Lien copié.");
      });
    }
  }

  function handleFollow() {
    toast("Follow streamer — Sprint suivant.");
  }

  if (error) {
    return (
      <div className="h-full flex flex-col items-center justify-center p-6 text-center bg-black">
        <p className="text-[14px] font-bold text-cream">
          Impossible de rejoindre ce live.
        </p>
        <p className="mt-2 text-[12px] text-cream/60">
          {error === "forbidden"
            ? "Tu n'as pas l'accès requis pour ce live."
            : error === "session_closed"
              ? "Ce live est terminé."
              : `Code : ${error}`}
        </p>
        <button
          type="button"
          onClick={() => router.replace("/lives")}
          className="mt-4 h-9 px-4 rounded-full bg-gold text-night text-[12px] font-bold"
        >
          Retour aux lives
        </button>
      </div>
    );
  }

  if (!token || !wsUrl) {
    return (
      <div className="h-full flex flex-col items-center justify-center p-6 text-center bg-black">
        <div className="w-6 h-6 border-2 border-gold border-t-transparent rounded-full animate-spin" />
        <p className="mt-3 text-[12px] text-cream/60">Chargement du live…</p>
      </div>
    );
  }

  return (
    <LiveLikesProvider sessionId={sessionId} initialCount={initialLikeCount}>
      <div className="absolute inset-0 bg-black overflow-hidden">
        {/* LiveKit Room enrobe le canvas pour exposer les tracks. */}
        <LiveKitRoom
          token={token}
          serverUrl={wsUrl}
          connect={true}
          audio={false}
          video={false}
          data-lk-theme="default"
          className="absolute inset-0"
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

          {/* Tap zone double-tap = like. */}
          <LiveTapToLikeOverlay />
        </LiveKitRoom>

        {/* Top bar */}
        <LiveTopBar
          host={host}
          viewersCount={viewersCount}
          isFollowing={false}
          onFollow={handleFollow}
        />

        {/* Top gifters overlay gauche milieu. */}
        <div className="absolute left-2 top-1/3 z-20 pointer-events-none">
          <TopGiftersPanel sessionId={sessionId} />
        </div>

        {/* Comments stream bottom-left au-dessus du bottom bar. */}
        <div className="absolute left-2 right-24 bottom-20 z-25 pointer-events-none">
          <CommentsStream
            sessionId={sessionId}
            hostId={host.id}
            currentUserId={currentUserId}
          />
        </div>

        {/* Animations cadeaux (3 niveaux). */}
        <GiftCinematicOverlay sessionId={sessionId} />

        {/* Cœurs flottants. */}
        <FloatingLikesLayer />

        {/* Bottom bar */}
        <LiveBottomBar
          sessionId={sessionId}
          chatEnabled={chatEnabled}
          stageStatus={stageStatus}
          onStageStatusChange={setStageStatus}
          onOpenGifts={() => setGiftsOpen(true)}
          onOpenEmoji={() => toast("Emoji picker — bientôt.")}
          onShare={handleShare}
          onOpenMore={() => {
            if (tipsEnabled) setTipsOpen(true);
            else setSubOpen(true);
          }}
        />

        {/* Modals */}
        <GiftPanel
          sessionId={sessionId}
          open={giftsOpen}
          onClose={() => setGiftsOpen(false)}
        />
        <LiveTipsModal
          sessionId={sessionId}
          open={tipsOpen}
          onClose={() => setTipsOpen(false)}
        />
        <SubscribeCreatorModal
          creatorId={host.id}
          creatorName={host.full_name ?? host.username ?? "Créateur"}
          open={subOpen}
          onClose={() => setSubOpen(false)}
        />
      </div>
    </LiveLikesProvider>
  );
}
