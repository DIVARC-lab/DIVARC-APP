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
import { KickerLabel } from "@/components/ui/KickerLabel";
import { EmptyState } from "@/components/ui/EmptyState";
import { Container } from "@/components/primitives/Container";
import { Stack } from "@/components/primitives/Stack";

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
    <Container maxWidth="default" paddingX="page" paddingY="3xl">
      <Stack gap="3xl">
      <header>
        <Link
          href="/jobs"
          className="inline-flex items-center gap-2 text-sm text-night-muted hover:text-night mb-3"
        >
          <ArrowLeft className="w-4 h-4" aria-hidden />
          Emploi
        </Link>
        <KickerLabel>Alertes</KickerLabel>
        <h1 className="mt-2 font-display text-4xl text-night">
          Tes <em className="italic text-gold-deep">alertes emploi</em>.
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
          <EmptyState
            icon={BellRing}
            title="Pas encore d'alerte"
            body="Crée ta première alerte ci-dessus."
            tone="default"
          />
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
      </Stack>
    </Container>
  );
}
