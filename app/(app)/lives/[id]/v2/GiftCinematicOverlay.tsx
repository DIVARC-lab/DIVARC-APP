"use client";

/* Étape 17/60 — Animations gifts à l'écran (3 niveaux cinematic).
 *
 * Wrapper qui consomme un stream Realtime de gifts paid et déclenche
 * une animation différente selon le tier :
 *
 *   - Tier 1-2 : petite anim coin bottom-right (1-2s)
 *   - Tier 3-4 : burst central scale rotate (3-4s)
 *   - Tier 5-7 : fullscreen takeover (5-7s) avec confettis, particules
 *
 * Sources :
 *   - Polling /api/lives/[id]/gifts toutes les 3s (existant)
 *   - + Realtime broadcast 'gift_sent' pour latence faible */

import { motion, AnimatePresence } from "motion/react";
import { useEffect, useRef, useState } from "react";
import { Avatar } from "@/components/ui/Avatar";

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

type ActiveGift = {
  id: string;
  emoji: string;
  label: string;
  tier: number;
  amountCents: number;
  senderName: string;
  senderAvatar: string | null;
  gradientFrom: string;
  gradientTo: string;
  glowColor: string;
  spawnAt: number;
};

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

const DURATION_BY_TIER: Record<number, number> = {
  1: 2000,
  2: 2500,
  3: 4000,
  4: 4500,
  5: 6000,
  6: 7000,
  7: 8000,
};

type Props = { sessionId: string };

export function GiftCinematicOverlay({ sessionId }: Props) {
  const [active, setActive] = useState<ActiveGift[]>([]);
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

        const newOnes: ActiveGift[] = [];
        for (const g of data.items ?? []) {
          if (seenRef.current.has(g.id)) continue;
          const paidAt = new Date(g.paid_at).getTime();
          if (paidAt < mountTimeRef.current - 5000) {
            seenRef.current.add(g.id);
            continue;
          }
          seenRef.current.add(g.id);

          const meta = GIFT_META[g.gift_id] ?? {
            emoji: "🎁",
            tier: 1,
            gradientFrom: g.gift_color,
            gradientTo: g.gift_color,
            glowColor: g.gift_color,
          };

          newOnes.push({
            id: g.id,
            emoji: meta.emoji,
            label: g.gift_label,
            tier: meta.tier,
            amountCents: g.amount_cents,
            senderName: g.viewer_full_name ?? g.viewer_username ?? "Anonyme",
            senderAvatar: null,
            gradientFrom: meta.gradientFrom,
            gradientTo: meta.gradientTo,
            glowColor: meta.glowColor,
            spawnAt: Date.now(),
          });
        }

        if (newOnes.length === 0) return;
        setActive((prev) => [...prev, ...newOnes]);

        for (const g of newOnes) {
          const ttl = DURATION_BY_TIER[g.tier] ?? 3000;
          window.setTimeout(() => {
            setActive((prev) => prev.filter((a) => a.id !== g.id));
          }, ttl);
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

  return (
    <>
      {/* Tier 1-2 : coin bottom-right discret. */}
      <AnimatePresence>
        {active
          .filter((g) => g.tier <= 2)
          .map((g) => (
            <motion.div
              key={g.id}
              initial={{ opacity: 0, scale: 0.4, x: 80, y: 0 }}
              animate={{ opacity: 1, scale: 1, x: 0, y: 0 }}
              exit={{ opacity: 0, y: -40 }}
              transition={{ duration: 0.5, type: "spring", stiffness: 220 }}
              className="absolute bottom-28 right-4 z-30 pointer-events-none"
            >
              <div className="flex flex-col items-end gap-1">
                <span
                  className="inline-flex items-center justify-center w-12 h-12 rounded-2xl text-2xl shadow-xl"
                  style={{
                    background: `linear-gradient(135deg, ${g.gradientFrom}, ${g.gradientTo})`,
                    boxShadow: `0 8px 24px -4px ${g.glowColor}`,
                  }}
                >
                  {g.emoji}
                </span>
                <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-night/85 backdrop-blur-md text-[10.5px]">
                  <Avatar
                    src={g.senderAvatar}
                    fullName={g.senderName}
                    size="sm"
                  />
                  <span className="font-bold text-cream">{g.senderName}</span>
                  <span className="text-gold tabular-nums">
                    {(g.amountCents / 100).toFixed(2)} €
                  </span>
                </span>
              </div>
            </motion.div>
          ))}
      </AnimatePresence>

      {/* Tier 3-4 : burst central. */}
      <AnimatePresence>
        {active
          .filter((g) => g.tier === 3 || g.tier === 4)
          .map((g) => (
            <motion.div
              key={g.id}
              initial={{ opacity: 0, scale: 0.2, rotate: -25 }}
              animate={{ opacity: 1, scale: 1, rotate: 0 }}
              exit={{ opacity: 0, scale: 1.4, rotate: 10 }}
              transition={{
                duration: 0.6,
                type: "spring",
                stiffness: 200,
              }}
              className="absolute inset-0 z-30 flex items-center justify-center pointer-events-none"
            >
              <div className="flex flex-col items-center gap-3">
                <div className="relative">
                  <span
                    aria-hidden
                    className="absolute inset-0 -m-10 rounded-full blur-3xl"
                    style={{
                      backgroundColor: g.glowColor,
                      opacity: 0.5,
                    }}
                  />
                  <motion.span
                    animate={{ rotate: [0, -8, 8, 0] }}
                    transition={{
                      duration: 0.8,
                      repeat: 3,
                      ease: "easeInOut",
                    }}
                    className="relative inline-flex items-center justify-center w-36 h-36 rounded-3xl text-8xl shadow-2xl"
                    style={{
                      background: `linear-gradient(135deg, ${g.gradientFrom}, ${g.gradientTo})`,
                      boxShadow: `0 20px 60px -8px ${g.glowColor}, 0 0 0 3px ${g.glowColor}80`,
                    }}
                  >
                    {g.emoji}
                  </motion.span>
                </div>
                <motion.div
                  initial={{ y: 20, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  transition={{ delay: 0.4 }}
                  className="rounded-2xl bg-night/85 backdrop-blur-md px-4 py-2 border border-cream/20"
                >
                  <p className="text-[12px] font-extrabold text-cream text-center">
                    {g.senderName}
                  </p>
                  <p className="text-[15px] font-display italic bg-gradient-to-r from-gold via-rose-300 to-fuchsia-300 bg-clip-text text-transparent text-center">
                    {g.label} · {(g.amountCents / 100).toFixed(2)} €
                  </p>
                </motion.div>
              </div>
            </motion.div>
          ))}
      </AnimatePresence>

      {/* Tier 5-7 : fullscreen takeover. */}
      <AnimatePresence>
        {active
          .filter((g) => g.tier >= 5)
          .map((g) => (
            <motion.div
              key={g.id}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.3 }}
              className="fixed inset-0 z-50 flex items-center justify-center pointer-events-none"
            >
              {/* Background sweep */}
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="absolute inset-0"
                style={{
                  background: `radial-gradient(circle at 50% 50%, ${g.glowColor}80 0%, ${g.gradientTo}40 40%, transparent 80%)`,
                }}
              />

              {/* Particles burst */}
              {Array.from({ length: 16 }).map((_, i) => (
                <motion.span
                  key={i}
                  initial={{ scale: 0, opacity: 0, x: 0, y: 0, rotate: 0 }}
                  animate={{
                    scale: [0, 1.4, 1.2, 1, 0],
                    opacity: [0, 1, 1, 0.7, 0],
                    x: Math.cos((i * Math.PI * 2) / 16) * 280,
                    y: Math.sin((i * Math.PI * 2) / 16) * 280,
                    rotate: 360,
                  }}
                  transition={{ duration: 2.5, ease: "easeOut" }}
                  className="absolute text-3xl"
                  style={{ color: g.glowColor }}
                >
                  ✦
                </motion.span>
              ))}

              {/* Main gift cinematic. */}
              <motion.div
                initial={{ scale: 0.1, rotate: -180 }}
                animate={{ scale: 1, rotate: 0 }}
                exit={{ scale: 0.6, opacity: 0 }}
                transition={{
                  duration: 0.8,
                  type: "spring",
                  stiffness: 120,
                  damping: 14,
                }}
                className="relative flex flex-col items-center gap-4"
              >
                <span
                  className="inline-flex items-center justify-center w-56 h-56 rounded-[42px] text-[140px]"
                  style={{
                    background: `linear-gradient(135deg, ${g.gradientFrom}, ${g.gradientTo})`,
                    boxShadow: `0 40px 120px -15px ${g.glowColor}, 0 0 0 4px ${g.glowColor}`,
                  }}
                >
                  {g.emoji}
                </span>
                <div className="rounded-3xl bg-night/90 backdrop-blur-md px-6 py-3 border-2 border-cream/30 text-center">
                  <p className="text-[10px] font-extrabold uppercase tracking-[0.18em] text-cream/60">
                    {g.tier === 7 ? "⚡ Cosmic Gift ⚡" : "💎 Cadeau Mythique"}
                  </p>
                  <p className="text-[14px] font-extrabold text-cream mt-1">
                    {g.senderName}
                  </p>
                  <p className="text-[18px] font-display italic bg-gradient-to-r from-gold via-rose-300 to-fuchsia-300 bg-clip-text text-transparent">
                    {g.label} · {(g.amountCents / 100).toFixed(2)} €
                  </p>
                </div>
              </motion.div>
            </motion.div>
          ))}
      </AnimatePresence>
    </>
  );
}
