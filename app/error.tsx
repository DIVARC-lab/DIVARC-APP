"use client";

import { useEffect } from "react";
import { ErrorState } from "@/components/ui/ErrorState";

const OPAQUE_SERVER_ERROR_MESSAGE =
  "An error occurred in the Server Components render. The specific message is omitted in production builds to avoid leaking sensitive details. A digest property is included on this error instance which may provide additional details about the nature of the error.";

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

  const isOpaque = error.message === OPAQUE_SERVER_ERROR_MESSAGE;

  return (
    <ErrorState
      code="503"
      title={
        <>
          On a un{" "}
          <em className="italic bg-gradient-to-br from-gold to-[#B88A2A] bg-clip-text text-transparent">
            petit souci
          </em>{" "}
          de notre côté.
        </>
      }
      body="Notre équipe est déjà sur le coup. Réessaie dans quelques instants."
      details={!isOpaque && error.message ? error.message : undefined}
      digest={error.digest}
      onReset={reset}
      resetLabel="Réessayer"
      homeHref="/"
      homeLabel="Accueil"
    />
  );
}
