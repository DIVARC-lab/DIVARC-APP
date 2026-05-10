"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";

/* Server action — sauvegarde des préférences publicitaires user.
 *
 * Conformité RGPD :
 *   - Consent timestamp mis à jour à chaque changement (preuve d'opt-in)
 *   - L'opt-out est immédiat (le caller revalide le path pour rafraîchir)
 *   - Les changements de blocked_categories sont pris en compte au
 *     prochain runAuction côté serveur
 */

const prefsSchema = z
  .object({
    personalized_ads_consent: z.boolean(),
    behavioral_data_consent: z.boolean(),
    location_data_consent: z.boolean(),
    blocked_categories: z.array(z.string().max(50)).max(50).default([]),
  })
  .strict();

export type SaveResult = { ok: true } | { ok: false; error: string };

export async function saveAdPreferences(
  input: z.infer<typeof prefsSchema>,
): Promise<SaveResult> {
  const parsed = prefsSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: "Données invalides." };
  }
  const data = parsed.data;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Non authentifié." };

  /* Upsert sur la PK user_id. */
  const { error } = await supabase
    .from("user_ad_preferences")
    .upsert(
      {
        user_id: user.id,
        personalized_ads_consent: data.personalized_ads_consent,
        behavioral_data_consent: data.behavioral_data_consent,
        location_data_consent: data.location_data_consent,
        blocked_categories: data.blocked_categories,
        consent_updated_at: new Date().toISOString(),
      },
      { onConflict: "user_id" },
    );

  if (error) {
    console.error("[ads:saveAdPreferences]", error);
    return { ok: false, error: "Sauvegarde impossible." };
  }

  revalidatePath("/settings/privacy/ads");
  return { ok: true };
}
