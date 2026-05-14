import { Settings, Sparkles, Wand2 } from "lucide-react";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { DisplayHeading } from "@/components/ui/DisplayHeading";
import { KickerLabel } from "@/components/ui/KickerLabel";
import { CampaignBuilderPro } from "@/components/ads/builder/CampaignBuilderPro";
import { SmartCampaignBuilder } from "@/components/ads/smartCampaign/SmartCampaignBuilder";
import { createClient } from "@/lib/supabase/server";
import { Container } from "@/components/primitives/Container";

export const metadata = { title: "Nouvelle campagne" };

type Params = Promise<{ accountId: string }>;
type SearchParams = Promise<{ mode?: string; analysis?: string }>;

export default async function NewCampaignPage({
  params,
  searchParams,
}: {
  params: Params;
  searchParams: SearchParams;
}) {
  const { accountId } = await params;
  const { mode, analysis } = await searchParams;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  /* Vérification rôle editor minimum (RPC). */
  const { data: hasRole } = await supabase.rpc("user_has_ad_account_role", {
    p_ad_account_id: accountId,
    p_min_role: "editor",
  });
  if (!hasRole) notFound();

  /* Récupère les advertiser_entities du compte (pages représentées).
     Si aucune n'existe (cas des ad_accounts créés avant l'auto-create
     de mai 2026), on en crée une à la volée pour ne pas bloquer le
     wizard. */
  let { data: entities } = await supabase
    .from("advertiser_entities")
    .select("id, name, type, url")
    .eq("ad_account_id", accountId)
    .order("created_at", { ascending: false });

  const { data: account } = await supabase
    .from("ad_accounts")
    .select("name, currency, business_account_id")
    .eq("id", accountId)
    .maybeSingle();

  if ((!entities || entities.length === 0) && account) {
    const { data: business } = await supabase
      .from("ads_business_accounts")
      .select("legal_name")
      .eq("id", account.business_account_id)
      .maybeSingle();
    const { data: created } = await supabase
      .from("advertiser_entities")
      .insert({
        ad_account_id: accountId,
        type: "external_site",
        name: business?.legal_name ?? account.name,
        verified_owner: false,
      })
      .select("id, name, type, url")
      .single();
    if (created) entities = [created];
  }

  /* Mode selector :
       ?mode=smart  → SmartCampaignBuilder (4 étapes IA-first)
       ?mode=expert → CampaignBuilderPro (5 étapes contrôle total)
       sinon        → écran de choix Smart vs Expert */
  if (mode === "smart") {
    return (
      <Container maxWidth="default" paddingX="page" paddingY="3xl">
        <Link
          href={`/ads-manager/${accountId}`}
          className="inline-flex items-center gap-1.5 text-[12px] font-bold text-night-muted hover:text-night transition-colors mb-4"
        >
          ← {account?.name ?? "Compte"}
        </Link>
        <SmartCampaignBuilder
          accountId={accountId}
          currency={account?.currency ?? "EUR"}
          entities={entities ?? []}
          analysisId={analysis}
        />
      </Container>
    );
  }

  if (mode === "expert") {
    return (
      <Container maxWidth="default" paddingX="page" paddingY="3xl">
        <Link
          href={`/ads-manager/${accountId}`}
          className="inline-flex items-center gap-1.5 text-[12px] font-bold text-night-muted hover:text-night transition-colors mb-4"
        >
          ← {account?.name ?? "Compte"}
        </Link>
        <header className="mb-7">
          <KickerLabel>· Création campagne · Mode Expert</KickerLabel>
          <DisplayHeading
            size="lg"
            className="mt-2 !leading-[1.05] !text-[32px] sm:!text-[40px]"
          >
            Lance ta <em className="italic text-gold-deep">campagne</em>
          </DisplayHeading>
          <p className="mt-3 text-[14px] text-night-soft max-w-2xl leading-relaxed">
            Configure ton objectif, ton audience, ton budget et ton creative.
            La campagne sera vérifiée automatiquement (conformité DSA + RGPD)
            avant lancement.
          </p>
        </header>
        <CampaignBuilderPro
          accountId={accountId}
          currency={account?.currency ?? "EUR"}
          entities={entities ?? []}
        />
      </Container>
    );
  }

  /* Default : mode chooser. */
  return (
    <Container maxWidth="default" paddingX="page" paddingY="3xl">
      <Link
        href={`/ads-manager/${accountId}`}
        className="inline-flex items-center gap-1.5 text-[12px] font-bold text-night-muted hover:text-night transition-colors mb-4"
      >
        ← {account?.name ?? "Compte"}
      </Link>

      <header className="mb-8 text-center">
        <KickerLabel>· Création campagne</KickerLabel>
        <DisplayHeading
          size="lg"
          className="mt-2 !leading-[1.05] !text-[32px] sm:!text-[40px]"
        >
          Comment veux-tu{" "}
          <em className="italic text-gold-deep">lancer ta campagne</em> ?
        </DisplayHeading>
        <p className="mt-3 text-[14px] text-night-soft max-w-xl mx-auto leading-relaxed">
          Choisis Smart Campaign si tu veux que l&apos;IA s&apos;occupe de
          tout, ou Mode Expert pour contrôler chaque détail.
        </p>
      </header>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Link
          href={`/ads-manager/${accountId}/campaigns/new?mode=smart`}
          className="block p-6 rounded-2xl bg-gold/15 border-2 border-gold-deep hover:bg-gold/25 transition-colors group"
        >
          <span
            aria-hidden
            className="inline-flex w-12 h-12 rounded-2xl bg-gold-deep text-cream items-center justify-center mb-3"
          >
            <Wand2 className="w-6 h-6" aria-hidden />
          </span>
          <h3 className="text-[18px] font-semibold text-night flex items-center gap-1.5">
            Smart Campaign
            <Sparkles className="w-4 h-4 text-gold-deep" aria-hidden />
          </h3>
          <p className="text-[12.5px] text-night-soft mt-1.5 leading-relaxed">
            Wizard simplifié 4 étapes. L&apos;IA pré-remplit tout :
            audience, mots-clés, visuels, textes, budget. Idéal pour
            démarrer vite.
          </p>
          <ul className="mt-3 space-y-1 text-[11.5px] text-night-soft">
            <li>✓ 4 étapes guidées</li>
            <li>✓ IA-first (pré-rempli)</li>
            <li>✓ Mode automatique disponible</li>
            <li>✓ Lancement en moins de 5 min</li>
          </ul>
        </Link>

        <Link
          href={`/ads-manager/${accountId}/campaigns/new?mode=expert`}
          className="block p-6 rounded-2xl bg-white border-2 border-line hover:border-night/30 transition-colors group"
        >
          <span
            aria-hidden
            className="inline-flex w-12 h-12 rounded-2xl bg-night text-cream items-center justify-center mb-3"
          >
            <Settings className="w-6 h-6" aria-hidden />
          </span>
          <h3 className="text-[18px] font-semibold text-night">
            Mode Expert
          </h3>
          <p className="text-[12.5px] text-night-soft mt-1.5 leading-relaxed">
            Wizard complet 5 étapes avec contrôle total : objectifs détaillés,
            audience builder riche, placements granulaires, attribution avancée.
          </p>
          <ul className="mt-3 space-y-1 text-[11.5px] text-night-soft">
            <li>✓ 14 objectifs détaillés</li>
            <li>✓ Audience builder 7 panels</li>
            <li>✓ A/B testing intégré</li>
            <li>✓ Bid strategies avancées</li>
          </ul>
        </Link>
      </div>

      <div className="mt-6 rounded-2xl bg-bg-soft border border-line p-4 text-center">
        <p className="text-[12.5px] text-night-soft">
          💡 Astuce : utilise d&apos;abord{" "}
          <Link
            href={`/ads-manager/${accountId}/analyzer`}
            className="text-gold-deep font-semibold hover:underline"
          >
            l&apos;Analyse IA
          </Link>{" "}
          pour pré-remplir automatiquement ta campagne depuis l&apos;URL de
          ton site.
        </p>
      </div>
    </Container>
  );
}
