import Link from "next/link";
import { Wordmark } from "@/components/Logo";
import { LoginForm } from "./LoginForm";

type SearchParams = Promise<{ confirmation?: string }>;

export default async function LoginPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const { confirmation } = await searchParams;
  const showConfirmationNotice = confirmation === "sent";

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
            · Connexion
          </p>
          <h1 className="mt-2 font-display text-[36px] sm:text-[44px] font-normal leading-[1.05] tracking-[-0.02em] text-night text-balance">
            Bon retour parmi tes{" "}
            <em className="italic bg-gradient-to-br from-gold to-[#B88A2A] bg-clip-text text-transparent">
              proches
            </em>
            .
          </h1>
          <p className="mt-3 text-[14px] text-night-muted leading-relaxed">
            Connecte-toi pour continuer sur DIVARC.
          </p>

          {showConfirmationNotice ? (
            <div className="mt-6 p-4 rounded-2xl bg-gold/10 border border-gold/30 text-sm text-night-soft">
              📧 Vérifie ta boîte mail pour confirmer ton compte avant de te
              connecter.
            </div>
          ) : null}

          <div className="mt-7">
            <LoginForm />
          </div>

          <p className="mt-6 text-sm text-muted text-center">
            Pas encore de compte ?{" "}
            <Link
              href="/signup"
              className="font-semibold text-gold-deep hover:text-night transition-colors"
            >
              Créer un compte
            </Link>
          </p>
        </div>
      </main>
    </div>
  );
}
