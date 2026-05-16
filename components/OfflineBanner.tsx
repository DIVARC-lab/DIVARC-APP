"use client";

/* Sprint K — Bandeau global "Hors ligne" affiché en haut de l'écran
 * quand navigator.onLine = false. S'auto-cache via le service worker
 * existant ; affiche un message rassurant + lien vers /offline pour les
 * pages essentielles. */

import { CloudOff, Wifi } from "lucide-react";
import { useEffect, useState } from "react";

export function OfflineBanner() {
  const [online, setOnline] = useState(true);
  const [reconnected, setReconnected] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    setOnline(window.navigator.onLine);

    function handleOnline() {
      setOnline(true);
      setReconnected(true);
      window.setTimeout(() => setReconnected(false), 3000);
    }
    function handleOffline() {
      setOnline(false);
      setReconnected(false);
    }

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);
    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  if (online && !reconnected) return null;

  return (
    <div
      role="status"
      aria-live="polite"
      className={`fixed top-0 inset-x-0 z-[60] px-4 py-2 text-center text-[12px] font-bold transition-colors ${
        online
          ? "bg-emerald-600 text-white"
          : "bg-night text-cream"
      }`}
    >
      <span className="inline-flex items-center gap-1.5">
        {online ? (
          <>
            <Wifi className="w-3.5 h-3.5" aria-hidden />
            Connexion rétablie ✓
          </>
        ) : (
          <>
            <CloudOff className="w-3.5 h-3.5" aria-hidden />
            Mode hors ligne — certaines fonctionnalités sont limitées.
          </>
        )}
      </span>
    </div>
  );
}
