import "server-only";
import { createClient } from "@/lib/supabase/server";
import type { EventSurface } from "@/lib/database.types";
import type { ExperimentId } from "./index";

/* Tracking d'exposition à une expérience.
 *
 * Pattern : "fire and forget". L'insertion dans recsys_events doit
 * être non-bloquante pour le render (le user ne doit pas attendre
 * un INSERT pour voir son feed). On capture les erreurs silencieusement
 * — un event manquant n'est pas une régression, juste un trou dans
 * l'analyse.
 *
 * Dédoublonnage : on log à chaque exposure (même user, même session).
 * L'analyse SQL fait DISTINCT ON (user_id, properties->>'variant')
 * pour compter les uniques. Ça reste plus simple que d'ajouter une
 * table experiment_assignments à maintenir.
 */
export async function trackExperimentExposure(args: {
  userId: string;
  experimentId: ExperimentId;
  variant: string;
  surface: EventSurface;
}): Promise<void> {
  try {
    const supabase = await createClient();
    await supabase.from("recsys_events").insert({
      event_id: crypto.randomUUID(),
      user_id: args.userId,
      session_id: "server-render",
      event_type: "experiment.exposure",
      surface: args.surface,
      properties: {
        experiment_id: args.experimentId,
        variant: args.variant,
      },
    });
  } catch (err) {
    /* Si la table recsys_events n'existe pas (migrations pas appliquées)
       ou si un autre soucis DB survient, on n'interrompt pas le render. */
    console.error("[experiments] tracking failed:", err);
  }
}
