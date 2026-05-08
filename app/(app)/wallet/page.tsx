import { ArrowUpRight, Sparkles } from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { listTransactions, listWallets } from "@/lib/queries/wallet";
import { createClient } from "@/lib/supabase/server";
import { BalanceCard } from "./_components/BalanceCard";
import { TransactionList } from "./_components/TransactionList";
import { KickerLabel } from "@/components/ui/KickerLabel";

export const metadata = {
  title: "Wallet",
};

export default async function WalletPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const [wallets, transactions] = await Promise.all([
    listWallets(user.id),
    listTransactions(user.id, 50),
  ]);

  return (
    <div className="px-6 sm:px-10 py-10 max-w-5xl mx-auto w-full space-y-8">
      <header className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
        <div>
          <KickerLabel>Wallet</KickerLabel>
          <h1 className="mt-2 font-display text-4xl sm:text-5xl text-night text-balance leading-[1.05]">
            Ton argent, <em className="italic text-gold-deep">multi-devise</em>.
          </h1>
          <p className="mt-2 text-muted-strong max-w-xl">
            Envoie et reçois de l&apos;argent à tes amis francophones,
            instantanément, sans frais. Chaque devise a son wallet.
          </p>
        </div>
        <Button asChild size="lg">
          <Link href="/wallet/send">
            <ArrowUpRight className="w-4 h-4" aria-hidden />
            Envoyer de l&apos;argent
          </Link>
        </Button>
      </header>

      {wallets.length === 0 ? (
        <div className="text-center py-16 px-6 rounded-3xl bg-white border border-line">
          <p className="text-muted">Aucun wallet pour l&apos;instant.</p>
        </div>
      ) : (
        <section className="grid sm:grid-cols-2 gap-4">
          {wallets.map((wallet) => (
            <BalanceCard key={wallet.currency} wallet={wallet} />
          ))}
        </section>
      )}

      <article className="p-5 sm:p-6 rounded-3xl bg-gradient-to-br from-cream to-bg border border-gold/30 flex items-start gap-4">
        <div className="w-10 h-10 rounded-2xl bg-gold/20 flex items-center justify-center shrink-0">
          <Sparkles className="w-5 h-5 text-gold-deep" aria-hidden />
        </div>
        <div>
          <p className="font-semibold text-night">Crédit de bienvenue beta</p>
          <p className="mt-1 text-sm text-night-muted leading-relaxed">
            En tant que fondateur, tu démarres avec{" "}
            <strong>50 € + 30 000 XAF</strong> pour tester les transferts.
            Les top-ups Stripe et Mobile Money arrivent bientôt — pour
            l&apos;instant, échange avec tes amis.
          </p>
        </div>
      </article>

      <section>
        <header className="mb-4">
          <h2 className="font-display text-2xl text-night">
            Historique des transactions
          </h2>
          <p className="text-sm text-muted">
            {transactions.length} mouvement{transactions.length > 1 ? "s" : ""}
          </p>
        </header>
        <TransactionList transactions={transactions} />
      </section>
    </div>
  );
}
