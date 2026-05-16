/* Étape 6 — Page viewer fullscreen pour spectateurs.
 *
 * SSR : auth + check access via visibility + récup données host pour
 * affichage info (avatar, name, title, tags, category).
 *
 * Le check d'accès est dupliqué côté API token (/api/lives/[id]/token)
 * pour défense en profondeur, mais on filtre déjà côté page pour
 * éviter de rendre l'UI viewer si l'user ne peut pas voir le live. */

import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, CircleDot } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { isLiveKitConfigured } from "@/lib/livekit/server";
import { LiveReplayPlayer } from "./LiveReplayPlayer";
import { LiveViewerClient } from "./LiveViewerClient";

type Params = Promise<{ id: string }>;

export const metadata = { title: "Live — DIVARC" };

export default async function LiveViewerPage({
  params,
}: {
  params: Params;
}) {
  const { id } = await params;
  if (!/^[a-f0-9-]{36}$/i.test(id)) notFound();

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect(`/login?next=/lives/${id}`);

  /* eslint-disable-next-line @typescript-eslint/no-explicit-any */
  const { data: room } = await (supabase as any)
    .from("circle_live_rooms")
    .select(
      "id, host_id, circle_id, kind, title, description, status, visibility, category, tags, language, started_at, participants_count, peak_participants, chat_enabled, is_tips_enabled, vod_url, vod_thumbnail_url, vod_duration_seconds, like_count",
    )
    .eq("id", id)
    .maybeSingle();
  if (!room) notFound();

  const r = room as {
    id: string;
    host_id: string;
    circle_id: string | null;
    kind: "audio" | "video";
    title: string;
    description: string | null;
    status: "scheduled" | "live" | "ended" | "cancelled";
    visibility: string;
    category: string | null;
    tags: string[];
    language: string;
    started_at: string | null;
    participants_count: number;
    peak_participants: number;
    chat_enabled: boolean;
    is_tips_enabled: boolean;
    vod_url: string | null;
    vod_thumbnail_url: string | null;
    vod_duration_seconds: number | null;
    like_count: number;
  };

  /* Host doit aller au studio. */
  if (r.host_id === user.id) {
    redirect(`/lives/${id}/studio`);
  }

  if (r.status === "ended" || r.status === "cancelled") {
    /* Étape 22 — Replay player si VOD disponible. */
    if (r.status === "ended" && r.vod_url) {
      /* eslint-disable-next-line @typescript-eslint/no-explicit-any */
      const { data: rec } = await (supabase as any)
        .from("live_recordings")
        .select("id, view_count, duration_seconds, thumbnail_url")
        .eq("session_id", r.id)
        .eq("status", "completed")
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      const recording = rec as {
        id: string;
        view_count: number;
        duration_seconds: number | null;
        thumbnail_url: string | null;
      } | null;

      return (
        <div className="flex flex-col min-h-[calc(100dvh-56px)] bg-night text-cream">
          <header className="flex items-center gap-3 px-4 py-3 border-b border-cream/10">
            <Link
              href="/lives"
              className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-cream/10 hover:bg-cream/20 transition-colors"
              aria-label="Retour"
            >
              <ArrowLeft className="w-4 h-4" aria-hidden />
            </Link>
            <div className="flex-1 min-w-0">
              <p className="text-[10px] font-bold uppercase tracking-wider text-cream/60">
                Replay
                {r.category ? ` · #${r.category}` : ""}
              </p>
              <h1 className="text-[15px] font-bold truncate">{r.title}</h1>
            </div>
          </header>
          <main className="flex-1">
            <LiveReplayPlayer
              sessionId={r.id}
              title={r.title}
              description={r.description}
              recordingId={recording?.id ?? null}
              vodUrl={r.vod_url}
              durationSeconds={
                recording?.duration_seconds ?? r.vod_duration_seconds
              }
              initialViewCount={recording?.view_count ?? 0}
              thumbnailUrl={recording?.thumbnail_url ?? r.vod_thumbnail_url}
            />
          </main>
        </div>
      );
    }

    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center bg-night text-cream p-6 text-center">
        <p className="text-[14px] font-bold mb-2">Ce live est terminé.</p>
        <p className="text-[12px] text-cream/60 max-w-md">
          {r.status === "cancelled"
            ? "Le live a été annulé."
            : "Le replay est en cours de traitement et sera disponible dans quelques minutes."}
        </p>
        <Link
          href="/lives"
          className="mt-4 text-[12px] text-gold font-bold hover:underline"
        >
          ← Découvrir d&apos;autres lives
        </Link>
      </div>
    );
  }

  /* Récup host profile pour info bar. */
  const { data: hostProfile } = await supabase
    .from("profiles")
    .select("id, full_name, username, avatar_url")
    .eq("id", r.host_id)
    .maybeSingle();
  const host = hostProfile as {
    id: string;
    full_name: string | null;
    username: string | null;
    avatar_url: string | null;
  } | null;

  const configured = isLiveKitConfigured();

  return (
    <div className="flex flex-col min-h-[calc(100dvh-56px)] bg-night text-cream">
      <header className="flex items-center gap-3 px-4 py-3 border-b border-cream/10">
        <Link
          href="/lives"
          className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-cream/10 hover:bg-cream/20 transition-colors"
          aria-label="Retour"
        >
          <ArrowLeft className="w-4 h-4" aria-hidden />
        </Link>
        <div className="flex-1 min-w-0">
          <p className="text-[10px] font-bold uppercase tracking-wider text-cream/60">
            {r.kind === "audio" ? "Audio room" : "Vidéo room"}
            {r.category ? ` · #${r.category}` : ""}
          </p>
          <h1 className="text-[15px] font-bold truncate">{r.title}</h1>
        </div>
        {r.status === "live" ? (
          <span className="inline-flex items-center gap-1 px-2 h-6 rounded-full bg-rose-600 text-white text-[10px] font-bold uppercase tracking-wider">
            <CircleDot className="w-3 h-3 animate-pulse" aria-hidden />
            Live · {r.participants_count}
          </span>
        ) : null}
      </header>

      <main className="flex-1 relative">
        {!configured ? (
          <div className="h-full flex flex-col items-center justify-center p-6 text-center">
            <p className="text-[14px] font-bold text-cream">
              Lecture indisponible
            </p>
            <p className="mt-2 text-[12px] text-cream/60 max-w-md leading-relaxed">
              LiveKit n&apos;est pas configuré côté serveur. L&apos;admin doit
              définir les variables d&apos;environnement.
            </p>
          </div>
        ) : (
          <LiveViewerClient
            sessionId={r.id}
            kind={r.kind}
            title={r.title}
            description={r.description}
            tags={r.tags}
            chatEnabled={r.chat_enabled}
            tipsEnabled={r.is_tips_enabled}
            host={host}
            currentUserId={user.id}
            hostId={r.host_id}
            initialLikeCount={r.like_count ?? 0}
          />
        )}
      </main>
    </div>
  );
}
