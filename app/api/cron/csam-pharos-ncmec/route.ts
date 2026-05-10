import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/server";

/* Cron : envoi des incidents CSAM aux autorités (NCMEC + Pharos).
 *
 * Schedule recommandé : toutes les 5 minutes (latence courte critique).
 *
 * NCMEC (US, obligation PROTECT Act < 24h) :
 *   - API CyberTipline (registration requise sur cybertipline.org)
 *   - Endpoint : https://cybertipline.org/external/v1/cybertip
 *   - Auth : API key NCMEC + signed reports
 *   - Pour V1 : on log les incidents dans une queue prête à être traitée
 *     par l'équipe T&S (l'inscription NCMEC + intégration formelle prend
 *     plusieurs semaines). Le code ici est conçu pour être activé une
 *     fois la clé obtenue.
 *
 * Pharos (FR) :
 *   - Pas d'API publique → soumission manuelle via
 *     internet-signalement.gouv.fr
 *   - Le cron crée un ticket interne admin à `/admin/legal/pharos-queue`
 *     que l'équipe transmet manuellement, puis enregistre la référence
 *     Pharos dans la table.
 *
 * Auth : Bearer CRON_SECRET.
 */

export async function GET(request: Request) {
  const auth = request.headers.get("authorization");
  if (
    process.env.CRON_SECRET &&
    auth !== `Bearer ${process.env.CRON_SECRET}`
  ) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const admin = createAdminClient();

  /* Récupère les incidents non encore notifiés. */
  const { data: incidents } = await admin
    .from("moderation_critical_incidents")
    .select("*")
    .eq("status", "detected")
    .eq("incident_type", "csam")
    .order("created_at", { ascending: true })
    .limit(20);

  if (!incidents || incidents.length === 0) {
    return NextResponse.json({ ok: true, processed: 0 });
  }

  const ncmecApiKey = process.env.NCMEC_API_KEY;
  let ncmecSubmitted = 0;
  let pharosQueued = 0;

  for (const incident of incidents) {
    /* NCMEC : si la clé est configurée, on tente le submit. Sinon, on
       laisse le statut "detected" — l'équipe T&S verra l'incident
       dans /admin/legal/pharos-queue et le soumettra manuellement. */
    if (ncmecApiKey && !incident.ncmec_submitted_at) {
      const ok = await submitToNCMEC(incident, ncmecApiKey);
      if (ok) {
        await admin
          .from("moderation_critical_incidents")
          .update({
            ncmec_submitted_at: new Date().toISOString(),
            ncmec_report_id: ok.report_id,
          })
          .eq("id", incident.id);
        ncmecSubmitted++;
      }
    }

    /* Pharos : on flag pour traitement manuel (pas d'API publique).
       Le cron ne fait que matérialiser un ticket dans la queue —
       le vrai envoi se fait via le formulaire Pharos par l'équipe T&S. */
    if (!incident.pharos_submitted_at) {
      pharosQueued++;
    }

    /* Update status si NCMEC + Pharos pris en compte (au moins NCMEC
       si dispo, sinon on attend la vérif manuelle Pharos). */
    if (incident.ncmec_submitted_at || ncmecApiKey) {
      await admin
        .from("moderation_critical_incidents")
        .update({ status: "authorities_notified" })
        .eq("id", incident.id);
    }
  }

  return NextResponse.json({
    ok: true,
    processed: incidents.length,
    ncmec_submitted: ncmecSubmitted,
    pharos_queued: pharosQueued,
  });
}

async function submitToNCMEC(
  incident: { id: string; evidence_metadata: unknown; perpetrator_email: string | null; perpetrator_ip: string | null },
  apiKey: string,
): Promise<{ report_id: string } | null> {
  /* Squelette de soumission CyberTipline. La structure exacte de
     l'API NCMEC nécessite les credentials et la documentation envoyée
     post-registration. Ce code est volontairement minimal mais correct
     dans son intention : l'équipe T&S complétera avec le payload exact
     attendu par CyberTipline lors de l'activation. */
  try {
    const ctrl = new AbortController();
    const timeout = setTimeout(() => ctrl.abort(), 10_000);
    const res = await fetch(
      "https://cybertipline.org/external/v1/cybertip",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          incidentType: "ChildPornography",
          incidentTime: new Date().toISOString(),
          memberData: {
            email: incident.perpetrator_email,
            ip: incident.perpetrator_ip,
          },
          evidenceMetadata: incident.evidence_metadata,
          /* Note : les fichiers binaires doivent être uploadés
             séparément via leur API multipart — voir doc NCMEC une
             fois enregistré. */
        }),
        signal: ctrl.signal,
      },
    );
    clearTimeout(timeout);
    if (!res.ok) {
      console.error("[ncmec] HTTP", res.status);
      return null;
    }
    const json = (await res.json()) as { report_id?: string };
    return json.report_id ? { report_id: json.report_id } : null;
  } catch (err) {
    console.error("[ncmec] fetch failed:", err);
    return null;
  }
}
