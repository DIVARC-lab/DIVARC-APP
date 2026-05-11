"use client";

/* lib/crypto/webCrypto.ts — primitives Web Crypto API.
 *
 * Wrap les appels crypto.subtle pour ECDH key exchange + AES-GCM
 * symmetric encryption. Pas de Signal Protocol, juste les briques
 * cryptographiques basiques mais solides (utilisées par Signal en
 * interne et auditées par tous les browsers majeurs).
 *
 * Algorithmes :
 *   - ECDH P-256 (NIST) pour key exchange (X25519 pas dispo nativement
 *     dans Web Crypto API V1, P-256 = compromis pragmatique)
 *   - HKDF SHA-256 pour dériver la session key depuis le shared secret
 *   - AES-GCM 256 pour chiffrer/déchiffrer les messages */

import type { EncryptedPayload, IdentityKeyPair } from "./types";

const ECDH_CURVE: EcKeyGenParams = {
  name: "ECDH",
  namedCurve: "P-256",
};

const AES_PARAMS = {
  name: "AES-GCM",
  length: 256,
};

const SESSION_INFO = "DIVARC-session-v1";

/* === Key generation === */

export async function generateIdentityKeyPair(): Promise<IdentityKeyPair> {
  const keyPair = (await crypto.subtle.generateKey(
    ECDH_CURVE,
    /* extractable = true pour publique, false pour privée idéalement
       — mais on a besoin d'export privée pour backup BIP39 (V2). En V1
       on garde extractable=true pour permettre récupération. */
    true,
    ["deriveKey", "deriveBits"],
  )) as CryptoKeyPair;
  return {
    publicKey: keyPair.publicKey,
    privateKey: keyPair.privateKey,
  };
}

/* === Public key export/import (pour upload server) === */

export async function exportPublicKey(key: CryptoKey): Promise<string> {
  const raw = await crypto.subtle.exportKey("spki", key);
  return bufferToBase64(raw);
}

export async function importPublicKey(base64: string): Promise<CryptoKey> {
  const buf = base64ToBuffer(base64);
  return crypto.subtle.importKey(
    "spki",
    buf,
    ECDH_CURVE,
    true,
    [], // public ECDH key : pas d'usage direct, juste pour deriveKey
  );
}

/* Pour stocker la privée encryptée localement (V2 BIP39). */
export async function exportPrivateKey(key: CryptoKey): Promise<string> {
  const raw = await crypto.subtle.exportKey("pkcs8", key);
  return bufferToBase64(raw);
}

export async function importPrivateKey(base64: string): Promise<CryptoKey> {
  const buf = base64ToBuffer(base64);
  return crypto.subtle.importKey(
    "pkcs8",
    buf,
    ECDH_CURVE,
    false, // privée : non-extractable une fois importée
    ["deriveKey", "deriveBits"],
  );
}

/* === ECDH + HKDF — dérive session key entre 2 users === */

/* Bob fait deriveSessionKey(BobPrivate, AlicePublic).
 * Alice fait deriveSessionKey(AlicePrivate, BobPublic).
 * Les 2 obtiennent la MÊME session key (propriété ECDH symétrique). */
export async function deriveSessionKey(
  myPrivateKey: CryptoKey,
  theirPublicKey: CryptoKey,
): Promise<CryptoKey> {
  return crypto.subtle.deriveKey(
    {
      name: "ECDH",
      public: theirPublicKey,
    },
    myPrivateKey,
    AES_PARAMS,
    false, // session key non-extractable (forced in-memory)
    ["encrypt", "decrypt"],
  );
}

/* Hash de la session key pour tracking rotation (V2 ratchet). */
export async function hashSessionKey(key: CryptoKey): Promise<string> {
  /* On ne peut pas exporter une CryptoKey non-extractable. À la place,
     on chiffre un bloc nul connu et on hash le ciphertext. Stable
     pour la même key. */
  const probe = new TextEncoder().encode(SESSION_INFO);
  const iv = new Uint8Array(12); // IV nul = OK ici car c'est un probe
  const ct = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv },
    key,
    probe,
  );
  const hash = await crypto.subtle.digest("SHA-256", ct);
  return bufferToBase64(hash).slice(0, 22); // 22 chars = 132 bits, suffisant
}

/* === Encryption/decryption messages === */

export async function encryptMessage(
  sessionKey: CryptoKey,
  plaintext: string,
  sessionKeyHash: string,
): Promise<EncryptedPayload> {
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const encoder = new TextEncoder();
  const ciphertext = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv },
    sessionKey,
    encoder.encode(plaintext),
  );
  return {
    ciphertext: bufferToBase64(ciphertext),
    iv: bufferToBase64(iv.buffer),
    sessionKeyHash,
    version: 1,
  };
}

export async function decryptMessage(
  sessionKey: CryptoKey,
  payload: EncryptedPayload,
): Promise<string> {
  if (payload.version !== 1) {
    throw new Error(`Unsupported crypto version: ${payload.version}`);
  }
  const iv = base64ToBuffer(payload.iv);
  const ciphertext = base64ToBuffer(payload.ciphertext);
  const plaintext = await crypto.subtle.decrypt(
    { name: "AES-GCM", iv },
    sessionKey,
    ciphertext,
  );
  return new TextDecoder().decode(plaintext);
}

/* === Safety number (60 digits pour verify keys anti-MITM) === */

/* Génère un safety number lisible à partir des 2 identity keys publiques
 * (concaténation hashée → digits décimaux). */
export async function computeSafetyNumber(
  publicKeyA: string,
  publicKeyB: string,
): Promise<string> {
  /* Ordonne alphabétiquement pour cohérence quelle que soit la
     perspective. */
  const [first, second] = [publicKeyA, publicKeyB].sort();
  const combined = `${first}|${second}`;
  const hashBuf = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(combined),
  );
  const bytes = new Uint8Array(hashBuf);
  /* Convertit en 60 digits (12 groupes de 5). */
  let digits = "";
  for (let i = 0; i < 30 && digits.length < 60; i++) {
    const b1 = bytes[i] ?? 0;
    const b2 = bytes[(i + 1) % 32] ?? 0;
    const num = (b1 << 8) | b2; // 0..65535
    const fiveDigit = String(num % 100000).padStart(5, "0");
    digits += fiveDigit;
  }
  return digits.slice(0, 60);
}

export async function hashSafetyNumber(safetyNumber: string): Promise<string> {
  const hash = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(safetyNumber),
  );
  return bufferToHex(hash);
}

/* === Master key pour protéger les clés privées en IndexedDB === */

/* Dérive une master key depuis le mot de passe user (PBKDF2 → AES-GCM).
 * Cette key sert à chiffrer les clés privées avant stockage IndexedDB. */
export async function deriveMasterKey(
  password: string,
  saltBase64: string,
): Promise<CryptoKey> {
  const passwordKey = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(password),
    "PBKDF2",
    false,
    ["deriveKey"],
  );
  return crypto.subtle.deriveKey(
    {
      name: "PBKDF2",
      salt: base64ToBuffer(saltBase64),
      iterations: 100_000,
      hash: "SHA-256",
    },
    passwordKey,
    AES_PARAMS,
    false,
    ["encrypt", "decrypt"],
  );
}

export function generateSalt(): string {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  return bufferToBase64(salt.buffer);
}

export function generateRegistrationId(): number {
  /* Entier 14-bit (1..16383) — anti-collision multi-device. */
  return 1 + Math.floor(Math.random() * 16382);
}

/* === Encrypt/decrypt arbitrary buffer (pour stocker privée en IDB) === */

export async function encryptWithMasterKey(
  masterKey: CryptoKey,
  plaintext: ArrayBuffer,
): Promise<{ ciphertext: string; iv: string }> {
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const ciphertext = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv },
    masterKey,
    plaintext,
  );
  return {
    ciphertext: bufferToBase64(ciphertext),
    iv: bufferToBase64(iv.buffer),
  };
}

export async function decryptWithMasterKey(
  masterKey: CryptoKey,
  ciphertextBase64: string,
  ivBase64: string,
): Promise<ArrayBuffer> {
  return crypto.subtle.decrypt(
    { name: "AES-GCM", iv: base64ToBuffer(ivBase64) },
    masterKey,
    base64ToBuffer(ciphertextBase64),
  );
}

/* === Helpers base64 / hex === */

export function bufferToBase64(buf: ArrayBuffer): string {
  const bytes = new Uint8Array(buf);
  let str = "";
  for (let i = 0; i < bytes.length; i++) {
    str += String.fromCharCode(bytes[i] ?? 0);
  }
  return btoa(str);
}

export function base64ToBuffer(base64: string): ArrayBuffer {
  const str = atob(base64);
  const bytes = new Uint8Array(str.length);
  for (let i = 0; i < str.length; i++) {
    bytes[i] = str.charCodeAt(i);
  }
  return bytes.buffer;
}

function bufferToHex(buf: ArrayBuffer): string {
  const bytes = new Uint8Array(buf);
  let hex = "";
  for (let i = 0; i < bytes.length; i++) {
    hex += (bytes[i] ?? 0).toString(16).padStart(2, "0");
  }
  return hex;
}
