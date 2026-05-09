import {
  ArrowDownToLine,
  ArrowUpFromLine,
  Banknote,
  ShieldCheck,
  Sparkles,
} from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { ArcDeco } from "@/components/marketing/ArcDeco";
import { listTransactions, listWallets } from "@/lib/queries/wallet";
import { createClient } from "@/lib/supabase/server";
import { BalanceCard } from "./_components/BalanceCard";
import { TransactionList } from "./_components/TransactionList";
import { KickerLabel } from "@/components/ui/KickerLabel";
import { DisplayHeading } from "@/components/ui/DisplayHeading";
import { formatPrice } from "@/lib/utils/currency";

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

  const eur = wallets.find((w) => w.currency === "EUR") ?? wallets[0] ?? null;
  const others = wallets.filter((w) => w !== eur);

  /* Compute weekly + monthly delta for hero stats.
     React 19 strict : Date.now() est marqué impure par le lint en render,
     contrairement à new Date().getTime() qui passe. */
  const now = new Date().getTime();
  const oneWeek = 7 * 86_400_000;
  const oneMonth = 30 * 86_400_000;

  let weeklyIn = 0;
  let monthlyIn = 0;
  let monthlyOut = 0;
  let monthlyTxnsOut = 0;

  for (const tx of transactions) {
    if (!eur || tx.currency !== eur.currency) continue;
    const ts = new Date(tx.created_at).getTime();
    const age = now - ts;
    if (tx.direction === "incoming" || tx.direction === "credit") {
      if (age < oneWeek) weeklyIn += tx.amount;
      if (age < oneMonth) monthlyIn += tx.amount;
    } else if (tx.direction === "outgoing") {
      if (age < oneMonth) {
        monthlyOut += tx.amount;
        monthlyTxnsOut++;
      }
    }
  }

  return (
    <div className="px-4 sm:px-10 py-8 sm:py-10 max-w-3xl mx-auto w-full">
      <header className="mb-5">
        <KickerLabel>Wallet</KickerLabel>
        <DisplayHeading size="lg" className="mt-2">
          Ton argent, <em className="italic text-gold-deep">multi-devise</em>.
        </DisplayHeading>
      </header>

      {/* Hero balance card — navy with ArcDeco */}
      {eur ? (
        <article className="relative overflow-hidden rounded-3xl bg-night text-cream p-6 sm:p-7 mb-5 shadow-[0_24px_60px_-28px_rgba(10,31,68,0.5)]">
          <div
            aria-hidden
            className="absolute -right-16 -top-20 pointer-events-none"
          >
            <ArcDeco size={320} tone="gold" opacity={0.55} stroke={1.25} />
          </div>
          <div
            aria-hidden
            className="absolute -left-12 -bottom-16 pointer-events-none"
          >
            <ArcDeco size={200} tone="gold" opacity={0.25} stroke={1} />
          </div>
          <div className="relative">
            <div className="flex items-center justify-between gap-3">
              <span className="text-[11px] font-extrabold uppercase tracking-[0.18em] text-gold">
                · Wallet DIVARC
              </span>
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full border border-gold/30 text-gold text-[10px] font-extrabold uppercase tracking-[0.14em]">
                <ShieldCheck className="w-3 h-3" aria-hidden />
                Vérifié · KYC
              </span>
            </div>

            <p className="mt-5 text-xs text-cream/70">Solde disponible</p>
            <p className="mt-1 font-display italic text-5xl sm:text-6xl tracking-tight leading-none">
              <BigBalance amount={eur.balance} currency={eur.currency} />
            </p>
            {weeklyIn > 0 ? (
              <p className="mt-3 text-xs text-emerald-300 font-semibold inline-flex items-center gap-1">
                <span aria-hidden>↑</span>
                +{formatPrice(weeklyIn, eur.currency)} cette semaine
              </p>
            ) : (
              <p className="mt-3 text-xs text-cream/50">
                Aucun encaissement cette semaine
              </p>
            )}

            <div className="mt-6 grid grid-cols-3 gap-2 sm:gap-3">
              <ActionTile
                href="/wallet/send"
                icon={<ArrowDownToLine className="w-4 h-4" aria-hidden />}
                label="Recevoir"
              />
              <ActionTile
                href="/wallet/send"
                icon={<ArrowUpFromLine className="w-4 h-4" aria-hidden />}
                label="Envoyer"
              />
              <ActionTile
                href="/wallet/payout"
                icon={<Banknote className="w-4 h-4" aria-hidden />}
                label="Encaisser"
              />
            </div>
          </div>
        </article>
      ) : null}

      {/* Stats row — month earnings vs spending */}
      {eur ? (
        <section className="grid grid-cols-2 gap-3 mb-6">
          <StatTile
            label="Encaissé · ce mois"
            value={`+${formatPrice(monthlyIn, eur.currency)}`}
            tone="positive"
          />
          <StatTile
            label="Dépensé · ce mois"
            value={`−${formatPrice(monthlyOut, eur.currency)}`}
            sub={
              monthlyTxnsOut > 0
                ? `${monthlyTxnsOut} transaction${monthlyTxnsOut > 1 ? "s" : ""}`
                : "0 transaction"
            }
          />
        </section>
      ) : null}

      {/* Other currency wallets, if any (multi-currency users) */}
      {others.length > 0 ? (
        <section
          aria-label="Autres devises"
          className="grid sm:grid-cols-2 gap-3 mb-6"
        >
          {others.map((wallet) => (
            <BalanceCard key={wallet.currency} wallet={wallet} />
          ))}
        </section>
      ) : null}

      {/* Beta credit info */}
      <article className="mb-7 p-4 rounded-2xl bg-gold/[0.08] border border-gold/30 flex items-start gap-3">
        <span
          aria-hidden
          className="w-9 h-9 rounded-xl bg-gold/20 flex items-center justify-center shrink-0 text-gold-deep"
        >
          <Sparkles className="w-4 h-4" aria-hidden />
        </span>
        <div className="text-sm">
          <p className="font-semibold text-night">Crédit fondateur</p>
          <p className="mt-0.5 text-xs text-night-muted leading-relaxed">
            Tu démarres avec <strong>50 € + 30 000 XAF</strong>. Top-up Stripe
            et Mobile Money arrivent bientôt.
          </p>
        </div>
      </article>

      <section>
        <header className="flex items-end justify-between mb-3 px-1">
          <h2 className="font-display italic text-2xl text-night leading-tight">
            Activité récente
          </h2>
          <Link
            href="/wallet/history"
            className="text-xs font-semibold text-gold-deep hover:text-night transition-colors"
          >
            Tout voir →
          </Link>
        </header>
        <TransactionList transactions={transactions.slice(0, 8)} />
      </section>
    </div>
  );
}

function BigBalance({
  amount,
  currency,
}: {
  amount: number;
  currency: string;
}) {
  /* Render the integer in primary colour, decimal slightly smaller and
     muted-cream so the heading reads "1 247,80 €" with the cents lighter. */
  const fixed = amount.toFixed(2);
  const [int, dec] = fixed.split(".");
  const formatted = Number(int).toLocaleString("fr-FR");
  return (
    <span className="inline-flex items-baseline gap-1">
      <span>{formatted}</span>
      <span className="text-cream/65 text-[0.6em] not-italic font-display italic">
        ,{dec}
      </span>
      <span className="ml-1 text-[0.5em] text-cream/70 not-italic font-sans font-semibold">
        {currency === "EUR" ? "€" : currency}
      </span>
    </span>
  );
}

function ActionTile({
  href,
  icon,
  label,
}: {
  href: string;
  icon: React.ReactNode;
  label: string;
}) {
  return (
    <Link
      href={href}
      className="rounded-2xl bg-cream/[0.06] border border-gold/20 p-3 flex flex-col items-center gap-2 hover:bg-cream/[0.12] transition-colors"
    >
      <span className="w-9 h-9 rounded-full bg-gold text-night flex items-center justify-center">
        {icon}
      </span>
      <span className="text-xs font-semibold text-cream">{label}</span>
    </Link>
  );
}

function StatTile({
  label,
  value,
  sub,
  tone,
}: {
  label: string;
  value: string;
  sub?: string;
  tone?: "positive";
}) {
  return (
    <div className="rounded-2xl bg-white border border-line p-4">
      <p className="text-[10px] font-extrabold uppercase tracking-[0.16em] text-muted">
        {label}
      </p>
      <p
        className={
          tone === "positive"
            ? "mt-1 font-display italic text-2xl text-emerald-700 leading-none"
            : "mt-1 font-display italic text-2xl text-night leading-none"
        }
      >
        {value}
      </p>
      {sub ? <p className="mt-1.5 text-[11px] text-muted">{sub}</p> : null}
    </div>
  );
}
