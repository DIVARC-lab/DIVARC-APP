import {
  ArrowLeft,
  Briefcase,
  CheckCircle2,
  Clock,
  Compass,
  MessageSquareText,
  Share2,
  Sparkles,
  Users,
} from "lucide-react";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ArcDeco } from "@/components/marketing/ArcDeco";
import { Avatar } from "@/components/ui/Avatar";
import { SaveJobButton } from "@/components/jobs/SaveJobButton";
import {
  APPLICATION_STATUS_META,
  EXPERIENCE_META,
  JOB_CATEGORY_META,
  JOB_TYPE_META,
  WORK_MODE_META,
} from "@/lib/utils/jobs";
import { formatRelative } from "@/lib/utils/relativeTime";
import { getJobById } from "@/lib/queries/jobs";
import { getCurrentProfile } from "@/lib/queries/profile";
import { getProProfile } from "@/lib/queries/profilePro";
import { listFriendsForUser } from "@/lib/queries/friendships";
import {
  listMyExistingReferrals,
  listReferralsOnJob,
} from "@/lib/queries/referrals";
import { jobJsonLd, jsonLdScriptProps } from "@/lib/seo/jsonLd";
import { createClient } from "@/lib/supabase/server";
import { buildApplicationDraft } from "@/lib/utils/applicationDraft";
import { ApplyDialog } from "./_components/ApplyDialog";
import { ReferDialog } from "./_components/ReferDialog";
import { Container } from "@/components/primitives/Container";

type Params = Promise<{ id: string }>;

export async function generateMetadata({ params }: { params: Params }) {
  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { title: "Offre" };
  const job = await getJobById(id, user.id);
  if (!job) return { title: "Offre introuvable" };
  return {
    title: job.title,
    description: job.description.slice(0, 160),
  };
}

/* Refonte audit /jobs/[id] (handoff feed-jobs.jsx JobsDetailScreen
 * L113-217) — mobile-first Bold :
 * - Top bar : back/share/save chips white border
 * - Header card r-[24px] white avec ArcDeco gold filigrane top-right :
 *   icone navy 56 + chips type/cat/active + title italic 26 + company
 *   verified ✓
 * - Facts grid 2x2 : Localisation/Niveau/Candidatures/Publiée
 * - Salary card gradient cream + €
 * - Description avec kicker + bullets ✓ gold
 * - Poster card r-[18px] avatar 44 + name + meta
 * - Sticky CTA bottom : SaveJobButton lg + ApplyDialog primary-pill */
export default async function JobDetailPage({
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

  const job = await getJobById(id, user.id);
  if (!job) notFound();

  const isOwn = job.poster_id === user.id;

  const canRefer = job.status === "active" && !isOwn;
  const [friendsRaw, alreadyReferred] = canRefer
    ? await Promise.all([
        listFriendsForUser(user.id),
        listMyExistingReferrals({ userId: user.id, jobId: job.id }),
      ])
    : [[], []];
  const friends = friendsRaw.map((f) => ({
    user_id: f.other.id,
    full_name: f.other.full_name,
    username: f.other.username,
    avatar_url: f.other.avatar_url,
  }));
  const referralsForOwner = isOwn ? await listReferralsOnJob(job.id) : [];

  const canApply = !isOwn && !job.has_applied && job.status === "active";
  const [proProfile, currentProfile] = canApply
    ? await Promise.all([getProProfile(user.id), getCurrentProfile()])
    : [null, null];
  const hasProProfile =
    proProfile !== null &&
    (proProfile.experiences.length > 0 ||
      proProfile.skills.length > 0 ||
      Boolean(currentProfile?.headline));
  const draftFromProfile =
    hasProProfile && proProfile && currentProfile
      ? buildApplicationDraft({
          profile: {
            full_name: currentProfile.full_name,
            headline: currentProfile.headline,
            location: currentProfile.location,
          },
          job: {
            title: job.title,
            company_name: job.company_name,
            location: job.location,
            experience_level: job.experience_level,
          },
          experiences: proProfile.experiences,
          skills: proProfile.skills,
        })
      : null;

  const isClosed = job.status === "closed";
  const typeMeta = JOB_TYPE_META[job.job_type];
  const modeMeta = WORK_MODE_META[job.work_mode];
  const categoryMeta = JOB_CATEGORY_META[job.category];
  const posterName =
    job.poster?.full_name ?? job.poster?.username ?? "Recruteur";
  const myApplication = job.my_application;

  const salaryFormatted = formatSalary(
    job.salary_min,
    job.salary_max,
    job.salary_currency,
    job.salary_period,
  );

  /* JSON-LD JobPosting (Schema.org) — éligible Google for Jobs.
     N'est rendu que pour les jobs ouverts (status active). */
  const jsonLd =
    job.status === "active"
      ? jobJsonLd({
          id: job.id,
          title: job.title,
          description: job.description,
          postedAt: job.created_at,
          validThrough: job.closed_at,
          employmentType: job.job_type,
          location: job.location,
          remote: job.work_mode === "remote",
          salaryMin: job.salary_min,
          salaryMax: job.salary_max,
          currency: job.salary_currency ?? "EUR",
          companyName: job.company_name,
          companyLogo: null,
        })
      : null;

  return (
    <div className="bg-bg-soft min-h-screen pb-[120px] relative">
      {jsonLd ? <script {...jsonLdScriptProps(jsonLd)} /> : null}
      <Container maxWidth="text" paddingX="none">
        {/* Top bar : back / share / save (proto L117-123) */}
        <div className="flex items-center justify-between gap-3 px-4 pt-12 sm:pt-14 pb-2">
          <Link
            href="/jobs"
            aria-label="Retour aux offres"
            className="flex h-9 w-9 items-center justify-center rounded-full bg-white border border-line text-night hover:border-night/30 transition-colors"
          >
            <ArrowLeft className="w-[15px] h-[15px]" aria-hidden />
          </Link>
          <div className="flex items-center gap-2">
            <button
              type="button"
              aria-label="Partager"
              className="flex h-9 w-9 items-center justify-center rounded-full bg-white border border-line text-night hover:border-night/30 transition-colors"
            >
              <Share2 className="w-[14px] h-[14px]" aria-hidden />
            </button>
            <SaveJobButton
              jobId={job.id}
              initialSaved={job.is_saved}
              size="md"
              className="!bg-cream !border-gold/40 !text-gold-deep"
            />
          </div>
        </div>

        {/* Header card */}
        <div className="px-4 pt-1">
          <article className="relative overflow-hidden rounded-[24px] bg-white border border-line p-[18px]">
            <div
              aria-hidden
              className="absolute -right-14 -top-14 opacity-50 pointer-events-none"
            >
              <ArcDeco size={180} tone="gold" opacity={0.5} stroke={1.25} />
            </div>

            <div className="relative flex items-start gap-3.5">
              {/* Icone navy 56 */}
              <div className="flex h-14 w-14 items-center justify-center rounded-[14px] bg-night text-cream text-[28px] shrink-0">
                {typeMeta.emoji}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex flex-wrap gap-1 items-center">
                  <span className="inline-flex items-center px-1.5 py-[2px] rounded-md bg-night/[0.06] text-night-dim text-[9px] font-extrabold uppercase tracking-[0.06em]">
                    {typeMeta.label}
                  </span>
                  <span className="inline-flex items-center px-1.5 py-[2px] rounded-md bg-cream text-gold-deep text-[9px] font-extrabold uppercase tracking-[0.06em]">
                    {categoryMeta.label}
                  </span>
                  {!isClosed ? (
                    <span className="inline-flex items-center gap-0.5 px-1.5 py-[2px] rounded-md bg-emerald-100/60 text-emerald-700 text-[9px] font-extrabold uppercase tracking-[0.06em]">
                      ● Active
                    </span>
                  ) : (
                    <span className="inline-flex items-center px-1.5 py-[2px] rounded-md bg-night text-cream text-[9px] font-extrabold uppercase tracking-[0.06em]">
                      Clôturée
                    </span>
                  )}
                  <span className="inline-flex items-center px-1.5 py-[2px] rounded-md bg-night/[0.06] text-night-dim text-[9px] font-extrabold uppercase tracking-[0.06em]">
                    {modeMeta.label}
                  </span>
                </div>
                <h1 className="mt-2 font-display text-[26px] text-night leading-[1.05] font-normal tracking-[-0.01em] text-balance">
                  {job.title}
                </h1>
                {job.company_name ? (
                  <p className="mt-1 inline-flex items-center gap-1.5 text-[13px] font-bold text-night">
                    {job.company_name}
                    <span
                      aria-label="Profil vérifié"
                      className="inline-flex h-3 w-3 items-center justify-center rounded-full bg-gold text-night text-[7px] font-extrabold"
                    >
                      ✓
                    </span>
                  </p>
                ) : null}
              </div>
            </div>

            {/* Facts grid 2x2 */}
            <div className="mt-3.5 grid grid-cols-2 gap-2 relative">
              {job.location ? (
                <Fact icon={Compass} label="Localisation" value={job.location} />
              ) : null}
              <Fact
                icon={Sparkles}
                label="Niveau"
                value={EXPERIENCE_META[job.experience_level]}
              />
              <Fact
                icon={Users}
                label="Candidatures"
                value={`${job.applications_count} reçue${job.applications_count > 1 ? "s" : ""}`}
              />
              <Fact
                icon={Clock}
                label="Publiée"
                value={formatRelative(job.created_at)}
              />
            </div>

            {/* Salary card */}
            {salaryFormatted ? (
              <div className="mt-3 p-3.5 rounded-[16px] bg-gradient-to-br from-cream to-white border border-gold/30 flex items-center justify-between gap-2.5 relative">
                <div className="min-w-0">
                  <p className="text-[9px] font-extrabold uppercase tracking-[0.12em] text-gold-deep">
                    Rémunération
                  </p>
                  <p className="mt-0.5 font-display italic text-[22px] text-night leading-none">
                    {salaryFormatted.amount}
                    <span className="not-italic text-[12px] text-night-dim ml-1">
                      /{salaryFormatted.period}
                    </span>
                  </p>
                </div>
                <span
                  aria-hidden
                  className="flex h-8 w-8 items-center justify-center rounded-full bg-night text-gold text-base font-bold shrink-0"
                >
                  €
                </span>
              </div>
            ) : null}
          </article>
        </div>

        {/* Description */}
        <section className="px-6 pt-5">
          <p className="text-[11px] font-extrabold uppercase tracking-[0.16em] text-gold-deep">
            · Description
          </p>
          <p className="mt-2 text-[14px] text-night-soft leading-[1.6] whitespace-pre-wrap text-pretty">
            {job.description}
          </p>
        </section>

        {/* Poster card */}
        {job.poster ? (
          <section className="px-4 pt-5">
            <Link
              href={`/u/${job.poster.username ?? ""}`}
              className="flex items-center gap-3 p-3.5 rounded-[18px] bg-white border border-line hover:border-gold/40 transition-colors"
            >
              <Avatar
                src={job.poster.avatar_url}
                fullName={posterName}
                size="md-bold"
              />
              <div className="flex-1 min-w-0">
                <p className="text-[9px] font-extrabold uppercase tracking-[0.12em] text-night-dim">
                  Publié par
                </p>
                <p className="mt-0.5 text-[14px] font-bold text-night truncate">
                  {posterName}
                  {job.company_name ? (
                    <span className="font-medium text-night-soft">
                      {" · "}
                      {job.company_name}
                    </span>
                  ) : null}
                </p>
                <p className="text-[11px] text-night-dim">
                  Voir le profil →
                </p>
              </div>
              <span
                aria-hidden
                className="flex h-9 w-9 items-center justify-center rounded-full bg-bg-soft text-night"
              >
                <MessageSquareText className="w-[14px] h-[14px]" aria-hidden />
              </span>
            </Link>
          </section>
        ) : null}

        {/* Cooptation card */}
        {canRefer && friends.length > 0 ? (
          <section className="px-4 pt-3">
            <article className="p-4 rounded-[18px] bg-gradient-to-br from-cream via-bg to-gold/10 border border-gold/30">
              <p className="text-[11px] font-extrabold uppercase tracking-[0.16em] text-gold-deep">
                · Cooptation
              </p>
              <p className="mt-1.5 text-[13px] text-night-soft leading-[1.5]">
                Tu connais quelqu&apos;un qui ferait l&apos;affaire ?
                Recommande-le en 1 clic.
              </p>
              <div className="mt-3">
                <ReferDialog
                  jobId={job.id}
                  jobTitle={job.title}
                  friends={friends}
                  alreadyReferredIds={alreadyReferred}
                />
              </div>
            </article>
          </section>
        ) : null}

        {/* Owner : referrals received */}
        {isOwn && referralsForOwner.length > 0 ? (
          <section className="px-4 pt-3">
            <article className="p-4 rounded-[18px] bg-white border border-line">
              <p className="text-[11px] font-extrabold uppercase tracking-[0.16em] text-gold-deep">
                · Cooptations reçues ({referralsForOwner.length})
              </p>
              <ul className="mt-2 space-y-1.5">
                {referralsForOwner.map((r) => (
                  <li
                    key={r.id}
                    className="flex items-center gap-2 text-[13px] text-night-soft"
                  >
                    <Avatar
                      src={r.referrer?.avatar_url ?? null}
                      fullName={r.referrer?.full_name ?? null}
                      size="sm"
                      className="!w-6 !h-6 !text-[10px]"
                    />
                    <span className="truncate">
                      <strong className="text-night">
                        {r.referrer?.full_name ?? "Un membre"}
                      </strong>{" "}
                      coopte{" "}
                      <strong className="text-night">
                        {r.referred?.full_name ??
                          "@" + (r.referred?.username ?? "")}
                      </strong>
                      {r.application_id ? (
                        <span className="text-emerald-700 font-semibold">
                          {" · a postulé ✓"}
                        </span>
                      ) : null}
                    </span>
                  </li>
                ))}
              </ul>
            </article>
          </section>
        ) : null}

        {/* Application existante */}
        {myApplication && myApplication.status !== "withdrawn" ? (
          <section className="px-4 pt-3">
            <article className="p-4 rounded-[18px] bg-gradient-to-br from-cream to-bg border border-gold/30">
              <div className="flex items-center justify-between gap-2">
                <p className="text-[11px] font-extrabold uppercase tracking-[0.16em] text-gold-deep">
                  · Ta candidature
                </p>
                <span className="inline-flex items-center gap-1 px-2.5 h-6 rounded-full bg-emerald-50 text-emerald-700 text-[11px] font-bold">
                  <CheckCircle2 className="w-3 h-3" aria-hidden />
                  {APPLICATION_STATUS_META[myApplication.status].label}
                </span>
              </div>
              {myApplication.message ? (
                <p className="mt-2 text-[13px] text-night-soft leading-[1.5] line-clamp-4">
                  « {myApplication.message} »
                </p>
              ) : null}
              <p className="mt-2 text-[11px] text-night-dim">
                Envoyée {formatRelative(myApplication.created_at)}
              </p>
            </article>
          </section>
        ) : null}
      </Container>

      {/* Sticky CTA bottom */}
      <div
        className="fixed inset-x-0 bottom-0 z-30 px-4 pt-3 bg-[rgba(248,249,251,0.92)] backdrop-blur-md border-t border-line"
        style={{
          paddingBottom: "max(env(safe-area-inset-bottom, 16px), 16px)",
        }}
      >
        <Container maxWidth="text" paddingX="none" className="flex items-center gap-2.5">
          {isOwn ? (
            <Link
              href={`/jobs/${job.id}/applicants`}
              className="flex-1 inline-flex items-center justify-center gap-2 h-12 px-5 rounded-full bg-night text-cream font-extrabold text-[14px] hover:bg-night-soft transition-colors"
            >
              <Users className="w-[15px] h-[15px]" aria-hidden />
              Voir les candidats
            </Link>
          ) : isClosed ? (
            <button
              type="button"
              disabled
              className="flex-1 inline-flex items-center justify-center gap-2 h-12 px-5 rounded-full bg-night/30 text-night/60 font-extrabold text-[14px] cursor-not-allowed"
            >
              <Briefcase className="w-[15px] h-[15px]" aria-hidden />
              Offre clôturée
            </button>
          ) : myApplication && myApplication.status !== "withdrawn" ? (
            <span className="flex-1 inline-flex items-center justify-center gap-2 h-12 px-5 rounded-full bg-emerald-50 text-emerald-700 font-bold text-[14px]">
              <CheckCircle2 className="w-[15px] h-[15px]" aria-hidden />
              Candidature envoyée
            </span>
          ) : (
            <>
              <SaveJobButton
                jobId={job.id}
                initialSaved={job.is_saved}
                size="lg"
                className="!bg-white !border-line shrink-0"
              />
              <ApplyDialog
                jobId={job.id}
                jobTitle={job.title}
                draftFromProfile={draftFromProfile}
                hasProProfile={hasProProfile}
                triggerVariant="primary-pill"
                triggerLabel="Postuler · 1 clic"
              />
            </>
          )}
        </Container>
      </div>
    </div>
  );
}

function Fact({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof Compass;
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-[12px] bg-night/[0.03] border border-line p-2.5">
      <div className="inline-flex items-center gap-1.5 text-[9px] font-extrabold uppercase tracking-[0.1em] text-night-dim">
        <Icon className="w-[10px] h-[10px]" aria-hidden />
        {label}
      </div>
      <p className="mt-0.5 text-[12px] font-bold text-night truncate">
        {value}
      </p>
    </div>
  );
}

function formatSalary(
  min: number | null,
  max: number | null,
  currency: string | null,
  period: string | null,
): { amount: string; period: string } | null {
  if (!min && !max) return null;
  const symbol =
    currency === "EUR" ? "€" : currency === "USD" ? "$" : currency ?? "€";
  const minK = min ? formatK(min) : null;
  const maxK = max ? formatK(max) : null;
  const amount =
    minK && maxK ? `${minK}–${maxK}${symbol}` : `${minK ?? maxK}${symbol}`;
  const periodLabel =
    period === "year"
      ? "an"
      : period === "month"
        ? "mois"
        : period === "day"
          ? "jour"
          : period === "hour"
            ? "h"
            : "mois";
  return { amount, period: periodLabel };
}

function formatK(amount: number): string {
  if (amount >= 1000) {
    const k = amount / 1000;
    return Number.isInteger(k) ? `${k}k` : `${k.toFixed(1)}k`;
  }
  return amount.toString();
}
