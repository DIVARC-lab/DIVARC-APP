import Link from "next/link";
import { Wordmark } from "@/components/Logo";
import { ForgotPasswordForm } from "./ForgotPasswordForm";

export const metadata = { title: "Mot de passe oublié" };

export default function ForgotPasswordPage() {
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
            · Réinitialisation
          </p>
          <h1 className="mt-2 font-display text-[32px] sm:text-[40px] font-normal leading-[1.05] tracking-[-0.02em] text-night text-balance">
            Tu as oublié ton{" "}
            <em className="italic bg-gradient-to-br from-gold to-gold-deep bg-clip-text text-transparent">
              mot de passe
            </em>{" "}
            ?
          </h1>
          <p className="mt-3 text-[14px] text-night-muted leading-relaxed">
            Pas de panique. Saisis ton email et on t&apos;envoie un lien
            sécurisé pour en définir un nouveau.
          </p>

          <div className="mt-7">
            <ForgotPasswordForm />
          </div>

          <p className="mt-6 text-sm text-muted text-center">
            Tu te souviens finalement ?{" "}
            <Link
              href="/login"
              className="font-semibold text-gold-deep hover:text-night transition-colors"
            >
              Se connecter
            </Link>
          </p>
        </div>
      </main>
    </div>
  );
}
