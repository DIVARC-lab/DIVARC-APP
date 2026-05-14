import {
  BadgeCheck,
  Building2,
  Calendar,
  ExternalLink,
  MapPin,
  Users,
} from "lucide-react";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { Avatar } from "@/components/ui/Avatar";
import { getCompanyBySlug } from "@/lib/queries/company";
import { createClient } from "@/lib/supabase/server";
import { FollowCompanyButton } from "./_components/FollowCompanyButton";
import { Container } from "@/components/primitives/Container";

/* Page entreprise /c/[slug] V1 :
 *   - Cover + logo + name + tagline + verified badge
 *   - Stats : followers, employés DIVARC
 *   - Actions : Suivre (company_followers)
 *   - Sections : About + Employés grid
 *
 * V2 : Posts entreprise + Jobs + Vie d'entreprise + Vérification employé. */

const SIZE_LABELS: Record<string, string> = {
  "1-10": "1-10 employés",
  "11-50": "11-50 employés",
  "51-200": "51-200 employés",
  "201-500": "201-500 employés",
  "501-1000": "501-1000 employés",
  "1001-5000": "1001-5000 employés",
  "5001-10000": "5001-10000 employés",
  "10000+": "10000+ employés",
};

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const pkg = await getCompanyBySlug(slug);
  if (!pkg) return { title: "Entreprise introuvable" };
  return {
    title: pkg.company.name,
    description: pkg.company.tagline ?? pkg.company.description ?? undefined,
  };
}

export default async function CompanyPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const pkg = await getCompanyBySlug(slug);
  if (!pkg) notFound();

  const { company, employees, is_following } = pkg;

  return (
    <div className="min-h-screen bg-bg-soft">
      {/* Cover */}
      <div className="relative w-full aspect-[16/9] sm:aspect-[3/1] lg:aspect-[4/1] bg-night/5 overflow-hidden">
        {company.cover_url ? (
          /* eslint-disable-next-line @next/next/no-img-element */
          <img
            src={company.cover_url}
            alt=""
            className="absolute inset-0 w-full h-full object-cover"
          />
        ) : (
          <div
            className="absolute inset-0"
            style={{
              backgroundImage:
                "linear-gradient(135deg, #0A1F44 0%, #F4B942 100%)",
            }}
          />
        )}
      </div>

      {/* Header */}
      <Container as="section" maxWidth="default" paddingX="page" className="pb-6">
        <div className="flex flex-col sm:flex-row sm:items-end gap-3 sm:gap-5 -mt-12 sm:-mt-16 lg:-mt-20">
          {/* Logo */}
          <div className="shrink-0 w-24 h-24 sm:w-32 sm:h-32 lg:w-[168px] lg:h-[168px] rounded-2xl bg-white ring-4 ring-white shadow-[0_8px_28px_-12px_rgba(10,31,68,0.4)] overflow-hidden flex items-center justify-center">
            {company.logo_url ? (
              /* eslint-disable-next-line @next/next/no-img-element */
              <img
                src={company.logo_url}
                alt={company.name}
                className="w-full h-full object-cover"
              />
            ) : (
              <Building2 className="w-12 h-12 text-night-muted" aria-hidden />
            )}
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3">
              <div className="min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <h1 className="text-2xl sm:text-3xl font-display italic text-night truncate">
                    {company.name}
                  </h1>
                  {company.verified ? (
                    <span
                      aria-label="Entreprise vérifiée"
                      className="inline-flex items-center gap-1 text-[12px] font-semibold text-[#3B82F6]"
                    >
                      <BadgeCheck className="w-4 h-4 fill-[#DBEAFE]" aria-hidden />
                      Vérifiée
                    </span>
                  ) : null}
                </div>
                {company.tagline ? (
                  <p className="mt-1 text-[14px] text-night-soft">
                    {company.tagline}
                  </p>
                ) : null}
                <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1.5 text-[12.5px] text-night-muted">
                  {company.industry ? (
                    <span>{company.industry}</span>
                  ) : null}
                  {company.size_label ? (
                    <>
                      <span className="text-night-dim">·</span>
                      <span>{SIZE_LABELS[company.size_label]}</span>
                    </>
                  ) : null}
                  {company.headquarters ? (
                    <>
                      <span className="text-night-dim">·</span>
                      <span className="inline-flex items-center gap-1">
                        <MapPin className="w-3.5 h-3.5" aria-hidden />
                        {company.headquarters}
                      </span>
                    </>
                  ) : null}
                  {company.founded_year ? (
                    <>
                      <span className="text-night-dim">·</span>
                      <span className="inline-flex items-center gap-1">
                        <Calendar className="w-3.5 h-3.5" aria-hidden />
                        Fondée en {company.founded_year}
                      </span>
                    </>
                  ) : null}
                  {company.website ? (
                    <>
                      <span className="text-night-dim">·</span>
                      <a
                        href={company.website}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-night hover:text-gold-deep transition-colors"
                      >
                        <ExternalLink className="w-3.5 h-3.5" aria-hidden />
                        {hostname(company.website)}
                      </a>
                    </>
                  ) : null}
                </div>
                <div className="mt-2 flex items-center gap-4 text-[13px]">
                  <span>
                    <span className="font-bold text-night">
                      {company.followers_count}
                    </span>{" "}
                    <span className="text-night-muted">
                      abonné{company.followers_count !== 1 ? "s" : ""}
                    </span>
                  </span>
                  <span>
                    <span className="font-bold text-night">
                      {employees.length}
                    </span>{" "}
                    <span className="text-night-muted">
                      employé{employees.length !== 1 ? "s" : ""} DIVARC
                    </span>
                  </span>
                </div>
              </div>

              <div className="shrink-0 self-start sm:self-end">
                <FollowCompanyButton
                  companyId={company.id}
                  initialFollowing={is_following}
                />
              </div>
            </div>
          </div>
        </div>
      </Container>

      {/* About + Employés */}
      <Container as="main" maxWidth="default" paddingX="page" className="pb-12 space-y-6">
        {company.description ? (
          <section className="rounded-2xl bg-white border border-line p-5">
            <h2 className="text-[11px] font-bold uppercase tracking-wider text-night-muted mb-3">
              À propos
            </h2>
            <p className="text-[13.5px] text-night leading-relaxed whitespace-pre-wrap">
              {company.description}
            </p>
          </section>
        ) : null}

        {employees.length > 0 ? (
          <section className="rounded-2xl bg-white border border-line overflow-hidden">
            <header className="px-5 py-4 border-b border-line flex items-center gap-2">
              <Users className="w-4 h-4 text-gold-deep" aria-hidden />
              <h2 className="text-[14px] font-bold text-night">
                Employés sur DIVARC
              </h2>
              <span className="text-[12px] text-night-muted">
                · {employees.length}
              </span>
            </header>
            <ul className="divide-y divide-line">
              {employees.map((emp) => (
                <li key={emp.id}>
                  <Link
                    href={`/u/${emp.username ?? ""}`}
                    className="flex items-center gap-3 px-5 py-3.5 hover:bg-bg-soft transition-colors"
                  >
                    <Avatar
                      src={emp.avatar_url}
                      fullName={emp.full_name ?? emp.username ?? "?"}
                      size="md"
                    />
                    <div className="min-w-0 flex-1">
                      <p className="text-[13.5px] font-semibold text-night truncate">
                        {emp.full_name ?? emp.username}
                      </p>
                      <p className="text-[12px] text-night-muted truncate">
                        {emp.current_title ?? emp.headline ?? ""}
                      </p>
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        ) : null}
      </Container>
    </div>
  );
}

function hostname(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return url;
  }
}
