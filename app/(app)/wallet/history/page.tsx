import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { DisplayHeading } from "@/components/ui/DisplayHeading";
import { KickerLabel } from "@/components/ui/KickerLabel";
import { listTransactions } from "@/lib/queries/wallet";
import { createClient } from "@/lib/supabase/server";
import { TransactionList } from "../_components/TransactionList";
import { cn } from "@/lib/utils/cn";
import { formatPrice } from "@/lib/utils/currency";

export const metadata = {
  title: "Historique",
};

export default async function WalletHistoryPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const transactions = await listTransactions(user.id, 200);

  /* Group by month-year. */
  type Bucket = {
    label: string;
    items: typeof transactions;
    incoming: number;
    currency: (typeof transactions)[number]["currency"] | null;
  };
  const buckets = new Map<string, Bucket>();
  for (const tx of transactions) {
    const d = new Date(tx.created_at);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    const label = d
      .toLocaleDateString("fr-FR", { month: "long", year: "numeric" })
      .toUpperCase();
    let b = buckets.get(key);
    if (!b) {
      b = { label, items: [], incoming: 0, currency: null };
      buckets.set(key, b);
    }
    b.items.push(tx);
    if (tx.direction === "incoming" || tx.direction === "credit") {
      b.incoming += tx.amount;
      b.currency = tx.currency;
    }
  }
  const groups = Array.from(buckets.values());

  return (
    <div className="px-4 sm:px-10 py-8 sm:py-10 max-w-3xl mx-auto w-full">
      <Link
        href="/wallet"
        className="inline-flex items-center gap-2 text-sm text-night-muted hover:text-night mb-4"
      >
        <ArrowLeft className="w-4 h-4" aria-hidden />
        Retour au wallet
      </Link>

      <header className="mb-5">
        <KickerLabel>Historique</KickerLabel>
        <DisplayHeading size="lg" className="mt-2">
          Toutes tes <em className="italic text-gold-deep">transactions</em>
        </DisplayHeading>
      </header>

      {/* Filter chips (visual scaffolding) */}
      <nav
        aria-label="Filtres transactions"
        className="-mx-1 px-1 mb-5 flex gap-2 overflow-x-auto scrollbar-none"
      >
        {[
          { l: "Tout", active: true },
          { l: "Entrant" },
          { l: "Sortant" },
          { l: "Frais" },
        ].map((f) => (
          <span
            key={f.l}
            className={cn(
              "shrink-0 px-3.5 h-8 rounded-full text-xs font-semibold inline-flex items-center transition-colors",
              f.active
                ? "bg-night text-cream"
                : "bg-white border border-line text-night-muted",
            )}
          >
            {f.l}
          </span>
        ))}
      </nav>

      {transactions.length === 0 ? (
        <p className="text-sm text-muted text-center py-12 rounded-2xl border border-dashed border-line">
          Aucune transaction pour l&apos;instant.{" "}
          <span className="italic font-display text-night">À venir.</span>
        </p>
      ) : (
        <div className="space-y-7">
          {groups.map((g) => (
            <section key={g.label} aria-label={g.label}>
              <header className="flex items-baseline justify-between mb-2 px-2">
                <p className="text-[11px] font-extrabold uppercase tracking-[0.18em] text-muted">
                  {g.label}
                </p>
                {g.currency ? (
                  <p className="text-xs font-semibold text-emerald-700 font-display italic">
                    +{formatPrice(g.incoming, g.currency)}
                  </p>
                ) : null}
              </header>
              <TransactionList transactions={g.items} />
            </section>
          ))}
        </div>
      )}
    </div>
  );
}
