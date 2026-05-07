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
    console.error("[divarc:error-boundary]", {
      message: error.message,
      digest: error.digest,
      stack: error.stack,
      name: error.name,
    });
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
        <div className="mt-4 px-4 py-2 rounded-xl bg-night/5 border border-line text-xs">
          <span className="text-muted">Code d&apos;erreur :</span>{" "}
          <code className="font-mono font-bold text-night select-all">
            {error.digest}
          </code>
        </div>
      ) : null}
      {error.message && error.message !== "An error occurred in the Server Components render. The specific message is omitted in production builds to avoid leaking sensitive details. A digest property is included on this error instance which may provide additional details about the nature of the error." ? (
        <pre className="mt-3 text-left text-xs p-3 rounded-lg bg-night/5 max-w-lg overflow-auto whitespace-pre-wrap border border-line">
          {error.message}
        </pre>
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
