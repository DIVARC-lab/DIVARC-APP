/* Types partagés du module crypto DIVARC.
 *
 * Architecture (Chantier 1.2 V1, Web Crypto API custom) :
 *   1. À l'inscription : génère un keypair ECDH long-lived par device
 *      (clé "identité" V1 — pas de signed prekey ni one-time prekeys,
 *      simplification vs Signal X3DH).
 *   2. Pour démarrer une session avec Alice : Bob fetch identity_key de
 *      Alice, fait ECDH(BobPrivate, AlicePublic) → shared secret →
 *      HKDF → AES-GCM key.
 *   3. Chaque message est chiffré avec AES-GCM (clé dérivée, IV unique).
 *
 * Limitations V1 :
 *   - Pas de Double Ratchet → la clé de session ne change pas. Si 1 clé
 *     fuit, tous les messages de la session sont déchiffrables.
 *   - Pas de forward secrecy par-message.
 *   - Pas de one-time prekeys → asymmetric mais initial bundle simple.
 *
 * V2 (audit pro) : ajouter Double Ratchet, X3DH avec one-time prekeys
 * + signed prekey + signature. */

/** Identity key pair = ECDH P-256 (CryptoKey natif Web Crypto). */
export type IdentityKeyPair = {
  publicKey: CryptoKey;
  privateKey: CryptoKey;
};

/** Identity key publique exportée pour upload server (base64 SPKI). */
export type ExportedIdentityKey = {
  /** Public key SPKI encoded en base64. */
  publicKey: string;
  /** Registration ID local (entier 14-bit, anti-collision multi-device). */
  registrationId: number;
};

/** Message chiffré stocké côté server (= messages.encrypted_content). */
export type EncryptedPayload = {
  /** Ciphertext base64 (AES-GCM output). */
  ciphertext: string;
  /** IV (12 bytes pour AES-GCM) base64. */
  iv: string;
  /** Hash de la clé de session utilisée (pour key rotation tracking). */
  sessionKeyHash: string;
  /** Version du schema crypto (pour migration V2 future). */
  version: 1;
};

/** Session établie entre 2 users dans une conv (stockée IndexedDB). */
export type CryptoSession = {
  /** Composite key : conv_id + peer_user_id. */
  id: string;
  conversationId: string;
  peerUserId: string;
  /** Clé AES-GCM dérivée d'ECDH (CryptoKey non-exportable). */
  sessionKey: CryptoKey;
  /** Hash de la sessionKey (= sessionKeyHash dans EncryptedPayload) pour
   *  détecter quand la clé change. */
  sessionKeyHash: string;
  /** Peer identity public key (CryptoKey importé, pas exportable). */
  peerPublicKey: CryptoKey;
  establishedAt: number;
  messageCount: number;
};

/** Snapshot exporté pour debugging (jamais persisté). */
export type CryptoSessionInfo = {
  conversationId: string;
  peerUserId: string;
  sessionKeyHash: string;
  establishedAt: number;
  messageCount: number;
};
