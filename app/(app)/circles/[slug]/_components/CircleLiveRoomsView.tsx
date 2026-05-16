"use client";

/* CircleLiveRoomsView — liste des salles live d'un cercle.
 *
 * Affiche les rooms scheduled + live actuelles + bouton "Démarrer
 * une room" pour owner/admin/moderator. Le clic sur une room "live"
 * ouvre une page séparée pour participer (V1 = redirige vers une
 * page placeholder, l'intégration WebRTC complète sera dans un
 * commit suivant — la struct DB est prête).
 *
 * V1 minimal viable :
 *  - List + create modal pour les rooms
 *  - Join button qui appelle la RPC join_circle_live_room
 *  - Status badges (scheduled, live avec dot pulsé rouge)
 *
 * V2 (futur) : intégration WebRTC mesh ou SFU pour le multi-stream
 * audio. Le call 1-1 actuel ne scale pas au-delà de 2 personnes. */

import { CircleDot, Mic, Plus, Users, Video, X } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Avatar } from "@/components/ui/Avatar";
import type {
  CircleLiveRoomWithHost,
  CircleRole,
} from "@/lib/database.types";
import { cn } from "@/lib/utils/cn";
import { formatRelative } from "@/lib/utils/relativeTime";
import {
  createCircleLiveRoom,
  endCircleLiveRoom,
  joinCircleLiveRoom,
} from "../live-actions";

type Props = {
  circleId: string;
  circleSlug: string;
  myRole: CircleRole | null;
  currentUserId: string;
  initialRooms: CircleLiveRoomWithHost[];
};

export function CircleLiveRoomsView({
  circleId,
  circleSlug,
  myRole,
  currentUserId,
  initialRooms,
}: Props) {
  const router = useRouter();
  const [rooms, setRooms] = useState(initialRooms);
  const [creating, setCreating] = useState(false);

  const canCreate =
    myRole === "owner" || myRole === "admin" || myRole === "moderator" || myRole === "mod";

  function handleCreated(room: CircleLiveRoomWithHost) {
    setRooms((prev) => [room, ...prev]);
    setCreating(false);
  }

  async function handleJoin(roomId: string) {
    /* Sprint E (LiveKit) — Marque l'user comme participant côté DB
       (best-effort) puis redirige vers la salle live qui handle le
       reste (token + WebRTC SFU). */
    const res = await joinCircleLiveRoom(roomId);
    if (!res.ok) {
      toast.error(res.error);
      return;
    }
    router.push(`/circles/${circleSlug}/live/${roomId}`);
  }

  async function handleEnd(roomId: string) {
    const res = await endCircleLiveRoom({ roomId, circleSlug });
    if (!res.ok) {
      toast.error(res.error);
      return;
    }
    toast.success("Room terminée");
    setRooms((prev) =>
      prev.map((r) =>
        r.id === roomId
          ? { ...r, status: "ended" as const, ended_at: new Date().toISOString() }
          : r,
      ),
    );
  }

  return (
    <div className="space-y-5 p-4 sm:p-6">
      <header className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="font-display italic text-2xl sm:text-3xl text-night flex items-center gap-2">
            <Mic className="w-6 h-6 text-rose-500" aria-hidden />
            Salles Live
          </h1>
          <p className="text-[12.5px] text-night-muted mt-1">
            Audio rooms (style Twitter Spaces) et livestreams vidéo
          </p>
        </div>
        {canCreate ? (
          <button
            type="button"
            onClick={() => setCreating(true)}
            className="inline-flex items-center gap-1.5 h-9 px-3 rounded-full bg-rose-500 hover:bg-rose-600 text-white text-[12px] font-bold"
          >
            <Plus className="w-3.5 h-3.5" aria-hidden />
            Démarrer une room
          </button>
        ) : null}
      </header>

      {rooms.length === 0 ? (
        <div className="text-center py-12">
          <Mic className="w-12 h-12 text-night-muted/30 mx-auto mb-3" aria-hidden />
          <p className="text-[13px] text-night-muted">
            Aucune salle live pour l&apos;instant.
          </p>
          {canCreate ? (
            <p className="text-[12px] text-night-muted/70 mt-1">
              Crée la première pour démarrer une conversation audio en direct.
            </p>
          ) : null}
        </div>
      ) : (
        <div className="space-y-3">
          {rooms.map((room) => (
            <LiveRoomCard
              key={room.id}
              room={room}
              isHost={room.host_id === currentUserId}
              onJoin={() => handleJoin(room.id)}
              onEnd={() => handleEnd(room.id)}
            />
          ))}
        </div>
      )}

      {/* Info ré-utilisation infra WebRTC */}
      <div className="bg-rose-50 border border-rose-200 rounded-2xl p-4 text-[12px] text-rose-900/80 leading-relaxed">
        <p className="font-bold mb-1">⚡ Live rooms V1 — Beta</p>
        <p>
          La structure data + permissions est en place. L&apos;intégration
          audio/vidéo multi-participants (au-delà du 1-1 existant) arrive
          dans une prochaine itération.
        </p>
      </div>

      {creating ? (
        <CreateRoomModal
          circleId={circleId}
          circleSlug={circleSlug}
          currentUserId={currentUserId}
          onCancel={() => setCreating(false)}
          onCreated={handleCreated}
        />
      ) : null}
    </div>
  );
}

function LiveRoomCard({
  room,
  isHost,
  onJoin,
  onEnd,
}: {
  room: CircleLiveRoomWithHost;
  isHost: boolean;
  onJoin: () => void;
  onEnd: () => void;
}) {
  const isLive = room.status === "live";
  const isScheduled = room.status === "scheduled";

  return (
    <article
      className={cn(
        "bg-white border rounded-2xl p-4 relative",
        isLive ? "border-rose-300 shadow-lg shadow-rose-500/10" : "border-line",
      )}
    >
      <div className="flex items-start gap-3">
        {/* Icon kind */}
        <div
          className={cn(
            "w-12 h-12 rounded-2xl flex items-center justify-center shrink-0",
            isLive ? "bg-rose-500 text-white" : "bg-night/5 text-night-muted",
          )}
        >
          {room.kind === "video" ? (
            <Video className="w-5 h-5" aria-hidden />
          ) : (
            <Mic className="w-5 h-5" aria-hidden />
          )}
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            {isLive ? (
              <span className="inline-flex items-center gap-1 px-2 h-5 rounded-full bg-rose-500 text-white text-[10px] font-extrabold uppercase tracking-[0.08em]">
                <CircleDot className="w-2.5 h-2.5 animate-pulse" aria-hidden />
                Live
              </span>
            ) : isScheduled ? (
              <span className="inline-flex items-center px-2 h-5 rounded-full bg-night/5 text-night-muted text-[10px] font-extrabold uppercase tracking-[0.08em]">
                Programmé
              </span>
            ) : null}
            <span className="text-[10px] text-night-muted">
              {room.kind === "video" ? "Vidéo" : "Audio"}
            </span>
          </div>

          <h3 className="text-[15px] font-bold text-night leading-snug">
            {room.title}
          </h3>
          {room.description ? (
            <p className="text-[12.5px] text-night/80 mt-1 line-clamp-2">
              {room.description}
            </p>
          ) : null}

          <div className="flex items-center gap-3 mt-2 text-[11px] text-night-muted">
            {room.host ? (
              <span className="inline-flex items-center gap-1.5">
                <Avatar
                  src={room.host.avatar_url}
                  fullName={room.host.full_name ?? "?"}
                  size="sm"
                />
                <span className="font-semibold text-night">
                  {room.host.full_name ?? room.host.username ?? "?"}
                </span>
              </span>
            ) : null}
            <span className="inline-flex items-center gap-1">
              <Users className="w-3 h-3" aria-hidden />
              {room.participants_count}
            </span>
            {isScheduled && room.scheduled_at ? (
              <span>{formatRelative(room.scheduled_at)}</span>
            ) : isLive && room.started_at ? (
              <span>Depuis {formatRelative(room.started_at)}</span>
            ) : null}
          </div>
        </div>

        {/* Actions */}
        <div className="flex flex-col gap-1.5 shrink-0">
          {isLive && !isHost ? (
            <button
              type="button"
              onClick={onJoin}
              className="inline-flex items-center h-8 px-3 rounded-full bg-rose-500 hover:bg-rose-600 text-white text-[11px] font-bold"
            >
              Rejoindre
            </button>
          ) : null}
          {isHost && isLive ? (
            <button
              type="button"
              onClick={onEnd}
              className="inline-flex items-center h-8 px-3 rounded-full bg-night text-cream text-[11px] font-bold"
            >
              Terminer
            </button>
          ) : null}
          {isScheduled ? (
            <Link
              href={`/circles/${room.circle_id}/live/${room.id}`}
              className="inline-flex items-center h-8 px-3 rounded-full bg-night/5 hover:bg-night/10 text-night text-[11px] font-bold"
            >
              Détails
            </Link>
          ) : null}
        </div>
      </div>
    </article>
  );
}

function CreateRoomModal({
  circleId,
  circleSlug,
  currentUserId,
  onCancel,
  onCreated,
}: {
  circleId: string;
  circleSlug: string;
  currentUserId: string;
  onCancel: () => void;
  onCreated: (room: CircleLiveRoomWithHost) => void;
}) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [kind, setKind] = useState<"audio" | "video">("audio");
  const [scheduleNow, setScheduleNow] = useState(true);
  const [scheduledAt, setScheduledAt] = useState("");
  const [pending, startTransition] = useTransition();

  function submit() {
    if (title.trim().length < 3) {
      toast.error("Le titre doit faire au moins 3 caractères");
      return;
    }
    startTransition(async () => {
      const res = await createCircleLiveRoom({
        circleId,
        circleSlug,
        title: title.trim(),
        description: description.trim() || undefined,
        kind,
        scheduledAt: scheduleNow ? null : new Date(scheduledAt).toISOString(),
      });
      if (!res.ok) {
        toast.error(res.error);
        return;
      }
      toast.success(scheduleNow ? "Room démarrée" : "Room programmée");
      onCreated({
        id: res.id,
        circle_id: circleId,
        host_id: currentUserId,
        kind,
        title: title.trim(),
        description: description.trim() || null,
        status: scheduleNow ? "live" : "scheduled",
        scheduled_at: scheduleNow ? null : new Date(scheduledAt).toISOString(),
        started_at: scheduleNow ? new Date().toISOString() : null,
        ended_at: null,
        recording_url: null,
        participants_count: 0,
        peak_participants: 0,
        deleted_at: null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        host: null,
      });
    });
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Nouvelle salle live"
      className="fixed inset-0 z-50 bg-night/60 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4"
      onClick={(e) => {
        if (e.target === e.currentTarget) onCancel();
      }}
    >
      <div className="w-full max-w-lg bg-bg rounded-t-3xl sm:rounded-3xl p-5 max-h-[90vh] overflow-y-auto">
        <header className="flex items-center justify-between mb-4">
          <h2 className="font-display italic text-xl text-night">
            Nouvelle salle live
          </h2>
          <button
            type="button"
            onClick={onCancel}
            aria-label="Fermer"
            className="w-9 h-9 rounded-full hover:bg-night/5 flex items-center justify-center text-night-muted"
          >
            <X className="w-4 h-4" aria-hidden />
          </button>
        </header>

        <div className="space-y-3">
          {/* Kind switcher */}
          <div className="flex gap-2">
            {(["audio", "video"] as const).map((k) => (
              <button
                key={k}
                type="button"
                onClick={() => setKind(k)}
                className={cn(
                  "flex-1 inline-flex items-center justify-center gap-1.5 h-10 rounded-2xl text-[13px] font-bold transition-colors",
                  kind === k
                    ? "bg-night text-cream"
                    : "bg-white border border-line text-night-muted hover:border-night/30",
                )}
              >
                {k === "audio" ? (
                  <>
                    <Mic className="w-4 h-4" aria-hidden />
                    Audio
                  </>
                ) : (
                  <>
                    <Video className="w-4 h-4" aria-hidden />
                    Vidéo
                  </>
                )}
              </button>
            ))}
          </div>

          <label className="block">
            <span className="block text-[11px] font-bold uppercase tracking-wider text-night-muted mb-1">
              Titre <span className="text-rose-500">*</span>
            </span>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Ex: Discussion lancement du produit"
              maxLength={140}
              className="w-full px-3 py-2 rounded-xl bg-white border border-line text-[14px]"
            />
          </label>
          <label className="block">
            <span className="block text-[11px] font-bold uppercase tracking-wider text-night-muted mb-1">
              Description (optionnel)
            </span>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="De quoi va parler la session ?"
              rows={3}
              maxLength={2000}
              className="w-full px-3 py-2 rounded-xl bg-white border border-line text-[14px] resize-y"
            />
          </label>

          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setScheduleNow(true)}
              className={cn(
                "flex-1 h-9 rounded-xl text-[12px] font-bold transition-colors",
                scheduleNow
                  ? "bg-rose-500 text-white"
                  : "bg-white border border-line text-night-muted",
              )}
            >
              Démarrer maintenant
            </button>
            <button
              type="button"
              onClick={() => setScheduleNow(false)}
              className={cn(
                "flex-1 h-9 rounded-xl text-[12px] font-bold transition-colors",
                !scheduleNow
                  ? "bg-night text-cream"
                  : "bg-white border border-line text-night-muted",
              )}
            >
              Programmer
            </button>
          </div>

          {!scheduleNow ? (
            <label className="block">
              <span className="block text-[11px] font-bold uppercase tracking-wider text-night-muted mb-1">
                Date &amp; heure
              </span>
              <input
                type="datetime-local"
                value={scheduledAt}
                onChange={(e) => setScheduledAt(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-white border border-line text-[14px]"
              />
            </label>
          ) : null}
        </div>

        <div className="flex items-center gap-2 mt-5">
          <button
            type="button"
            onClick={onCancel}
            className="flex-1 h-10 rounded-full bg-night/5 text-night font-bold text-[13px]"
          >
            Annuler
          </button>
          <button
            type="button"
            onClick={submit}
            disabled={pending}
            className="flex-1 h-10 rounded-full bg-rose-500 hover:bg-rose-600 text-white font-bold text-[13px] disabled:opacity-50"
          >
            {pending ? "Création…" : scheduleNow ? "Démarrer" : "Programmer"}
          </button>
        </div>
      </div>
    </div>
  );
}
