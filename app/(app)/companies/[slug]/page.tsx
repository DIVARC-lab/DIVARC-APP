import {
  Building2,
  Calendar,
  Globe,
  MapPin,
  Settings2,
  Users2,
} from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import {
  getCompanyBySlug,
  isFollowingCompany,
  listJobsByCompany,
} from "@/lib/queries/companies";
import { createClient } from "@/lib/supabase/server";
import { FollowCompanyButton } from "../_components/FollowCompanyButton";
import { Container } from "@/components/primitives/Container";
import { Stack } from "@/components/primitives/Stack";

type Params = Promise<{ slug: string }>;

export async function generateMetadata({ params }: { params: Params }) {
  const { slug } = await params;
  const company = await getCompanyBySlug(slug);
  if (!company) return { title: "Entreprise introuvable" };
  return {
    title: company.name,
    description: company.tagline ?? company.description?.slice(0, 160) ?? undefined,
  };
}

export default async function CompanyPage({ params }: { params: Params }) {
  const { slug } = await params;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const company = await getCompanyBySlug(slug);
  if (!company) notFound();

  const isOwner = company.owner_id === user.id;
  const [following, jobs] = await Promise.all([
    isOwner ? Promise.resolve(false) : isFollowingCompany(company.id, user.id),
    listJobsByCompany(company.id, 30),
  ]);

  return (
    <Container maxWidth="default" paddingX="page" paddingY="3xl">
      <Stack gap="3xl">
      <section className="rounded-3xl border border-line bg-white overflow-hidden">
        <div className="h-32 sm:h-40 relative bg-gradient-to-br from-night via-night-soft to-night-muted grain">
          {company.cover_url ? (
            <Image
              src={company.cover_url}
              alt=""
              fill
              className="object-cover"
              unoptimized
              priority
            />
          ) : null}
        </div>
        <div className="px-6 sm:px-10 pb-7 -mt-12 sm:-mt-14 flex flex-col sm:flex-row sm:items-end gap-5 sm:justify-between">
          <div className="flex items-end gap-5">
            <div className="rounded-2xl ring-4 ring-white p-1 bg-gradient-to-br from-gold via-gold-soft to-gold-deep">
              <div className="rounded-xl bg-white w-20 h-20 sm:w-24 sm:h-24 flex items-center justify-center overflow-hidden">
                {company.logo_url ? (
                  <Image
                    src={company.logo_url}
                    alt=""
                    width={96}
                    height={96}
                    className="object-cover w-full h-full"
                    unoptimized
                    priority
                  />
                ) : (
                  <Building2 className="w-8 h-8 text-night-muted" aria-hidden />
                )}
              </div>
            </div>
            <div className="pb-2">
              <div className="flex items-center gap-1.5 mb-1">
                {company.verified ? (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-gold/20 text-gold-deep text-[10px] font-bold uppercase tracking-widest">
                    Vérifiée
                  </span>
                ) : null}
              </div>
              <h1 className="font-display text-3xl sm:text-4xl text-night text-balance">
                {company.name}
              </h1>
              {company.tagline ? (
                <p className="mt-1 text-sm text-night-muted max-w-md">
                  {company.tagline}
                </p>
              ) : null}
              <p className="mt-1.5 text-xs text-muted flex flex-wrap items-center gap-x-2 gap-y-0.5">
                {company.industry ? <span>{company.industry}</span> : null}
                {company.size_label ? <span>· {company.size_label}</span> : null}
                {company.headquarters ? (
                  <span className="inline-flex items-center gap-0.5">
                    <MapPin className="w-3 h-3" />
                    {company.headquarters}
                  </span>
                ) : null}
                {company.founded_year ? (
                  <span className="inline-flex items-center gap-0.5">
                    <Calendar className="w-3 h-3" />
                    Fondée en {company.founded_year}
                  </span>
                ) : null}
              </p>
            </div>
          </div>
          <div className="sm:pb-2 flex items-center gap-2">
            {isOwner ? (
              <Link
                href={`/companies/${company.slug}/edit`}
                className="inline-flex items-center gap-1.5 px-4 h-10 rounded-full bg-white border border-line text-sm font-semibold text-night hover:border-night/30"
              >
                <Settings2 className="w-4 h-4" aria-hidden />
                Modifier
              </Link>
            ) : (
              <FollowCompanyButton
                companyId={company.id}
                initialFollowing={following}
                initialCount={company.followers_count}
              />
            )}
          </div>
        </div>

        <div className="px-6 sm:px-10 pb-7 grid sm:grid-cols-3 gap-3 sm:gap-4 border-t border-line pt-6">
          <Stat
            label="Abonnés"
            value={company.followers_count}
            icon={Users2}
          />
          <Stat label="Offres ouvertes" value={jobs.length} icon={Building2} />
          <div className="text-center sm:text-left p-4 rounded-2xl bg-night/[0.03] border border-line">
            <dt className="text-[10px] font-semibold uppercase tracking-widest text-muted">
              Site
            </dt>
            <dd className="mt-1">
              {company.website ? (
                <a
                  href={company.website}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-sm font-semibold text-gold-deep hover:underline truncate"
                >
                  <Globe className="w-3.5 h-3.5" aria-hidden />
                  {hostnameOf(company.website)}
                </a>
              ) : (
                <span className="text-sm text-muted">—</span>
              )}
            </dd>
          </div>
        </div>

        {company.description ? (
          <div className="px-6 sm:px-10 pb-7 -mt-2">
            <p className="text-night-muted leading-relaxed text-pretty whitespace-pre-wrap max-w-3xl">
              {company.description}
            </p>
          </div>
        ) : null}
      </section>

      <section>
        <h2 className="font-display text-2xl text-night mb-4">
          Offres ouvertes
        </h2>
        {jobs.length === 0 ? (
          <div className="text-center py-12 px-6 rounded-3xl bg-white border border-line">
            <p className="text-sm text-muted">
              Aucune offre publiée pour l&apos;instant.
            </p>
          </div>
        ) : (
          <div className="grid sm:grid-cols-2 gap-4">
            {jobs.map((job) => (
              <Link
                key={job.id}
                href={`/jobs/${job.id}`}
                className="p-5 rounded-2xl bg-white border border-line hover:border-night/30 transition-colors block"
              >
                <p className="font-semibold text-night truncate">{job.title}</p>
                <p className="text-xs text-muted mt-1">
                  {job.location ?? "À distance"} · {job.job_type.toUpperCase()}
                </p>
              </Link>
            ))}
          </div>
        )}
      </section>
      </Stack>
    </Container>
  );
}

function Stat({
  label,
  value,
  icon: Icon,
}: {
  label: string;
  value: number;
  icon: typeof Users2;
}) {
  return (
    <div className="text-center sm:text-left p-4 rounded-2xl bg-night/[0.03] border border-line">
      <dt className="text-[10px] font-semibold uppercase tracking-widest text-muted flex items-center gap-1">
        <Icon className="w-3 h-3" aria-hidden />
        {label}
      </dt>
      <dd className="mt-1 font-display text-2xl text-night">{value}</dd>
    </div>
  );
}

function hostnameOf(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return url;
  }
}
