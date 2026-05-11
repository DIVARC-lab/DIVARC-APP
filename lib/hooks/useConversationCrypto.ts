"use client";

/* useConversationCrypto — orchestrateur côté conversation.
 *
 * Responsabilités :
 *   - Établir une session crypto avec le peer (au mount, si conv secrète
 *     effective + crypto ready)
 *   - Fournir encrypt(text) → EncryptedPayload pour le composer
 *   - Fournir decrypt(payload) → text pour le bubble
 *   - Détecter l'état :
 *     · "no_secret"  : conv non secrète, pas de crypto requis
 *     · "needs_unlock" : conv secrète mais crypto verrouillée
 *     · "no_peer_key" : peer n'a pas uploadé sa clé
 *     · "establishing" : ECDH en cours
 *     · "ready" : session établie, encrypt/decrypt OK
 *     · "error" : problème */

import { useCallback, useEffect, useState } from "react";
import { fetchPeerPublicKey } from "@/app/(app)/messages/crypto-actions";
import {
  decryptFromSession,
  encryptForSession,
  establishSession,
  getSession,
} from "@/lib/crypto/messageCipher";
import { useCrypto } from "@/lib/hooks/useCrypto";
import type { EncryptedPayload } from "@/lib/crypto/types";

export type ConvCryptoState =
  | "no_secret"
  | "needs_unlock"
  | "no_peer_key"
  | "establishing"
  | "ready"
  | "error";

type Params = {
  conversationId: string;
  peerUserId: string | null;
  isEffectiveSecret: boolean;
};

export function useConversationCrypto({
  conversationId,
  peerUserId,
  isEffectiveSecret,
}: Params) {
  const { state: cryptoState } = useCrypto();
  const [state, setState] = useState<ConvCryptoState>("no_secret");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  /* Établit la session quand toutes les conditions sont réunies. */
  useEffect(() => {
    let cancelled = false;

    if (!isEffectiveSecret) {
      setState("no_secret");
      setErrorMessage(null);
      return;
    }

    if (cryptoState === "uninitialized" || cryptoState === "locked") {
      setState("needs_unlock");
      return;
    }

    if (cryptoState !== "ready") {
      /* checking / error → on wait */
      return;
    }

    if (!peerUserId) {
      setState("error");
      setErrorMessage("Peer introuvable.");
      return;
    }

    /* Cas ready + isEffectiveSecret + peerUserId : check si on a déjà
       une session, sinon établis. */
    (async () => {
      try {
        const existing = await getSession(conversationId, peerUserId);
        if (existing) {
          if (!cancelled) setState("ready");
          return;
        }

        setState("establishing");
        const peerRes = await fetchPeerPublicKey(peerUserId);
        if (!peerRes.ok) {
          if (!cancelled) {
            setState("no_peer_key");
            setErrorMessage(peerRes.error);
          }
          return;
        }

        await establishSession(
          conversationId,
          peerUserId,
          peerRes.data.publicKey,
        );
        if (!cancelled) setState("ready");
      } catch (err) {
        if (!cancelled) {
          setState("error");
          setErrorMessage(
            err instanceof Error ? err.message : "Erreur session.",
          );
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [conversationId, peerUserId, isEffectiveSecret, cryptoState]);

  const encrypt = useCallback(
    async (text: string): Promise<EncryptedPayload> => {
      if (!peerUserId) throw new Error("No peer");
      return encryptForSession(conversationId, peerUserId, text);
    },
    [conversationId, peerUserId],
  );

  const decrypt = useCallback(
    async (payload: EncryptedPayload): Promise<string> => {
      if (!peerUserId) throw new Error("No peer");
      return decryptFromSession(conversationId, peerUserId, payload);
    },
    [conversationId, peerUserId],
  );

  return {
    state,
    errorMessage,
    encrypt,
    decrypt,
    isReady: state === "ready",
  };
}
