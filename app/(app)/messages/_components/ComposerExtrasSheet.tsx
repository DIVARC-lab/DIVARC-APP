"use client";

/* Bottom-sheet "+" pour les fonctionnalités secondaires du composer.
 *
 * Options DIVARC natives :
 *   Stickers, GIFs, Fichier, Image, Sondage, Paiement, Position,
 *   Contact, Post DIVARC, Profil, Annonce, Offre emploi, Cercle,
 *   Événement, Audio musique. */

import {
  Briefcase,
  Calendar,
  Compass,
  FileText,
  ImageIcon,
  MapPin,
  Music,
  ShoppingBag,
  Smile,
  User,
  Vote,
  Wallet,
  X,
} from "lucide-react";
import { useEffect } from "react";
import { toast } from "sonner";

type ComposerExtrasSheetProps = {
  open: boolean;
  onClose: () => void;
  onPickFile: () => void;
  onOpenStickers: () => void;
  onOpenGifs: () => void;
  onOpenPoll?: () => void;
  onOpenPayment?: () => void;
  onSharePost?: () => void;
  onShareProfile?: () => void;
  onShareListing?: () => void;
  onShareJob?: () => void;
  onShareCircle?: () => void;
  onShareEvent?: () => void;
};

export function ComposerExtrasSheet({
  open,
  onClose,
  onPickFile,
  onOpenStickers,
  onOpenGifs,
  onOpenPoll,
  onOpenPayment,
  onSharePost,
  onShareProfile,
  onShareListing,
  onShareJob,
  onShareCircle,
  onShareEvent,
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

  function wrap(fn?: () => void, fallback?: string) {
    return () => {
      onClose();
      if (fn) fn();
      else if (fallback) handleNotReady(fallback);
    };
  }

  const items: Array<{
    icon: typeof FileText;
    label: string;
    sub: string;
    onClick: () => void;
    color: string;
  }> = [
    {
      icon: Smile,
      label: "Stickers",
      sub: "Emojis géants",
      onClick: wrap(onOpenStickers),
      color: "bg-gold/20 text-gold-deep",
    },
    {
      icon: ImageIcon,
      label: "GIFs",
      sub: "Recherche Giphy",
      onClick: wrap(onOpenGifs),
      color: "bg-violet-50 text-violet-600",
    },
    {
      icon: FileText,
      label: "Fichier",
      sub: "PDF, doc…",
      onClick: wrap(onPickFile),
      color: "bg-blue-50 text-blue-600",
    },
    {
      icon: Vote,
      label: "Sondage",
      sub: "Crée un vote",
      onClick: wrap(onOpenPoll, "Sondage"),
      color: "bg-rose-50 text-rose-600",
    },
    {
      icon: Wallet,
      label: "Paiement",
      sub: "Envoie de l'argent",
      onClick: wrap(onOpenPayment, "Paiement"),
      color: "bg-gold/20 text-gold-deep",
    },
    {
      icon: MapPin,
      label: "Position",
      sub: "Partage ta position",
      onClick: () => handleNotReady("Position"),
      color: "bg-emerald-50 text-emerald-600",
    },
    {
      icon: FileText,
      label: "Post DIVARC",
      sub: "Partage un post",
      onClick: wrap(onSharePost, "Partage post"),
      color: "bg-indigo-50 text-indigo-600",
    },
    {
      icon: User,
      label: "Profil",
      sub: "Partage un user",
      onClick: wrap(onShareProfile, "Partage profil"),
      color: "bg-fuchsia-50 text-fuchsia-600",
    },
    {
      icon: ShoppingBag,
      label: "Annonce",
      sub: "Marketplace",
      onClick: wrap(onShareListing, "Partage annonce"),
      color: "bg-orange-50 text-orange-600",
    },
    {
      icon: Briefcase,
      label: "Emploi",
      sub: "Offre de job",
      onClick: wrap(onShareJob, "Partage offre"),
      color: "bg-cyan-50 text-cyan-600",
    },
    {
      icon: Compass,
      label: "Cercle",
      sub: "Invite à un cercle",
      onClick: wrap(onShareCircle, "Partage cercle"),
      color: "bg-amber-50 text-amber-700",
    },
    {
      icon: Calendar,
      label: "Événement",
      sub: "Partage un event",
      onClick: wrap(onShareEvent, "Partage événement"),
      color: "bg-emerald-50 text-emerald-600",
    },
    {
      icon: Music,
      label: "Audio",
      sub: "Son externe",
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
          <h2 className="text-sm font-bold text-night">
            <em className="italic text-gold-deep font-display">Partager</em>
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Fermer"
            className="w-8 h-8 rounded-full hover:bg-night/5 flex items-center justify-center text-night-muted"
          >
            <X className="w-4 h-4" aria-hidden />
          </button>
        </header>
        <div className="grid grid-cols-4 gap-2 px-3 pb-3 max-h-[60vh] overflow-y-auto">
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
