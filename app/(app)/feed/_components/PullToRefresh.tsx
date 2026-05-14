"use client";

import { Loader2, RotateCw } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils/cn";

const PULL_THRESHOLD = 80; /* px à tirer pour déclencher le refresh */
const MAX_PULL = 120; /* clamp max pour effet élastique */
const DAMPING = 0.5; /* facteur d'amortissement (résistance perçue) */

type PullToRefreshProps = {
  /* Callback optionnel quand le refresh se déclenche. Par défaut on
     fait router.refresh() (re-fetch SSR Next.js sans full reload). */
  onRefresh?: () => Promise<void> | void;
  children: React.ReactNode;
};

/* Pull-to-refresh mobile FB/Twitter-style.
 *
 * Comportement :
 *  - Visible UNIQUEMENT sur mobile (sm:hidden), desktop pas concerné.
 *  - Détecte touchstart si scrollY === 0 (l'user est tout en haut).
 *  - touchmove : si l'user tire vers le bas, on track le delta avec
 *    amortissement (* 0.5) et clamp à 120px. Indicateur visuel suit.
 *  - touchend : si delta >= 80px → router.refresh() + spinner ; sinon
 *    snap back animé.
 *
 * Pas de re-attachement des listeners à chaque pullDistance (les
 * valeurs courantes sont stockées en refs).
 */
export function PullToRefresh({ onRefresh, children }: PullToRefreshProps) {
  const router = useRouter();
  const [pullDistance, setPullDistance] = useState(0);
  const [refreshing, setRefreshing] = useState(false);

  /* Refs pour les valeurs courantes (handlers stables). */
  const touchStartYRef = useRef<number | null>(null);
  const activeRef = useRef(false);
  const pullDistanceRef = useRef(0);
  const refreshingRef = useRef(false);

  useEffect(() => {
    pullDistanceRef.current = pullDistance;
  }, [pullDistance]);

  useEffect(() => {
    refreshingRef.current = refreshing;
  }, [refreshing]);

  useEffect(() => {
    function onTouchStart(e: TouchEvent) {
      /* On n'arme que si l'user est en haut du scroll ET pas déjà en
         train de refresh. */
      if (window.scrollY > 0 || refreshingRef.current) return;
      touchStartYRef.current = e.touches[0]?.clientY ?? null;
      activeRef.current = true;
    }

    function onTouchMove(e: TouchEvent) {
      if (!activeRef.current || touchStartYRef.current === null) return;
      const currentY = e.touches[0]?.clientY ?? 0;
      const delta = currentY - touchStartYRef.current;

      /* Pull uniquement vers le bas (delta > 0). */
      if (delta <= 0) {
        setPullDistance(0);
        return;
      }

      /* Damping + clamp pour effet élastique. */
      const clamped = Math.min(delta * DAMPING, MAX_PULL);
      setPullDistance(clamped);
    }

    async function onTouchEnd() {
      if (!activeRef.current) return;
      activeRef.current = false;
      touchStartYRef.current = null;

      const dist = pullDistanceRef.current;

      if (dist >= PULL_THRESHOLD && !refreshingRef.current) {
        setRefreshing(true);
        try {
          if (onRefresh) {
            await onRefresh();
          } else {
            router.refresh();
            /* Petit délai pour laisser le re-render se faire. */
            await new Promise((r) => setTimeout(r, 600));
          }
        } finally {
          setRefreshing(false);
        }
      }
      setPullDistance(0);
    }

    document.addEventListener("touchstart", onTouchStart, { passive: true });
    document.addEventListener("touchmove", onTouchMove, { passive: true });
    document.addEventListener("touchend", onTouchEnd);
    document.addEventListener("touchcancel", onTouchEnd);
    return () => {
      document.removeEventListener("touchstart", onTouchStart);
      document.removeEventListener("touchmove", onTouchMove);
      document.removeEventListener("touchend", onTouchEnd);
      document.removeEventListener("touchcancel", onTouchEnd);
    };
  }, [router, onRefresh]);

  const reached = pullDistance >= PULL_THRESHOLD;
  const showIndicator = pullDistance > 4 || refreshing;

  return (
    <>
      {/* Indicateur cercle gold animé (mobile only). */}
      <div
        aria-hidden
        className={cn(
          "sm:hidden fixed left-1/2 -translate-x-1/2 z-30 pointer-events-none",
          "transition-opacity duration-200",
          showIndicator ? "opacity-100" : "opacity-0",
        )}
        style={{
          top: 64 + Math.min(pullDistance, 80) - 20,
        }}
      >
        <div
          className={cn(
            "w-10 h-10 rounded-full bg-white shadow-soft border flex items-center justify-center",
            reached ? "border-gold scale-105" : "border-line",
          )}
          style={{ transition: "transform 150ms" }}
        >
          {refreshing ? (
            <Loader2
              className="w-4 h-4 text-gold-deep animate-spin"
              aria-hidden
            />
          ) : (
            <RotateCw
              className={cn(
                "w-4 h-4 transition-colors",
                reached ? "text-gold-deep" : "text-night-muted",
              )}
              style={{ transform: `rotate(${pullDistance * 3}deg)` }}
              aria-hidden
            />
          )}
        </div>
      </div>

      {/* Wrapper qui se déplace légèrement avec le pull (effet "fall"). */}
      <div
        style={{
          transform:
            pullDistance > 0 || refreshing
              ? `translateY(${Math.min(pullDistance * 0.3, 24)}px)`
              : undefined,
          transition: pullDistance === 0 ? "transform 200ms ease-out" : undefined,
        }}
      >
        {children}
      </div>
    </>
  );
}
