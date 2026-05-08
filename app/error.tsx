"use client";

import { Home, RotateCcw } from "lucide-react";
import Link from "next/link";
import { useEffect } from "react";
import { ArcMark } from "@/components/marketing/ArcMark";
import { Button } from "@/components/ui/Button";
import { KickerLabel } from "@/components/ui/KickerLabel";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[divarc:error-boundary]", {
      message: error.message,
      digest: error.digest,
      stack: error.stack,
      name: error.name,
    });
  }, [error]);

  const isOpaqueServerError =
    error.message ===
    "An error occurred in the Server Components render. The specific message is omitted in production builds to avoid leaking sensitive details. A digest property is included on this error instance which may provide additional details about the nature of the error.";

  return (
    <div className="min-h-screen flex flex-col bg-cream">
      <header className="px-6 sm:px-10 py-6">
        <Link
          href="/"
          className="inline-flex items-center gap-2 text-sm text-night-muted hover:text-night"
        >
          <Home className="w-4 h-4" aria-hidden />
          DIVARC
        </Link>
      </header>

      <div className="flex-1 flex flex-col items-center justify-center px-6 sm:px-10 text-center relative max-w-2xl mx-auto w-full">
        {/* Striped illustration */}
        <div className="relative w-44 h-20 mb-6">
          <div className="absolute inset-0 rounded-2xl bg-white border border-line overflow-hidden">
            {[0, 1, 2, 3, 4, 5].map((i) => (
              <div
                key={i}
                className="absolute left-0 right-0 h-1.5 opacity-45"
                style={{
                  top: i * 14,
                  background:
                    i % 2 === 0
                      ? "repeating-linear-gradient(45deg, #B88A2A, #B88A2A 4px, transparent 4px, transparent 8px)"
                      : "transparent",
                }}
              />
            ))}
          </div>
          <div className="absolute inset-1/2 -translate-x-1/2 -translate-y-1/2 w-14 h-14 rounded-full bg-night text-gold-deep flex items-center justify-center font-display italic text-3xl shadow-[0_8px_24px_rgba(10,31,68,0.2)]">
            !
          </div>
        </div>

        <KickerLabel>Erreur 503</KickerLabel>
        <h1 className="mt-2 font-display italic text-3xl sm:text-4xl text-night leading-[1.05] text-balance">
          On a un <span className="text-red-600">petit souci</span>
          <br />
          de notre côté.
        </h1>
        <p className="mt-3 text-muted-strong leading-relaxed max-w-md">
          Notre équipe est déjà sur le coup. Réessaie dans quelques instants.
        </p>

        {/* Status pill */}
        <div className="mt-6 inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white border border-line">
          <span className="w-2 h-2 rounded-full bg-red-500 shadow-[0_0_0_4px_rgba(208,76,63,0.18)]" />
          <span className="text-xs font-semibold text-night-muted">
            Status mis à jour il y a quelques minutes
          </span>
        </div>

        {!isOpaqueServerError && error.message ? (
          <pre className="mt-4 text-left text-xs p-3 rounded-xl bg-night/5 max-w-lg overflow-auto whitespace-pre-wrap border border-line text-night-muted">
            {error.message}
          </pre>
        ) : null}

        <div className="mt-8 flex flex-wrap items-center justify-center gap-2 w-full max-w-sm">
          <Button onClick={reset} size="lg" className="flex-1">
            <RotateCcw className="w-4 h-4" aria-hidden />
            Réessayer
          </Button>
          <Button asChild variant="secondary" size="lg" className="flex-1">
            <Link href="/">
              <Home className="w-4 h-4" aria-hidden />
              Accueil
            </Link>
          </Button>
        </div>

        {error.digest ? (
          <p className="mt-6 text-xs text-muted">
            Code incident :{" "}
            <code className="font-mono font-bold text-gold-deep select-all">
              {error.digest}
            </code>
          </p>
        ) : null}

        <div
          aria-hidden
          className="absolute -bottom-20 -right-20 opacity-40 pointer-events-none"
        >
          <ArcMark size={260} animate={false} />
        </div>
      </div>
    </div>
  );
}
