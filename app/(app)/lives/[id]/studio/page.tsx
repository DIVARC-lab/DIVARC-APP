/* Étape 5 — Studio broadcaster pour le host.
 *
 * SSR : auth + check host_id = user.id (sinon redirect viewer).
 * Lecture session + transmis au client.
 */

import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, CircleDot } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { isLiveKitConfigured } from "@/lib/livekit/server";
import { LiveStudioClient } from "./LiveStudioClient";

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
      "id, host_id, kind, title, status, visibility, category, tags, language",
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
  };

  /* Pas l'host → renvoie vers la page viewer. */
  if (r.host_id !== user.id) {
    redirect(`/lives/${id}`);
  }

  if (r.status === "ended" || r.status === "cancelled") {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center bg-night text-cream p-6 text-center">
        <p className="text-[14px] font-bold mb-2">Ce live est terminé.</p>
        <Link
          href="/lives"
          className="mt-3 text-[12px] text-gold font-bold hover:underline"
        >
          ← Découvrir d&apos;autres lives
        </Link>
      </div>
    );
  }

  const configured = isLiveKitConfigured();

  return (
    <div className="flex flex-col min-h-[calc(100dvh-56px)] bg-night text-cream">
      <header className="flex items-center gap-3 px-4 py-3 border-b border-cream/10">
        <Link
          href="/lives"
          className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-cream/10 hover:bg-cream/20 transition-colors"
          aria-label="Quitter le studio"
        >
          <ArrowLeft className="w-4 h-4" aria-hidden />
        </Link>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5 mb-0.5">
            <span className="text-[10px] font-bold uppercase tracking-wider text-cream/60">
              Studio · {r.kind === "audio" ? "Audio" : "Vidéo"}
            </span>
            <span className="text-cream/30 text-[10px]">·</span>
            <span className="text-[10px] font-bold uppercase tracking-wider text-cream/60">
              {r.visibility}
            </span>
          </div>
          <h1 className="text-[15px] font-bold truncate">{r.title}</h1>
        </div>
        {r.status === "live" ? (
          <span className="inline-flex items-center gap-1 px-2 h-6 rounded-full bg-rose-600 text-white text-[10px] font-bold uppercase tracking-wider">
            <CircleDot className="w-3 h-3 animate-pulse" aria-hidden />
            Live
          </span>
        ) : (
          <span className="inline-flex items-center gap-1 px-2 h-6 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30 text-[10px] font-bold uppercase tracking-wider">
            Préparation
          </span>
        )}
      </header>

      <main className="flex-1 relative">
        {!configured ? (
          <div className="h-full flex flex-col items-center justify-center p-6 text-center">
            <p className="text-[14px] font-bold text-cream">
              LiveKit non configuré
            </p>
            <p className="mt-2 text-[12px] text-cream/60 max-w-md leading-relaxed">
              Les variables d&apos;environnement LIVEKIT_API_KEY,
              LIVEKIT_API_SECRET, NEXT_PUBLIC_LIVEKIT_URL doivent être
              définies côté serveur.
            </p>
          </div>
        ) : (
          <LiveStudioClient
            sessionId={r.id}
            kind={r.kind}
            title={r.title}
            currentStatus={r.status}
          />
        )}
      </main>
    </div>
  );
}
