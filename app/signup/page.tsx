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
          <h1 className="text-3xl font-bold tracking-tight text-night">
            Rejoins DIVARC
          </h1>
          <p className="mt-2 text-muted">
            Crée ton compte gratuitement en moins d&apos;une minute.
          </p>

          <div className="mt-8">
            <SignupForm />
          </div>

          <p className="mt-6 text-sm text-muted text-center">
            Déjà membre ?{" "}
            <Link
              href="/login"
              className="font-semibold text-night hover:text-night-soft"
            >
              Se connecter
            </Link>
          </p>
        </div>
      </main>
    </div>
  );
}
