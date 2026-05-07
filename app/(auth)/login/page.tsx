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
          <h1 className="text-3xl font-bold tracking-tight text-night">
            Bon retour parmi nous
          </h1>
          <p className="mt-2 text-muted">
            Connecte-toi pour continuer sur DIVARC.
          </p>

          {showConfirmationNotice ? (
            <div className="mt-6 p-4 rounded-xl bg-gold/10 border border-gold/30 text-sm text-night-soft">
              📧 Vérifie ta boîte mail pour confirmer ton compte avant de te
              connecter.
            </div>
          ) : null}

          <div className="mt-8">
            <LoginForm />
          </div>

          <p className="mt-6 text-sm text-muted text-center">
            Pas encore de compte ?{" "}
            <Link
              href="/signup"
              className="font-semibold text-night hover:text-night-soft"
            >
              Créer un compte
            </Link>
          </p>
        </div>
      </main>
    </div>
  );
}
