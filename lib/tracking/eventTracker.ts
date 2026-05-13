"use client";

import { CRITICAL_EVENT_TYPES } from "@/lib/recsys/eventWeights";
import type { EventSurface } from "@/lib/database.types";

/* EventTracker — SDK frontend pour capturer les events comportementaux
 * et les flush vers /api/events/track en batch.
 *
 * Architecture :
 *  - Queue mémoire des events
 *  - Flush automatique toutes les 5s OU dès que la queue atteint 50 events
 *  - Flush forcé à beforeunload + visibilitychange hidden (sauvegarde
 *    avant fermeture de l'onglet)
 *  - Idempotence : chaque event a un UUID v4 généré localement
 *
 * Pas de retry agressif en V1 — si le flush échoue, on perd les events
 * non flushés. V2 : localStorage queue + retry exponentiel. */

export type TrackerEvent = {
  event_id: string;
  session_id: string;
  event_type: string;
  surface?: EventSurface;
  position?: number;
  target_post_id?: string;
  target_user_id?: string;
  target_listing_id?: string;
  target_job_id?: string;
  target_circle_id?: string;
  properties?: Record<string, unknown>;
  device_type?: "mobile" | "tablet" | "desktop";
  locale?: string;
  client_ts?: number;
};

const MAX_BATCH = 50;
const FLUSH_INTERVAL_MS = 5000;
const SESSION_KEY = "divarc:recsys-session";

class EventTracker {
  private queue: TrackerEvent[] = [];
  private timer: ReturnType<typeof setInterval> | null = null;
  private listenersAttached = false;

  /** Identifiant de session généré à la première utilisation, persisté
   *  en sessionStorage (recréé à la fermeture de l'onglet). */
  private getSessionId(): string {
    if (typeof window === "undefined") return "ssr";
    let id = window.sessionStorage.getItem(SESSION_KEY);
    if (!id) {
      id = crypto.randomUUID();
      window.sessionStorage.setItem(SESSION_KEY, id);
    }
    return id;
  }

  private getDeviceType(): "mobile" | "tablet" | "desktop" {
    if (typeof window === "undefined") return "desktop";
    const w = window.innerWidth;
    if (w < 768) return "mobile";
    if (w < 1024) return "tablet";
    return "desktop";
  }

  private ensureLifecycleListeners() {
    if (this.listenersAttached || typeof window === "undefined") return;
    this.listenersAttached = true;

    /* Flush avant unload pour ne pas perdre la queue. sendBeacon = blocking
       fire-and-forget supporté par tous les browsers modernes. */
    window.addEventListener("beforeunload", () => this.flush(true));
    document.addEventListener("visibilitychange", () => {
      if (document.visibilityState === "hidden") this.flush(true);
    });

    /* Timer de flush périodique. */
    this.timer = setInterval(() => this.flush(false), FLUSH_INTERVAL_MS);
  }

  /** Capture un event. Push en queue, flush déclenché async. */
  track(
    eventType: string,
    payload?: Omit<
      TrackerEvent,
      "event_id" | "session_id" | "event_type" | "client_ts"
    >,
  ) {
    if (typeof window === "undefined") return;
    this.ensureLifecycleListeners();

    const ev: TrackerEvent = {
      event_id: crypto.randomUUID(),
      session_id: this.getSessionId(),
      event_type: eventType,
      device_type: this.getDeviceType(),
      locale: navigator.language,
      client_ts: Date.now(),
      ...payload,
    };

    this.queue.push(ev);

    /* Chantier Reels Recsys 1 — events critiques (report/block/share_external/
     * follow/replay_multiple) doivent partir immédiatement sans attendre le
     * timer 5s : ils déclenchent des changements visibles côté ranker. */
    if (CRITICAL_EVENT_TYPES.has(eventType)) {
      void this.flush(false);
    } else if (this.queue.length >= MAX_BATCH) {
      void this.flush(false);
    }
  }

  /** Envoie la queue au backend. Vide la queue avant l'envoi pour éviter
   *  de re-flush les mêmes events si flush concurrent. */
  async flush(useBeacon = false): Promise<void> {
    if (typeof window === "undefined") return;
    if (this.queue.length === 0) return;

    const batch = this.queue.slice(0, MAX_BATCH);
    this.queue = this.queue.slice(MAX_BATCH);
    const body = JSON.stringify({ events: batch });

    try {
      if (useBeacon && "sendBeacon" in navigator) {
        const blob = new Blob([body], { type: "application/json" });
        navigator.sendBeacon("/api/events/track", blob);
        return;
      }
      await fetch("/api/events/track", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body,
        keepalive: true,
      });
    } catch {
      /* On perd le batch en V1 — V2 : queue persistée localStorage + retry. */
    }
  }
}

/* Singleton — un seul tracker par tab. */
let instance: EventTracker | null = null;

export function getEventTracker(): EventTracker {
  if (!instance) instance = new EventTracker();
  return instance;
}

/* Helper raccourci pour tracker un event one-shot. */
export function trackEvent(
  eventType: string,
  payload?: Parameters<EventTracker["track"]>[1],
) {
  getEventTracker().track(eventType, payload);
}
