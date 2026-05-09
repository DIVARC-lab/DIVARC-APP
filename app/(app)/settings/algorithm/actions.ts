"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";

const settingsSchema = z.object({
  chronological_mode: z.boolean().optional(),
  personalization_consent: z.boolean().optional(),
  location_consent: z.boolean().optional(),
  contacts_consent: z.boolean().optional(),
  ads_consent: z.boolean().optional(),
});

export type SaveResult =
  | { ok: true }
  | { ok: false; error: string };

/* Server action pour persister un toggle des settings algorithme.
 * Met à jour consent_timestamp si un consentement passe à true (RGPD
 * art. 7 : daté). */
export async function saveAlgorithmSettings(
  patch: z.infer<typeof settingsSchema>,
): Promise<SaveResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Non authentifié." };

  const parsed = settingsSchema.safeParse(patch);
  if (!parsed.success) return { ok: false, error: "Données invalides." };

  /* Si un consentement passe à true, on stamp consent_timestamp.
     Si ce n'est qu'un toggle techniques (chronological_mode), pas de
     stamp. */
  const consentChanged =
    parsed.data.personalization_consent === true ||
    parsed.data.location_consent === true ||
    parsed.data.contacts_consent === true ||
    parsed.data.ads_consent === true;

  const { error } = await supabase
    .from("user_algorithm_settings")
    .upsert(
      {
        user_id: user.id,
        ...parsed.data,
        ...(consentChanged
          ? { consent_timestamp: new Date().toISOString() }
          : {}),
        updated_at: new Date().toISOString(),
      },
      { onConflict: "user_id" },
    );

  if (error) return { ok: false, error: "Sauvegarde impossible." };

  revalidatePath("/settings/algorithm");
  return { ok: true };
}
