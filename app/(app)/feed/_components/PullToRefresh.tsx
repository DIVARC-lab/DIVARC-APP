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
 * Implémentation perf-first :
 *  - Les touch handlers manipulent le DOM directement (refs) au lieu
 *    de setState à chaque touchmove. Sur iOS PWA, setState dans
 *    touchmove provoque un re-render React du sous-arbre `children`
 *    à chaque frame (60-120Hz) = lag massif perceptible. Avec refs
 *    + transform inline, on évite ces re-renders et la jauge suit
 *    le doigt à 120Hz natif.
 *  - rAF throttle sur touchmove pour batch les mises à jour DOM.
 *  - setState UNIQUEMENT pour : "refreshing on/off". Tout le reste
 *    (position visuelle de l'indicateur + wrapper) passe par refs.
 *  - touch listeners attachés à document avec { passive: true }
 *    pour ne JAMAIS bloquer le scroll iOS.
 */
export function PullToRefresh({ onRefresh, children }: PullToRefreshProps) {
  const router = useRouter();
  const [refreshing, setRefreshing] = useState(false);

  /* Refs DOM pour update direct (sans re-render). */
  const indicatorRef = useRef<HTMLDivElement | null>(null);
  const indicatorIconRef = useRef<HTMLDivElement | null>(null);
  const indicatorWrapperRef = useRef<HTMLDivElement | null>(null);
  const wrapperRef = useRef<HTMLDivElement | null>(null);

  /* État courant en refs (handlers stables). */
  const touchStartYRef = useRef<number | null>(null);
  const activeRef = useRef(false);
  const pullDistanceRef = useRef(0);
  const refreshingRef = useRef(false);
  const rafIdRef = useRef<number | null>(null);
  const pendingDeltaRef = useRef<number | null>(null);

  useEffect(() => {
    refreshingRef.current = refreshing;
  }, [refreshing]);

  /* Applique la position visuelle en DOM direct (pas de re-render). */
  function applyPull(dist: number) {
    pullDistanceRef.current = dist;
    const indicator = indicatorRef.current;
    const iconWrap = indicatorIconRef.current;
    const wrapper = wrapperRef.current;
    const reached = dist >= PULL_THRESHOLD;
    const visible = dist > 4 || refreshingRef.current;

    if (indicator) {
      indicator.style.top = `${64 + Math.min(dist, 80) - 20}px`;
      indicator.style.opacity = visible ? "1" : "0";
    }
    if (iconWrap) {
      iconWrap.dataset.reached = reached ? "true" : "false";
      const icon = iconWrap.querySelector<HTMLElement>("[data-rotor]");
      if (icon) {
        icon.style.transform = `rotate(${dist * 3}deg)`;
      }
    }
    if (wrapper) {
      const ty = dist > 0 || refreshingRef.current
        ? Math.min(dist * 0.3, 24)
        : 0;
      wrapper.style.transform = ty > 0 ? `translateY(${ty}px)` : "";
      wrapper.style.transition = dist === 0 ? "transform 200ms ease-out" : "";
    }
  }

  useEffect(() => {
    function flushRaf() {
      rafIdRef.current = null;
      const delta = pendingDeltaRef.current;
      if (delta === null) return;
      pendingDeltaRef.current = null;
      if (delta <= 0) {
        applyPull(0);
        return;
      }
      const clamped = Math.min(delta * DAMPING, MAX_PULL);
      applyPull(clamped);
    }

    function onTouchStart(e: TouchEvent) {
      if (window.scrollY > 0 || refreshingRef.current) return;
      touchStartYRef.current = e.touches[0]?.clientY ?? null;
      activeRef.current = true;
    }

    function onTouchMove(e: TouchEvent) {
      if (!activeRef.current || touchStartYRef.current === null) return;
      const currentY = e.touches[0]?.clientY ?? 0;
      pendingDeltaRef.current = currentY - touchStartYRef.current;
      if (rafIdRef.current === null) {
        rafIdRef.current = requestAnimationFrame(flushRaf);
      }
    }

    async function onTouchEnd() {
      if (!activeRef.current) return;
      activeRef.current = false;
      touchStartYRef.current = null;
      if (rafIdRef.current !== null) {
        cancelAnimationFrame(rafIdRef.current);
        rafIdRef.current = null;
        pendingDeltaRef.current = null;
      }

      const dist = pullDistanceRef.current;

      if (dist >= PULL_THRESHOLD && !refreshingRef.current) {
        setRefreshing(true);
        try {
          if (onRefresh) {
            await onRefresh();
          } else {
            router.refresh();
            await new Promise((r) => setTimeout(r, 600));
          }
        } finally {
          setRefreshing(false);
        }
      }
      applyPull(0);
    }

    document.addEventListener("touchstart", onTouchStart, { passive: true });
    document.addEventListener("touchmove", onTouchMove, { passive: true });
    document.addEventListener("touchend", onTouchEnd, { passive: true });
    document.addEventListener("touchcancel", onTouchEnd, { passive: true });
    return () => {
      document.removeEventListener("touchstart", onTouchStart);
      document.removeEventListener("touchmove", onTouchMove);
      document.removeEventListener("touchend", onTouchEnd);
      document.removeEventListener("touchcancel", onTouchEnd);
      if (rafIdRef.current !== null) {
        cancelAnimationFrame(rafIdRef.current);
      }
    };
  }, [router, onRefresh]);

  /* Quand refreshing change, on resync l'affichage de l'indicateur. */
  useEffect(() => {
    applyPull(pullDistanceRef.current);
  }, [refreshing]);

  return (
    <>
      {/* Indicateur cercle gold animé (mobile only). Position pilotée
          en DOM direct par applyPull(), pas par React state. */}
      <div
        ref={indicatorRef}
        aria-hidden
        className="sm:hidden fixed left-1/2 -translate-x-1/2 z-30 pointer-events-none opacity-0"
        style={{ top: 44, transition: "opacity 200ms" }}
      >
        <div
          ref={indicatorIconRef}
          data-reached="false"
          className={cn(
            "w-10 h-10 rounded-full bg-white shadow-soft border border-line flex items-center justify-center",
            "data-[reached=true]:border-gold data-[reached=true]:scale-105",
          )}
          style={{ transition: "transform 150ms, border-color 150ms" }}
        >
          {refreshing ? (
            <Loader2
              className="w-4 h-4 text-gold-deep animate-spin"
              aria-hidden
            />
          ) : (
            <div data-rotor>
              <RotateCw
                className="w-4 h-4 text-night-muted"
                aria-hidden
              />
            </div>
          )}
        </div>
      </div>

      {/* Wrapper qui se déplace légèrement avec le pull (effet "fall"). */}
      <div ref={wrapperRef}>{children}</div>
    </>
  );
}
