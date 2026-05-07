import { ArrowDownLeft, ArrowUpRight, Sparkles } from "lucide-react";
import Link from "next/link";
import { Avatar } from "@/components/ui/Avatar";
import type { TransactionWithCounterparty } from "@/lib/database.types";
import { cn } from "@/lib/utils/cn";
import { formatPrice } from "@/lib/utils/currency";
import { formatRelative } from "@/lib/utils/relativeTime";

type TransactionListProps = {
  transactions: TransactionWithCounterparty[];
};

export function TransactionList({ transactions }: TransactionListProps) {
  if (transactions.length === 0) {
    return (
      <div className="text-center py-16 px-6 rounded-3xl bg-white border border-line">
        <div
          aria-hidden
          className="w-16 h-16 mx-auto rounded-2xl bg-gradient-to-br from-cream via-bg to-gold/15 border border-gold/30 flex items-center justify-center mb-4 text-3xl"
        >
          💸
        </div>
        <h3 className="font-display text-xl text-night">Aucun mouvement</h3>
        <p className="mt-1 text-sm text-muted max-w-sm mx-auto">
          Tes transferts d&apos;argent apparaîtront ici.
        </p>
      </div>
    );
  }

  return (
    <ul className="rounded-3xl bg-white border border-line overflow-hidden divide-y divide-line">
      {transactions.map((transaction) => (
        <li key={transaction.id}>
          <TransactionRow transaction={transaction} />
        </li>
      ))}
    </ul>
  );
}

function TransactionRow({
  transaction,
}: {
  transaction: TransactionWithCounterparty;
}) {
  const isIncoming = transaction.direction === "incoming";
  const isCredit = transaction.direction === "credit";
  const counterparty = transaction.counterparty;
  const counterpartyName =
    counterparty?.full_name ?? counterparty?.username ?? null;

  let icon: React.ReactNode;
  let title: string;
  let bgClass: string;

  if (isCredit) {
    icon = <Sparkles className="w-4 h-4 text-gold-deep" aria-hidden />;
    title = transaction.description ?? "Crédit DIVARC";
    bgClass = "bg-gold/15";
  } else if (isIncoming) {
    icon = <ArrowDownLeft className="w-4 h-4 text-emerald-700" aria-hidden />;
    title = counterpartyName
      ? `Reçu de ${counterpartyName}`
      : "Argent reçu";
    bgClass = "bg-emerald-50";
  } else {
    icon = <ArrowUpRight className="w-4 h-4 text-night" aria-hidden />;
    title = counterpartyName
      ? `Envoyé à ${counterpartyName}`
      : "Argent envoyé";
    bgClass = "bg-night/10";
  }

  const sign = isIncoming || isCredit ? "+" : "−";
  const amountClass = isIncoming
    ? "text-emerald-700"
    : isCredit
      ? "text-gold-deep"
      : "text-night";

  return (
    <div className="flex items-center gap-4 px-4 sm:px-6 py-4">
      {counterparty ? (
        <Link
          href={`/u/${counterparty.username ?? ""}`}
          aria-label={counterpartyName ?? ""}
        >
          <Avatar
            src={counterparty.avatar_url}
            fullName={counterpartyName}
            size="md"
          />
        </Link>
      ) : (
        <div
          aria-hidden
          className={cn(
            "w-12 h-12 rounded-full flex items-center justify-center",
            bgClass,
          )}
        >
          {icon}
        </div>
      )}
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-night truncate">{title}</p>
        {transaction.description ? (
          <p className="text-xs text-muted truncate">
            {transaction.description}
          </p>
        ) : null}
        <p className="text-[10px] text-muted mt-0.5">
          {formatRelative(transaction.created_at)}
        </p>
      </div>
      <div className="text-right shrink-0">
        <p className={cn("font-display text-lg", amountClass)}>
          {sign}
          {formatPrice(transaction.amount, transaction.currency)}
        </p>
      </div>
    </div>
  );
}
