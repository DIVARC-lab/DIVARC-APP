"use client";

/* Modal d'envoi de paiement à un user (membre de la conv 1-1 ou groupe).
 * Pour les conversations 1-1, le recipient est auto. Pour les groupes,
 * on demande de choisir le destinataire. */

import { Loader2, User, Wallet, X } from "lucide-react";
import { useEffect, useState, useTransition } from "react";
import { toast } from "sonner";
import { Avatar } from "@/components/ui/Avatar";
import { createClient } from "@/lib/supabase/client";
import { createMessagePayment } from "../payment-actions";

type Props = {
  conversationId: string;
  open: boolean;
  onClose: () => void;
};

type Member = {
  user_id: string;
  username: string | null;
  full_name: string | null;
  avatar_url: string | null;
};

const QUICK_AMOUNTS = [500, 1000, 2000, 5000, 10000, 20000]; // 5€, 10€, 20€, 50€, 100€, 200€

export function CreatePaymentDialog({
  conversationId,
  open,
  onClose,
}: Props) {
  const [members, setMembers] = useState<Member[]>([]);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [recipientId, setRecipientId] = useState<string | null>(null);
  const [amountInput, setAmountInput] = useState<string>("");
  const [description, setDescription] = useState("");
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    if (!open) return;
    let alive = true;
    (async () => {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (alive) setCurrentUserId(user?.id ?? null);

      /* eslint-disable-next-line @typescript-eslint/no-explicit-any */
      const { data } = await (supabase as any)
        .from("conversation_members")
        .select("user_id, profiles(username, full_name, avatar_url)")
        .eq("conversation_id", conversationId);
      if (!alive) return;
      const list = ((data ?? []) as Array<{
        user_id: string;
        profiles: {
          username: string | null;
          full_name: string | null;
          avatar_url: string | null;
        } | null;
      }>)
        .filter((m) => m.user_id !== user?.id)
        .map((m) => ({
          user_id: m.user_id,
          username: m.profiles?.username ?? null,
          full_name: m.profiles?.full_name ?? null,
          avatar_url: m.profiles?.avatar_url ?? null,
        }));
      setMembers(list);
      if (list.length === 1) setRecipientId(list[0]!.user_id);
    })();
    return () => {
      alive = false;
    };
  }, [open, conversationId]);

  function reset() {
    setRecipientId(null);
    setAmountInput("");
    setDescription("");
  }

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!recipientId) {
      toast.error("Choisis un destinataire.");
      return;
    }
    const cents = Math.round(Number.parseFloat(amountInput) * 100);
    if (!Number.isFinite(cents) || cents < 100) {
      toast.error("Montant minimum 1 €.");
      return;
    }
    if (cents > 100_000) {
      toast.error("Montant maximum 1000 €.");
      return;
    }

    startTransition(async () => {
      const res = await createMessagePayment({
        conversationId,
        recipientId,
        amountCents: cents,
        description: description.trim() || undefined,
      });
      if (!res.ok) {
        toast.error(res.error);
        return;
      }
      toast.success("Demande de paiement envoyée.");
      reset();
      onClose();
      if (res.checkoutUrl) {
        /* L'expéditeur (le user courant) ne paie PAS depuis ce dialog —
           le recipient paie via Checkout. Mais on log l'URL pour debug. */
        console.log("[Payment] Checkout URL recipient:", res.checkoutUrl);
      }
    });
  }

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-night/50 backdrop-blur-sm p-4"
      onClick={onClose}
    >
      <form
        onSubmit={handleSubmit}
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-md rounded-3xl bg-white text-night p-5 shadow-2xl"
      >
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Wallet
              className="w-4 h-4 text-gold-deep"
              aria-hidden
              strokeWidth={2.4}
            />
            <p className="text-[10px] font-extrabold uppercase tracking-[0.16em] text-gold-deep">
              Demander un paiement
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Fermer"
            className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-bg-soft hover:bg-night/10 text-night"
          >
            <X className="w-4 h-4" aria-hidden />
          </button>
        </div>

        {/* Recipient picker (si > 1 membre). */}
        {members.length > 1 ? (
          <fieldset className="mb-3">
            <legend className="block text-[10px] font-bold uppercase tracking-wider text-night-dim mb-1.5">
              Destinataire
            </legend>
            <div className="grid grid-cols-2 gap-2 max-h-[180px] overflow-y-auto">
              {members.map((m) => {
                const name = m.full_name ?? m.username ?? "Membre";
                const active = recipientId === m.user_id;
                return (
                  <button
                    key={m.user_id}
                    type="button"
                    onClick={() => setRecipientId(m.user_id)}
                    aria-pressed={active}
                    className={`flex items-center gap-2 p-2 rounded-2xl border transition-colors ${
                      active
                        ? "bg-gold/15 border-gold/50"
                        : "bg-bg-soft border-line hover:bg-night/5"
                    }`}
                  >
                    <Avatar src={m.avatar_url} fullName={name} size="sm" />
                    <span className="text-[11.5px] font-bold text-night truncate">
                      {name}
                    </span>
                  </button>
                );
              })}
            </div>
          </fieldset>
        ) : null}

        {/* Montant rapide */}
        <fieldset className="mb-3">
          <legend className="block text-[10px] font-bold uppercase tracking-wider text-night-dim mb-1.5">
            Montant
          </legend>
          <div className="grid grid-cols-3 gap-2 mb-2">
            {QUICK_AMOUNTS.map((c) => {
              const v = (c / 100).toFixed(0);
              const active = amountInput === v;
              return (
                <button
                  key={c}
                  type="button"
                  onClick={() => setAmountInput(v)}
                  className={`h-10 rounded-xl text-[13px] font-extrabold tabular-nums transition-colors ${
                    active
                      ? "bg-gold text-night"
                      : "bg-bg-soft text-night hover:bg-night/5"
                  }`}
                >
                  {v} €
                </button>
              );
            })}
          </div>
          <div className="relative">
            <input
              type="number"
              inputMode="decimal"
              value={amountInput}
              onChange={(e) => setAmountInput(e.target.value)}
              placeholder="Montant libre (1 à 1000 €)"
              step="0.01"
              min="1"
              max="1000"
              required
              className="w-full h-11 pl-3 pr-10 rounded-xl bg-bg-soft border border-line text-night text-[14px] tabular-nums focus:outline-none focus:border-gold-deep"
            />
            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-night-dim font-bold">
              €
            </span>
          </div>
        </fieldset>

        {/* Description */}
        <label className="block mb-4">
          <span className="block text-[10px] font-bold uppercase tracking-wider text-night-dim mb-1.5">
            Description (optionnel)
          </span>
          <input
            type="text"
            value={description}
            onChange={(e) => setDescription(e.target.value.slice(0, 200))}
            placeholder="Resto, location, cadeau…"
            maxLength={200}
            className="w-full h-11 px-3 rounded-xl bg-bg-soft border border-line text-night text-[13px] focus:outline-none focus:border-gold-deep"
          />
        </label>

        <div className="flex items-center justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            disabled={isPending}
            className="h-10 px-4 rounded-full text-[12px] font-bold text-night-dim hover:text-night"
          >
            Annuler
          </button>
          <button
            type="submit"
            disabled={isPending || !recipientId || !amountInput}
            className="inline-flex items-center gap-1.5 h-10 px-5 rounded-full bg-gold text-night text-[12px] font-extrabold hover:bg-gold-soft transition-colors disabled:opacity-60"
          >
            {isPending ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" aria-hidden />
            ) : (
              <Wallet className="w-3.5 h-3.5" aria-hidden strokeWidth={2.6} />
            )}
            Envoyer la demande
          </button>
        </div>

        <p className="mt-3 text-[10px] text-night-dim text-center">
          Paiement sécurisé via Stripe. Frais DIVARC : 2,5 %.
        </p>
      </form>
    </div>
  );
}
