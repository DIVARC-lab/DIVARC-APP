"use client";

/* Animations cadeaux entrants v2 — TikTok-like avec :
 *
 * - Taille croissante selon le tier (rose petite, dragon énorme)
 * - Animation différente selon le tier (rise pour T1-3, cinematic
 *   center burst pour T4+, fullscreen takeover pour T6-7)
 * - Particules de fond pour les tiers élevés
 * - Affichage nom du sender + montant en gradient
 *
 * Polling 3s sur /api/lives/[id]/gifts. */

import { Sparkles } from "lucide-react";
import { useEffect, useRef, useState } from "react";

type ApiGift = {
  id: string;
  gift_id: string;
  gift_label: string;
  gift_icon_name: string;
  gift_color: string;
  amount_cents: number;
  paid_at: string;
  viewer_id: string;
  viewer_full_name: string | null;
  viewer_username: string | null;
};

type FloatingGift = {
  id: string;
  emoji: string;
  label: string;
  tier: number;
  amountCents: number;
  senderName: string;
  gradientFrom: string;
  gradientTo: string;
  glowColor: string;
  offsetX: number;
};

const ANIMATION_MS_LOW = 4500;
const ANIMATION_MS_HIGH = 6500;

/* Mapping gift_id (catalog) → metadata visuelle.
 * On évite un fetch DB côté client en hardcodant ici, synchro avec
 * migration 0170. Pour les anciens gifts (rose, heart, …) on fallback
 * sur des défauts par couleur. */
const GIFT_META: Record<
  string,
  {
    emoji: string;
    tier: number;
    gradientFrom: string;
    gradientTo: string;
    glowColor: string;
  }
> = {
  rose_premium:    { emoji: "🌹", tier: 1, gradientFrom: "#fda4af", gradientTo: "#f43f5e", glowColor: "#fb7185" },
  coffee:          { emoji: "☕", tier: 1, gradientFrom: "#fde68a", gradientTo: "#d97706", glowColor: "#facc15" },
  cute_heart:      { emoji: "💗", tier: 1, gradientFrom: "#fbcfe8", gradientTo: "#ec4899", glowColor: "#f472b6" },
  kiss:            { emoji: "💋", tier: 1, gradientFrom: "#fbcfe8", gradientTo: "#db2777", glowColor: "#ec4899" },
  cute_star:       { emoji: "⭐", tier: 1, gradientFrom: "#fef3c7", gradientTo: "#eab308", glowColor: "#facc15" },
  ice_cream:       { emoji: "🍦", tier: 2, gradientFrom: "#bae6fd", gradientTo: "#0891b2", glowColor: "#22d3ee" },
  pizza:           { emoji: "🍕", tier: 2, gradientFrom: "#fdba74", gradientTo: "#ea580c", glowColor: "#fb923c" },
  medal:           { emoji: "🏅", tier: 2, gradientFrom: "#fde68a", gradientTo: "#ca8a04", glowColor: "#eab308" },
  trophy_gold:     { emoji: "🏆", tier: 2, gradientFrom: "#fef08a", gradientTo: "#a16207", glowColor: "#facc15" },
  fire_premium:    { emoji: "🔥", tier: 3, gradientFrom: "#fecaca", gradientTo: "#dc2626", glowColor: "#f87171" },
  microphone_gold: { emoji: "🎤", tier: 3, gradientFrom: "#e9d5ff", gradientTo: "#7e22ce", glowColor: "#c084fc" },
  crown_premium:   { emoji: "👑", tier: 3, gradientFrom: "#fef3c7", gradientTo: "#a16207", glowColor: "#eab308" },
  diamond:         { emoji: "💎", tier: 4, gradientFrom: "#cffafe", gradientTo: "#0e7490", glowColor: "#22d3ee" },
  sports_car:      { emoji: "🏎️", tier: 4, gradientFrom: "#fecaca", gradientTo: "#b91c1c", glowColor: "#ef4444" },
  rocket_premium:  { emoji: "🚀", tier: 4, gradientFrom: "#bfdbfe", gradientTo: "#1d4ed8", glowColor: "#60a5fa" },
  helicopter:      { emoji: "🚁", tier: 5, gradientFrom: "#fef3c7", gradientTo: "#854d0e", glowColor: "#eab308" },
  yacht:           { emoji: "🛥️", tier: 5, gradientFrom: "#bae6fd", gradientTo: "#0369a1", glowColor: "#38bdf8" },
  jet_private:     { emoji: "✈️", tier: 5, gradientFrom: "#dbeafe", gradientTo: "#1e3a8a", glowColor: "#3b82f6" },
  castle_premium:  { emoji: "🏰", tier: 6, gradientFrom: "#e9d5ff", gradientTo: "#6b21a8", glowColor: "#a855f7" },
  island_premium:  { emoji: "🏝️", tier: 6, gradientFrom: "#a7f3d0", gradientTo: "#047857", glowColor: "#10b981" },
  lion_king:       { emoji: "🦁", tier: 6, gradientFrom: "#fed7aa", gradientTo: "#9a3412", glowColor: "#f97316" },
  galaxy:          { emoji: "🌌", tier: 7, gradientFrom: "#c4b5fd", gradientTo: "#5b21b6", glowColor: "#a78bfa" },
  cosmic_dragon:   { emoji: "🐉", tier: 7, gradientFrom: "#f5d0fe", gradientTo: "#86198f", glowColor: "#e879f9" },
};

function metaFor(giftId: string, fallbackColor: string, fallbackLabel: string) {
  const meta = GIFT_META[giftId];
  if (meta) return meta;
  return {
    emoji: fallbackLabel.includes("Cœur") || fallbackLabel.includes("heart") ? "💖" : "🎁",
    tier: 1,
    gradientFrom: fallbackColor,
    gradientTo: fallbackColor,
    glowColor: fallbackColor,
  };
}

type Props = { sessionId: string };

export function GiftAnimationOverlay({ sessionId }: Props) {
  const [floating, setFloating] = useState<FloatingGift[]>([]);
  const seenRef = useRef<Set<string>>(new Set());
  const mountTimeRef = useRef<number>(Date.now());

  useEffect(() => {
    let alive = true;
    let timer: number | null = null;

    async function poll() {
      try {
        const res = await fetch(`/api/lives/${sessionId}/gifts?since=15`, {
          cache: "no-store",
        });
        if (!res.ok) return;
        const data = (await res.json()) as { items: ApiGift[] };
        if (!alive) return;

        const newOnes: FloatingGift[] = [];
        for (const g of data.items ?? []) {
          if (seenRef.current.has(g.id)) continue;
          const paidAtMs = new Date(g.paid_at).getTime();
          if (paidAtMs < mountTimeRef.current - 5000) {
            seenRef.current.add(g.id);
            continue;
          }
          seenRef.current.add(g.id);

          const meta = metaFor(g.gift_id, g.gift_color, g.gift_label);
          newOnes.push({
            id: g.id,
            emoji: meta.emoji,
            label: g.gift_label,
            tier: meta.tier,
            amountCents: g.amount_cents,
            senderName:
              g.viewer_full_name ?? g.viewer_username ?? "Spectateur",
            gradientFrom: meta.gradientFrom,
            gradientTo: meta.gradientTo,
            glowColor: meta.glowColor,
            offsetX: Math.floor(Math.random() * 120) - 60,
          });
        }

        if (newOnes.length === 0) return;
        setFloating((prev) => [...prev, ...newOnes]);

        for (const g of newOnes) {
          const duration = g.tier >= 4 ? ANIMATION_MS_HIGH : ANIMATION_MS_LOW;
          window.setTimeout(() => {
            setFloating((prev) => prev.filter((f) => f.id !== g.id));
          }, duration);
        }
      } catch {
        /* silencieux */
      }
    }

    void poll();
    timer = window.setInterval(() => void poll(), 3000);
    return () => {
      alive = false;
      if (timer !== null) window.clearInterval(timer);
    };
  }, [sessionId]);

  if (floating.length === 0) return null;

  return (
    <>
      {/* Tier 1-3 : montée classique depuis le bas */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 overflow-hidden"
      >
        {floating
          .filter((g) => g.tier <= 3)
          .map((g) => (
            <div
              key={g.id}
              className="absolute bottom-20 left-1/2"
              style={{ transform: `translateX(${g.offsetX}px)` }}
            >
              <div className="flex flex-col items-center gap-1 animate-gift-rise">
                <span
                  className="inline-flex items-center justify-center w-14 h-14 rounded-2xl text-3xl shadow-2xl"
                  style={{
                    background: `linear-gradient(135deg, ${g.gradientFrom}, ${g.gradientTo})`,
                    boxShadow: `0 10px 40px -5px ${g.glowColor}, 0 0 0 2px ${g.glowColor}40`,
                  }}
                >
                  {g.emoji}
                </span>
                <span className="text-[10.5px] font-extrabold text-white bg-night/70 backdrop-blur-sm px-2 py-0.5 rounded-full shadow">
                  {g.senderName}
                  <span className="ml-1 text-gold tabular-nums">
                    {(g.amountCents / 100).toFixed(2)} €
                  </span>
                </span>
              </div>
            </div>
          ))}
      </div>

      {/* Tier 4-5 : burst central avec sparkles */}
      {floating
        .filter((g) => g.tier === 4 || g.tier === 5)
        .map((g) => (
          <div
            key={g.id}
            aria-hidden
            className="pointer-events-none absolute inset-0 flex items-center justify-center z-10"
          >
            <div className="animate-gift-burst flex flex-col items-center gap-3">
              <div className="relative">
                <span
                  aria-hidden
                  className="absolute inset-0 -m-8 rounded-full blur-2xl animate-pulse"
                  style={{ backgroundColor: g.glowColor, opacity: 0.6 }}
                />
                <span
                  className="relative inline-flex items-center justify-center w-32 h-32 rounded-3xl text-7xl shadow-2xl"
                  style={{
                    background: `linear-gradient(135deg, ${g.gradientFrom}, ${g.gradientTo})`,
                    boxShadow: `0 20px 80px -10px ${g.glowColor}, 0 0 0 3px ${g.glowColor}80`,
                  }}
                >
                  {g.emoji}
                </span>
              </div>
              <div className="bg-night/80 backdrop-blur-md rounded-2xl px-4 py-2 border border-cream/20">
                <p className="text-[12px] font-extrabold text-cream text-center">
                  {g.senderName}
                </p>
                <p className="text-[14px] font-extrabold bg-gradient-to-r from-gold via-rose-300 to-fuchsia-300 bg-clip-text text-transparent text-center">
                  {g.label} · {(g.amountCents / 100).toFixed(2)} €
                </p>
              </div>
            </div>
          </div>
        ))}

      {/* Tier 6-7 : fullscreen takeover avec particles */}
      {floating
        .filter((g) => g.tier >= 6)
        .map((g) => (
          <div
            key={g.id}
            aria-hidden
            className="pointer-events-none fixed inset-0 z-50 flex items-center justify-center"
          >
            {/* Background sweep */}
            <div
              className="absolute inset-0 animate-gift-mythic-bg"
              style={{
                background: `radial-gradient(circle at 50% 50%, ${g.glowColor}80 0%, ${g.gradientTo}40 40%, transparent 80%)`,
              }}
            />
            {/* Particles burst */}
            <div className="absolute inset-0 flex items-center justify-center">
              {Array.from({ length: 12 }).map((_, i) => (
                <Sparkles
                  key={i}
                  className="absolute w-6 h-6 animate-gift-particle"
                  style={
                    {
                      color: g.glowColor,
                      "--angle": `${i * 30}deg`,
                    } as React.CSSProperties
                  }
                  aria-hidden
                />
              ))}
            </div>
            {/* Main gift */}
            <div className="relative animate-gift-mythic flex flex-col items-center gap-4">
              <span
                className="inline-flex items-center justify-center w-48 h-48 rounded-3xl text-9xl"
                style={{
                  background: `linear-gradient(135deg, ${g.gradientFrom}, ${g.gradientTo})`,
                  boxShadow: `0 30px 120px -15px ${g.glowColor}, 0 0 0 4px ${g.glowColor}`,
                }}
              >
                {g.emoji}
              </span>
              <div className="bg-night/90 backdrop-blur-md rounded-3xl px-6 py-3 border-2 border-cream/30">
                <p className="text-[10px] font-extrabold uppercase tracking-[0.18em] text-cream/60 text-center">
                  {g.tier === 7 ? "⚡ Cosmic Gift ⚡" : "💎 Cadeau Mythique 💎"}
                </p>
                <p className="text-[14px] font-extrabold text-cream text-center mt-1">
                  {g.senderName}
                </p>
                <p className="text-[18px] font-extrabold bg-gradient-to-r from-gold via-rose-300 to-fuchsia-300 bg-clip-text text-transparent text-center">
                  {g.label} · {(g.amountCents / 100).toFixed(2)} €
                </p>
              </div>
            </div>
          </div>
        ))}
    </>
  );
}
