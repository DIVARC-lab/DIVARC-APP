"use client";

import { useEffect } from "react";
import { ErrorState } from "@/components/ui/ErrorState";

/* Error boundary scopé à /jobs — capture les erreurs de rendu côté
 * Server Components ou Client Components dans cette route. */
export default function JobsError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[divarc:jobs:error]", {
      message: error.message,
      digest: error.digest,
    });
  }, [error]);

  return (
    <ErrorState
      code="503"
      title={
        <>
          Les offres sont{" "}
          <em className="italic bg-gradient-to-br from-gold to-gold-deep bg-clip-text text-transparent">
            momentanément
          </em>{" "}
          indisponibles.
        </>
      }
      body="On essaie de relancer ça. Si le souci persiste, ton fil de candidatures reste sauvegardé."
      digest={error.digest}
      onReset={reset}
      resetLabel="Réessayer"
      homeHref="/"
      homeLabel="Accueil"
    />
  );
}
