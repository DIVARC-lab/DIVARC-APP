import { ArrowLeft, BarChart3, Target } from "lucide-react";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { DisplayHeading } from "@/components/ui/DisplayHeading";
import { KickerLabel } from "@/components/ui/KickerLabel";
import { FunnelChart } from "@/components/ads/FunnelChart";
import { buildFunnel } from "@/lib/queries/adsFunnel";
import { createClient } from "@/lib/supabase/server";
import { Container } from "@/components/primitives/Container";

export const metadata = { title: "Funnel de conversion" };

type Params = Promise<{ accountId: string }>;
type SearchParams = Promise<{
  variant?: string;
  pixel?: string;
  period?: string;
}>;

export default async function FunnelPage({
  params,
  searchParams,
}: {
  params: Params;
  searchParams: SearchParams;
}) {
  const { accountId } = await params;
  const { variant, pixel, period } = await searchParams;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: hasRole } = await supabase.rpc("user_has_ad_account_role", {
    p_ad_account_id: accountId,
    p_min_role: "analyst",
  });
  if (!hasRole) notFound();

  const days = period === "7" ? 7 : period === "90" ? 90 : 30;
  const since = new Date(
    Date.now() - days * 24 * 3600 * 1000,
  ).toISOString();

  const funnels = await buildFunnel({
    ad_account_id: accountId,
    pixel_id: pixel,
    since,
    variant: variant === "lead" ? "lead" : "ecommerce",
  });

  return (
    <Container maxWidth="default" paddingX="page" paddingY="3xl">
      <Link
        href={`/ads-manager/${accountId}`}
        className="inline-flex items-center gap-1.5 text-[12px] font-bold text-night-muted hover:text-night transition-colors mb-4"
      >
        <ArrowLeft className="w-[14px] h-[14px]" aria-hidden />
        Compte publicitaire
      </Link>

      <header className="mb-7">
        <KickerLabel>· Suivi conversions</KickerLabel>
        <DisplayHeading
          size="lg"
          className="mt-2 !leading-[1.05] !text-[32px] sm:!text-[40px]"
        >
          Funnel de{" "}
          <em className="italic text-gold-deep">conversion</em>
        </DisplayHeading>
        <p className="mt-3 text-[14px] text-night-soft max-w-2xl leading-relaxed">
          Visualise comment les utilisateurs progressent dans ton tunnel
          d&apos;achat (ou de capture lead). Identifie les étapes où ils
          abandonnent et optimise tes pages pour augmenter le taux de
          conversion.
        </p>
      </header>

      {/* Filtres */}
      <div className="mb-6 flex items-center gap-2 flex-wrap">
        <FilterTab
          href={`/ads-manager/${accountId}/funnel?period=7${variant ? `&variant=${variant}` : ""}`}
          label="7 jours"
          active={period === "7"}
        />
        <FilterTab
          href={`/ads-manager/${accountId}/funnel${variant ? `?variant=${variant}` : ""}`}
          label="30 jours"
          active={period !== "7" && period !== "90"}
        />
        <FilterTab
          href={`/ads-manager/${accountId}/funnel?period=90${variant ? `&variant=${variant}` : ""}`}
          label="90 jours"
          active={period === "90"}
        />
        <span className="mx-2 text-night-muted">|</span>
        <FilterTab
          href={`/ads-manager/${accountId}/funnel${period ? `?period=${period}` : ""}`}
          label="E-commerce"
          icon={Target}
          active={variant !== "lead"}
        />
        <FilterTab
          href={`/ads-manager/${accountId}/funnel?variant=lead${period ? `&period=${period}` : ""}`}
          label="Lead generation"
          icon={BarChart3}
          active={variant === "lead"}
        />
      </div>

      {funnels.length === 0 ? (
        <div className="rounded-2xl bg-white border border-line p-8 text-center">
          <p className="text-[14px] font-semibold text-night mb-1.5">
            Aucun pixel installé
          </p>
          <p className="text-[12.5px] text-night-muted max-w-md mx-auto">
            Crée un DIVARC Pixel et installe-le sur ton site pour
            commencer à tracker tes conversions.
          </p>
          <Link
            href={`/ads-manager/${accountId}/pixels`}
            className="inline-block mt-4 text-[12px] font-semibold text-gold-deep hover:underline"
          >
            Configurer un pixel →
          </Link>
        </div>
      ) : (
        <div className="space-y-5">
          {funnels.map((funnel) => (
            <FunnelChart key={funnel.pixel_id} data={funnel} />
          ))}
        </div>
      )}

      <section className="mt-10">
        <h2 className="text-[11px] font-extrabold uppercase tracking-[0.16em] text-muted mb-3">
          <span className="text-gold-deep">·</span> Comment lire ce funnel ?
        </h2>
        <div className="rounded-2xl bg-bg-soft border border-line p-5 text-[13px] text-night-soft leading-relaxed space-y-2">
          <p>
            <strong className="text-night">Largeur des barres :</strong>{" "}
            proportionnelle au nombre d&apos;événements à chaque étape (le
            top of funnel = 100%).
          </p>
          <p>
            <strong className="text-night">Drop-off :</strong> pourcentage
            d&apos;utilisateurs qui ne sont PAS passés à l&apos;étape suivante.
            Une drop-off &gt; 60% est suspecte et mérite investigation.
          </p>
          <p>
            <strong className="text-night">Passage :</strong> taux de
            conversion entre 2 étapes consécutives. Plus c&apos;est haut,
            mieux c&apos;est. Benchmark e-commerce moyen : 2-3% du PageView
            → Purchase final.
          </p>
          <p>
            <strong className="text-night">Optimisation typique :</strong>{" "}
            si l&apos;étape AddToCart → Checkout drop-off &gt; 70%, c&apos;est
            souvent un problème de friction (frais de livraison surprise,
            inscription forcée, etc.).
          </p>
        </div>
      </section>
    </Container>
  );
}

function FilterTab({
  href,
  label,
  icon: Icon,
  active,
}: {
  href: string;
  label: string;
  icon?: typeof Target;
  active: boolean;
}) {
  return (
    <Link
      href={href}
      className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[12px] font-semibold border transition-colors ${
        active
          ? "border-night bg-night text-cream"
          : "border-line bg-white text-night-muted hover:bg-bg-soft"
      }`}
    >
      {Icon ? <Icon className="w-3 h-3" aria-hidden /> : null}
      {label}
    </Link>
  );
}
