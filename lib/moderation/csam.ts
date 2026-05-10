import "server-only";
import { createAdminClient } from "@/lib/supabase/server";

/* PhotoDNA CSAM detection.
 *
 * PhotoDNA est une API Microsoft gratuite (jusqu'à 100M users) pour
 * détecter les contenus pédopornographiques connus via leur "robust
 * hashing". Inscription requise auprès de Microsoft :
 *   https://www.microsoft.com/en-us/PhotoDNA
 *
 * Endpoint : https://api.microsoftmoderator.com/photodna/v1.0/Match
 * Payload  : binaire de l'image (jpeg/png) + headers Ocp-Apim-Subscription-Key
 * Retour   : { IsMatch: boolean, MatchDetails: { ... } }
 *
 * Si match positif (IsMatch: true) :
 *   1. Le contenu est immédiatement bloqué silencieusement (pas de
 *      message à l'auteur — anti-tipping pour préserver l'enquête)
 *   2. Insertion en moderation_critical_incidents (incident_type=csam,
 *      detected_by=photodna)
 *   3. Cron csam-pharos-ncmec déclenchera l'envoi vers NCMEC
 *      CyberTipline (REQUIS sous 24h par PROTECT Act US)
 *   4. Pour Pharos (FR), un ticket interne haute priorité est créé :
 *      l'envoi se fait manuellement via internet-signalement.gouv.fr
 *      (pas d'API publique programmatique)
 *
 * Sécurité :
 *   - L'evidence (image binaire) doit être chiffrée at rest dans
 *     Supabase Storage avec un bucket service-role-only. Elle ne sera
 *     accessible qu'aux modérateurs autorisés et aux autorités via
 *     export contrôlé.
 *   - Aucun log textuel ne révèle l'image — uniquement son hash et
 *     les métadonnées de la match.
 */

export type PhotoDNAMatchResult = {
  is_match: boolean;
  match_details?: {
    matchFlags: string[];
    advancedInfo: Record<string, unknown>;
  };
};

export async function checkPhotoDNA(args: {
  /** Buffer binaire de l'image. */
  image_data: Buffer;
  /** Mime type pour PhotoDNA. */
  content_type: "image/jpeg" | "image/png" | "image/gif" | "image/bmp";
}): Promise<PhotoDNAMatchResult | null> {
  const subscriptionKey = process.env.PHOTODNA_API_KEY;
  if (!subscriptionKey) {
    console.warn("[csam:photodna] PHOTODNA_API_KEY missing — skipping check");
    return null;
  }

  try {
    const ctrl = new AbortController();
    const timeout = setTimeout(() => ctrl.abort(), 8000);
    const res = await fetch(
      "https://api.microsoftmoderator.com/photodna/v1.0/Match?enhance=false",
      {
        method: "POST",
        headers: {
          "Content-Type": args.content_type,
          "Ocp-Apim-Subscription-Key": subscriptionKey,
        },
        body: args.image_data as unknown as BodyInit,
        signal: ctrl.signal,
      },
    );
    clearTimeout(timeout);

    if (!res.ok) {
      console.error(
        "[csam:photodna] HTTP",
        res.status,
        await res.text().catch(() => ""),
      );
      return null;
    }

    const json = (await res.json()) as {
      IsMatch?: boolean;
      MatchFlags?: string[];
      AdvancedInfo?: Record<string, unknown>;
      Status?: { Code: number; Description: string };
    };

    return {
      is_match: json.IsMatch === true,
      match_details: json.IsMatch
        ? {
            matchFlags: json.MatchFlags ?? [],
            advancedInfo: json.AdvancedInfo ?? {},
          }
        : undefined,
    };
  } catch (err) {
    console.error("[csam:photodna] fetch failed:", err);
    return null;
  }
}

/* Protocole d'urgence CSAM — appelé dès qu'une match positive est
 * détectée (PhotoDNA, signalement utilisateur child_safety, OpenAI
 * Vision minor_present + nsfw>0.5).
 *
 * Actions :
 *   1. Bloquer le contenu silencieusement (pas de tipping de l'auteur)
 *   2. Sauvegarder l'evidence dans Storage chiffré
 *   3. Insert moderation_critical_incidents
 *   4. Sanction immédiate : ban_permanent (level 5)
 *   5. Le cron NCMEC s'en occupera dans les minutes suivantes
 */
export async function csamEmergencyProtocol(args: {
  perpetrator_user_id: string | null;
  perpetrator_email?: string | null;
  perpetrator_ip?: string | null;
  evidence_storage_path: string;
  detection_source: "photodna" | "user_report" | "moderator" | "external_api";
  context_metadata: Record<string, unknown>;
}): Promise<{ incident_id: string }> {
  const admin = createAdminClient();

  /* Insert incident. */
  const { data: incident, error } = await admin
    .from("moderation_critical_incidents")
    .insert({
      incident_type: "csam",
      evidence_storage_path: args.evidence_storage_path,
      evidence_metadata: args.context_metadata,
      perpetrator_user_id: args.perpetrator_user_id,
      perpetrator_email: args.perpetrator_email ?? null,
      perpetrator_ip: args.perpetrator_ip ?? null,
      detected_by: args.detection_source,
      status: "detected",
    })
    .select("id")
    .single();

  if (error || !incident) {
    console.error("[csam:emergency] incident insert failed:", error);
    throw new Error("CSAM emergency protocol failed at incident creation");
  }

  /* Sanction immédiate (ban) si user identifié. */
  if (args.perpetrator_user_id) {
    await admin.rpc("apply_sanction", {
      p_user_id: args.perpetrator_user_id,
      p_level: 5,
      p_reason:
        "Détection automatique de contenu pédopornographique. Compte banni définitivement. Signalement aux autorités en cours.",
    });
  }

  /* Enqueue NCMEC submission (cron csam-pharos-ncmec). */
  await admin.from("moderation_queue").insert({
    job_type: "csam_scan",
    payload: { incident_id: incident.id, target: "ncmec_submission" },
    priority: 100,
  });

  return { incident_id: incident.id };
}
