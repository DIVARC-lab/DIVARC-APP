import { ArrowDownLeft, ArrowUpRight } from "lucide-react";
import Link from "next/link";
import type { Currency, Wallet } from "@/lib/database.types";
import { CURRENCY_LABELS } from "@/lib/database.types";
import { formatPrice } from "@/lib/utils/currency";

type BalanceCardProps = {
  wallet: Wallet;
};

const CURRENCY_THEME: Record<Currency, { bg: string; text: string; flag: string }> = {
  EUR: { bg: "from-night to-night-soft", text: "text-cream", flag: "🇪🇺" },
  XAF: { bg: "from-emerald-700 to-emerald-900", text: "text-cream", flag: "🌍" },
  XOF: { bg: "from-emerald-600 to-emerald-800", text: "text-cream", flag: "🌍" },
  MAD: { bg: "from-red-700 to-red-900", text: "text-cream", flag: "🇲🇦" },
  TND: { bg: "from-red-700 to-red-900", text: "text-cream", flag: "🇹🇳" },
  DZD: { bg: "from-emerald-800 to-emerald-950", text: "text-cream", flag: "🇩🇿" },
  CAD: { bg: "from-red-600 to-red-800", text: "text-cream", flag: "🇨🇦" },
  CHF: { bg: "from-red-600 to-red-800", text: "text-cream", flag: "🇨🇭" },
};

export function BalanceCard({ wallet }: BalanceCardProps) {
  const theme = CURRENCY_THEME[wallet.currency];
  const label = CURRENCY_LABELS[wallet.currency].split(" · ")[0];

  return (
    <article
      className={`relative overflow-hidden rounded-3xl bg-gradient-to-br ${theme.bg} ${theme.text} p-6 sm:p-7 grain shadow-night`}
    >
      <div className="pointer-events-none absolute -top-16 -right-16 w-48 h-48 rounded-full bg-white/10 blur-2xl" />
      <div className="pointer-events-none absolute -bottom-12 -left-12 w-40 h-40 rounded-full bg-white/5 blur-2xl" />

      <div className="relative flex items-start justify-between">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-widest opacity-70">
            {label}
          </p>
          <p className="mt-3 font-display text-4xl tracking-tight">
            {formatPrice(wallet.balance, wallet.currency)}
          </p>
        </div>
        <span aria-hidden className="text-3xl">
          {theme.flag}
        </span>
      </div>

      <div className="relative mt-6 flex flex-wrap gap-2">
        <Link
          href={`/wallet/send?currency=${wallet.currency}`}
          className="inline-flex items-center gap-1.5 px-3.5 h-9 rounded-full bg-white/15 backdrop-blur-sm hover:bg-white/25 text-xs font-semibold transition"
        >
          <ArrowUpRight className="w-3.5 h-3.5" aria-hidden />
          Envoyer
        </Link>
        <button
          type="button"
          disabled
          className="inline-flex items-center gap-1.5 px-3.5 h-9 rounded-full bg-white/10 text-xs font-semibold opacity-60 cursor-not-allowed"
        >
          <ArrowDownLeft className="w-3.5 h-3.5" aria-hidden />
          Recharger · bientôt
        </button>
      </div>
    </article>
  );
}
