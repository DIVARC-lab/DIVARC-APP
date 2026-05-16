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
import { ArrowLeft } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { isLiveKitConfigured } from "@/lib/livekit/server";
import { LiveReplayPlayer } from "./LiveReplayPlayer";
import { LiveViewerV2 } from "./v2/LiveViewerV2";

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
      "id, host_id, circle_id, kind, title, description, status, visibility, category, tags, language, started_at, participants_count, peak_participants, viewers_current, chat_enabled, is_tips_enabled, vod_url, vod_thumbnail_url, vod_duration_seconds, like_count, layout",
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
    viewers_current: number;
    chat_enabled: boolean;
    is_tips_enabled: boolean;
    vod_url: string | null;
    vod_thumbnail_url: string | null;
    vod_duration_seconds: number | null;
    like_count: number;
    layout:
      | "solo"
      | "panel_2"
      | "panel_4"
      | "panel_6"
      | "panel_8"
      | "pk_battle"
      | "audio_only";
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

  /* Récupère les guests sur le panel actif. */
  /* eslint-disable-next-line @typescript-eslint/no-explicit-any */
  const { data: panelData } = await (supabase as any)
    .from("live_panel_participants")
    .select(
      "user_id, username, avatar_url, position, is_muted, is_video_off, gifts_received_during_session",
    )
    .eq("session_id", r.id)
    .is("left_panel_at", null)
    .order("position", { ascending: true });

  const guests = (panelData ?? []) as Array<{
    user_id: string;
    username: string | null;
    avatar_url: string | null;
    position: number;
    is_muted: boolean;
    is_video_off: boolean;
    gifts_received_during_session: number;
  }>;

  if (!configured) {
    return (
      <div className="absolute inset-0 bg-black text-cream flex flex-col items-center justify-center p-6 text-center">
        <p className="text-[14px] font-bold">Lecture indisponible</p>
        <p className="mt-2 text-[12px] text-cream/60 max-w-md leading-relaxed">
          LiveKit n&apos;est pas configuré côté serveur.
        </p>
        <Link
          href="/lives"
          className="mt-4 inline-flex items-center gap-1.5 h-9 px-4 rounded-full bg-gold text-night text-[12px] font-bold"
        >
          <ArrowLeft className="w-3 h-3" aria-hidden /> Retour
        </Link>
      </div>
    );
  }

  /* Fullscreen TikTok V2 — pas de header séparé, tout est overlay. */
  if (!host) {
    return null;
  }

  /* Layout server-side : utilise le layout DB si présent, fallback solo. */
  const validLayouts = [
    "solo",
    "panel_2",
    "panel_4",
    "panel_6",
    "panel_8",
    "audio_only",
  ] as const;
  type LayoutKind = (typeof validLayouts)[number];
  const layout: LayoutKind = validLayouts.includes(
    r.layout as LayoutKind,
  )
    ? (r.layout as LayoutKind)
    : "solo";

  return (
    <div className="relative h-[100dvh] w-full bg-black overflow-hidden">
      <LiveViewerV2
        sessionId={r.id}
        title={r.title}
        host={host}
        chatEnabled={r.chat_enabled}
        tipsEnabled={r.is_tips_enabled}
        initialViewers={r.viewers_current ?? r.participants_count ?? 0}
        initialLikeCount={r.like_count ?? 0}
        layout={layout}
        initialGuests={guests}
        currentUserId={user.id}
      />
    </div>
  );
}
