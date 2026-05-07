"use client";

import { AlertCircle, RotateCcw } from "lucide-react";
import { useEffect } from "react";
import { Button } from "@/components/ui/Button";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[divarc:error-boundary]", error);
  }, [error]);

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-6 text-center">
      <div className="w-14 h-14 rounded-full bg-red-50 border border-red-200 flex items-center justify-center mb-5">
        <AlertCircle className="w-7 h-7 text-red-500" aria-hidden />
      </div>
      <h1 className="text-2xl font-bold text-night">Une erreur est survenue</h1>
      <p className="mt-2 text-muted max-w-md">
        Quelque chose s&apos;est mal passé de notre côté. Tu peux réessayer ou
        revenir à l&apos;accueil.
      </p>
      {error.digest ? (
        <p className="mt-3 text-xs text-muted">Code : {error.digest}</p>
      ) : null}
      <div className="mt-6 flex gap-2">
        <Button onClick={reset}>
          <RotateCcw className="w-4 h-4" aria-hidden />
          Réessayer
        </Button>
        <Button variant="secondary" asChild>
          <a href="/">Retour à l&apos;accueil</a>
        </Button>
      </div>
    </div>
  );
}
