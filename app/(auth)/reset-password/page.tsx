import Link from "next/link";
import { redirect } from "next/navigation";
import { Wordmark } from "@/components/Logo";
import { createClient } from "@/lib/supabase/server";
import { ResetPasswordForm } from "./ResetPasswordForm";

export const metadata = { title: "Définir un nouveau mot de passe" };

export default async function ResetPasswordPage() {
  /* L'user doit être authentifié (session de récup créée via le lien
     email + callback OAuth). Sinon → redirect vers forgot-password
     pour redemander un lien. */
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    redirect("/forgot-password?expired=1");
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
            · Nouveau mot de passe
          </p>
          <h1 className="mt-2 font-display text-[32px] sm:text-[40px] font-normal leading-[1.05] tracking-[-0.02em] text-night text-balance">
            Choisis un mot de passe{" "}
            <em className="italic bg-gradient-to-br from-gold to-gold-deep bg-clip-text text-transparent">
              solide
            </em>
            .
          </h1>
          <p className="mt-3 text-[14px] text-night-muted leading-relaxed">
            Tu seras automatiquement reconnecté après la mise à jour.
          </p>

          <div className="mt-7">
            <ResetPasswordForm />
          </div>
        </div>
      </main>
    </div>
  );
}
