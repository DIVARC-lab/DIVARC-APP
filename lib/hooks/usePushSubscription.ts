"use client";

import { useCallback, useEffect, useState } from "react";

type PushState =
  | { status: "loading" }
  | { status: "unsupported"; reason: string }
  | {
      status: "ready";
      permission: NotificationPermission;
      subscribed: boolean;
      endpoint: string | null;
    };

/* Convertit la clé VAPID base64url côté client (NEXT_PUBLIC) en Uint8Array
 * comme attendu par PushManager.subscribe. */
function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(base64);
  const output = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i++) {
    output[i] = raw.charCodeAt(i);
  }
  return output;
}

/* Hook qui gère le cycle de vie d'une push subscription :
 * - charge l'état actuel (perm + subscription existante)
 * - subscribe() demande la permission, crée la sub côté browser, l'envoie
 *   au backend via /api/push/subscribe
 * - unsubscribe() la retire côté browser ET côté backend
 *
 * Le service worker est attendu à `/sw.js` (déjà enregistré par DIVARC).
 * VAPID public key dans NEXT_PUBLIC_VAPID_PUBLIC_KEY. */
export function usePushSubscription() {
  const [state, setState] = useState<PushState>({ status: "loading" });
  const [busy, setBusy] = useState(false);

  const refresh = useCallback(async () => {
    if (typeof window === "undefined") return;
    if (!("serviceWorker" in navigator) || !("PushManager" in window)) {
      setState({
        status: "unsupported",
        reason: "Ce navigateur ne supporte pas les notifications push.",
      });
      return;
    }
    try {
      const registration = await navigator.serviceWorker.ready;
      const existing = await registration.pushManager.getSubscription();
      setState({
        status: "ready",
        permission: Notification.permission,
        subscribed: !!existing,
        endpoint: existing?.endpoint ?? null,
      });
    } catch {
      setState({
        status: "unsupported",
        reason: "Service worker indisponible.",
      });
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const subscribe = useCallback(async (): Promise<{
    ok: boolean;
    error?: string;
  }> => {
    if (state.status !== "ready") {
      return { ok: false, error: "Push non disponible." };
    }
    const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
    if (!publicKey) {
      return {
        ok: false,
        error: "Configuration VAPID manquante (NEXT_PUBLIC_VAPID_PUBLIC_KEY).",
      };
    }

    setBusy(true);
    try {
      /* requestPermission DOIT être appelé suite à un user gesture, sinon
         certains browsers refusent silencieusement. Le hook s'attend à
         être déclenché depuis un onClick. */
      const permission = await Notification.requestPermission();
      if (permission !== "granted") {
        return { ok: false, error: "Permission refusée." };
      }

      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(publicKey),
      });

      const json = subscription.toJSON();
      const response = await fetch("/api/push/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          endpoint: json.endpoint,
          keys: json.keys,
        }),
      });
      if (!response.ok) {
        /* Si le backend refuse, on annule la sub côté browser pour rester
           cohérent. */
        await subscription.unsubscribe().catch(() => undefined);
        return { ok: false, error: "Inscription serveur échouée." };
      }

      await refresh();
      return { ok: true };
    } catch (err) {
      return {
        ok: false,
        error:
          err instanceof Error
            ? err.message
            : "Erreur inattendue lors de l'inscription.",
      };
    } finally {
      setBusy(false);
    }
  }, [state.status, refresh]);

  const unsubscribe = useCallback(async (): Promise<{
    ok: boolean;
    error?: string;
  }> => {
    if (state.status !== "ready" || !state.endpoint) {
      return { ok: false, error: "Aucune subscription active." };
    }
    setBusy(true);
    try {
      const registration = await navigator.serviceWorker.ready;
      const existing = await registration.pushManager.getSubscription();
      if (existing) await existing.unsubscribe();

      await fetch("/api/push/unsubscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ endpoint: state.endpoint }),
      });

      await refresh();
      return { ok: true };
    } catch (err) {
      return {
        ok: false,
        error: err instanceof Error ? err.message : "Erreur inattendue.",
      };
    } finally {
      setBusy(false);
    }
  }, [state, refresh]);

  return { state, busy, subscribe, unsubscribe, refresh };
}
