import { ArrowLeft, Calendar, Plus, Radio, Users2 } from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Avatar } from "@/components/ui/Avatar";
import { Button } from "@/components/ui/Button";
import { listUpcomingLiveSessions } from "@/lib/queries/liveSessions";
import { createClient } from "@/lib/supabase/server";
import { KickerLabel } from "@/components/ui/KickerLabel";
import { EmptyState } from "@/components/ui/EmptyState";
import { Container } from "@/components/primitives/Container";
import { Stack } from "@/components/primitives/Stack";

export const metadata = {
  title: "Lives recrutement",
};

export default async function LivePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const sessions = await listUpcomingLiveSessions();

  return (
    <Container maxWidth="default" paddingX="page" paddingY="3xl">
      <Stack gap="3xl">
      <header className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
        <div>
          <Link
            href="/jobs"
            className="inline-flex items-center gap-2 text-sm text-night-muted hover:text-night mb-3"
          >
            <ArrowLeft className="w-4 h-4" aria-hidden />
            Emploi
          </Link>
          <KickerLabel>Lives recrutement</KickerLabel>
          <h1 className="mt-2 font-display text-4xl sm:text-5xl text-night text-balance leading-[1.05]">
            Sessions <em className="italic text-gold-deep">Q&amp;A</em> en direct.
          </h1>
          <p className="mt-2 text-muted-strong max-w-xl">
            Pose tes questions aux recruteurs, fondateurs ou mentors en direct.
            Chat en temps réel, sans caméra.
          </p>
        </div>
        <Button asChild>
          <Link href="/jobs/live/new">
            <Plus className="w-4 h-4" aria-hidden />
            Programmer un live
          </Link>
        </Button>
      </header>

      {sessions.length === 0 ? (
        <EmptyState
          icon={Radio}
          title="Aucun live programmé"
          body="Sois le premier à programmer une session pour ta communauté."
          ctaHref="/jobs/live/new"
          ctaLabel="Programmer un live"
          tone="default"
          size="lg"
        />
      ) : (
        <ul className="space-y-3">
          {sessions.map((s) => {
            const hostName = s.host?.full_name ?? s.host?.username ?? "Hôte";
            const isLive = s.status === "live";
            return (
              <li key={s.id}>
                <Link
                  href={`/jobs/live/${s.id}`}
                  className="block p-5 rounded-3xl bg-white border border-line hover:border-night/30 hover:shadow-[0_30px_60px_-30px_rgba(10,31,68,0.25)] transition-all"
                >
                  <div className="flex items-start gap-3">
                    <Avatar
                      src={s.host?.avatar_url ?? null}
                      fullName={hostName}
                      size="md"
                    />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        {isLive ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-red-500 text-white text-[10px] font-bold uppercase tracking-widest">
                            <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
                            LIVE
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-gold/15 text-gold-deep text-[10px] font-bold uppercase tracking-widest">
                            <Calendar className="w-3 h-3" aria-hidden />
                            Programmé
                          </span>
                        )}
                        <span className="text-xs text-muted">
                          {new Date(s.scheduled_at).toLocaleString("fr-FR", {
                            dateStyle: "medium",
                            timeStyle: "short",
                          })}
                        </span>
                      </div>
                      <h3 className="mt-1 font-display text-xl text-night">
                        {s.title}
                      </h3>
                      <p className="mt-1 text-sm text-night-muted">
                        Animé par <strong>{hostName}</strong> · {s.duration_min} min
                      </p>
                      {s.description ? (
                        <p className="mt-2 text-sm text-night-muted line-clamp-2">
                          {s.description}
                        </p>
                      ) : null}
                    </div>
                    <span className="shrink-0 inline-flex items-center gap-1 text-xs text-muted">
                      <Users2 className="w-3.5 h-3.5" aria-hidden />
                      {s.attendees_count}
                    </span>
                  </div>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
      </Stack>
    </Container>
  );
}
