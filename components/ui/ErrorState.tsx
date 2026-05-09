"use client";

import { Home, RotateCcw, type LucideIcon } from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils/cn";

type ErrorStateProps = {
  /* Code d'erreur : "503", "404", "500", ou personnalisé. Affiché en kicker. */
  code?: string;
  /* Icône optionnelle. Sinon "!" italic dans un cercle navy. */
  icon?: LucideIcon;
  title: React.ReactNode;
  body?: React.ReactNode;
  /* Détails techniques (digest, message). Affichés dans un <pre> discret
     uniquement si fournis (ne pas leak en prod). */
  digest?: string;
  details?: string;
  /* Action principale : reset (boundary client) ou href. */
  onReset?: () => void;
  resetLabel?: string;
  homeHref?: string;
  homeLabel?: string;
  className?: string;
  /* "page" = pleine page (min-h-screen), "inline" = bloc dans une page existante. */
  variant?: "page" | "inline";
};

/* Brief Session 9 — ErrorState réutilisable.
   - Hérite de la grammaire EmptyState mais avec accent rouge sur le code
   - Pattern dérivé de app/error.tsx mais sans style inline (Tailwind v4 PUR)
   - Utilisable dans error.tsx (boundaries) ET inline dans n'importe quelle
     page server pour signaler un fail dégradé. */
export function ErrorState({
  code = "503",
  icon: Icon,
  title,
  body,
  digest,
  details,
  onReset,
  resetLabel = "Réessayer",
  homeHref = "/",
  homeLabel = "Accueil",
  className,
  variant = "page",
}: ErrorStateProps) {
  const Inner = (
    <div className="flex flex-col items-center text-center max-w-2xl mx-auto w-full">
      {/* Bandeau rayé doré + bulle navy avec "!" italic ou icône. */}
      <div className="relative w-44 h-20 mb-6">
        <div
          aria-hidden
          className="absolute inset-0 rounded-2xl bg-white border border-line overflow-hidden"
        >
          <div className="absolute inset-0 bg-[repeating-linear-gradient(45deg,#B88A2A_0_4px,transparent_4px_8px)] opacity-25" />
        </div>
        <div className="absolute inset-1/2 -translate-x-1/2 -translate-y-1/2 w-14 h-14 rounded-full bg-night text-gold-deep flex items-center justify-center font-display italic text-3xl shadow-[0_8px_24px_rgba(10,31,68,0.2)]">
          {Icon ? <Icon className="w-6 h-6" aria-hidden /> : "!"}
        </div>
      </div>

      <span className="text-[11px] font-extrabold uppercase tracking-[0.18em] text-gold-deep">
        · Erreur {code}
      </span>
      <h1 className="mt-2 font-display italic text-3xl sm:text-4xl text-night leading-[1.05] text-balance">
        {title}
      </h1>
      {body ? (
        <p className="mt-3 text-night-muted leading-relaxed max-w-md">
          {body}
        </p>
      ) : null}

      {/* Status pill discret. */}
      <div className="mt-6 inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white border border-line">
        <span className="w-2 h-2 rounded-full bg-red-500 shadow-[0_0_0_4px_rgba(208,76,63,0.18)]" />
        <span className="text-xs font-semibold text-night-muted">
          On regarde ça en direct.
        </span>
      </div>

      {details ? (
        <pre className="mt-4 text-left text-xs p-3 rounded-xl bg-night/5 max-w-lg overflow-auto whitespace-pre-wrap border border-line text-night-muted">
          {details}
        </pre>
      ) : null}

      <div className="mt-8 flex flex-col sm:flex-row items-stretch sm:items-center justify-center gap-2 w-full max-w-sm">
        {onReset ? (
          <button
            type="button"
            onClick={onReset}
            className="inline-flex items-center justify-center gap-2 h-12 px-6 rounded-full bg-gold text-night font-extrabold text-sm hover:bg-gold-soft transition-colors shadow-[0_12px_28px_-10px_rgba(244,185,66,0.55)] flex-1"
          >
            <RotateCcw className="w-4 h-4" aria-hidden />
            {resetLabel}
          </button>
        ) : null}
        <Link
          href={homeHref}
          className="inline-flex items-center justify-center gap-2 h-12 px-6 rounded-full bg-night text-cream font-semibold text-sm hover:bg-night-soft transition-colors flex-1"
        >
          <Home className="w-4 h-4" aria-hidden />
          {homeLabel}
        </Link>
      </div>

      {digest ? (
        <p className="mt-6 text-xs text-muted">
          Code incident :{" "}
          <code className="font-mono font-bold text-gold-deep select-all">
            {digest}
          </code>
        </p>
      ) : null}
    </div>
  );

  if (variant === "inline") {
    return (
      <div className={cn("py-12 px-6", className)}>{Inner}</div>
    );
  }

  return (
    <div
      className={cn(
        "min-h-[calc(100vh-56px)] flex items-center justify-center px-6 sm:px-10 py-12 bg-cream",
        className,
      )}
    >
      {Inner}
    </div>
  );
}
