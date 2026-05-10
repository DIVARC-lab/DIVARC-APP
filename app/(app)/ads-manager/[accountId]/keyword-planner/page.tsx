import { ArrowLeft, KeyRound } from "lucide-react";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { DisplayHeading } from "@/components/ui/DisplayHeading";
import { KickerLabel } from "@/components/ui/KickerLabel";
import { KeywordPlannerClient } from "@/components/ads/keyword-planner/KeywordPlannerClient";
import { createClient } from "@/lib/supabase/server";

export const metadata = { title: "Keyword Planner" };

type Params = Promise<{ accountId: string }>;

export default async function KeywordPlannerPage({
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

  const { data: hasRole } = await supabase.rpc("user_has_ad_account_role", {
    p_ad_account_id: accountId,
    p_min_role: "analyst",
  });
  if (!hasRole) notFound();

  return (
    <div className="px-5 sm:px-8 py-8 max-w-5xl mx-auto">
      <Link
        href={`/ads-manager/${accountId}`}
        className="inline-flex items-center gap-1.5 text-[12px] font-bold text-night-muted hover:text-night transition-colors mb-4"
      >
        <ArrowLeft className="w-[14px] h-[14px]" aria-hidden />
        Retour au compte
      </Link>

      <header className="mb-7">
        <KickerLabel>· Keyword Planner</KickerLabel>
        <DisplayHeading
          size="lg"
          className="mt-2 !leading-[1.05] !text-[32px] sm:!text-[40px]"
        >
          Recherche de{" "}
          <em className="italic text-gold-deep">mots-clés</em>
        </DisplayHeading>
        <p className="mt-3 text-[14px] text-night-soft max-w-2xl leading-relaxed">
          Volume mensuel, CPC moyen, niveau de compétition et intent par
          mot-clé. Données via DataForSEO (Google Ads), cache 90j partagé
          entre comptes pour économiser les requêtes.
        </p>
      </header>

      <KeywordPlannerClient accountId={accountId} />
    </div>
  );
}
