import { ArrowLeft, Banknote, Sparkles } from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { DisplayHeading } from "@/components/ui/DisplayHeading";
import { KickerLabel } from "@/components/ui/KickerLabel";
import { listWallets } from "@/lib/queries/wallet";
import { createClient } from "@/lib/supabase/server";
import { formatPrice } from "@/lib/utils/currency";

export const metadata = {
  title: "Encaisser",
};

export default async function PayoutPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const wallets = await listWallets(user.id);
  const eur = wallets.find((w) => w.currency === "EUR") ?? wallets[0] ?? null;

  return (
    <div className="px-4 sm:px-10 py-8 sm:py-10 max-w-2xl mx-auto w-full">
      <Link
        href="/wallet"
        className="inline-flex items-center gap-2 text-sm text-night-muted hover:text-night mb-4"
      >
        <ArrowLeft className="w-4 h-4" aria-hidden />
        Retour au wallet
      </Link>

      <header className="mb-7">
        <KickerLabel>Encaisser</KickerLabel>
        <DisplayHeading size="lg" className="mt-2">
          Vers ton <em className="italic text-gold-deep">compte</em>
        </DisplayHeading>
      </header>

      {/* "Coming soon" — Stripe Connect intégration */}
      <section className="rounded-3xl bg-white border border-line p-6 sm:p-8 text-center">
        <div
          aria-hidden
          className="w-16 h-16 mx-auto rounded-2xl bg-gradient-to-br from-cream via-bg to-gold/15 border border-gold/30 flex items-center justify-center mb-5"
        >
          <Banknote className="w-7 h-7 text-gold-deep" aria-hidden />
        </div>
        <KickerLabel>Bientôt</KickerLabel>
        <h2 className="mt-2 font-display italic text-2xl sm:text-3xl text-night leading-tight">
          Encaissement <em className="italic text-gold-deep">SEPA</em> en
          préparation.
        </h2>
        <p className="mt-3 text-sm text-muted-strong leading-relaxed max-w-md mx-auto">
          Tu pourras virer ton solde vers ton compte bancaire en 1 à 2 jours
          ouvrés, gratuitement, dès que l&apos;intégration Stripe Connect sera
          activée pour les comptes vérifiés KYC.
        </p>
        {eur ? (
          <p className="mt-4 text-xs text-muted">
            Solde disponible :{" "}
            <strong className="text-night">
              {formatPrice(eur.balance, eur.currency)}
            </strong>
          </p>
        ) : null}
        <div className="mt-6 inline-flex items-center justify-center gap-2 px-4 h-10 rounded-full bg-gold/15 text-gold-deep text-xs font-extrabold tracking-wide">
          <Sparkles className="w-3.5 h-3.5" aria-hidden />
          On te prévient dès que c&apos;est prêt
        </div>
      </section>

      <div className="mt-6 flex justify-center">
        <Button asChild variant="secondary">
          <Link href="/wallet">Retour</Link>
        </Button>
      </div>
    </div>
  );
}
