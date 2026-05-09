"use client";

import { useEffect, useRef } from "react";
import { createClient } from "@/lib/supabase/client";
import type { PresenceStatus } from "@/lib/database.types";

const HEARTBEAT_MS = 30_000;
const IDLE_AFTER_MS = 5 * 60 * 1000;
const ACTIVITY_EVENTS: Array<keyof DocumentEventMap> = [
  "mousemove",
  "keydown",
  "click",
  "scroll",
  "touchstart",
];

/** Maintient la présence du user courant : envoie un heartbeat toutes les 30s
 * avec son état (online/away), et passe offline à la fermeture de l'onglet.
 *
 *  - Online      → activité dans l'onglet (focus + interaction récente)
 *  - Away        → onglet en arrière-plan OU idle > 5 min
 *  - Offline     → onglet fermé (best effort via beforeunload + visibilitychange) */
export function usePresenceHeartbeat() {
  /* React 19 strict : Date.now() est marqué impure et ne peut pas être
     appelé en initialisation de useRef pendant le render. On part de 0 et
     on réinitialise dans l'effect (qui s'exécute après le commit). */
  const lastActivityRef = useRef<number>(0);
  const lastSentStatusRef = useRef<PresenceStatus | null>(null);

  useEffect(() => {
    if (typeof window === "undefined") return;

    lastActivityRef.current = Date.now();
    const supabase = createClient();
    let cancelled = false;
    let intervalId: ReturnType<typeof setInterval> | null = null;

    function computeStatus(): PresenceStatus {
      if (typeof document === "undefined") return "online";
      if (document.visibilityState !== "visible") return "away";
      const inactiveMs = Date.now() - lastActivityRef.current;
      if (inactiveMs >= IDLE_AFTER_MS) return "away";
      return "online";
    }

    async function send(status: PresenceStatus) {
      if (cancelled) return;
      if (lastSentStatusRef.current === status) return;
      lastSentStatusRef.current = status;
      try {
        await supabase.rpc("update_my_presence", { new_status: status });
      } catch {
        lastSentStatusRef.current = null;
      }
    }

    function tick() {
      void send(computeStatus());
    }

    function markActivity() {
      lastActivityRef.current = Date.now();
      if (lastSentStatusRef.current !== "online") tick();
    }

    function onVisibility() {
      tick();
    }

    function sendOfflineSync() {
      // beforeunload : on tente un sendBeacon sur un endpoint REST Supabase,
      // sinon on retombe sur un best-effort RPC qui partira sans attendre.
      lastSentStatusRef.current = null;
      try {
        void supabase.rpc("update_my_presence", { new_status: "offline" });
      } catch {
        /* ignore */
      }
    }

    // Boot : online tout de suite
    void send(computeStatus());
    intervalId = setInterval(tick, HEARTBEAT_MS);

    document.addEventListener("visibilitychange", onVisibility);
    for (const event of ACTIVITY_EVENTS) {
      document.addEventListener(event, markActivity, { passive: true });
    }
    window.addEventListener("focus", tick);
    window.addEventListener("blur", tick);
    window.addEventListener("pagehide", sendOfflineSync);
    window.addEventListener("beforeunload", sendOfflineSync);

    return () => {
      cancelled = true;
      if (intervalId) clearInterval(intervalId);
      document.removeEventListener("visibilitychange", onVisibility);
      for (const event of ACTIVITY_EVENTS) {
        document.removeEventListener(event, markActivity);
      }
      window.removeEventListener("focus", tick);
      window.removeEventListener("blur", tick);
      window.removeEventListener("pagehide", sendOfflineSync);
      window.removeEventListener("beforeunload", sendOfflineSync);
      sendOfflineSync();
    };
  }, []);
}
