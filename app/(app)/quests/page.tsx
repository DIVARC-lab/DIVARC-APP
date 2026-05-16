/* Sprint F.2 — Page Quests : liste les quêtes actives + progress du
 * user courant. Cards avec icon, title, description, progress bar
 * et badge "Terminé" si completed_at != null. */

import { redirect } from "next/navigation";
import { Target, Trophy } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { listActiveQuestsForUser, pingUserStreak } from "@/lib/queries/gamification";

export const metadata = { title: "Quêtes" };

export default async function QuestsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login?next=/quests");

  /* Profite du chargement de la page pour pinger le streak du user. */
  await pingUserStreak(user.id);

  const quests = await listActiveQuestsForUser(user.id);

  const weekly = quests.filter((q) => q.period === "weekly");
  const daily = quests.filter((q) => q.period === "daily");

  return (
    <div className="px-5 sm:px-8 py-6 max-w-3xl mx-auto">
      <header className="mb-5 flex items-center gap-2">
        <Target className="w-4 h-4 text-gold-deep" aria-hidden />
        <h1 className="text-[15px] sm:text-[17px] font-bold text-night">
          Quêtes
        </h1>
      </header>
      <p className="text-[12px] text-night-dim mb-5 max-w-prose leading-relaxed">
        Termine ces missions pour grappiller de l&apos;XP, débloquer des
        badges et grimper au classement de tes cercles.
      </p>

      <QuestSection title="Cette semaine" quests={weekly} />
      <QuestSection title="Aujourd&rsquo;hui" quests={daily} />
    </div>
  );
}

type QuestSectionProps = {
  title: string;
  quests: Awaited<ReturnType<typeof listActiveQuestsForUser>>;
};

function QuestSection({ title, quests }: QuestSectionProps) {
  if (quests.length === 0) return null;
  return (
    <section className="mb-6">
      <h2 className="text-[11px] font-bold uppercase tracking-wider text-night-dim mb-2">
        {title}
      </h2>
      <ul className="space-y-2">
        {quests.map((q) => {
          const target = q.criteria.target;
          const pct = Math.min(100, Math.round((q.progress / target) * 100));
          const done = q.completed_at != null;
          return (
            <li
              key={q.id}
              className={`rounded-2xl border p-3.5 ${
                done
                  ? "border-emerald-200 bg-emerald-50"
                  : "border-line bg-white"
              }`}
            >
              <div className="flex items-start gap-3">
                <div
                  className={`shrink-0 w-9 h-9 rounded-full flex items-center justify-center text-[18px] ${
                    done ? "bg-emerald-100" : "bg-bg-soft"
                  }`}
                >
                  {q.icon}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-[13px] font-bold text-night">
                      {q.title}
                    </p>
                    <span className="inline-flex items-center gap-1 text-[10.5px] font-bold text-gold-deep">
                      <Trophy className="w-3 h-3" aria-hidden />
                      {q.xp_reward} XP
                    </span>
                  </div>
                  <p className="mt-0.5 text-[11.5px] text-night-dim">
                    {q.description}
                  </p>
                  <div className="mt-2 flex items-center gap-2">
                    <div className="flex-1 h-1.5 rounded-full bg-bg-soft overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all ${
                          done ? "bg-emerald-500" : "bg-gold"
                        }`}
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                    <span className="text-[10.5px] font-bold tabular-nums text-night-dim">
                      {q.progress}/{target}
                    </span>
                  </div>
                </div>
              </div>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
