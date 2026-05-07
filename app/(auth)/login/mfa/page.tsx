import { ShieldCheck } from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { MFAForm } from "./MFAForm";

export const metadata = {
  title: "Vérification 2FA",
};

export default async function MFAChallengePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  // If user already has aal2, no need to challenge
  const { data: aal } =
    await supabase.auth.mfa.getAuthenticatorAssuranceLevel();

  if (aal?.currentLevel === aal?.nextLevel) {
    redirect("/dashboard");
  }

  return (
    <div className="reveal-up">
      <span className="text-xs font-semibold tracking-widest uppercase text-gold-deep">
        Sécurité · 2FA
      </span>
      <h1 className="mt-2 font-display text-4xl text-night text-balance">
        Confirme avec ton{" "}
        <em className="italic">authentificateur</em>.
      </h1>
      <p className="mt-3 text-muted-strong">
        Pour finaliser la connexion, entre le code à 6 chiffres de ton
        appli (Google Authenticator, Authy, 1Password, etc.).
      </p>

      <div className="mt-8 p-3 rounded-2xl bg-emerald-50 border border-emerald-200 flex items-center gap-3">
        <ShieldCheck
          className="w-5 h-5 text-emerald-700 shrink-0"
          aria-hidden
        />
        <p className="text-xs text-emerald-900 leading-relaxed">
          Ton compte est protégé par la double authentification. Tu pourras
          la désactiver depuis ton profil après connexion.
        </p>
      </div>

      <div className="mt-8">
        <MFAForm />
      </div>

      <p className="mt-8 text-sm text-muted text-center">
        Tu n&apos;as plus accès à ton authentificateur ?{" "}
        <Link
          href="/login"
          className="font-semibold text-night hover:text-gold-deep transition-colors"
        >
          Recontacte le support
        </Link>
      </p>
    </div>
  );
}
