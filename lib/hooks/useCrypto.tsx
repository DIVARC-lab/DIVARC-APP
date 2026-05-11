"use client";

/* useCrypto — hook React + Context Provider pour gérer l'état crypto
 * d'une session browser. Évite de re-prompt password à chaque action.
 *
 * États :
 *   - "uninitialized" : pas d'identité en IDB
 *   - "locked"        : identité existe, master key pas en cache
 *   - "ready"         : master key en cache, prêt à encrypt/decrypt
 *   - "error"         : password incorrect ou autre
 *
 * Le Provider ne provoque PAS de prompt automatique au mount — c'est
 * l'UI qui décide quand demander (ex: au clic sur conv secrète). */

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import {
  initializeCrypto,
  lockCrypto,
  resetCrypto,
} from "@/lib/crypto/messageCipher";
import { getIdentityMetadata } from "@/lib/crypto/secureStore";
import {
  hasUploadedIdentity,
  resetMyIdentity,
  uploadMyIdentityKey,
} from "@/app/(app)/messages/crypto-actions";

export type CryptoState =
  | "checking"
  | "uninitialized"
  | "locked"
  | "ready"
  | "error";

export type CryptoContextValue = {
  state: CryptoState;
  errorMessage: string | null;
  /* Unlock OU initialise selon si l'identité existe déjà. */
  unlock: (password: string) => Promise<{ ok: boolean; error?: string }>;
  /* Soft-lock : oublie le password (la prochaine action demandera
   *  re-prompt). Garde l'identité IDB. */
  lock: () => void;
  /* Hard reset : purge IDB + signal_identity_keys server-side. */
  reset: () => Promise<void>;
};

const CryptoContext = createContext<CryptoContextValue | null>(null);

export function CryptoProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<CryptoState>("checking");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  /* Au mount : check si on a une identité en IDB. */
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const meta = await getIdentityMetadata();
        if (cancelled) return;
        if (meta) {
          setState("locked");
        } else {
          setState("uninitialized");
        }
      } catch (err) {
        console.error("[useCrypto:check]", err);
        if (!cancelled) {
          setState("error");
          setErrorMessage("Impossible de lire le coffre crypto local.");
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const unlock = useCallback(async (password: string) => {
    setErrorMessage(null);
    try {
      const { identity, isNew } = await initializeCrypto(password);
      /* Première fois OU après reset : upload server-side. Idempotent
         (upsert sur user_id PK). */
      if (isNew) {
        const upload = await uploadMyIdentityKey(
          identity.publicKey,
          identity.registrationId,
        );
        if (!upload.ok) {
          setState("error");
          setErrorMessage(upload.error);
          return { ok: false, error: upload.error };
        }
      } else {
        /* Existant en local — vérifie que c'est aussi uploadé côté
           server (cas import device, etc.). */
        const uploaded = await hasUploadedIdentity();
        if (!uploaded) {
          const upload = await uploadMyIdentityKey(
            identity.publicKey,
            identity.registrationId,
          );
          if (!upload.ok) {
            setState("error");
            setErrorMessage(upload.error);
            return { ok: false, error: upload.error };
          }
        }
      }
      setState("ready");
      return { ok: true };
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Erreur crypto.";
      setErrorMessage(msg);
      /* Si password incorrect, on garde l'état locked pour re-try. */
      if (msg.toLowerCase().includes("incorrect")) {
        setState("locked");
      } else {
        setState("error");
      }
      return { ok: false, error: msg };
    }
  }, []);

  const lock = useCallback(() => {
    lockCrypto();
    setState("locked");
    setErrorMessage(null);
  }, []);

  const reset = useCallback(async () => {
    try {
      await resetCrypto();
      await resetMyIdentity();
      setState("uninitialized");
      setErrorMessage(null);
    } catch (err) {
      console.error("[useCrypto:reset]", err);
      setErrorMessage("Reset partiel — relance l'app.");
    }
  }, []);

  const value: CryptoContextValue = {
    state,
    errorMessage,
    unlock,
    lock,
    reset,
  };

  return (
    <CryptoContext.Provider value={value}>{children}</CryptoContext.Provider>
  );
}

export function useCrypto(): CryptoContextValue {
  const ctx = useContext(CryptoContext);
  if (!ctx) {
    throw new Error("useCrypto must be used inside <CryptoProvider>");
  }
  return ctx;
}

/* Variante safe pour les composants qui peuvent vivre hors du provider
 * (ex: layouts qui rendent à la fois des pages crypto et non-crypto). */
export function useCryptoSafe(): CryptoContextValue | null {
  return useContext(CryptoContext);
}
