"use client";

import { Bell, BellOff, Loader2, Send } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { usePushSubscription } from "@/lib/hooks/usePushSubscription";

/* Card de réglages : toggle d'opt-in aux notifications push + bouton de
 * test pour vérifier la livraison. Géré entièrement côté client (browser
 * Notification API + Service Worker). */
export function PushNotificationToggle() {
  const { state, busy, subscribe, unsubscribe } = usePushSubscription();
  const [testing, setTesting] = useState(false);

  if (state.status === "loading") {
    return (
      <div className="rounded-2xl bg-white border border-line p-4 flex items-center gap-3">
        <Loader2 className="w-4 h-4 text-muted animate-spin" aria-hidden />
        <span className="text-sm text-night-muted">Chargement…</span>
      </div>
    );
  }

  if (state.status === "unsupported") {
    return (
      <div className="rounded-2xl bg-white border border-line p-4">
        <div className="flex items-start gap-3">
          <span
            aria-hidden
            className="w-9 h-9 rounded-xl bg-night/5 text-night-muted flex items-center justify-center shrink-0"
          >
            <BellOff className="w-4 h-4" aria-hidden />
          </span>
          <div className="min-w-0">
            <p className="text-sm font-semibold text-night">
              Push non disponible
            </p>
            <p className="text-xs text-muted mt-0.5">{state.reason}</p>
          </div>
        </div>
      </div>
    );
  }

  const blocked = state.permission === "denied";
  const subscribed = state.subscribed;

  async function handleToggle() {
    if (subscribed) {
      const result = await unsubscribe();
      if (!result.ok) {
        toast.error(result.error ?? "Désactivation impossible.");
      } else {
        toast.success("Notifications désactivées.");
      }
    } else {
      const result = await subscribe();
      if (!result.ok) {
        toast.error(result.error ?? "Activation impossible.");
      } else {
        toast.success("Notifications activées ✨");
      }
    }
  }

  async function handleTest() {
    setTesting(true);
    try {
      const response = await fetch("/api/push/test", { method: "POST" });
      const data = (await response.json().catch(() => null)) as
        | { ok?: boolean; error?: string }
        | null;
      if (!response.ok || !data?.ok) {
        toast.error(data?.error ?? "Test impossible.");
      } else {
        toast.success("Notification envoyée. Vérifie ton device.");
      }
    } finally {
      setTesting(false);
    }
  }

  return (
    <div className="rounded-2xl bg-white border border-line overflow-hidden">
      <div className="flex items-start gap-3 p-4">
        <span
          aria-hidden
          className={
            subscribed
              ? "w-9 h-9 rounded-xl bg-gold/15 text-gold-deep flex items-center justify-center shrink-0"
              : "w-9 h-9 rounded-xl bg-night/5 text-night-muted flex items-center justify-center shrink-0"
          }
        >
          {subscribed ? (
            <Bell className="w-4 h-4" aria-hidden />
          ) : (
            <BellOff className="w-4 h-4" aria-hidden />
          )}
        </span>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-night">
            Notifications push
          </p>
          <p className="text-xs text-muted mt-0.5 leading-relaxed">
            {blocked
              ? "Bloquées par le navigateur. Réactive-les dans les permissions du site."
              : subscribed
                ? "Tu reçois les notifs sur ce device."
                : "Active pour recevoir les messages, demandes d'amis, offres marketplace en temps réel."}
          </p>
        </div>

        {!blocked ? (
          <button
            type="button"
            role="switch"
            aria-checked={subscribed}
            aria-label={
              subscribed
                ? "Désactiver les notifications push"
                : "Activer les notifications push"
            }
            disabled={busy}
            onClick={handleToggle}
            className={
              subscribed
                ? "shrink-0 relative w-11 h-6 rounded-full bg-night transition-colors disabled:opacity-60"
                : "shrink-0 relative w-11 h-6 rounded-full bg-line-strong transition-colors disabled:opacity-60"
            }
          >
            <span
              aria-hidden
              className={
                subscribed
                  ? "absolute top-0.5 left-[22px] w-5 h-5 rounded-full bg-white shadow-sm transition-transform"
                  : "absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow-sm transition-transform"
              }
            />
          </button>
        ) : null}
      </div>

      {subscribed ? (
        <div className="border-t border-line p-3 flex items-center justify-end">
          <button
            type="button"
            onClick={handleTest}
            disabled={testing}
            className="inline-flex items-center gap-1.5 h-9 px-3 rounded-full bg-night/5 text-night-muted text-xs font-bold hover:bg-night/10 hover:text-night transition-colors disabled:opacity-60"
          >
            {testing ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" aria-hidden />
            ) : (
              <Send className="w-3.5 h-3.5" aria-hidden />
            )}
            Envoyer un test
          </button>
        </div>
      ) : null}
    </div>
  );
}
