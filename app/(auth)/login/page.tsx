import Link from "next/link";
import { Wordmark } from "@/components/Logo";
import { SocialAuthButtons } from "@/components/auth/SocialAuthButtons";
import { LoginForm } from "./LoginForm";

type SearchParams = Promise<{
  confirmation?: string;
  error?: string;
  provider?: string;
}>;

export default async function LoginPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const { confirmation, error, provider } = await searchParams;
  const showConfirmationNotice = confirmation === "sent";

  let oauthError: string | null = null;
  if (error === "oauth_failed") {
    oauthError = `Connexion ${
      provider ? `via ${provider}` : "OAuth"
    } impossible pour le moment. Réessaie ou utilise ton mot de passe.`;
  } else if (error === "provider_invalid") {
    oauthError = "Fournisseur de connexion inconnu.";
  } else if (error === "auth_failed") {
    oauthError = "Le lien de connexion est invalide ou a expiré.";
  }

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
            <em className="italic bg-gradient-to-br from-gold to-gold-deep bg-clip-text text-transparent">
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

          {oauthError ? (
            <div
              role="alert"
              className="mt-6 p-4 rounded-2xl bg-red-50 border border-red-200 text-sm text-red-900"
            >
              {oauthError}
            </div>
          ) : null}

          <div className="mt-7">
            <SocialAuthButtons next="/dashboard" prefix="Continuer avec" />
          </div>

          <div className="my-7 flex items-center gap-3">
            <div className="flex-1 h-px bg-line" />
            <span className="text-[11px] font-semibold uppercase tracking-widest text-muted">
              ou par email
            </span>
            <div className="flex-1 h-px bg-line" />
          </div>

          <LoginForm />

          <div className="mt-5 flex flex-col sm:flex-row gap-2 sm:gap-3 sm:justify-between">
            <Link
              href="/magic-link"
              className="text-sm font-medium text-gold-deep hover:text-night transition-colors"
            >
              Recevoir un lien magique →
            </Link>
            <Link
              href="/phone-login"
              className="text-sm font-medium text-gold-deep hover:text-night transition-colors"
            >
              Connexion par SMS →
            </Link>
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
