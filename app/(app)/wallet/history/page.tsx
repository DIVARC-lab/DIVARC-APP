import { ArrowDownLeft, ArrowLeft, ArrowUpRight, List, Sparkles } from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { ArcDeco } from "@/components/marketing/ArcDeco";
import { listTransactions } from "@/lib/queries/wallet";
import { createClient } from "@/lib/supabase/server";
import { TransactionList } from "../_components/TransactionList";
import { cn } from "@/lib/utils/cn";
import { formatPrice } from "@/lib/utils/currency";
import { Container } from "@/components/primitives/Container";

export const metadata = {
  title: "Historique",
};

const FILTERS = [
  { id: "all", label: "Tout", icon: List },
  { id: "incoming", label: "Entrant", icon: ArrowDownLeft },
  { id: "outgoing", label: "Sortant", icon: ArrowUpRight },
  { id: "credit", label: "Crédit", icon: Sparkles },
] as const;

type FilterId = (typeof FILTERS)[number]["id"];

type SearchParams = Promise<{ filter?: string }>;

export default async function WalletHistoryPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { filter: rawFilter } = await searchParams;
  const activeFilter: FilterId =
    (FILTERS.find((f) => f.id === rawFilter)?.id as FilterId) ?? "all";

  const allTransactions = await listTransactions(user.id, 200);

  /* Filter direction côté server (fact-based, peut être bookmarké). */
  const transactions = allTransactions.filter((tx) => {
    if (activeFilter === "all") return true;
    if (activeFilter === "incoming") {
      return tx.direction === "incoming" || tx.direction === "credit";
    }
    if (activeFilter === "outgoing") return tx.direction === "outgoing";
    if (activeFilter === "credit") return tx.direction === "credit";
    return true;
  });

  /* Counts par filter pour les badges des chips. */
  const counts = {
    all: allTransactions.length,
    incoming: allTransactions.filter(
      (tx) => tx.direction === "incoming" || tx.direction === "credit",
    ).length,
    outgoing: allTransactions.filter((tx) => tx.direction === "outgoing")
      .length,
    credit: allTransactions.filter((tx) => tx.direction === "credit").length,
  } as const;

  /* Group by month-year + totals incoming/outgoing par bucket. */
  type Bucket = {
    label: string;
    items: typeof transactions;
    incoming: number;
    outgoing: number;
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
      b = { label, items: [], incoming: 0, outgoing: 0, currency: null };
      buckets.set(key, b);
    }
    b.items.push(tx);
    b.currency = tx.currency;
    if (tx.direction === "incoming" || tx.direction === "credit") {
      b.incoming += tx.amount;
    } else if (tx.direction === "outgoing") {
      b.outgoing += tx.amount;
    }
  }
  const groups = Array.from(buckets.values());

  return (
    <div className="bg-bg-soft min-h-screen pb-24">
      <Container maxWidth="text" paddingX="none">
        {/* Hero header */}
        <header className="relative overflow-hidden bg-gradient-to-b from-cream to-bg-soft px-5 sm:px-8 pt-8 sm:pt-10 pb-6">
          <div
            aria-hidden
            className="absolute -right-12 -top-14 opacity-45 pointer-events-none"
          >
            <ArcDeco size={220} tone="gold" opacity={1} stroke={1.25} />
          </div>
          <div className="relative">
            <Link
              href="/wallet"
              className="inline-flex items-center gap-1.5 text-[12px] font-bold text-night-muted hover:text-night transition-colors mb-4"
            >
              <ArrowLeft className="w-[14px] h-[14px]" aria-hidden />
              Retour au wallet
            </Link>
            <p className="text-[11px] font-extrabold uppercase tracking-[0.18em] text-gold-deep">
              · Historique
            </p>
            <h1 className="mt-2 font-display text-[36px] sm:text-[44px] font-normal leading-[1.05] tracking-[-0.02em] text-night text-balance">
              Toutes tes{" "}
              <em className="italic bg-gradient-to-br from-gold to-gold-deep bg-clip-text text-transparent">
                transactions
              </em>
              .
            </h1>
            <p className="mt-2 text-[13px] text-night-soft">
              {transactions.length} mouvement{transactions.length > 1 ? "s" : ""}
              {activeFilter !== "all" ? ` · filtre ${FILTERS.find((f) => f.id === activeFilter)?.label.toLowerCase()}` : ""}
            </p>
          </div>
        </header>

        {/* Filter chips fonctionnels */}
        <nav
          aria-label="Filtres transactions"
          className="px-4 sm:px-7 pt-5 flex gap-2 overflow-x-auto scrollbar-none"
        >
          {FILTERS.map((f) => {
            const Icon = f.icon;
            const active = activeFilter === f.id;
            const count = counts[f.id];
            const href =
              f.id === "all" ? "/wallet/history" : `/wallet/history?filter=${f.id}`;
            return (
              <Link
                key={f.id}
                href={href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "shrink-0 inline-flex items-center gap-1.5 h-8 px-3 rounded-full text-[12px] font-bold transition-colors",
                  active
                    ? "bg-night text-cream"
                    : "bg-white border border-line text-night-soft hover:border-night/30",
                )}
              >
                <Icon className="w-3 h-3" aria-hidden />
                {f.label}
                {count > 0 ? (
                  <span
                    className={cn(
                      "min-w-[18px] h-[18px] px-1 rounded-full text-[10px] font-extrabold flex items-center justify-center",
                      active ? "bg-gold text-night" : "bg-night/10 text-night",
                    )}
                  >
                    {count}
                  </span>
                ) : null}
              </Link>
            );
          })}
        </nav>

        {/* Liste */}
        <div className="px-4 sm:px-7 pt-5">
          {transactions.length === 0 ? (
            <div className="py-12 text-center rounded-2xl border border-dashed border-line bg-white">
              <p className="text-[13px] text-muted">
                Aucune transaction pour ce filtre.
              </p>
              {activeFilter !== "all" ? (
                <Link
                  href="/wallet/history"
                  className="mt-3 inline-flex items-center gap-1 text-[12px] font-bold text-gold-deep hover:text-night transition-colors"
                >
                  Réinitialiser →
                </Link>
              ) : null}
            </div>
          ) : (
            <div className="space-y-6">
              {groups.map((g) => (
                <section key={g.label} aria-label={g.label}>
                  <header className="flex items-baseline justify-between mb-2 px-2 gap-3">
                    <p className="text-[10.5px] font-extrabold uppercase tracking-[0.16em] text-night-dim">
                      {g.label}
                    </p>
                    {g.currency ? (
                      <p className="text-[11px] font-display italic flex items-center gap-2">
                        {g.incoming > 0 ? (
                          <span className="text-emerald-700">
                            +{formatPrice(g.incoming, g.currency)}
                          </span>
                        ) : null}
                        {g.outgoing > 0 ? (
                          <span className="text-night">
                            −{formatPrice(g.outgoing, g.currency)}
                          </span>
                        ) : null}
                      </p>
                    ) : null}
                  </header>
                  <TransactionList transactions={g.items} />
                </section>
              ))}
            </div>
          )}
        </div>
      </Container>
    </div>
  );
}
