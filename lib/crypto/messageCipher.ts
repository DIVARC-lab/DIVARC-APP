"use client";

/* lib/crypto/messageCipher.ts — orchestrateur high-level.
 *
 * API consommée par les composants UI :
 *   - initializeCrypto(password) : crée ou récupère l'identité
 *   - establishSession(conversationId, peerUserId, peerPreKeyBundle)
 *   - encryptForSession(conversationId, peerUserId, text)
 *   - decryptFromSession(conversationId, peerUserId, payload)
 *
 * Gère la cache des CryptoKey en mémoire (les CryptoKey sont des refs
 * vivantes, pas exportables une fois importées). */

import {
  decryptMessage,
  deriveSessionKey,
  encryptMessage,
  generateIdentityKeyPair,
  generateRegistrationId,
  generateSalt,
  hashSessionKey,
  importPublicKey,
} from "./webCrypto";
import {
  cacheMasterKey,
  clearMasterKey,
  deleteIdentity,
  getCachedMasterKey,
  getIdentityMetadata,
  loadIdentity,
  loadSessionMeta,
  storeIdentity,
  storeSession,
} from "./secureStore";
import { deriveMasterKey } from "./webCrypto";
import type {
  CryptoSession,
  EncryptedPayload,
  ExportedIdentityKey,
} from "./types";

/* Cache mémoire des CryptoKey de session (non sérialisables). */
const sessionCache = new Map<string, CryptoSession>();

function sessionCacheKey(conversationId: string, peerUserId: string): string {
  return `${conversationId}:${peerUserId}`;
}

/* === Initialisation (à appeler après login user) === */

/** Crée ou récupère l'identité du user. Retourne la clé publique +
 *  registrationId à uploader server-side via lib/queries/crypto. */
export async function initializeCrypto(
  password: string,
): Promise<{ identity: ExportedIdentityKey; isNew: boolean }> {
  const existing = await getIdentityMetadata();

  if (existing) {
    /* Déchiffrer la privée avec la master key dérivée du password. */
    const masterKey = await deriveMasterKey(password, existing.salt);
    cacheMasterKey(masterKey);
    /* Tente le load pour valider que le password est correct. */
    const loaded = await loadIdentity(masterKey);
    if (!loaded) {
      throw new Error("Mot de passe incorrect.");
    }
    return {
      identity: {
        publicKey: existing.publicKey,
        registrationId: existing.registrationId,
      },
      isNew: false,
    };
  }

  /* Première fois : génère tout. */
  const salt = generateSalt();
  const masterKey = await deriveMasterKey(password, salt);
  cacheMasterKey(masterKey);

  const keyPair = await generateIdentityKeyPair();
  const registrationId = generateRegistrationId();
  await storeIdentity(keyPair, masterKey, registrationId, salt);

  const meta = await getIdentityMetadata();
  if (!meta) throw new Error("Crypto init failed");

  return {
    identity: {
      publicKey: meta.publicKey,
      registrationId: meta.registrationId,
    },
    isNew: true,
  };
}

/** Locked-state : appel sans password pour vérifier si on a une identité
 *  + master key encore en cache. */
export async function isCryptoReady(): Promise<boolean> {
  const meta = await getIdentityMetadata();
  return meta !== null && getCachedMasterKey() !== null;
}

/** Soft-lock : oublie le password (la prochaine action crypto demandera
 *  re-prompt). */
export function lockCrypto(): void {
  clearMasterKey();
  sessionCache.clear();
}

/** Hard reset : supprime tout. L'user perd toutes les conv secrètes. */
export async function resetCrypto(): Promise<void> {
  clearMasterKey();
  sessionCache.clear();
  await deleteIdentity();
}

/* === Session management === */

/** Démarre une session avec un peer. Le caller doit fournir la public
 *  key du peer (fetchée via RPC get_prekey_bundle côté serveur). */
export async function establishSession(
  conversationId: string,
  peerUserId: string,
  peerIdentityPublicKeyBase64: string,
): Promise<CryptoSession> {
  const masterKey = getCachedMasterKey();
  if (!masterKey) throw new Error("Crypto locked. Call initializeCrypto first.");

  const identity = await loadIdentity(masterKey);
  if (!identity) throw new Error("No identity stored.");

  const peerPublicKey = await importPublicKey(peerIdentityPublicKeyBase64);
  const sessionKey = await deriveSessionKey(
    identity.keyPair.privateKey,
    peerPublicKey,
  );
  const sessionKeyHash = await hashSessionKey(sessionKey);

  const session: CryptoSession = {
    id: sessionCacheKey(conversationId, peerUserId),
    conversationId,
    peerUserId,
    sessionKey,
    sessionKeyHash,
    peerPublicKey,
    establishedAt: Date.now(),
    messageCount: 0,
  };

  sessionCache.set(session.id, session);
  await storeSession(session);
  return session;
}

/** Récupère une session existante depuis le cache ou IDB.
 *  Re-dérive sessionKey si nécessaire. */
export async function getSession(
  conversationId: string,
  peerUserId: string,
): Promise<CryptoSession | null> {
  const cacheKey = sessionCacheKey(conversationId, peerUserId);
  const cached = sessionCache.get(cacheKey);
  if (cached) return cached;

  const meta = await loadSessionMeta(conversationId, peerUserId);
  if (!meta) return null;

  const masterKey = getCachedMasterKey();
  if (!masterKey) return null;

  const identity = await loadIdentity(masterKey);
  if (!identity) return null;

  const peerPublicKey = await importPublicKey(meta.peerPublicKeyBase64);
  const sessionKey = await deriveSessionKey(
    identity.keyPair.privateKey,
    peerPublicKey,
  );
  const sessionKeyHash = await hashSessionKey(sessionKey);

  /* Si le hash a changé depuis stocké : peer a re-init son identité,
     warning anti-MITM. Pour V1 on accepte silencieusement et update.
     V2 : alerter l'user "Les clés de [peer] ont changé". */
  const session: CryptoSession = {
    id: cacheKey,
    conversationId,
    peerUserId,
    sessionKey,
    sessionKeyHash,
    peerPublicKey,
    establishedAt: meta.establishedAt,
    messageCount: meta.messageCount,
  };
  sessionCache.set(cacheKey, session);
  return session;
}

/* === High-level encrypt/decrypt === */

export async function encryptForSession(
  conversationId: string,
  peerUserId: string,
  plaintext: string,
): Promise<EncryptedPayload> {
  const session = await getSession(conversationId, peerUserId);
  if (!session) {
    throw new Error(
      "Pas de session crypto pour cette conversation. Appelle establishSession d'abord.",
    );
  }
  session.messageCount += 1;
  return encryptMessage(session.sessionKey, plaintext, session.sessionKeyHash);
}

export async function decryptFromSession(
  conversationId: string,
  peerUserId: string,
  payload: EncryptedPayload,
): Promise<string> {
  const session = await getSession(conversationId, peerUserId);
  if (!session) {
    throw new Error(
      "Pas de session crypto pour cette conversation. La session a peut-être été perdue (clé reset).",
    );
  }
  if (payload.sessionKeyHash !== session.sessionKeyHash) {
    /* La clé a changé. V1 : on tente quand même (peut-être ratchet
       futur), V2 : alerter user "Les clés de cette conv ont changé". */
    console.warn(
      `[crypto] sessionKeyHash mismatch on conv ${conversationId} — peer may have rotated keys`,
    );
  }
  return decryptMessage(session.sessionKey, payload);
}
