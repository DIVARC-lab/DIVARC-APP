"use client";

/* Étape 8/60 — Système de likes flottants TikTok-style.
 *
 * Variation d'emojis aléatoires (❤️🌹💝💕✨🔥) + path courbe via
 * Framer Motion (motion). Dérive horizontale sinusoïdale + rotation
 * aléatoire + scale pop puis fade.
 *
 * Source = LiveLikesContext (broadcast via Realtime).
 *
 * Pré-requis : LiveLikesProvider doit wrapper l'arbre parent. */

import { motion, AnimatePresence } from "motion/react";
import { useLiveLikes } from "../LiveLikesContext";

const LIKE_EMOJIS = ["❤️", "🌹", "💝", "💕", "✨", "🔥"];

function pickEmoji(idx: number): string {
  return LIKE_EMOJIS[idx % LIKE_EMOJIS.length] ?? "❤️";
}

export function FloatingLikesLayer() {
  const { hearts } = useLiveLikes();

  if (hearts.length === 0) return null;

  return (
    <div
      aria-hidden
      className="pointer-events-none fixed inset-0 z-40 overflow-hidden"
    >
      <AnimatePresence>
        {hearts.map((h, idx) => {
          const emoji = pickEmoji(idx + h.id);
          const driftSign = h.driftX >= 0 ? 1 : -1;
          /* Dérive sinusoïdale : keyframes x qui oscillent. */
          const xKeyframes = [
            0,
            driftSign * 20,
            driftSign * -10,
            driftSign * 30,
            driftSign * 60,
          ];
          return (
            <motion.span
              key={h.id}
              initial={{
                opacity: 0,
                scale: 0.3,
                x: h.originX,
                y: h.originY,
                rotate: -10,
              }}
              animate={{
                opacity: [0, 1, 1, 0.8, 0],
                scale: [0.3, 1.4, 1.1, 0.95, 0.7],
                x: xKeyframes.map((dx) => h.originX + dx),
                y: [
                  h.originY,
                  h.originY - 60,
                  h.originY - 150,
                  h.originY - 230,
                  h.originY - 310,
                ],
                rotate: [
                  -10,
                  driftSign * 12,
                  driftSign * -8,
                  driftSign * 6,
                  driftSign * -4,
                ],
              }}
              exit={{ opacity: 0 }}
              transition={{
                duration: 2.6,
                ease: [0.25, 0.1, 0.25, 1],
                times: [0, 0.12, 0.45, 0.78, 1],
              }}
              className="absolute select-none"
              style={{
                fontSize: "28px",
                color: h.color,
                textShadow: "0 2px 12px rgba(0,0,0,0.5)",
                left: 0,
                top: 0,
              }}
            >
              {emoji}
            </motion.span>
          );
        })}
      </AnimatePresence>
    </div>
  );
}
