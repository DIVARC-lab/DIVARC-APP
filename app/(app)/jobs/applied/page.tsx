import { ArrowLeft, Calendar, Send } from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { listMyApplications } from "@/lib/queries/jobs";
import { createClient } from "@/lib/supabase/server";
import { APPLICATION_STATUS_META } from "@/lib/utils/jobs";
import { formatRelative } from "@/lib/utils/relativeTime";
import { WithdrawButton } from "./_components/WithdrawButton";
import { KickerLabel } from "@/components/ui/KickerLabel";
import { EmptyState } from "@/components/ui/EmptyState";
import { Container } from "@/components/primitives/Container";
import { Stack } from "@/components/primitives/Stack";

export const metadata = {
  title: "Mes candidatures",
};

const TONE_CLASSES = {
  blue: "bg-night/5 text-night",
  green: "bg-emerald-50 text-emerald-700",
  red: "bg-red-50 text-red-600",
  neutral: "bg-night/[0.04] text-night-muted",
  muted: "bg-night/[0.04] text-muted",
  gold: "bg-gold/15 text-gold-deep",
} as const;

export default async function MyApplicationsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const applications = await listMyApplications(user.id);

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
        <KickerLabel>· Mes candidatures</KickerLabel>
        <h1 className="mt-3 font-display italic text-[40px] sm:text-[54px] text-night text-balance leading-[1.05] tracking-[-0.02em]">
          Tes <span className="text-gold-deep">candidatures</span>.
        </h1>
        <p className="mt-3 text-night-muted leading-relaxed">
          {applications.length} candidature{applications.length > 1 ? "s" : ""}{" "}
          envoyée{applications.length > 1 ? "s" : ""}
        </p>
      </header>

      {applications.length === 0 ? (
        <EmptyState
          icon={Send}
          title="Pas encore de candidature"
          body="Parcours les offres et postule en un clic."
          ctaHref="/jobs"
          ctaLabel="Voir les offres"
          tone="default"
        />
      ) : (
        <ul className="space-y-3">
          {applications.map((application) => {
            const statusMeta = APPLICATION_STATUS_META[application.status];
            const isActive = application.status === "pending" || application.status === "reviewed";
            return (
              <li
                key={application.id}
                className="p-5 rounded-3xl bg-white border border-line"
              >
                <div className="flex items-start justify-between gap-3">
                  <Link
                    href={`/jobs/${application.job.id}`}
                    className="flex-1 min-w-0 group"
                  >
                    <h3 className="font-display text-lg text-night group-hover:text-night-soft truncate">
                      {application.job.title}
                    </h3>
                    {application.job.company_name ? (
                      <p className="text-sm text-night-muted truncate">
                        {application.job.company_name}
                      </p>
                    ) : null}
                  </Link>
                  <span
                    className={`shrink-0 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest ${
                      TONE_CLASSES[statusMeta.tone]
                    }`}
                  >
                    {statusMeta.label}
                  </span>
                </div>

                {application.message ? (
                  <blockquote className="mt-3 p-3 rounded-2xl bg-night/[0.03] border border-line text-sm text-night-muted leading-relaxed line-clamp-2">
                    « {application.message} »
                  </blockquote>
                ) : null}

                <div className="mt-3 flex items-center justify-between text-xs text-muted">
                  <span className="flex items-center gap-1">
                    <Calendar className="w-3 h-3" aria-hidden />
                    Envoyée {formatRelative(application.created_at)}
                  </span>
                  {isActive ? (
                    <WithdrawButton applicationId={application.id} />
                  ) : null}
                </div>
              </li>
            );
          })}
        </ul>
      )}
      </Stack>
    </Container>
  );
}
