import { ArrowLeft, Calendar, Users2 } from "lucide-react";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { Avatar } from "@/components/ui/Avatar";
import {
  getLiveSession,
  isUserAttending,
  listLiveSessionMessages,
} from "@/lib/queries/liveSessions";
import { createClient } from "@/lib/supabase/server";
import { LiveSessionRoom } from "../_components/LiveSessionRoom";
import { Container } from "@/components/primitives/Container";
import { Stack } from "@/components/primitives/Stack";

type Params = Promise<{ id: string }>;

export async function generateMetadata({ params }: { params: Params }) {
  const { id } = await params;
  const session = await getLiveSession(id);
  if (!session) return { title: "Live introuvable" };
  return {
    title: session.title,
    description: session.description ?? undefined,
  };
}

export default async function LiveSessionPage({
  params,
}: {
  params: Params;
}) {
  const { id } = await params;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const session = await getLiveSession(id);
  if (!session) notFound();

  const [attending, initialMessages] = await Promise.all([
    isUserAttending(id, user.id),
    listLiveSessionMessages(id),
  ]);

  const isHost = session.host_id === user.id;
  const hostName =
    session.host?.full_name ?? session.host?.username ?? "Hôte";

  return (
    <Container maxWidth="default" paddingX="page" paddingY="3xl">
      <Stack gap="2xl">
      <Link
        href="/jobs/live"
        className="inline-flex items-center gap-2 text-sm text-night-muted hover:text-night"
      >
        <ArrowLeft className="w-4 h-4" aria-hidden />
        Lives
      </Link>

      <article className="rounded-3xl bg-white border border-line shadow-soft p-6 sm:p-8">
        <div className="flex items-center gap-2 flex-wrap mb-3">
          {session.status === "live" ? (
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-red-500 text-white text-[10px] font-bold uppercase tracking-widest">
              <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
              LIVE
            </span>
          ) : session.status === "ended" ? (
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-night/10 text-night-muted text-[10px] font-bold uppercase tracking-widest">
              Terminé
            </span>
          ) : (
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-gold/15 text-gold-deep text-[10px] font-bold uppercase tracking-widest">
              <Calendar className="w-3 h-3" aria-hidden />
              Programmé
            </span>
          )}
          <span className="text-xs text-muted">
            {new Date(session.scheduled_at).toLocaleString("fr-FR", {
              dateStyle: "full",
              timeStyle: "short",
            })}
          </span>
          <span className="inline-flex items-center gap-1 text-xs text-muted">
            <Users2 className="w-3.5 h-3.5" aria-hidden />
            {session.attendees_count}
          </span>
        </div>
        <h1 className="font-display text-4xl text-night text-balance">
          {session.title}
        </h1>
        <div className="mt-3 flex items-center gap-2 text-sm text-night-muted">
          <Avatar
            src={session.host?.avatar_url ?? null}
            fullName={hostName}
            size="sm"
          />
          <span>
            Animé par <strong>{hostName}</strong>
          </span>
        </div>
        {session.description ? (
          <p className="mt-4 text-night-muted whitespace-pre-wrap leading-relaxed">
            {session.description}
          </p>
        ) : null}
      </article>

      <LiveSessionRoom
        session={session}
        currentUserId={user.id}
        isHost={isHost}
        initiallyAttending={attending}
        initialMessages={initialMessages}
      />
      </Stack>
    </Container>
  );
}
