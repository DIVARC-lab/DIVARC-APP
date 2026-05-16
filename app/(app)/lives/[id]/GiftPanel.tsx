"use client";

/* Panel cadeaux premium TikTok-style.
 *
 * - Tabs horizontales par tier (1-7)
 * - Grid 4 colonnes par tier
 * - Cards avec gradient unique par tier + glow + emoji 3D large
 * - Tap = sélection visuelle, double-tap ou bouton "Envoyer" = checkout
 * - Animation "shimmer" sur les cards des tiers élevés
 */

import { Loader2, Sparkles, X } from "lucide-react";
import { useEffect, useMemo, useState, useTransition } from "react";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";
import { sendVirtualGift } from "../gift-actions";

type Gift = {
  id: string;
  label: string;
  description: string | null;
  tagline: string | null;
  emoji: string | null;
  icon_name: string;
  color: string;
  amount_cents: number;
  tier: number | null;
  gradient_from: string | null;
  gradient_to: string | null;
  glow_color: string | null;
  rank: number;
  is_active: boolean;
};

type Props = {
  sessionId: string;
  open: boolean;
  onClose: () => void;
};

const TIER_LABELS: Record<number, string> = {
  1: "Mignon",
  2: "Bravo",
  3: "Bravo+",
  4: "Premium",
  5: "Légende",
  6: "Mythique",
  7: "Cosmic",
};

const TIER_BADGE_BG: Record<number, string> = {
  1: "bg-pink-400/20 text-pink-200 border-pink-300/30",
  2: "bg-cyan-400/20 text-cyan-200 border-cyan-300/30",
  3: "bg-purple-400/20 text-purple-200 border-purple-300/30",
  4: "bg-emerald-400/20 text-emerald-200 border-emerald-300/30",
  5: "bg-amber-400/20 text-amber-200 border-amber-300/30",
  6: "bg-rose-500/20 text-rose-200 border-rose-300/30",
  7: "bg-fuchsia-500/20 text-fuchsia-200 border-fuchsia-300/30",
};

export function GiftPanel({ sessionId, open, onClose }: Props) {
  const [gifts, setGifts] = useState<Gift[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [activeTier, setActiveTier] = useState<number>(1);
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
          "id, label, description, tagline, emoji, icon_name, color, amount_cents, tier, gradient_from, gradient_to, glow_color, rank, is_active",
        )
        .eq("is_active", true)
        .order("tier", { ascending: true })
        .order("amount_cents", { ascending: true });
      if (alive) {
        setGifts((data ?? []) as Gift[]);
        setLoading(false);
      }
    })();
    return () => {
      alive = false;
    };
  }, [open]);

  /* Group gifts par tier. */
  const byTier = useMemo(() => {
    const map = new Map<number, Gift[]>();
    for (const g of gifts) {
      const t = g.tier ?? 1;
      if (!map.has(t)) map.set(t, []);
      map.get(t)!.push(g);
    }
    return map;
  }, [gifts]);

  const availableTiers = useMemo(
    () => Array.from(byTier.keys()).sort((a, b) => a - b),
    [byTier],
  );

  /* Auto-select premier tier disponible si activeTier vide. */
  useEffect(() => {
    if (availableTiers.length > 0 && !availableTiers.includes(activeTier)) {
      setActiveTier(availableTiers[0] ?? 1);
    }
  }, [availableTiers, activeTier]);

  const selectedGift = useMemo(
    () => gifts.find((g) => g.id === selectedId) ?? null,
    [gifts, selectedId],
  );

  function handleSend() {
    if (!selectedGift || isPending) return;
    startTransition(async () => {
      const res = await sendVirtualGift({
        sessionId,
        giftId: selectedGift.id,
      });
      if (!res.ok) {
        toast.error(res.error);
        return;
      }
      if (res.url) {
        window.location.href = res.url;
      } else {
        toast.error("URL Stripe manquante.");
      }
    });
  }

  if (!open) return null;

  const tierGifts = byTier.get(activeTier) ?? [];

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-night/80 backdrop-blur-md"
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="relative w-full max-w-lg rounded-t-3xl bg-gradient-to-b from-night via-night/95 to-night/90 backdrop-blur-2xl border-t-2 border-cream/20 text-cream shadow-[0_-30px_80px_-10px_rgba(255,200,80,0.15)]"
      >
        {/* Decorative top sparkle line */}
        <div
          aria-hidden
          className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 w-16 h-1.5 rounded-full bg-gradient-to-r from-transparent via-gold to-transparent"
        />

        <header className="flex items-center justify-between px-5 pt-5 pb-3">
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-gradient-to-br from-gold to-rose-500 shadow-lg">
              <Sparkles
                className="w-3.5 h-3.5 text-night"
                aria-hidden
                strokeWidth={2.6}
              />
            </span>
            <div>
              <p className="text-[10px] font-extrabold uppercase tracking-[0.18em] bg-gradient-to-r from-gold via-rose-300 to-fuchsia-300 bg-clip-text text-transparent">
                Boutique cadeaux
              </p>
              <p className="text-[10.5px] text-cream/50">
                Soutiens le host. 90% reviennent à l&apos;artiste.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Fermer"
            className="inline-flex items-center justify-center w-9 h-9 rounded-full bg-cream/10 hover:bg-cream/20 transition-colors"
          >
            <X className="w-4 h-4" aria-hidden />
          </button>
        </header>

        {/* Tabs tier */}
        {availableTiers.length > 1 ? (
          <div className="flex gap-1.5 px-5 pb-2 overflow-x-auto scrollbar-hide">
            {availableTiers.map((t) => {
              const active = activeTier === t;
              return (
                <button
                  key={t}
                  type="button"
                  onClick={() => {
                    setActiveTier(t);
                    setSelectedId(null);
                  }}
                  className={`shrink-0 inline-flex items-center gap-1 h-8 px-3 rounded-full border text-[11px] font-extrabold transition-all ${
                    active
                      ? `${TIER_BADGE_BG[t] ?? "bg-cream/20 text-cream border-cream/30"} ring-1 ring-current`
                      : "bg-cream/5 text-cream/50 border-cream/10 hover:bg-cream/10"
                  }`}
                >
                  T{t} · {TIER_LABELS[t] ?? `Tier ${t}`}
                </button>
              );
            })}
          </div>
        ) : null}

        {/* Grid cadeaux */}
        <div className="px-5 pb-3 min-h-[300px] max-h-[55vh] overflow-y-auto scrollbar-hide">
          {loading ? (
            <div className="h-40 flex items-center justify-center">
              <Loader2
                className="w-6 h-6 animate-spin text-gold"
                aria-hidden
              />
            </div>
          ) : tierGifts.length === 0 ? (
            <p className="text-[12px] text-cream/50 text-center py-12">
              Aucun cadeau dans ce tier.
            </p>
          ) : (
            <ul
              aria-label={`Cadeaux ${TIER_LABELS[activeTier] ?? activeTier}`}
              className="grid grid-cols-4 gap-2.5"
            >
              {tierGifts.map((g) => {
                const selected = selectedId === g.id;
                const from = g.gradient_from ?? "#1f2937";
                const to = g.gradient_to ?? "#0f172a";
                const glow = g.glow_color ?? from;
                return (
                  <li key={g.id}>
                    <button
                      type="button"
                      onClick={() => setSelectedId(g.id)}
                      title={g.tagline ?? g.label}
                      className={`group relative w-full aspect-square flex flex-col items-center justify-center gap-1 rounded-2xl overflow-hidden transition-all duration-200 ${
                        selected
                          ? "ring-2 ring-cream scale-[1.05] shadow-2xl"
                          : "hover:scale-[1.03] active:scale-95"
                      }`}
                      style={{
                        background: `linear-gradient(135deg, ${from}, ${to})`,
                        boxShadow: selected
                          ? `0 8px 32px -4px ${glow}, 0 0 0 1px ${glow}`
                          : `0 4px 12px -2px ${glow}40`,
                      }}
                    >
                      {/* Glow halo derrière l'emoji */}
                      <span
                        aria-hidden
                        className="absolute inset-0 opacity-50 group-hover:opacity-80 transition-opacity"
                        style={{
                          background: `radial-gradient(circle at 50% 40%, ${glow}88 0%, transparent 60%)`,
                        }}
                      />
                      {/* Shimmer top */}
                      <span
                        aria-hidden
                        className="absolute inset-x-0 top-0 h-1/2 bg-gradient-to-b from-white/30 to-transparent opacity-60"
                      />
                      <span
                        className="relative z-10 text-3xl filter drop-shadow-lg select-none"
                        aria-hidden
                      >
                        {g.emoji ?? "🎁"}
                      </span>
                      <span className="relative z-10 text-[9.5px] font-extrabold text-white tabular-nums px-1.5 py-0.5 rounded-full bg-night/40 backdrop-blur-sm">
                        {(g.amount_cents / 100).toFixed(2)} €
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        {/* Footer : selected gift info + send button */}
        <footer className="px-5 py-4 border-t border-cream/10 bg-night/50 rounded-b-none">
          {selectedGift ? (
            <div className="flex items-center gap-3">
              <span
                className="inline-flex items-center justify-center w-12 h-12 rounded-2xl text-2xl shrink-0 shadow-lg"
                style={{
                  background: `linear-gradient(135deg, ${selectedGift.gradient_from}, ${selectedGift.gradient_to})`,
                  boxShadow: `0 4px 20px -2px ${selectedGift.glow_color}80`,
                }}
                aria-hidden
              >
                {selectedGift.emoji ?? "🎁"}
              </span>
              <div className="flex-1 min-w-0">
                <p className="text-[13px] font-extrabold text-cream truncate">
                  {selectedGift.label}
                </p>
                {selectedGift.tagline ? (
                  <p className="text-[10.5px] text-cream/60 truncate">
                    {selectedGift.tagline}
                  </p>
                ) : null}
              </div>
              <button
                type="button"
                onClick={handleSend}
                disabled={isPending}
                className="inline-flex items-center gap-1.5 h-11 px-5 rounded-full bg-gradient-to-r from-rose-500 to-fuchsia-500 text-white text-[12px] font-extrabold hover:from-rose-600 hover:to-fuchsia-600 transition-all disabled:opacity-60 shadow-lg shadow-rose-500/30 active:scale-95"
              >
                {isPending ? (
                  <Loader2 className="w-4 h-4 animate-spin" aria-hidden />
                ) : (
                  <Sparkles
                    className="w-4 h-4"
                    aria-hidden
                    strokeWidth={2.6}
                  />
                )}
                Envoyer {(selectedGift.amount_cents / 100).toFixed(2)} €
              </button>
            </div>
          ) : (
            <p className="text-[11px] text-cream/40 text-center py-3">
              Sélectionne un cadeau pour l&apos;envoyer.
            </p>
          )}
          <p className="mt-2 text-[9.5px] text-cream/30 text-center">
            Paiement Stripe sécurisé · 90% pour le host, 10% DIVARC.
          </p>
        </footer>
      </div>
    </div>
  );
}
