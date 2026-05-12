"use client";

import { useEffect, useRef } from "react";
import { usePushSubscription } from "@/lib/hooks/usePushSubscription";

/* AutoEnablePushPrompt — déclenche automatiquement la demande
 * d'autorisation push notifications dès que l'user arrive sur l'app,
 * sans qu'il ait à aller dans Paramètres.
 *
 * Comportement :
 * - Si push non supporté ou état "loading" → no-op
 * - Si permission === "default" (jamais demandé) → trigger subscribe()
 *   qui déclenche la popup native du navigateur
 * - Si permission === "granted" mais pas de sub active → re-subscribe
 *   silencieusement (pas de popup, browser permission déjà accordée)
 * - Si permission === "denied" → no-op (respecte le choix user, ne pas
 *   re-popup à l'infini)
 * - 1 seule tentative par session/page-load (ref guard) */
export function AutoEnablePushPrompt() {
  const { state, subscribe } = usePushSubscription();
  const triedRef = useRef(false);

  useEffect(() => {
    if (triedRef.current) return;
    if (state.status !== "ready") return;

    /* Permission denied : on respecte. L'user peut toujours réactiver
       manuellement depuis les paramètres du navigateur. */
    if (state.permission === "denied") return;

    /* Déjà subscribed : tout va bien. */
    if (state.subscribed) return;

    /* default OU granted-sans-sub : on déclenche subscribe().
       - default → popup native demande la permission
       - granted-sans-sub → re-create la sub sans popup (perm déjà OK) */
    triedRef.current = true;
    void subscribe();
  }, [state, subscribe]);

  return null;
}
