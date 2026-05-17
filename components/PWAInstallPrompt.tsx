"use client";

import { Download, Share, Plus, X } from "lucide-react";
import { useEffect, useState } from "react";

const DISMISS_KEY = "divarc:pwa-install-dismissed";
const IOS_DISMISS_KEY = "divarc:pwa-ios-prompt-dismissed";

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

/* Détecte si on est sur iOS Safari (mobile), pas déjà en standalone. */
function detectIOSSafari(): boolean {
  if (typeof window === "undefined") return false;
  const ua = window.navigator.userAgent;
  /* iOS = iPhone | iPad | iPod (et iPadOS 13+ qui se déclare comme Mac
     mais avec touch). */
  const isIOS =
    /iPad|iPhone|iPod/.test(ua) ||
    (ua.includes("Mac") && "ontouchend" in document);
  const isStandalone =
    window.matchMedia("(display-mode: standalone)").matches ||
    // @ts-expect-error iOS-only standalone flag
    window.navigator.standalone === true;
  /* On veut Safari (pas Chrome/Firefox iOS qui ne supportent pas
     l'install). Heuristique : "Safari" présent mais pas "CriOS" (Chrome
     iOS) ni "FxiOS" (Firefox iOS) ni "EdgiOS". */
  const isSafari =
    ua.includes("Safari") &&
    !ua.includes("CriOS") &&
    !ua.includes("FxiOS") &&
    !ua.includes("EdgiOS");
  return isIOS && isSafari && !isStandalone;
}

export function PWAInstallPrompt() {
  const [installEvent, setInstallEvent] =
    useState<BeforeInstallPromptEvent | null>(null);
  const [showAndroid, setShowAndroid] = useState(false);
  const [showIOS, setShowIOS] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;

    /* Déjà installé en standalone : on cache tout. */
    if (
      window.matchMedia("(display-mode: standalone)").matches ||
      // @ts-expect-error iOS standalone flag
      window.navigator.standalone === true
    ) {
      return;
    }

    /* iOS Safari : detect + show instructions popup. */
    if (detectIOSSafari()) {
      try {
        const dismissed = window.localStorage.getItem(IOS_DISMISS_KEY);
        if (
          dismissed &&
          Date.now() - Number(dismissed) < 7 * 24 * 60 * 60 * 1000
        ) {
          return;
        }
      } catch {
        /* ignore */
      }
      /* Délai 2s pour ne pas surprendre dès l'arrivée. */
      const timer = setTimeout(() => setShowIOS(true), 2000);
      return () => clearTimeout(timer);
    }

    /* Android/Chrome desktop : écoute beforeinstallprompt natif. */
    try {
      const dismissed = window.localStorage.getItem(DISMISS_KEY);
      if (
        dismissed &&
        Date.now() - Number(dismissed) < 7 * 24 * 60 * 60 * 1000
      ) {
        return;
      }
    } catch {
      /* ignore */
    }

    const handler = (rawEvent: Event) => {
      const ev = rawEvent as BeforeInstallPromptEvent;
      ev.preventDefault();
      setInstallEvent(ev);
      setShowAndroid(true);
    };
    window.addEventListener("beforeinstallprompt", handler);
    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, []);

  function dismissAndroid() {
    setShowAndroid(false);
    try {
      window.localStorage.setItem(DISMISS_KEY, Date.now().toString());
    } catch {
      /* ignore */
    }
  }

  function dismissIOS() {
    setShowIOS(false);
    try {
      window.localStorage.setItem(IOS_DISMISS_KEY, Date.now().toString());
    } catch {
      /* ignore */
    }
  }

  async function installAndroid() {
    if (!installEvent) return;
    await installEvent.prompt();
    const { outcome } = await installEvent.userChoice;
    if (outcome === "accepted") {
      setInstallEvent(null);
      setShowAndroid(false);
    } else {
      dismissAndroid();
    }
  }

  if (showIOS) {
    return (
      <div
        role="dialog"
        aria-label="Installer DIVARC sur iPhone"
        className="fixed bottom-4 left-4 right-4 z-50 rounded-3xl bg-[#0a1f44] text-[#fff8e8] border border-night/40 shadow-[0_30px_80px_-20px_rgba(10,31,68,0.55)] p-4"
      >
        <button
          type="button"
          onClick={dismissIOS}
          aria-label="Fermer"
          className="absolute top-3 right-3 w-7 h-7 rounded-full hover:bg-[#ffffff]/10 flex items-center justify-center text-[#fff8e8]/70"
        >
          <X className="w-3.5 h-3.5" aria-hidden />
        </button>
        <div className="flex items-start gap-3 pr-6">
          <div className="w-10 h-10 rounded-2xl bg-[#f4b942]/20 flex items-center justify-center shrink-0">
            <Download className="w-5 h-5 text-[#f4b942]" aria-hidden />
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-display text-base">Installer DIVARC</p>
            <p className="mt-0.5 text-xs text-[#fff8e8]/70 leading-snug">
              Pour recevoir les notifications d&apos;appels et de messages,
              installe l&apos;app sur ton écran d&apos;accueil :
            </p>
            <ol className="mt-3 space-y-2 text-xs text-[#fff8e8]/90">
              <li className="flex items-center gap-2">
                <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-[#f4b942]/20 text-[10px] font-bold text-[#f4b942] shrink-0">
                  1
                </span>
                <span>
                  Touche l&apos;icône{" "}
                  <Share
                    className="inline w-3.5 h-3.5 -mt-0.5 text-[#f4b942]"
                    aria-hidden
                  />{" "}
                  <span className="font-semibold">Partager</span> en bas de
                  Safari
                </span>
              </li>
              <li className="flex items-center gap-2">
                <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-[#f4b942]/20 text-[10px] font-bold text-[#f4b942] shrink-0">
                  2
                </span>
                <span>
                  Choisis{" "}
                  <Plus
                    className="inline w-3.5 h-3.5 -mt-0.5 text-[#f4b942]"
                    aria-hidden
                  />{" "}
                  <span className="font-semibold">
                    Sur l&apos;écran d&apos;accueil
                  </span>
                </span>
              </li>
              <li className="flex items-center gap-2">
                <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-[#f4b942]/20 text-[10px] font-bold text-[#f4b942] shrink-0">
                  3
                </span>
                <span>
                  <span className="font-semibold">Ajouter</span> en haut à
                  droite
                </span>
              </li>
            </ol>
            <button
              type="button"
              onClick={dismissIOS}
              className="mt-3 text-xs font-semibold text-[#fff8e8]/70 hover:text-[#fff8e8]"
            >
              Plus tard
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (showAndroid && installEvent) {
    return (
      <div
        role="dialog"
        aria-label="Installer DIVARC"
        className="fixed bottom-4 left-4 right-4 sm:left-auto sm:right-4 sm:w-[360px] z-40 rounded-3xl bg-[#0a1f44] text-[#fff8e8] border border-night/40 shadow-[0_30px_80px_-20px_rgba(10,31,68,0.55)] p-4 grain reveal-up"
      >
        <div className="relative flex items-start gap-3">
          <div className="w-10 h-10 rounded-2xl bg-[#f4b942]/20 flex items-center justify-center shrink-0">
            <Download className="w-5 h-5 text-[#f4b942]" aria-hidden />
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-display text-base">Installer DIVARC</p>
            <p className="mt-0.5 text-xs text-[#fff8e8]/70 leading-snug">
              Une icône sur ton écran d&apos;accueil, accès direct, et
              notifications natives.
            </p>
            <div className="mt-3 flex items-center gap-2">
              <button
                type="button"
                onClick={installAndroid}
                className="inline-flex items-center gap-1.5 px-3 h-8 rounded-full bg-[#f4b942] text-[#0a1f44] text-xs font-semibold hover:bg-[#f8cd76] transition"
              >
                <Download className="w-3.5 h-3.5" aria-hidden />
                Installer
              </button>
              <button
                type="button"
                onClick={dismissAndroid}
                className="text-xs font-semibold text-[#fff8e8]/70 hover:text-[#fff8e8]"
              >
                Plus tard
              </button>
            </div>
          </div>
          <button
            type="button"
            onClick={dismissAndroid}
            aria-label="Fermer"
            className="w-7 h-7 rounded-full hover:bg-[#ffffff]/10 flex items-center justify-center text-[#fff8e8]/70"
          >
            <X className="w-3.5 h-3.5" aria-hidden />
          </button>
        </div>
      </div>
    );
  }

  return null;
}
