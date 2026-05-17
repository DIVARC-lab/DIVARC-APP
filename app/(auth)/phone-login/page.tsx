import Link from "next/link";
import { Wordmark } from "@/components/Logo";
import { PhoneLoginForm } from "./PhoneLoginForm";

export const metadata = {
  title: "Connexion par téléphone · DIVARC",
  description: "Connecte-toi à DIVARC avec un code SMS.",
};

export default function PhoneLoginPage() {
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
            · Code SMS
          </p>
          <h1 className="mt-2 font-display text-[36px] sm:text-[44px] font-normal leading-[1.05] tracking-[-0.02em] text-night text-balance">
            Connexion par{" "}
            <em className="italic bg-gradient-to-br from-gold to-gold-deep bg-clip-text text-transparent">
              téléphone
            </em>
            .
          </h1>
          <p className="mt-3 text-[14px] text-night-muted leading-relaxed">
            Reçois un code à 6 chiffres par SMS pour te connecter en toute
            sécurité.
          </p>

          <div className="mt-7">
            <PhoneLoginForm />
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
