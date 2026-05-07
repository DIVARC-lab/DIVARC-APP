"use client";

import { ArrowRight, Search, Send, Wallet } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useActionState } from "react";
import { toast } from "sonner";
import { Avatar } from "@/components/ui/Avatar";
import { Button } from "@/components/ui/Button";
import {
  Field,
  FieldError,
  FieldHint,
  FieldLabel,
} from "@/components/ui/Field";
import { Input, Textarea } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { CURRENCY_LABELS, type Currency, type Wallet as WalletType } from "@/lib/database.types";
import { cn } from "@/lib/utils/cn";
import { formatPrice } from "@/lib/utils/currency";
import { sendMoney, type TransferFormState } from "../actions";

const INITIAL: TransferFormState = { status: "idle" };

type Friend = {
  id: string;
  full_name: string | null;
  username: string | null;
  avatar_url: string | null;
};

type SendFormProps = {
  wallets: WalletType[];
  friends: Friend[];
  initialRecipientId: string | null;
  initialCurrency: Currency;
};

export function SendForm({
  wallets,
  friends,
  initialRecipientId,
  initialCurrency,
}: SendFormProps) {
  const [state, formAction, pending] = useActionState<
    TransferFormState,
    FormData
  >(sendMoney, INITIAL);

  const [recipientId, setRecipientId] = useState<string>(
    initialRecipientId ?? "",
  );
  const [currency, setCurrency] = useState<Currency>(initialCurrency);
  const [amount, setAmount] = useState<string>("");
  const [search, setSearch] = useState("");

  const selectedWallet = useMemo(
    () => wallets.find((w) => w.currency === currency),
    [wallets, currency],
  );

  const balance = selectedWallet?.balance ?? 0;
  const amountNumber = Number(amount);
  const amountValid =
    !Number.isNaN(amountNumber) && amountNumber > 0 && amountNumber <= balance;

  useEffect(() => {
    if (state.status === "error" && state.message) toast.error(state.message);
  }, [state]);

  const filteredFriends = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return friends;
    return friends.filter((friend) => {
      const haystack = [friend.full_name, friend.username]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      return haystack.includes(term);
    });
  }, [friends, search]);

  const recipient = friends.find((f) => f.id === recipientId) ?? null;

  return (
    <form action={formAction} className="space-y-7" noValidate>
      <input type="hidden" name="recipient_id" value={recipientId} />

      <Section title="Destinataire" hint="Choisis un de tes amis.">
        {recipient ? (
          <div className="flex items-center gap-3 p-3 rounded-2xl bg-white border border-night/30">
            <Avatar
              src={recipient.avatar_url}
              fullName={recipient.full_name ?? recipient.username}
              size="md"
            />
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-night truncate">
                {recipient.full_name ?? recipient.username}
              </p>
              {recipient.username ? (
                <p className="text-xs text-muted truncate">
                  @{recipient.username}
                </p>
              ) : null}
            </div>
            <button
              type="button"
              onClick={() => setRecipientId("")}
              className="text-xs font-semibold text-night-muted hover:text-night"
            >
              Changer
            </button>
          </div>
        ) : (
          <>
            <div className="relative mb-3">
              <Search
                className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted"
                aria-hidden
              />
              <input
                type="search"
                placeholder="Rechercher parmi tes amis..."
                value={search}
                onChange={(event) => setSearch(event.currentTarget.value)}
                className="w-full h-10 rounded-xl border border-line bg-white pl-9 pr-3 text-sm focus:outline-none focus:border-night focus:ring-2 focus:ring-night/15"
              />
            </div>
            {friends.length === 0 ? (
              <p className="text-sm text-muted text-center py-4">
                Tu n&apos;as pas encore d&apos;amis. Va sur{" "}
                <a href="/friends" className="underline">
                  /friends
                </a>{" "}
                pour en ajouter.
              </p>
            ) : (
              <ul className="max-h-72 overflow-y-auto space-y-1 -mx-1 px-1">
                {filteredFriends.map((friend) => (
                  <li key={friend.id}>
                    <button
                      type="button"
                      onClick={() => setRecipientId(friend.id)}
                      className="w-full flex items-center gap-3 p-2.5 rounded-2xl hover:bg-night/[0.04] text-left transition-colors"
                    >
                      <Avatar
                        src={friend.avatar_url}
                        fullName={friend.full_name ?? friend.username}
                        size="sm"
                      />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-night truncate">
                          {friend.full_name ?? friend.username ?? "—"}
                        </p>
                        {friend.username ? (
                          <p className="text-xs text-muted truncate">
                            @{friend.username}
                          </p>
                        ) : null}
                      </div>
                      <ArrowRight className="w-4 h-4 text-muted" aria-hidden />
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </>
        )}
        <FieldError>{state.fieldErrors?.recipient_id}</FieldError>
      </Section>

      <Section title="Montant" hint={`Solde disponible : ${selectedWallet ? formatPrice(balance, currency) : "—"}`}>
        <div className="grid sm:grid-cols-3 gap-4">
          <Field className="sm:col-span-2">
            <FieldLabel htmlFor="amount" required>
              Montant
            </FieldLabel>
            <Input
              id="amount"
              name="amount"
              type="number"
              min={0}
              step={0.01}
              value={amount}
              onChange={(event) => setAmount(event.currentTarget.value)}
              required
              placeholder="0.00"
              invalid={Boolean(state.fieldErrors?.amount) || (amount.length > 0 && !amountValid)}
            />
            {amount.length > 0 && !amountValid ? (
              <FieldError>
                {amountNumber > balance
                  ? `Solde insuffisant. Tu as ${formatPrice(balance, currency)}.`
                  : "Montant invalide."}
              </FieldError>
            ) : null}
          </Field>
          <Field>
            <FieldLabel htmlFor="currency" required>
              Devise
            </FieldLabel>
            <Select
              id="currency"
              name="currency"
              value={currency}
              onChange={(event) => setCurrency(event.currentTarget.value as Currency)}
            >
              {wallets.map((wallet) => (
                <option key={wallet.currency} value={wallet.currency}>
                  {CURRENCY_LABELS[wallet.currency].split(" · ")[0]} (
                  {wallet.currency})
                </option>
              ))}
            </Select>
          </Field>
        </div>
      </Section>

      <Section title="Message (facultatif)">
        <Field>
          <FieldLabel htmlFor="description">Pour quoi ?</FieldLabel>
          <Textarea
            id="description"
            name="description"
            rows={2}
            maxLength={280}
            placeholder="Pour le tissu, merci ! 🙏"
            invalid={Boolean(state.fieldErrors?.description)}
          />
          <FieldHint>
            Le destinataire verra ce message dans son historique.
          </FieldHint>
        </Field>
      </Section>

      <div
        className={cn(
          "p-5 rounded-3xl border flex items-center gap-3",
          recipient && amountValid
            ? "bg-night text-cream border-night"
            : "bg-night/[0.02] border-line text-night-muted",
        )}
      >
        <Wallet className="w-5 h-5 shrink-0" aria-hidden />
        <p className="flex-1 text-sm">
          {recipient && amountValid ? (
            <>
              Tu vas envoyer{" "}
              <strong>{formatPrice(amountNumber, currency)}</strong> à{" "}
              <strong>
                {recipient.full_name ?? recipient.username ?? "—"}
              </strong>
              .
            </>
          ) : (
            <>Choisis un destinataire et un montant.</>
          )}
        </p>
        <Button
          type="submit"
          loading={pending}
          disabled={!recipient || !amountValid}
        >
          {!pending ? <Send className="w-4 h-4" aria-hidden /> : null}
          Envoyer
        </Button>
      </div>
    </form>
  );
}

function Section({
  title,
  hint,
  children,
}: {
  title: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="p-6 sm:p-8 rounded-3xl bg-white border border-line shadow-soft">
      <header className="mb-5">
        <h2 className="font-display text-2xl text-night">{title}</h2>
        {hint ? <p className="mt-0.5 text-sm text-muted">{hint}</p> : null}
      </header>
      {children}
    </section>
  );
}
