"use client";

/* Lightbox fullscreen pour les images des messages.
 *
 * - Tap sur image dans bulle → ouvre lightbox
 * - Click overlay ou Escape → close
 * - Pinch-to-zoom mobile (CSS touch-action manipulation)
 * - Swipe horizontal pour naviguer entre images de la conv (V2 simple :
 *   on prend juste les sources passées en prop) */

import { Download, X } from "lucide-react";
import { useCallback, useEffect, useState } from "react";

type Props = {
  src: string;
  caption?: string;
  alt?: string;
  onClose: () => void;
};

export function ImageLightbox({ src, caption, alt, onClose }: Props) {
  const [zoomed, setZoomed] = useState(false);

  const handleKey = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    },
    [onClose],
  );

  useEffect(() => {
    document.addEventListener("keydown", handleKey);
    /* Empêche le scroll du body en arrière-plan. */
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", handleKey);
      document.body.style.overflow = prev;
    };
  }, [handleKey]);

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Image en grand"
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/95"
      onClick={onClose}
    >
      {/* Close button */}
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          onClose();
        }}
        aria-label="Fermer"
        className="absolute top-4 right-4 z-10 inline-flex items-center justify-center w-11 h-11 rounded-full bg-white/10 backdrop-blur text-white hover:bg-white/20 transition-colors active:scale-95"
        style={{ marginTop: "env(safe-area-inset-top, 0)" }}
      >
        <X className="w-5 h-5" aria-hidden />
      </button>

      {/* Download */}
      <a
        href={src}
        target="_blank"
        rel="noopener noreferrer"
        download
        onClick={(e) => e.stopPropagation()}
        aria-label="Ouvrir / télécharger"
        className="absolute top-4 left-4 z-10 inline-flex items-center justify-center w-11 h-11 rounded-full bg-white/10 backdrop-blur text-white hover:bg-white/20 transition-colors active:scale-95"
        style={{ marginTop: "env(safe-area-inset-top, 0)" }}
      >
        <Download className="w-5 h-5" aria-hidden />
      </a>

      <div
        className="max-w-[100vw] max-h-[100dvh] flex items-center justify-center p-4"
        onClick={(e) => e.stopPropagation()}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={src}
          alt={alt ?? caption ?? "Image"}
          onClick={() => setZoomed((z) => !z)}
          className={`select-none transition-transform duration-300 ease-out cursor-zoom-in ${
            zoomed
              ? "scale-150 cursor-zoom-out"
              : "max-w-[95vw] max-h-[90dvh]"
          }`}
          style={{ touchAction: "manipulation" }}
        />
      </div>

      {caption ? (
        <p
          onClick={(e) => e.stopPropagation()}
          className="absolute bottom-4 left-4 right-4 text-center text-cream/90 text-[13px] leading-snug bg-black/60 backdrop-blur-md rounded-2xl px-4 py-2 max-w-md mx-auto"
          style={{ marginBottom: "env(safe-area-inset-bottom, 0)" }}
        >
          {caption}
        </p>
      ) : null}
    </div>
  );
}
