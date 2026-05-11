"use client";

/* lib/crypto/secureStore.ts — store IndexedDB natif pour les clés
 * privées du user et les sessions.
 *
 * Schema IndexedDB :
 *   db "divarc-crypto"
 *     store "identity" : 1 row { id: 'mine', publicKey, encryptedPrivateKey, privateKeyIV, registrationId, salt }
 *     store "sessions" : id = `${conversationId}:${peerUserId}`, value = CryptoSession (sans CryptoKey directement,
 *                        on stocke peer publicKey base64 + sessionKeyHash, et on re-dérive sessionKey à la demande)
 *
 * Le PrivateKey identity est stocké CHIFFRÉ par la master key (dérivée
 * du mot de passe user via PBKDF2). Sans le mot de passe, l'attaquant
 * ne peut pas déchiffrer la clé privée même s'il dump IndexedDB. */

import {
  decryptWithMasterKey,
  encryptWithMasterKey,
  exportPrivateKey,
  exportPublicKey,
  importPrivateKey,
  importPublicKey,
} from "./webCrypto";
import type { CryptoSession, IdentityKeyPair } from "./types";

const DB_NAME = "divarc-crypto";
const DB_VERSION = 1;
const STORE_IDENTITY = "identity";
const STORE_SESSIONS = "sessions";

type IdentityRecord = {
  id: "mine";
  publicKey: string;
  encryptedPrivateKey: string;
  privateKeyIV: string;
  registrationId: number;
  salt: string;
  createdAt: number;
};

type SessionRecord = {
  id: string;
  conversationId: string;
  peerUserId: string;
  peerPublicKey: string;
  sessionKeyHash: string;
  establishedAt: number;
  messageCount: number;
};

let dbPromise: Promise<IDBDatabase> | null = null;

function openDb(): Promise<IDBDatabase> {
  if (dbPromise) return dbPromise;
  dbPromise = new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_IDENTITY)) {
        db.createObjectStore(STORE_IDENTITY, { keyPath: "id" });
      }
      if (!db.objectStoreNames.contains(STORE_SESSIONS)) {
        db.createObjectStore(STORE_SESSIONS, { keyPath: "id" });
      }
    };
  });
  return dbPromise;
}

async function withStore<T>(
  storeName: string,
  mode: IDBTransactionMode,
  fn: (store: IDBObjectStore) => IDBRequest | Promise<T>,
): Promise<T> {
  const db = await openDb();
  return new Promise<T>((resolve, reject) => {
    const tx = db.transaction(storeName, mode);
    const store = tx.objectStore(storeName);
    const result = fn(store);
    if (result instanceof IDBRequest) {
      result.onsuccess = () => resolve(result.result as T);
      result.onerror = () => reject(result.error);
    } else {
      result.then(resolve).catch(reject);
    }
  });
}

/* === Identity (clé privée chiffrée par master key) === */

export async function storeIdentity(
  identity: IdentityKeyPair,
  masterKey: CryptoKey,
  registrationId: number,
  salt: string,
): Promise<void> {
  const publicKeyBase64 = await exportPublicKey(identity.publicKey);
  const privateKeyRaw = await exportPrivateKey(identity.privateKey);
  const { ciphertext, iv } = await encryptWithMasterKey(
    masterKey,
    Uint8Array.from(atob(privateKeyRaw), (c) => c.charCodeAt(0)).buffer,
  );
  const record: IdentityRecord = {
    id: "mine",
    publicKey: publicKeyBase64,
    encryptedPrivateKey: ciphertext,
    privateKeyIV: iv,
    registrationId,
    salt,
    createdAt: Date.now(),
  };
  await withStore(STORE_IDENTITY, "readwrite", (store) => store.put(record));
}

export async function loadIdentity(
  masterKey: CryptoKey,
): Promise<{ keyPair: IdentityKeyPair; registrationId: number } | null> {
  const record = (await withStore(
    STORE_IDENTITY,
    "readonly",
    (store) => store.get("mine"),
  )) as IdentityRecord | undefined;
  if (!record) return null;

  const privateKeyBuffer = await decryptWithMasterKey(
    masterKey,
    record.encryptedPrivateKey,
    record.privateKeyIV,
  );
  const privateKeyBase64 = btoa(
    String.fromCharCode(...new Uint8Array(privateKeyBuffer)),
  );
  const [publicKey, privateKey] = await Promise.all([
    importPublicKey(record.publicKey),
    importPrivateKey(privateKeyBase64),
  ]);
  return {
    keyPair: { publicKey, privateKey },
    registrationId: record.registrationId,
  };
}

export async function getIdentityMetadata(): Promise<{
  publicKey: string;
  registrationId: number;
  salt: string;
  createdAt: number;
} | null> {
  const record = (await withStore(
    STORE_IDENTITY,
    "readonly",
    (store) => store.get("mine"),
  )) as IdentityRecord | undefined;
  if (!record) return null;
  return {
    publicKey: record.publicKey,
    registrationId: record.registrationId,
    salt: record.salt,
    createdAt: record.createdAt,
  };
}

export async function deleteIdentity(): Promise<void> {
  await withStore(STORE_IDENTITY, "readwrite", (store) => store.delete("mine"));
  await withStore(STORE_SESSIONS, "readwrite", (store) => store.clear());
}

/* === Sessions === */

export async function storeSession(session: CryptoSession): Promise<void> {
  const record: SessionRecord = {
    id: session.id,
    conversationId: session.conversationId,
    peerUserId: session.peerUserId,
    peerPublicKey: await exportPublicKey(session.peerPublicKey),
    sessionKeyHash: session.sessionKeyHash,
    establishedAt: session.establishedAt,
    messageCount: session.messageCount,
  };
  await withStore(STORE_SESSIONS, "readwrite", (store) => store.put(record));
}

export async function loadSessionMeta(
  conversationId: string,
  peerUserId: string,
): Promise<{
  peerPublicKeyBase64: string;
  sessionKeyHash: string;
  establishedAt: number;
  messageCount: number;
} | null> {
  const id = `${conversationId}:${peerUserId}`;
  const record = (await withStore(
    STORE_SESSIONS,
    "readonly",
    (store) => store.get(id),
  )) as SessionRecord | undefined;
  if (!record) return null;
  return {
    peerPublicKeyBase64: record.peerPublicKey,
    sessionKeyHash: record.sessionKeyHash,
    establishedAt: record.establishedAt,
    messageCount: record.messageCount,
  };
}

export async function deleteSession(
  conversationId: string,
  peerUserId: string,
): Promise<void> {
  const id = `${conversationId}:${peerUserId}`;
  await withStore(STORE_SESSIONS, "readwrite", (store) => store.delete(id));
}

export async function listSessions(): Promise<SessionRecord[]> {
  return withStore<SessionRecord[]>(STORE_SESSIONS, "readonly", (store) => {
    return new Promise<SessionRecord[]>((resolve, reject) => {
      const req = store.getAll();
      req.onsuccess = () => resolve((req.result as SessionRecord[]) ?? []);
      req.onerror = () => reject(req.error);
    });
  });
}

/* === Master key cache mémoire (anti re-prompt fréquent) ===
 *
 * Garde la master key déchiffrée en mémoire JS pendant la session
 * browser. Jamais persisté. Auto-clear sur tab close. */
let inMemoryMasterKey: CryptoKey | null = null;

export function cacheMasterKey(key: CryptoKey): void {
  inMemoryMasterKey = key;
}

export function getCachedMasterKey(): CryptoKey | null {
  return inMemoryMasterKey;
}

export function clearMasterKey(): void {
  inMemoryMasterKey = null;
}
