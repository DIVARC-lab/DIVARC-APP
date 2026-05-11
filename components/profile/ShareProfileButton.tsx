"use client";

import { Check, Copy, QrCode, Share2, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { cn } from "@/lib/utils/cn";

/* ShareProfileButton — modal de partage avec :
 *   - URL copyable
 *   - QR code généré côté client via canvas (algo simple sans lib)
 *   - Web Share API si dispo (navigator.share)
 *
 * V2 : qrcode.react pour un QR plus propre. V1 utilise un fallback
 * "QR-like" simple via Google Charts API (suffisant pour partage). */

type Props = {
  username: string;
  fullName: string;
};

export function ShareProfileButton({ username, fullName }: Props) {
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);

  /* URL absolute. window non dispo SSR → construit côté client. */
  const url =
    typeof window !== "undefined"
      ? `${window.location.origin}/u/${username}`
      : `/u/${username}`;

  /* QR code via Google Charts API (publique, gratuite, pas de lib). */
  const qrSrc = `https://api.qrserver.com/v1/create-qr-code/?size=240x240&margin=8&data=${encodeURIComponent(url)}`;

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
      toast.success("Lien copié");
    } catch {
      toast.error("Impossible de copier.");
    }
  }

  async function handleShare() {
    if (!navigator.share) {
      void handleCopy();
      return;
    }
    try {
      await navigator.share({
        title: `Profil DIVARC de ${fullName}`,
        text: `Découvre le profil de ${fullName} sur DIVARC`,
        url,
      });
    } catch {
      /* user cancelled */
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label="Partager mon profil"
        className="h-10 w-10 rounded-full bg-white border border-line flex items-center justify-center hover:bg-bg-soft transition-colors"
      >
        <Share2 className="w-4 h-4 text-night" aria-hidden />
      </button>

      {open ? (
        <ShareModal
          url={url}
          fullName={fullName}
          qrSrc={qrSrc}
          copied={copied}
          onCopy={handleCopy}
          onShare={handleShare}
          onClose={() => setOpen(false)}
        />
      ) : null}
    </>
  );
}

function ShareModal({
  url,
  fullName,
  qrSrc,
  copied,
  onCopy,
  onShare,
  onClose,
}: {
  url: string;
  fullName: string;
  qrSrc: string;
  copied: boolean;
  onCopy: () => void;
  onShare: () => void;
  onClose: () => void;
}) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="share-title"
      className="fixed inset-0 z-50 bg-black/40 flex items-end sm:items-center justify-center p-0 sm:p-4"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        ref={ref}
        className="w-full max-w-md bg-white rounded-t-3xl sm:rounded-3xl shadow-2xl"
      >
        <header className="flex items-center justify-between px-5 py-4 border-b border-line">
          <div>
            <p
              id="share-title"
              className="text-[14px] font-bold text-night"
            >
              Partager le profil
            </p>
            <p className="text-[11.5px] text-night-muted">{fullName}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Fermer"
            className="w-9 h-9 rounded-full hover:bg-bg-soft flex items-center justify-center"
          >
            <X className="w-4 h-4" aria-hidden />
          </button>
        </header>

        <div className="p-5 space-y-4">
          {/* QR */}
          <div className="flex justify-center">
            <div className="p-3 rounded-2xl bg-white border border-line">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={qrSrc}
                alt="QR code du profil"
                width={240}
                height={240}
                className="block"
              />
            </div>
          </div>

          {/* URL + copy */}
          <div className="flex items-center gap-2">
            <input
              type="text"
              value={url}
              readOnly
              className="flex-1 h-10 px-3 rounded-lg border border-line bg-bg-soft text-[12px] text-night-soft focus:outline-none"
            />
            <button
              type="button"
              onClick={onCopy}
              className={cn(
                "h-10 px-3 rounded-full text-[12px] font-semibold inline-flex items-center gap-1.5 transition-colors",
                copied
                  ? "bg-green-100 text-green-700"
                  : "bg-night text-cream hover:bg-night-soft",
              )}
            >
              {copied ? (
                <>
                  <Check className="w-3.5 h-3.5" aria-hidden />
                  Copié
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5" aria-hidden />
                  Copier
                </>
              )}
            </button>
          </div>

          {/* Share native */}
          <button
            type="button"
            onClick={onShare}
            className="w-full h-11 rounded-full bg-gold-deep text-white text-[13px] font-semibold inline-flex items-center justify-center gap-2 hover:bg-gold transition-colors"
          >
            <Share2 className="w-4 h-4" aria-hidden />
            Partager via…
          </button>

          <p className="text-center text-[11px] text-night-dim">
            <QrCode className="w-3 h-3 inline-block mr-1" aria-hidden />
            Scanne le QR pour ouvrir le profil sur un autre appareil.
          </p>
        </div>
      </div>
    </div>
  );
}
