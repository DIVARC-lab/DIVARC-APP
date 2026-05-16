import "server-only";

/* Sprint Recsys — Étape 20 : Cold start phase helpers.
 *
 * Lit get_user_cold_start_info() RPC pour exposer la phase + le label
 * + la barre de progression côté UI. */

import { createClient } from "@/lib/supabase/server";

export type ColdStartPhase = "new" | "learning" | "adjusting" | "stabilized";

export type ColdStartInfo = {
  phase: ColdStartPhase;
  phase_label: string;
  phase_desc: string;
  phase_progress_pct: number;
  age_hours: number;
  is_new_user: boolean;
  created_at: string | null;
};

export async function getUserColdStartInfo(
  userId: string,
): Promise<ColdStartInfo | null> {
  const supabase = await createClient();
  /* eslint-disable-next-line @typescript-eslint/no-explicit-any */
  const { data, error } = await (supabase as any).rpc(
    "get_user_cold_start_info",
    { p_user_id: userId },
  );
  if (error || !data) return null;
  return data as ColdStartInfo;
}

export async function getUserColdStartPhase(
  userId: string,
): Promise<ColdStartPhase> {
  const supabase = await createClient();
  /* eslint-disable-next-line @typescript-eslint/no-explicit-any */
  const { data, error } = await (supabase as any).rpc(
    "get_user_cold_start_phase",
    { p_user_id: userId },
  );
  if (error || !data) return "new";
  return data as ColdStartPhase;
}
