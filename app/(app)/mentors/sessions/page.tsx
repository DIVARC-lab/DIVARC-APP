import { ArrowLeft, CalendarCheck, GraduationCap, Inbox } from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Tabs } from "@/components/ui/Tabs";
import { listMyMentorSessions } from "@/lib/queries/mentors";
import { createClient } from "@/lib/supabase/server";
import { formatRelative } from "@/lib/utils/relativeTime";
import { SessionRespondActions } from "../_components/SessionRespondActions";

export const metadata = {
  title: "Mes sessions de mentorat",
};

const TABS = [
  { id: "demandes", label: "Reçues", icon: Inbox },
  { id: "envoyees", label: "Envoyées", icon: GraduationCap },
] as const;

type TabId = (typeof TABS)[number]["id"];
type SearchParams = Promise<{ tab?: string }>;

const STATUS_LABELS: Record<string, string> = {
  pending: "En attente",
  confirmed: "Confirmée",
  declined: "Refusée",
  completed: "Terminée",
  cancelled: "Annulée",
};

const STATUS_TONE: Record<string, string> = {
  pending: "bg-night/5 text-night-muted",
  confirmed: "bg-emerald-50 text-emerald-700",
  declined: "bg-red-50 text-red-600",
  completed: "bg-gold/15 text-gold-deep",
  cancelled: "bg-night/[0.04] text-muted",
};

export default async function MentorSessionsPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { tab } = await searchParams;
  const activeTab: TabId =
    (TABS.find((t) => t.id === tab)?.id as TabId) ?? "demandes";

  const role = activeTab === "demandes" ? "mentor" : "mentee";
  const sessions = await listMyMentorSessions(user.id, role);

  return (
    <div className="px-6 sm:px-10 py-10 max-w-3xl mx-auto w-full space-y-8">
      <header>
        <Link
          href="/mentors"
          className="inline-flex items-center gap-2 text-sm text-night-muted hover:text-night mb-3"
        >
          <ArrowLeft className="w-4 h-4" aria-hidden />
          Mentors
        </Link>
        <span className="text-xs font-semibold tracking-widest uppercase text-gold-deep">
          Sessions
        </span>
        <h1 className="mt-2 font-display text-4xl text-night">
          Tes <em className="italic">sessions de mentorat</em>.
        </h1>
      </header>

      <Tabs
        tabs={[...TABS]}
        activeId={activeTab}
        pathname="/mentors/sessions"
        defaultTab="demandes"
        paramName="tab"
      />

      {sessions.length === 0 ? (
        <div className="text-center py-16 px-6 rounded-3xl bg-white border border-line">
          <CalendarCheck
            className="w-8 h-8 mx-auto text-gold-deep mb-3"
            aria-hidden
          />
          <p className="text-sm text-muted">
            {activeTab === "demandes"
              ? "Pas encore de demande reçue."
              : "Pas encore de session demandée."}
          </p>
        </div>
      ) : (
        <ul className="space-y-3">
          {sessions.map((s) => (
            <li
              key={s.id}
              className="p-5 rounded-2xl bg-white border border-line"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <p className="font-display text-lg text-night truncate">
                    {s.topic}
                  </p>
                  <p className="text-xs text-muted mt-0.5 flex flex-wrap gap-2">
                    <span>{s.duration_min} min</span>
                    {s.scheduled_at ? (
                      <span>
                        ·{" "}
                        {new Date(s.scheduled_at).toLocaleString("fr-FR", {
                          dateStyle: "medium",
                          timeStyle: "short",
                        })}
                      </span>
                    ) : null}
                    <span>· Reçue {formatRelative(s.created_at)}</span>
                  </p>
                  {s.message ? (
                    <p className="mt-2 text-sm text-night-muted whitespace-pre-wrap line-clamp-3">
                      « {s.message} »
                    </p>
                  ) : null}
                </div>
                <span
                  className={`shrink-0 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest ${
                    STATUS_TONE[s.status] ?? "bg-night/5 text-night-muted"
                  }`}
                >
                  {STATUS_LABELS[s.status] ?? s.status}
                </span>
              </div>

              <div className="mt-3 flex justify-end gap-2">
                <SessionRespondActions
                  sessionId={s.id}
                  status={s.status}
                  isMentor={role === "mentor"}
                />
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
