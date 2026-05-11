import { ArrowLeft, KeyRound } from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { DisplayHeading } from "@/components/ui/DisplayHeading";
import { KickerLabel } from "@/components/ui/KickerLabel";
import { createClient } from "@/lib/supabase/server";
import { EncryptionPanel } from "./EncryptionPanel";

export const metadata = {
  title: "Chiffrement bout-en-bout · Sécurité",
};

/* Page /settings/security/encryption.
 *
 * Affiche le statut crypto + permet de configurer/débloquer/réinitialiser
 * sa passphrase. Le coffre crypto est entièrement client-side : DIVARC
 * ne voit JAMAIS la passphrase ni les clés privées. */

export default async function EncryptionPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  /* On peut fetch hasUploadedIdentity server-side pour afficher un état
     informatif (au-delà du state client useCrypto qui dépend d'IDB
     local). Mais V1 on délègue tout au composant client. */

  return (
    <div className="min-h-screen bg-bg-soft pb-12">
      <div className="max-w-2xl mx-auto px-5 sm:px-8 pt-8">
        <header className="mb-6">
          <Link
            href="/settings"
            className="inline-flex items-center gap-1.5 text-[12px] font-bold text-night-muted hover:text-night transition-colors mb-4"
          >
            <ArrowLeft className="w-[14px] h-[14px]" aria-hidden />
            Paramètres
          </Link>
          <KickerLabel>· Sécurité</KickerLabel>
          <DisplayHeading
            size="lg"
            className="mt-2 !leading-[1.05] !text-[36px] sm:!text-[44px]"
          >
            Chiffrement bout-en-bout
          </DisplayHeading>
          <p className="mt-3 text-[14px] text-night-soft leading-relaxed">
            Tes conversations marquées &laquo;&nbsp;secrètes&nbsp;&raquo;
            sont chiffrées sur ton appareil avec une passphrase que toi
            seul connais. DIVARC stocke uniquement le résultat chiffré
            et ne peut pas le lire.
          </p>
        </header>

        <div className="rounded-2xl bg-white border border-line p-4 mb-5 flex items-start gap-3">
          <span className="w-9 h-9 rounded-lg bg-gold/15 text-gold-deep flex items-center justify-center shrink-0">
            <KeyRound className="w-4 h-4" aria-hidden />
          </span>
          <div className="text-[12.5px] text-night-soft leading-relaxed">
            <p className="font-semibold text-night">Comment ça marche</p>
            <p className="mt-1">
              Une paire de clés (publique/privée) est générée sur ton
              appareil. La privée ne quitte jamais ton navigateur, et est
              chiffrée par ta passphrase. Pour lire des messages secrets sur
              un autre appareil, tu devras y configurer la même passphrase.
            </p>
          </div>
        </div>

        <EncryptionPanel />
      </div>
    </div>
  );
}
