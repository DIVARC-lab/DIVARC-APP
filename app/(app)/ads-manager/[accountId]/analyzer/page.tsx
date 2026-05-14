import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { WebsiteAnalyzer } from "@/components/ads/websiteAnalyzer/WebsiteAnalyzer";
import { createClient } from "@/lib/supabase/server";
import { Container } from "@/components/primitives/Container";

export const metadata = { title: "Analyse IA — Website Analyzer" };

type Params = Promise<{ accountId: string }>;

export default async function AnalyzerPage({ params }: { params: Params }) {
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
    <Container maxWidth="wide" paddingX="page" paddingY="3xl">
      <Link
        href={`/ads-manager/${accountId}`}
        className="inline-flex items-center gap-1.5 text-[12px] font-bold text-night-muted hover:text-night transition-colors mb-4"
      >
        <ArrowLeft className="w-[14px] h-[14px]" aria-hidden />
        Compte publicitaire
      </Link>

      <WebsiteAnalyzer accountId={accountId} />
    </Container>
  );
}
