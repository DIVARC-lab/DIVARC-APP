import { ArrowLeft, BellRing } from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { listMySavedSearches } from "@/lib/queries/savedSearches";
import {
  JOB_CATEGORY_META,
  JOB_TYPE_META,
  WORK_MODE_META,
} from "@/lib/utils/jobs";
import { createClient } from "@/lib/supabase/server";
import { SavedSearchCard } from "./_components/SavedSearchCard";
import { CreateAlertCard } from "./_components/CreateAlertCard";

export const metadata = {
  title: "Alertes emploi",
};

export default async function AlertsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const alerts = await listMySavedSearches(user.id);

  return (
    <div className="px-6 sm:px-10 py-10 max-w-3xl mx-auto w-full space-y-8">
      <header>
        <Link
          href="/jobs"
          className="inline-flex items-center gap-2 text-sm text-night-muted hover:text-night mb-3"
        >
          <ArrowLeft className="w-4 h-4" aria-hidden />
          Emploi
        </Link>
        <span className="text-xs font-semibold tracking-widest uppercase text-gold-deep">
          Alertes
        </span>
        <h1 className="mt-2 font-display text-4xl text-night">
          Tes <em className="italic">alertes emploi</em>.
        </h1>
        <p className="mt-1 text-muted-strong">
          Quand une nouvelle offre matche, tu reçois une notification dans les
          secondes qui suivent.
        </p>
      </header>

      <CreateAlertCard
        categories={Object.entries(JOB_CATEGORY_META).map(([id, meta]) => ({
          value: id,
          label: meta.label,
        }))}
        jobTypes={Object.entries(JOB_TYPE_META).map(([id, meta]) => ({
          value: id,
          label: meta.label,
        }))}
        workModes={Object.entries(WORK_MODE_META).map(([id, meta]) => ({
          value: id,
          label: meta.label,
        }))}
      />

      <section>
        <h2 className="font-display text-2xl text-night mb-4">
          Mes alertes ({alerts.length})
        </h2>
        {alerts.length === 0 ? (
          <div className="text-center py-12 px-6 rounded-3xl bg-white border border-line">
            <div
              aria-hidden
              className="w-16 h-16 mx-auto rounded-2xl bg-gradient-to-br from-cream to-gold/15 border border-gold/30 flex items-center justify-center mb-4"
            >
              <BellRing className="w-6 h-6 text-gold-deep" aria-hidden />
            </div>
            <h3 className="font-display text-xl text-night">
              Pas encore d&apos;alerte
            </h3>
            <p className="mt-2 text-sm text-muted">
              Crée ta première alerte ci-dessus.
            </p>
          </div>
        ) : (
          <ul className="space-y-3">
            {alerts.map((alert) => (
              <li key={alert.id}>
                <SavedSearchCard alert={alert} />
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
