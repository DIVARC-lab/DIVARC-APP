import Link from "next/link";
import { Wordmark } from "@/components/Logo";
import { MagicLinkForm } from "./MagicLinkForm";

export const metadata = {
  title: "Connexion par lien magique · DIVARC",
  description: "Connecte-toi à DIVARC sans mot de passe via un lien sécurisé.",
};

export default function MagicLinkPage() {
  return (
    <div className="flex flex-col min-h-screen">
      <header className="px-6 sm:px-10 py-5 border-b border-line">
        <Link href="/" className="inline-flex">
          <Wordmark />
        </Link>
      </header>

      <main className="flex-1 flex items-center justify-center px-6 py-12">
        <div className="w-full max-w-md">
          <p className="text-[11px] font-extrabold uppercase tracking-[0.18em] text-gold-deep">
            · Sans mot de passe
          </p>
          <h1 className="mt-2 font-display text-[36px] sm:text-[44px] font-normal leading-[1.05] tracking-[-0.02em] text-night text-balance">
            Reçois un{" "}
            <em className="italic bg-gradient-to-br from-gold to-gold-deep bg-clip-text text-transparent">
              lien magique
            </em>{" "}
            par email.
          </h1>
          <p className="mt-3 text-[14px] text-night-muted leading-relaxed">
            On t&apos;envoie un lien à usage unique pour te connecter sans saisir
            ton mot de passe.
          </p>

          <div className="mt-7">
            <MagicLinkForm />
          </div>

          <div className="mt-6 space-y-2 text-center">
            <p className="text-sm text-muted">
              <Link
                href="/login"
                className="font-semibold text-gold-deep hover:text-night transition-colors"
              >
                ← Retour à la connexion classique
              </Link>
            </p>
            <p className="text-sm text-muted">
              Pas encore de compte ?{" "}
              <Link
                href="/signup"
                className="font-semibold text-gold-deep hover:text-night transition-colors"
              >
                Créer un compte
              </Link>
            </p>
          </div>
        </div>
      </main>
    </div>
  );
}
