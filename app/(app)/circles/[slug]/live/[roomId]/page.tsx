/* Sprint E (LiveKit) — Page d'une salle Live audio/vidéo cercle.
 *
 * SSR :
 *   - Auth required
 *   - Vérifie que la room existe + cercle membership active
 *   - Récupère le room + host + kind (audio|video)
 *
 * Rendu :
 *   - Header : titre room + statut + bouton "Quitter"
 *   - LiveRoomClient (client component) qui fetch token via API et
 *     monte LiveKitRoom + composants pré-faits @livekit/components-react. */

import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, CircleDot, Mic, Video } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getCircleBySlug } from "@/lib/queries/circles";
import { isLiveKitConfigured } from "@/lib/livekit/server";
import { LiveRoomClient } from "./LiveRoomClient";

type Params = Promise<{ slug: string; roomId: string }>;

export const metadata = { title: "Salle live" };

export default async function CircleLiveRoomPage({
  params,
}: {
  params: Params;
}) {
  const { slug, roomId } = await params;

  if (!/^[a-f0-9-]{36}$/i.test(roomId)) notFound();

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect(`/login?next=/circles/${slug}/live/${roomId}`);

  const circle = await getCircleBySlug(slug, user.id);
  if (!circle) notFound();
  if (!circle.is_member) redirect(`/circles/${slug}/about`);

  /* eslint-disable-next-line @typescript-eslint/no-explicit-any */
  const { data: room } = await (supabase as any)
    .from("circle_live_rooms")
    .select("id, title, kind, status, host_id")
    .eq("id", roomId)
    .eq("circle_id", circle.id)
    .maybeSingle();
  if (!room) notFound();

  const r = room as {
    id: string;
    title: string;
    kind: "audio" | "video";
    status: "scheduled" | "live" | "ended" | "cancelled";
    host_id: string;
  };

  if (r.status === "ended" || r.status === "cancelled") {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center p-6 text-center">
        <p className="text-[14px] font-bold text-night">
          Cette salle est terminée.
        </p>
        <Link
          href={`/circles/${slug}/live`}
          className="mt-3 text-[12px] text-gold-deep font-bold hover:underline"
        >
          ← Retour aux salles live
        </Link>
      </div>
    );
  }

  const configured = isLiveKitConfigured();

  return (
    <div className="flex flex-col min-h-[calc(100dvh-56px)] bg-night text-cream">
      <header className="flex items-center gap-3 px-4 py-3 border-b border-cream/10">
        <Link
          href={`/circles/${slug}/live`}
          className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-cream/10 hover:bg-cream/20 transition-colors"
          aria-label="Retour"
        >
          <ArrowLeft className="w-4 h-4" aria-hidden />
        </Link>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5 mb-0.5">
            {r.kind === "audio" ? (
              <Mic className="w-3 h-3 text-gold" aria-hidden />
            ) : (
              <Video className="w-3 h-3 text-gold" aria-hidden />
            )}
            <span className="text-[10px] font-bold uppercase tracking-wider text-cream/60">
              {r.kind === "audio" ? "Audio room" : "Vidéo room"}
            </span>
          </div>
          <h1 className="text-[15px] font-bold truncate">{r.title}</h1>
        </div>
        {r.status === "live" ? (
          <span className="inline-flex items-center gap-1 px-2 h-6 rounded-full bg-rose-600 text-white text-[10px] font-bold uppercase tracking-wider">
            <CircleDot className="w-3 h-3 animate-pulse" aria-hidden />
            Live
          </span>
        ) : null}
      </header>

      <main className="flex-1 relative">
        {!configured ? (
          <div className="h-full flex flex-col items-center justify-center p-6 text-center">
            <p className="text-[14px] font-bold text-cream">
              LiveKit n&apos;est pas configuré
            </p>
            <p className="mt-2 text-[12px] text-cream/60 max-w-md leading-relaxed">
              L&apos;admin doit définir <code className="px-1 py-0.5 rounded bg-cream/10">LIVEKIT_API_KEY</code>,{" "}
              <code className="px-1 py-0.5 rounded bg-cream/10">LIVEKIT_API_SECRET</code> et{" "}
              <code className="px-1 py-0.5 rounded bg-cream/10">NEXT_PUBLIC_LIVEKIT_URL</code>{" "}
              côté serveur Vercel.
            </p>
          </div>
        ) : (
          <LiveRoomClient
            roomId={r.id}
            roomTitle={r.title}
            roomKind={r.kind}
            circleSlug={slug}
            isModerator={
              circle.owner_id === user.id ||
              circle.my_role === "admin" ||
              circle.my_role === "moderator" ||
              circle.my_role === "mod" ||
              r.host_id === user.id
            }
          />
        )}
      </main>
    </div>
  );
}
