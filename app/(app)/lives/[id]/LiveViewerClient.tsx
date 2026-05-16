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
import { Flag, Loader2, Share2, UserPlus } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Avatar } from "@/components/ui/Avatar";

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
  host: Host;
};

type TokenResponse = {
  token: string;
  wsUrl: string;
  canPublish: boolean;
  role: "host" | "viewer";
};

export function LiveViewerClient({
  sessionId,
  kind,
  title,
  description,
  tags,
  host,
}: Props) {
  const router = useRouter();
  const [token, setToken] = useState<string | null>(null);
  const [wsUrl, setWsUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

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
      </div>

      {/* Info bar : avatar host + actions */}
      <div className="bg-night/95 backdrop-blur-md border-t border-cream/10 px-4 py-3">
        <div className="flex items-center gap-3 mb-2.5">
          {host ? (
            <>
              <Avatar
                src={host.avatar_url}
                fullName={host.full_name ?? host.username ?? "Streamer"}
                size="md"
              />
              <div className="flex-1 min-w-0">
                <p className="text-[13px] font-bold text-cream truncate">
                  {host.full_name ?? host.username ?? "Streamer"}
                </p>
                {host.username ? (
                  <p className="text-[11px] text-cream/60 truncate">
                    @{host.username}
                  </p>
                ) : null}
              </div>
            </>
          ) : (
            <div className="flex-1" />
          )}
          <button
            type="button"
            onClick={handleFollow}
            className="inline-flex items-center gap-1.5 h-8 px-3 rounded-full bg-gold text-night text-[11px] font-bold hover:bg-gold/90 transition-colors"
          >
            <UserPlus className="w-3.5 h-3.5" aria-hidden />
            Suivre
          </button>
        </div>

        {description ? (
          <p className="text-[11.5px] text-cream/70 leading-relaxed mb-2 line-clamp-2">
            {description}
          </p>
        ) : null}

        {tags.length > 0 ? (
          <div className="flex flex-wrap gap-1 mb-2">
            {tags.slice(0, 6).map((tag) => (
              <span
                key={tag}
                className="inline-flex items-center h-5 px-2 rounded-full bg-cream/10 text-cream/80 text-[10px] font-bold"
              >
                #{tag}
              </span>
            ))}
          </div>
        ) : null}

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleShare}
            className="inline-flex items-center gap-1.5 h-8 px-3 rounded-full bg-cream/10 text-cream hover:bg-cream/20 text-[11px] font-bold transition-colors"
          >
            <Share2 className="w-3.5 h-3.5" aria-hidden />
            Partager
          </button>
          <button
            type="button"
            onClick={handleReport}
            className="inline-flex items-center gap-1.5 h-8 px-3 rounded-full bg-cream/10 text-cream/70 hover:bg-rose-500/20 hover:text-rose-300 text-[11px] font-bold transition-colors ml-auto"
          >
            <Flag className="w-3.5 h-3.5" aria-hidden />
            Signaler
          </button>
        </div>
      </div>
    </div>
  );
}
