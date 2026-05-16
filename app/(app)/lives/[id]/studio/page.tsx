/* Étape 31/60 — Studio host V2 (page server fullscreen TikTok). */

import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { isLiveKitConfigured } from "@/lib/livekit/server";
import { LiveStudioV2 } from "../v2/LiveStudioV2";

type Params = Promise<{ id: string }>;

export const metadata = { title: "Studio live — DIVARC" };

export default async function LiveStudioPage({ params }: { params: Params }) {
  const { id } = await params;
  if (!/^[a-f0-9-]{36}$/i.test(id)) notFound();

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect(`/login?next=/lives/${id}/studio`);

  /* eslint-disable-next-line @typescript-eslint/no-explicit-any */
  const { data: room } = await (supabase as any)
    .from("circle_live_rooms")
    .select(
      "id, host_id, kind, title, status, visibility, category, tags, language, started_at, is_recording, viewers_current, peak_participants, participants_count, like_count, total_gifts_coins, revenue_total_cents, new_followers_count, layout",
    )
    .eq("id", id)
    .maybeSingle();
  if (!room) notFound();

  const r = room as {
    id: string;
    host_id: string;
    kind: "audio" | "video";
    title: string;
    status: "scheduled" | "live" | "ended" | "cancelled";
    visibility: string;
    category: string | null;
    tags: string[];
    language: string;
    started_at: string | null;
    is_recording: boolean | null;
    viewers_current: number;
    peak_participants: number;
    participants_count: number;
    like_count: number;
    total_gifts_coins: number;
    revenue_total_cents: number;
    new_followers_count: number;
    layout:
      | "solo"
      | "panel_2"
      | "panel_4"
      | "panel_6"
      | "panel_8"
      | "pk_battle"
      | "audio_only";
  };

  /* Pas l'host → renvoie vers la page viewer. */
  if (r.host_id !== user.id) {
    redirect(`/lives/${id}`);
  }

  if (r.status === "ended" || r.status === "cancelled") {
    return (
      <div className="absolute inset-0 bg-black text-cream flex flex-col items-center justify-center p-6 text-center">
        <p className="text-[14px] font-bold mb-2">Ce live est terminé.</p>
        <Link
          href="/lives"
          className="mt-3 inline-flex items-center gap-1.5 h-9 px-4 rounded-full bg-gold text-night text-[12px] font-bold"
        >
          <ArrowLeft className="w-3 h-3" aria-hidden /> Retour
        </Link>
      </div>
    );
  }

  if (!isLiveKitConfigured()) {
    return (
      <div className="absolute inset-0 bg-black text-cream flex flex-col items-center justify-center p-6 text-center">
        <p className="text-[14px] font-bold">LiveKit non configuré.</p>
        <Link
          href="/lives"
          className="mt-4 inline-flex items-center gap-1.5 h-9 px-4 rounded-full bg-gold text-night text-[12px] font-bold"
        >
          <ArrowLeft className="w-3 h-3" aria-hidden /> Retour
        </Link>
      </div>
    );
  }

  /* Host profile dénormalisé pour LiveTopBar. */
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
  if (!host) return null;

  /* Guests panel actif. */
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

  const validLayouts = [
    "solo",
    "panel_2",
    "panel_4",
    "panel_6",
    "panel_8",
    "audio_only",
  ] as const;
  type LayoutKind = (typeof validLayouts)[number];
  const layout: LayoutKind = validLayouts.includes(r.layout as LayoutKind)
    ? (r.layout as LayoutKind)
    : "solo";

  return (
    <div className="relative h-[100dvh] w-full bg-black overflow-hidden">
      <LiveStudioV2
        sessionId={r.id}
        kind={r.kind}
        title={r.title}
        host={host}
        currentStatus={r.status}
        startedAt={r.started_at ?? null}
        isRecording={r.is_recording ?? false}
        initialViewers={r.viewers_current ?? r.participants_count ?? 0}
        initialLikeCount={r.like_count ?? 0}
        initialPeak={r.peak_participants ?? 0}
        initialCoins={r.total_gifts_coins ?? r.revenue_total_cents ?? 0}
        initialNewFollowers={r.new_followers_count ?? 0}
        layout={layout}
        initialGuests={guests}
      />
    </div>
  );
}
