"use client";

import { Download, X } from "lucide-react";
import { useEffect, useState } from "react";

const DISMISS_KEY = "divarc:pwa-install-dismissed";

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

export function PWAInstallPrompt() {
  const [event, setEvent] = useState<BeforeInstallPromptEvent | null>(null);
  const [hidden, setHidden] = useState(true);

  useEffect(() => {
    if (typeof window === "undefined") return;

    // Already installed
    if (
      window.matchMedia("(display-mode: standalone)").matches ||
      // @ts-expect-error iOS-only standalone flag
      window.navigator.standalone
    ) {
      return;
    }

    try {
      const dismissed = window.localStorage.getItem(DISMISS_KEY);
      if (dismissed && Date.now() - Number(dismissed) < 7 * 24 * 60 * 60 * 1000) {
        return;
      }
    } catch {
      /* ignore */
    }

    const handler = (rawEvent: Event) => {
      const installEvent = rawEvent as BeforeInstallPromptEvent;
      installEvent.preventDefault();
      setEvent(installEvent);
      setHidden(false);
    };

    window.addEventListener("beforeinstallprompt", handler);
    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, []);

  function dismiss() {
    setHidden(true);
    try {
      window.localStorage.setItem(DISMISS_KEY, Date.now().toString());
    } catch {
      /* ignore */
    }
  }

  async function install() {
    if (!event) return;
    await event.prompt();
    const { outcome } = await event.userChoice;
    if (outcome === "accepted") {
      setEvent(null);
      setHidden(true);
    } else {
      dismiss();
    }
  }

  if (hidden || !event) return null;

  return (
    <div
      role="dialog"
      aria-label="Installer DIVARC"
      className="fixed bottom-4 left-4 right-4 sm:left-auto sm:right-4 sm:w-[360px] z-40 rounded-3xl bg-night text-cream border border-night/40 shadow-[0_30px_80px_-20px_rgba(10,31,68,0.55)] p-4 grain reveal-up"
    >
      <div className="relative flex items-start gap-3">
        <div className="w-10 h-10 rounded-2xl bg-gold/20 flex items-center justify-center shrink-0">
          <Download className="w-5 h-5 text-gold" aria-hidden />
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-display text-base">Installer DIVARC</p>
          <p className="mt-0.5 text-xs text-cream/70 leading-snug">
            Une icône sur ton écran d&apos;accueil, accès direct, et bientôt
            les notifications.
          </p>
          <div className="mt-3 flex items-center gap-2">
            <button
              type="button"
              onClick={install}
              className="inline-flex items-center gap-1.5 px-3 h-8 rounded-full bg-gold text-night text-xs font-semibold hover:bg-gold-soft transition"
            >
              <Download className="w-3.5 h-3.5" aria-hidden />
              Installer
            </button>
            <button
              type="button"
              onClick={dismiss}
              className="text-xs font-semibold text-cream/70 hover:text-cream"
            >
              Plus tard
            </button>
          </div>
        </div>
        <button
          type="button"
          onClick={dismiss}
          aria-label="Fermer"
          className="w-7 h-7 rounded-full hover:bg-white/10 flex items-center justify-center text-cream/70"
        >
          <X className="w-3.5 h-3.5" aria-hidden />
        </button>
      </div>
    </div>
  );
}
