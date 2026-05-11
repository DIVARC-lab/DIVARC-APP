"use server";

import { createClient } from "@/lib/supabase/server";
import type { DraftProfile } from "@/lib/database.types";

/* Étape 3.5 — actions brouillon édition profil (V0070 draft_profiles).
 *
 * Le brouillon est persisté côté serveur pour sync multi-device. L'UI
 * appelle saveDraft() avec debounce 1s pendant l'édition, et clearDraft()
 * au submit final.
 *
 * version field : pour optimistic locking si le user a 2 onglets ouverts.
 * Last write wins V1 (pas de merge), mais on log si version saute. */

export type DraftResult =
  | { ok: true; version: number }
  | { ok: false; error: string };

export async function saveDraft(
  payload: Record<string, unknown>,
  currentSection?: string,
): Promise<DraftResult> {
  try {
    const supabase = await createClient();
    const { data, error } = await supabase.rpc("upsert_draft_profile", {
      p_payload: payload,
      p_current_section: currentSection,
    });
    if (error) {
      console.error("[saveDraft]", error);
      return { ok: false, error: "Sauvegarde échouée." };
    }
    return { ok: true, version: typeof data === "number" ? data : 1 };
  } catch (err) {
    console.error("[saveDraft:catch]", err);
    return { ok: false, error: "Erreur serveur." };
  }
}

export async function loadDraft(): Promise<DraftProfile | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data, error } = await supabase
    .from("draft_profiles")
    .select("*")
    .eq("user_id", user.id)
    .maybeSingle();

  if (error || !data) return null;
  return data as DraftProfile;
}

export async function clearDraft(): Promise<{ ok: boolean }> {
  try {
    const supabase = await createClient();
    const { error } = await supabase.rpc("clear_draft_profile");
    if (error) {
      console.error("[clearDraft]", error);
      return { ok: false };
    }
    return { ok: true };
  } catch {
    return { ok: false };
  }
}
