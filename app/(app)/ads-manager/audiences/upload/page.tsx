import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { DisplayHeading } from "@/components/ui/DisplayHeading";
import { KickerLabel } from "@/components/ui/KickerLabel";
import { listMyAdAccounts } from "@/lib/queries/ads";
import { createClient } from "@/lib/supabase/server";
import { CustomAudienceUploader } from "./CustomAudienceUploader";
import { Container } from "@/components/primitives/Container";

export const metadata = { title: "Upload audience client" };

export default async function CustomAudienceUploadPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const accounts = await listMyAdAccounts();
  if (accounts.length === 0) {
    return (
      <Container maxWidth="text" paddingX="page" paddingY="3xl">
        <p className="text-[14px] text-night-muted">
          Pas de compte publicitaire. Crée-en un d&apos;abord.
        </p>
      </Container>
    );
  }

  return (
    <Container maxWidth="text" paddingX="page" paddingY="3xl">
      <Link
        href="/ads-manager/audiences"
        className="inline-flex items-center gap-1.5 text-[12px] font-bold text-night-muted hover:text-night transition-colors mb-4"
      >
        <ArrowLeft className="w-[14px] h-[14px]" aria-hidden />
        Audiences
      </Link>

      <header className="mb-7">
        <KickerLabel>· Custom audience</KickerLabel>
        <DisplayHeading
          size="lg"
          className="mt-2 !leading-[1.05] !text-[32px] sm:!text-[40px]"
        >
          Upload <em className="italic text-gold-deep">liste clients</em>
        </DisplayHeading>
        <p className="mt-3 text-[14px] text-night-soft leading-relaxed">
          Uploade une liste d&apos;emails ou de téléphones de tes clients
          pour les retrouver sur DIVARC. Le hashing SHA-256 est effectué
          dans ton navigateur — les emails en clair ne quittent jamais ton
          ordinateur.
        </p>
      </header>

      <CustomAudienceUploader accounts={accounts} userId={user.id} />

      <section className="mt-8 rounded-2xl bg-bg-soft border border-line p-4 text-[12px] text-night-soft leading-relaxed">
        <p className="font-semibold text-night mb-2">Conformité RGPD</p>
        <ul className="list-disc pl-5 space-y-1">
          <li>
            <strong>Hashing local :</strong> les identifiants sont
            transformés en hashes SHA-256 dans ton navigateur via
            l&apos;API Web Crypto, puis envoyés à DIVARC. Aucun email en
            clair n&apos;est jamais reçu sur nos serveurs.
          </li>
          <li>
            <strong>Base légale :</strong> tu dois pouvoir prouver que tu
            as obtenu le consentement explicite de tes clients pour
            cibler de la publicité (ou justifier une autre base RGPD
            art. 6 — exécution de contrat, intérêt légitime documenté).
          </li>
          <li>
            <strong>Match rate :</strong> le pourcentage de tes clients
            retrouvés sur DIVARC sera calculé après upload (cron 1h). Le
            list_count exact n&apos;est jamais exposé à un autre annonceur.
          </li>
          <li>
            <strong>Suppression :</strong> tu peux supprimer cette audience
            à tout moment depuis la page Audiences. Les hashes sont alors
            effacés en cascade (RGPD art. 17).
          </li>
        </ul>
      </section>
    </Container>
  );
}
