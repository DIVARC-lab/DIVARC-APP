"use client";

/* Étape 16 — Panel sélection cadeaux (slide-up depuis bouton 🎁).
 *
 * Charge le catalogue virtual_gifts au mount, affiche en grid avec
 * icône+couleur+prix, click → confirmation → Stripe Checkout. */

import { Loader2, X } from "lucide-react";
import { useEffect, useState, useTransition } from "react";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";
import { sendVirtualGift } from "../gift-actions";
import { iconForGift } from "./GiftCatalog";

type Gift = {
  id: string;
  label: string;
  description: string | null;
  icon_name: string;
  color: string;
  amount_cents: number;
  rank: number;
  is_active: boolean;
};

type Props = {
  sessionId: string;
  open: boolean;
  onClose: () => void;
};

export function GiftPanel({ sessionId, open, onClose }: Props) {
  const [gifts, setGifts] = useState<Gift[]>([]);
  const [loading, setLoading] = useState(true);
  const [pendingGiftId, setPendingGiftId] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    if (!open) return;
    let alive = true;
    (async () => {
      setLoading(true);
      const supabase = createClient();
      /* eslint-disable-next-line @typescript-eslint/no-explicit-any */
      const { data } = await (supabase as any)
        .from("virtual_gifts")
        .select(
          "id, label, description, icon_name, color, amount_cents, rank, is_active",
        )
        .eq("is_active", true)
        .order("rank", { ascending: true });
      if (alive) {
        setGifts((data ?? []) as Gift[]);
        setLoading(false);
      }
    })();
    return () => {
      alive = false;
    };
  }, [open]);

  function handleSend(giftId: string) {
    if (isPending) return;
    setPendingGiftId(giftId);
    startTransition(async () => {
      const res = await sendVirtualGift({ sessionId, giftId });
      if (!res.ok) {
        setPendingGiftId(null);
        toast.error(res.error);
        return;
      }
      if (res.url) {
        window.location.href = res.url;
      } else {
        setPendingGiftId(null);
        toast.error("URL Stripe manquante.");
      }
    });
  }

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-night/70 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-md rounded-t-3xl bg-cream/5 backdrop-blur-md border-t border-cream/20 text-cream p-5 shadow-2xl"
      >
        <div className="flex items-center justify-between mb-4">
          <p className="text-[10px] font-extrabold uppercase tracking-[0.16em] text-rose-300">
            Envoyer un cadeau
          </p>
          <button
            type="button"
            onClick={onClose}
            aria-label="Fermer"
            className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-cream/10 hover:bg-cream/20 text-cream transition-colors"
          >
            <X className="w-4 h-4" aria-hidden />
          </button>
        </div>

        {loading ? (
          <div className="h-40 flex items-center justify-center">
            <Loader2
              className="w-5 h-5 animate-spin text-cream"
              aria-hidden
            />
          </div>
        ) : gifts.length === 0 ? (
          <p className="text-[12px] text-cream/60 text-center py-8">
            Aucun cadeau disponible.
          </p>
        ) : (
          <ul
            aria-label="Catalogue cadeaux"
            className="grid grid-cols-4 gap-2.5"
          >
            {gifts.map((g) => {
              const Icon = iconForGift(g.icon_name);
              const isLoading = isPending && pendingGiftId === g.id;
              return (
                <li key={g.id}>
                  <button
                    type="button"
                    disabled={isPending}
                    onClick={() => handleSend(g.id)}
                    title={g.description ?? g.label}
                    className="w-full flex flex-col items-center gap-1 p-2 rounded-2xl bg-cream/10 hover:bg-cream/20 border border-cream/10 hover:border-cream/30 transition-colors disabled:opacity-60"
                  >
                    <span
                      className="inline-flex items-center justify-center w-10 h-10 rounded-full shrink-0"
                      style={{ backgroundColor: g.color }}
                    >
                      {isLoading ? (
                        <Loader2
                          className="w-5 h-5 animate-spin text-white"
                          aria-hidden
                        />
                      ) : (
                        <Icon
                          className="w-5 h-5 text-white"
                          aria-hidden
                          strokeWidth={2.4}
                        />
                      )}
                    </span>
                    <span className="text-[10.5px] font-bold text-cream truncate w-full text-center">
                      {g.label}
                    </span>
                    <span className="text-[10px] font-extrabold text-gold tabular-nums">
                      {(g.amount_cents / 100).toFixed(2)} €
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        )}

        <p className="mt-4 text-[10px] text-cream/40 leading-relaxed text-center">
          Paiement Stripe sécurisé. 90 % revient au host, 10 % de frais
          DIVARC.
        </p>
      </div>
    </div>
  );
}
