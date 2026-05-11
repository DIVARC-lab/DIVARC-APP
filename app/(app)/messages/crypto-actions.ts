"use server";

import { createClient } from "@/lib/supabase/server";
import type { SignalPreKeyBundle } from "@/lib/database.types";

/* Server Actions pour wrap les RPC Signal Protocol (migration 0074).
 *
 * Note : pour V1 (Web Crypto API custom), seul `public_key` +
 * `registration_id` sont utilisés. Les colonnes signed_prekeys / OTPK
 * existent dans le schema mais ne sont pas utilisées en V1 (X3DH allégé).
 * Préparation pour V2 audit complet. */

export type CryptoActionResult<T = void> =
  | { ok: true; data: T }
  | { ok: false; error: string };

/* Upload mon identité publique server-side après init crypto.
 * Idempotent : upsert sur user_id PK. */
export async function uploadMyIdentityKey(
  publicKey: string,
  registrationId: number,
): Promise<CryptoActionResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Non authentifié." };

  /* Validation simple */
  if (publicKey.length < 32 || publicKey.length > 256) {
    return { ok: false, error: "Clé publique invalide." };
  }
  if (registrationId < 1 || registrationId > 16383) {
    return { ok: false, error: "Registration ID invalide." };
  }

  const { error } = await supabase
    .from("signal_identity_keys")
    .upsert(
      {
        user_id: user.id,
        public_key: publicKey,
        registration_id: registrationId,
        device_id: 1,
      },
      { onConflict: "user_id" },
    );

  if (error) {
    console.error("[uploadMyIdentityKey]", error);
    return { ok: false, error: "Échec upload clé." };
  }

  return { ok: true, data: undefined };
}

/* Fetch la public key d'un peer pour démarrer une session. V1 = juste
 * identity_key (X3DH allégé sans OTPK). V2 utilisera get_prekey_bundle. */
export async function fetchPeerPublicKey(
  peerUserId: string,
): Promise<CryptoActionResult<{ publicKey: string; registrationId: number }>> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Non authentifié." };

  const { data, error } = await supabase
    .from("signal_identity_keys")
    .select("public_key, registration_id")
    .eq("user_id", peerUserId)
    .maybeSingle();

  if (error) {
    console.error("[fetchPeerPublicKey]", error);
    return { ok: false, error: "Erreur fetch clé peer." };
  }

  if (!data) {
    return {
      ok: false,
      error: "Cet utilisateur n'a pas encore activé le chiffrement.",
    };
  }

  return {
    ok: true,
    data: {
      publicKey: data.public_key,
      registrationId: data.registration_id,
    },
  };
}

/* Check si l'user a déjà uploadé son identité. */
export async function hasUploadedIdentity(): Promise<boolean> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return false;

  const { data } = await supabase
    .from("signal_identity_keys")
    .select("user_id")
    .eq("user_id", user.id)
    .maybeSingle();

  return data !== null;
}

/* V2 : récupère le PreKeyBundle complet (avec OTPK consommée). Préparé
 * pour quand on passera au Double Ratchet. */
export async function fetchPreKeyBundle(
  peerUserId: string,
): Promise<CryptoActionResult<SignalPreKeyBundle>> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Non authentifié." };

  const { data, error } = await supabase.rpc("get_prekey_bundle", {
    p_target_user_id: peerUserId,
  });

  if (error || !data) {
    return {
      ok: false,
      error: error?.message ?? "Bundle indisponible.",
    };
  }

  return { ok: true, data: data as unknown as SignalPreKeyBundle };
}

/* Mark safety verified — wrap RPC. */
export async function markSafetyVerified(
  peerUserId: string,
): Promise<CryptoActionResult> {
  const supabase = await createClient();
  const { error } = await supabase.rpc("mark_safety_verified", {
    p_other_user_id: peerUserId,
  });
  if (error) return { ok: false, error: error.message };
  return { ok: true, data: undefined };
}

/* Reset complet : supprime l'identité server-side. L'user devra
 * re-uploader une nouvelle clé. Toutes les conv secrètes existantes
 * deviennent indéchiffrables (warning critical côté UI). */
export async function resetMyIdentity(): Promise<CryptoActionResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Non authentifié." };

  /* Cascade : signal_signed_prekeys, signal_one_time_prekeys, signal_sessions
     ON DELETE CASCADE depuis user_id (mais pas signal_identity_keys
     elle-même qui a PK = user_id). */
  const { error } = await supabase
    .from("signal_identity_keys")
    .delete()
    .eq("user_id", user.id);

  if (error) return { ok: false, error: error.message };
  return { ok: true, data: undefined };
}
