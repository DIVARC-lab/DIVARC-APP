import { AlertTriangle, Inbox, Scale } from "lucide-react";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { DisplayHeading } from "@/components/ui/DisplayHeading";
import { KickerLabel } from "@/components/ui/KickerLabel";
import { isCurrentUserAdmin } from "@/lib/queries/admin";
import {
  getQueueStats,
  getReportDetail,
  listPendingReports,
} from "@/lib/queries/moderation";
import { CATEGORY_BY_ID } from "@/lib/moderation/categories";
import { createClient } from "@/lib/supabase/server";
import { ModerationActionPanel } from "./_components/ModerationActionPanel";
import { ReportListItem } from "./_components/ReportListItem";
import { Container } from "@/components/primitives/Container";

export const metadata = {
  title: "Modération — File de revue",
};

type SearchParams = Promise<{ id?: string; category?: string }>;

export default async function ModerationConsolePage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  if (!(await isCurrentUserAdmin())) notFound();

  const { id, category } = await searchParams;

  const [reports, stats] = await Promise.all([
    listPendingReports({
      category: category
        ? [category as keyof typeof CATEGORY_BY_ID]
        : undefined,
      limit: 100,
    }),
    getQueueStats(),
  ]);

  const selectedReport = id ? await getReportDetail(id) : reports[0]
    ? await getReportDetail(reports[0].id)
    : null;

  return (
    <div className="bg-bg-soft min-h-screen pb-12">
      <Container maxWidth="full" paddingX="page" paddingY="2xl">
        <header className="mb-6">
          <KickerLabel>· Trust & Safety</KickerLabel>
          <div className="flex items-baseline justify-between gap-4 flex-wrap">
            <DisplayHeading
              size="lg"
              className="mt-2 !leading-[1.05] !text-[32px] sm:!text-[40px]"
            >
              File de modération
            </DisplayHeading>
            <Link
              href="/admin"
              className="text-[12px] font-bold text-night-muted hover:text-night"
            >
              ← Tableau de bord admin
            </Link>
          </div>
          <StatsRow stats={stats} />
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-[320px_1fr] xl:grid-cols-[320px_1fr_360px] gap-4 lg:gap-5 items-start">
          {/* Colonne gauche — file */}
          <aside className="bg-white rounded-2xl border border-line overflow-hidden lg:sticky lg:top-4 lg:max-h-[calc(100vh-32px)] flex flex-col">
            <div className="p-3.5 border-b border-line">
              <CategoryFilter active={category ?? null} />
            </div>
            <ul className="overflow-y-auto flex-1 divide-y divide-line">
              {reports.length === 0 ? (
                <li className="px-4 py-8 text-center text-[13px] text-night-muted">
                  Aucun signalement en attente.
                </li>
              ) : (
                reports.map((r) => (
                  <li key={r.id}>
                    <ReportListItem
                      report={r}
                      isSelected={selectedReport?.id === r.id}
                      categoryParam={category}
                    />
                  </li>
                ))
              )}
            </ul>
          </aside>

          {/* Colonne centrale — détail */}
          <section className="bg-white rounded-2xl border border-line p-5 sm:p-6">
            {selectedReport ? (
              <ReportDetailView report={selectedReport} />
            ) : (
              <EmptySelectionState />
            )}
          </section>

          {/* Colonne droite — actions (xl seulement, sinon dessous) */}
          {selectedReport ? (
            <aside className="xl:sticky xl:top-4">
              <ModerationActionPanel report={selectedReport} />
            </aside>
          ) : null}
        </div>
      </Container>
    </div>
  );
}

function StatsRow({ stats }: { stats: Awaited<ReturnType<typeof getQueueStats>> }) {
  return (
    <ul className="mt-4 grid grid-cols-3 gap-2.5 max-w-2xl">
      <Stat label="En attente" value={stats.pending} icon={Inbox} />
      <Stat
        label="Priorité critique"
        value={stats.critical}
        icon={AlertTriangle}
        accent="red"
      />
      <Stat label="Recours en cours" value={stats.appealsPending} icon={Scale} />
    </ul>
  );
}

function Stat({
  label,
  value,
  icon: Icon,
  accent = "neutral",
}: {
  label: string;
  value: number;
  icon: typeof Inbox;
  accent?: "neutral" | "red";
}) {
  return (
    <li
      className={`flex items-center gap-3 px-3.5 py-3 rounded-2xl border bg-white ${
        accent === "red" && value > 0
          ? "border-red-200 bg-red-50/40"
          : "border-line"
      }`}
    >
      <span
        aria-hidden
        className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
          accent === "red" && value > 0
            ? "bg-red-100 text-red-700"
            : "bg-gold/15 text-gold-deep"
        }`}
      >
        <Icon className="w-[18px] h-[18px]" aria-hidden />
      </span>
      <div className="min-w-0">
        <p className="text-[11px] uppercase tracking-wider text-night-muted">
          {label}
        </p>
        <p className="text-[18px] font-bold text-night leading-tight">{value}</p>
      </div>
    </li>
  );
}

function CategoryFilter({ active }: { active: string | null }) {
  const options = [
    { id: null, label: "Toutes" },
    { id: "child_safety", label: "Enfance" },
    { id: "self_harm", label: "Self-harm" },
    { id: "violence", label: "Violence" },
    { id: "hate_speech", label: "Haine" },
    { id: "harassment", label: "Harcèlement" },
    { id: "scam_fraud", label: "Fraude" },
    { id: "spam", label: "Spam" },
  ];
  return (
    <div className="flex items-center gap-1.5 flex-wrap">
      {options.map((o) => (
        <Link
          key={o.id ?? "all"}
          href={
            o.id ? `/admin/moderation?category=${o.id}` : "/admin/moderation"
          }
          className={`px-2.5 py-1 rounded-full text-[11px] font-semibold border ${
            active === o.id || (!active && !o.id)
              ? "border-night bg-night text-cream"
              : "border-line text-night-muted hover:bg-bg-soft"
          }`}
        >
          {o.label}
        </Link>
      ))}
    </div>
  );
}

function EmptySelectionState() {
  return (
    <div className="text-center py-16">
      <p className="text-[14px] text-night-muted">
        Sélectionne un signalement à gauche pour l&apos;examiner.
      </p>
    </div>
  );
}

function ReportDetailView({
  report,
}: {
  report: NonNullable<Awaited<ReturnType<typeof getReportDetail>>>;
}) {
  const cat = CATEGORY_BY_ID[report.category];
  const target = report.target;
  return (
    <div className="space-y-6">
      <div>
        <p className="text-[11px] uppercase tracking-wider text-gold-deep font-extrabold">
          {cat?.label ?? report.category}
          {report.subcategory ? ` · ${report.subcategory}` : ""}
        </p>
        <h2 className="text-[22px] font-display font-normal mt-1 text-night">
          Signalement #{report.id.slice(0, 8).toUpperCase()}
        </h2>
        <div className="mt-2 flex items-center gap-3 text-[12px] text-night-muted flex-wrap">
          <span>
            Priorité :{" "}
            <strong className="text-night">{report.priority_score}/100</strong>
          </span>
          <span>·</span>
          <span>
            Statut :{" "}
            <span className="font-mono text-night">{report.status}</span>
          </span>
          <span>·</span>
          <span>
            Reçu le{" "}
            {new Date(report.created_at).toLocaleDateString("fr-FR", {
              day: "numeric",
              month: "long",
              year: "numeric",
              hour: "2-digit",
              minute: "2-digit",
            })}
          </span>
          {report.duplicate_count > 1 ? (
            <>
              <span>·</span>
              <span className="px-2 py-0.5 rounded-full bg-amber-50 text-amber-800 border border-amber-200 font-semibold">
                {report.duplicate_count} signalements
              </span>
            </>
          ) : null}
        </div>
      </div>

      {report.description ? (
        <section>
          <h3 className="text-[12px] font-bold uppercase tracking-wider text-muted mb-2">
            Description du reporter
          </h3>
          <p className="text-[14px] text-night-soft leading-relaxed bg-bg-soft border border-line rounded-2xl p-4 whitespace-pre-wrap">
            {report.description}
          </p>
        </section>
      ) : null}

      {target ? (
        <section>
          <h3 className="text-[12px] font-bold uppercase tracking-wider text-muted mb-2">
            Contenu signalé
          </h3>
          <TargetCard target={target} />
        </section>
      ) : (
        <section className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-[13px] text-amber-900">
          Le contenu cible n&apos;a pas pu être chargé (supprimé ou
          inaccessible).
        </section>
      )}

      {report.author_history ? (
        <section>
          <h3 className="text-[12px] font-bold uppercase tracking-wider text-muted mb-2">
            Historique de l&apos;auteur
          </h3>
          <AuthorHistoryCard history={report.author_history} />
        </section>
      ) : null}

      {report.related_reports.length > 0 ? (
        <section>
          <h3 className="text-[12px] font-bold uppercase tracking-wider text-muted mb-2">
            Autres signalements sur ce contenu ({report.related_reports.length})
          </h3>
          <ul className="space-y-1.5">
            {report.related_reports.map((r) => {
              const meta = CATEGORY_BY_ID[r.category];
              return (
                <li
                  key={r.id}
                  className="rounded-xl border border-line bg-bg-soft px-3 py-2 text-[12px]"
                >
                  <p className="font-semibold text-night">
                    {meta?.label ?? r.category}
                  </p>
                  {r.description ? (
                    <p className="text-night-muted mt-0.5 line-clamp-2">
                      {r.description}
                    </p>
                  ) : null}
                  <p className="text-night-muted text-[11px] mt-0.5">
                    {new Date(r.created_at).toLocaleDateString("fr-FR")}
                  </p>
                </li>
              );
            })}
          </ul>
        </section>
      ) : null}
    </div>
  );
}

function TargetCard({
  target,
}: {
  target: NonNullable<
    NonNullable<Awaited<ReturnType<typeof getReportDetail>>>["target"]
  >;
}) {
  return (
    <div className="rounded-2xl border border-line bg-bg-soft p-4">
      <div className="flex items-start gap-3">
        {target.author_avatar_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={target.author_avatar_url}
            alt=""
            className="w-10 h-10 rounded-full object-cover shrink-0"
          />
        ) : (
          <span
            aria-hidden
            className="w-10 h-10 rounded-full bg-gold/15 text-gold-deep flex items-center justify-center text-[13px] font-bold shrink-0"
          >
            {(target.author_full_name ?? target.author_username ?? "?")
              .slice(0, 1)
              .toUpperCase()}
          </span>
        )}
        <div className="min-w-0 flex-1">
          <div className="flex items-baseline gap-2 flex-wrap">
            <p className="text-[14px] font-semibold text-night truncate">
              {target.author_full_name ?? target.author_username ?? "Anonyme"}
            </p>
            <span className="text-[11px] text-night-muted">
              · {target.type}
            </span>
            {target.url_in_app ? (
              <Link
                href={target.url_in_app}
                target="_blank"
                rel="noreferrer"
                className="text-[12px] text-gold-deep hover:underline ml-auto"
              >
                Voir en contexte ↗
              </Link>
            ) : null}
          </div>
          {target.title ? (
            <p className="text-[15px] font-semibold text-night mt-1.5">
              {target.title}
            </p>
          ) : null}
          {target.body ? (
            <p className="text-[13.5px] text-night-soft mt-1.5 leading-relaxed whitespace-pre-wrap">
              {target.body}
            </p>
          ) : null}
        </div>
      </div>
    </div>
  );
}

function AuthorHistoryCard({
  history,
}: {
  history: NonNullable<
    NonNullable<Awaited<ReturnType<typeof getReportDetail>>>["author_history"]
  >;
}) {
  const trustColor =
    history.trust_score >= 80
      ? "text-emerald-700"
      : history.trust_score >= 40
        ? "text-night"
        : "text-red-700";
  return (
    <div className="rounded-2xl border border-line bg-white p-4 grid grid-cols-2 sm:grid-cols-3 gap-3 text-[12px]">
      <KV
        label="Trust score"
        value={
          <span className={`font-semibold ${trustColor}`}>
            {history.trust_score}/100
          </span>
        }
      />
      <KV label="Ancienneté" value={`${history.account_age_days} j`} />
      <KV label="Avertissements" value={history.warnings_count} />
      <KV label="Contenus retirés" value={history.content_removed_count} />
      <KV label="Timeouts subis" value={history.timeouts_received} />
      <KV
        label="Actions modé totales"
        value={history.prior_actions_count}
      />
      {history.active_sanction_type ? (
        <KV
          label="Sanction active"
          value={
            <span className="px-2 py-0.5 rounded bg-red-100 text-red-700 font-semibold uppercase text-[10px]">
              {history.active_sanction_type}
            </span>
          }
        />
      ) : null}
    </div>
  );
}

function KV({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div>
      <p className="text-[10px] uppercase tracking-wider text-muted">{label}</p>
      <p className="text-night mt-0.5">{value}</p>
    </div>
  );
}
