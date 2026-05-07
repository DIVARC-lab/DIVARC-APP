import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { listFriendsForUser } from "@/lib/queries/friendships";
import { listWallets } from "@/lib/queries/wallet";
import { createClient } from "@/lib/supabase/server";
import type { Currency } from "@/lib/database.types";
import { SendForm } from "./SendForm";

export const metadata = {
  title: "Envoyer de l'argent",
};

const CURRENCIES: Currency[] = [
  "EUR",
  "XAF",
  "XOF",
  "MAD",
  "TND",
  "DZD",
  "CAD",
  "CHF",
];

type SearchParams = Promise<{ to?: string; currency?: string }>;

export default async function SendMoneyPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { to, currency } = await searchParams;

  const [wallets, friendships] = await Promise.all([
    listWallets(user.id),
    listFriendsForUser(user.id),
  ]);

  const friends = friendships.map((friendship) => ({
    id: friendship.other.id,
    full_name: friendship.other.full_name,
    username: friendship.other.username,
    avatar_url: friendship.other.avatar_url,
  }));

  const initialCurrency =
    currency && CURRENCIES.includes(currency as Currency)
      ? (currency as Currency)
      : (wallets[0]?.currency ?? "EUR");

  return (
    <div className="px-6 sm:px-10 py-10 max-w-3xl mx-auto w-full">
      <header className="mb-8">
        <Link
          href="/wallet"
          className="inline-flex items-center gap-2 text-sm text-night-muted hover:text-night mb-4"
        >
          <ArrowLeft className="w-4 h-4" aria-hidden />
          Retour au wallet
        </Link>
        <span className="text-xs font-semibold tracking-widest uppercase text-gold-deep">
          Envoyer de l&apos;argent
        </span>
        <h1 className="mt-2 font-display text-4xl sm:text-5xl text-night text-balance leading-[1.05]">
          Transfert <em className="italic">instantané</em>.
        </h1>
        <p className="mt-2 text-muted-strong">
          Sans frais, vers un ami, dans la devise de ton choix.
        </p>
      </header>

      <SendForm
        wallets={wallets}
        friends={friends}
        initialRecipientId={to ?? null}
        initialCurrency={initialCurrency}
      />
    </div>
  );
}
