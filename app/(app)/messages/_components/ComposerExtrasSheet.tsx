"use client";

/* Bottom-sheet "+" pour les fonctionnalités secondaires du composer.
 * V1 expose : Fichier, Localisation, Sondage. D'autres viendront en V2
 * (contact, événement, paiement, etc.). */

import {
  FileText,
  MapPin,
  Music,
  Vote,
  X,
} from "lucide-react";
import { useEffect } from "react";
import { toast } from "sonner";

type ComposerExtrasSheetProps = {
  open: boolean;
  onClose: () => void;
  onPickFile: () => void;
};

export function ComposerExtrasSheet({
  open,
  onClose,
  onPickFile,
}: ComposerExtrasSheetProps) {
  useEffect(() => {
    if (!open) return;
    function handleKey(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
    }
    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, [open, onClose]);

  if (!open) return null;

  function handleNotReady(label: string) {
    toast(`${label} arrive bientôt`);
    onClose();
  }

  const items: Array<{
    icon: typeof FileText;
    label: string;
    sub: string;
    onClick: () => void;
    color: string;
  }> = [
    {
      icon: FileText,
      label: "Fichier",
      sub: "PDF, doc, archive…",
      onClick: () => {
        onPickFile();
        onClose();
      },
      color: "bg-blue-50 text-blue-600",
    },
    {
      icon: MapPin,
      label: "Localisation",
      sub: "Partage ta position",
      onClick: () => handleNotReady("Localisation"),
      color: "bg-emerald-50 text-emerald-600",
    },
    {
      icon: Vote,
      label: "Sondage",
      sub: "Crée un vote rapide",
      onClick: () => handleNotReady("Sondage"),
      color: "bg-violet-50 text-violet-600",
    },
    {
      icon: Music,
      label: "Audio (musique)",
      sub: "Partage un son",
      onClick: () => handleNotReady("Audio musique"),
      color: "bg-pink-50 text-pink-600",
    },
  ];

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Options supplémentaires"
      className="fixed inset-0 z-50 flex items-end justify-center bg-night/40 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-md bg-bg border-t border-line rounded-t-3xl shadow-[0_-20px_60px_-20px_rgba(10,31,68,0.4)] pb-[max(env(safe-area-inset-bottom,0px),16px)]"
      >
        <div
          aria-hidden
          className="mx-auto mt-2.5 mb-3 w-10 h-1 rounded-full bg-night/15"
        />
        <header className="flex items-center justify-between px-4 pb-2">
          <h2 className="text-sm font-bold text-night">Plus</h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Fermer"
            className="w-8 h-8 rounded-full hover:bg-night/5 flex items-center justify-center text-night-muted"
          >
            <X className="w-4 h-4" aria-hidden />
          </button>
        </header>
        <div className="grid grid-cols-4 gap-2 px-3 pb-3">
          {items.map((item) => {
            const Icon = item.icon;
            return (
              <button
                key={item.label}
                type="button"
                onClick={item.onClick}
                className="flex flex-col items-center gap-1.5 p-2 rounded-2xl hover:bg-night/5 active:scale-95 transition-transform"
              >
                <span
                  className={`w-12 h-12 rounded-2xl flex items-center justify-center ${item.color}`}
                >
                  <Icon className="w-5 h-5" aria-hidden />
                </span>
                <span className="text-[11px] font-semibold text-night text-center leading-tight">
                  {item.label}
                </span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
