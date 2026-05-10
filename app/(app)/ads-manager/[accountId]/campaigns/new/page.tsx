import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { DisplayHeading } from "@/components/ui/DisplayHeading";
import { KickerLabel } from "@/components/ui/KickerLabel";
import { createClient } from "@/lib/supabase/server";
import { CampaignWizard } from "./CampaignWizard";

export const metadata = { title: "Nouvelle campagne" };

type Params = Promise<{ accountId: string }>;

export default async function NewCampaignPage({
  params,
}: {
  params: Params;
}) {
  const { accountId } = await params;
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

  return (
    <div className="px-5 sm:px-8 py-8 max-w-4xl mx-auto">
      <Link
        href={`/ads-manager/${accountId}`}
        className="inline-flex items-center gap-1.5 text-[12px] font-bold text-night-muted hover:text-night transition-colors mb-4"
      >
        ← {account?.name ?? "Compte"}
      </Link>

      <header className="mb-7">
        <KickerLabel>· Création campagne</KickerLabel>
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

      <CampaignWizard
        accountId={accountId}
        currency={account?.currency ?? "EUR"}
        entities={entities ?? []}
      />
    </div>
  );
}
