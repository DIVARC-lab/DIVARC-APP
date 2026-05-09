import Link from "next/link";
import { Wordmark } from "@/components/Logo";
import { SignupForm } from "./SignupForm";

export default function SignupPage() {
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
            · Bienvenue
          </p>
          <h1 className="mt-2 font-display text-[36px] sm:text-[44px] font-normal leading-[1.05] tracking-[-0.02em] text-night text-balance">
            Rejoins ton{" "}
            <em className="italic bg-gradient-to-br from-gold to-gold-deep bg-clip-text text-transparent">
              quartier
            </em>
            .
          </h1>
          <p className="mt-3 text-[14px] text-night-muted leading-relaxed">
            Crée ton compte gratuitement en moins d&apos;une minute.
          </p>

          <div className="mt-7">
            <SignupForm />
          </div>

          <p className="mt-6 text-sm text-muted text-center">
            Déjà membre ?{" "}
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
