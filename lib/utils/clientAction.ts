"use client";

import { toast } from "sonner";

type ActionLikeResult = {
  ok: boolean;
  error?: string;
  [key: string]: unknown;
};

type RunOptions<T> = {
  /** Toast affiché en cas de succès. Si fonction, reçoit le result. */
  successMessage?: string | ((result: T) => string);
  /** Toast affiché en cas d'échec connu (result.ok=false). Override le result.error. */
  errorMessage?: string;
  /** Désactive le toast d'erreur (le caller le gère lui-même). */
  silent?: boolean;
  /** Callback en cas de succès (avant le toast). */
  onSuccess?: (result: T) => void;
  /** Callback en cas d'erreur (avant le toast). */
  onError?: (error: string) => void;
};

/* Wrapper pour exécuter une server action côté client avec gestion uniforme :
 * - catch les erreurs réseau / runtime → toast "Connexion interrompue"
 * - lit le shape `{ ok, error }` standard et toast si ok=false
 * - toast de succès optionnel
 *
 * Usage :
 *   const result = await runAction(
 *     () => sendOffer(formData),
 *     { successMessage: "Offre envoyée." }
 *   );
 *
 * Returns le résultat de l'action, ou null si erreur catch (le caller peut
 * checker result?.ok). */
export async function runAction<T extends ActionLikeResult>(
  action: () => Promise<T>,
  options: RunOptions<T> = {},
): Promise<T | null> {
  try {
    const result = await action();
    if (result.ok) {
      options.onSuccess?.(result);
      if (options.successMessage) {
        const msg =
          typeof options.successMessage === "function"
            ? options.successMessage(result)
            : options.successMessage;
        toast.success(msg);
      }
    } else {
      const error =
        options.errorMessage ?? result.error ?? "Une erreur est survenue.";
      options.onError?.(error);
      if (!options.silent) toast.error(error);
    }
    return result;
  } catch (err) {
    /* Erreur réseau, timeout, ou throw inattendu côté action.
       On masque le détail technique au user (security + UX). */
    const message =
      err instanceof Error && /network|fetch|timeout/i.test(err.message)
        ? "Connexion interrompue. Réessaie."
        : "Une erreur inattendue est survenue.";
    options.onError?.(message);
    if (!options.silent) toast.error(message);
    return null;
  }
}
