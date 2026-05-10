import { NextResponse } from "next/server";
import { z } from "zod";
import { createAdminClient, createClient } from "@/lib/supabase/server";

/* POST /api/moderation/appeals — Recours utilisateur DSA art. 20.
 *
 * Pré-conditions :
 *   - Auth requis
 *   - L'action ciblée doit être appealable (par défaut oui sauf no_action)
 *   - L'auteur du contenu modéré doit être l'appelant (RLS verifie aussi)
 *   - Pas d'appel déjà actif sur cette action (status pending|assigned)
 *   - Délai de 6 mois après decision_action.created_at (DSA art. 20.1)
 *
 * Post-conditions :
 *   - Insert moderation_appeals (status=pending, sla_deadline=J+7)
 *   - Mise en queue moderation_queue (job_type=appeal_handoff)
 *   - assigned_moderator_id sera attribué côté admin avec contrainte
 *     "modérateur ≠ celui de l'action initiale" (DSA art. 20.6)
 */

const appealSchema = z
  .object({
    action_id: z.string().uuid(),
    user_explanation: z.string().min(20).max(2000),
    additional_evidence_urls: z
      .array(z.string().url())
      .max(5)
      .optional()
      .default([]),
  })
  .strict();

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json(
      { error: "Authentification requise." },
      { status: 401 },
    );
  }

  const body = await request.json().catch(() => null);
  const parsed = appealSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Requête invalide.", details: parsed.error.flatten() },
      { status: 400 },
    );
  }
  const input = parsed.data;

  /* Lecture de l'action ciblée. RLS autorise target_user_id à voir,
     donc on est sûrs que l'appelant a le droit de contester. */
  const { data: action } = await supabase
    .from("moderation_actions")
    .select(
      "id, target_user_id, appealable, appeal_deadline, created_at, moderator_id",
    )
    .eq("id", input.action_id)
    .maybeSingle();
  if (!action) {
    return NextResponse.json(
      { error: "Décision introuvable ou non accessible." },
      { status: 404 },
    );
  }

  if (action.target_user_id !== user.id) {
    return NextResponse.json(
      { error: "Tu ne peux faire appel que sur tes propres décisions." },
      { status: 403 },
    );
  }
  if (!action.appealable) {
    return NextResponse.json(
      { error: "Cette décision n'est pas susceptible d'appel." },
      { status: 400 },
    );
  }

  /* DSA art. 20.1 : 6 mois max. */
  if (
    action.appeal_deadline &&
    new Date(action.appeal_deadline).getTime() < Date.now()
  ) {
    return NextResponse.json(
      {
        error:
          "Le délai pour contester cette décision est dépassé (6 mois). Tu peux saisir un organe de règlement extra-judiciaire (ARCOM).",
      },
      { status: 400 },
    );
  }

  /* Pas de doublon. */
  const { data: existing } = await supabase
    .from("moderation_appeals")
    .select("id, status")
    .eq("action_id", input.action_id)
    .eq("appellant_id", user.id)
    .in("status", ["pending", "assigned"])
    .maybeSingle();
  if (existing) {
    return NextResponse.json(
      {
        error: "Tu as déjà un appel en cours sur cette décision.",
        appeal_id: existing.id,
      },
      { status: 409 },
    );
  }

  /* SLA opérationnel 7 jours. SLA légal max 6 mois. */
  const slaDeadline = new Date(Date.now() + 7 * 24 * 3600 * 1000).toISOString();

  const { data: appeal, error } = await supabase
    .from("moderation_appeals")
    .insert({
      action_id: input.action_id,
      appellant_id: user.id,
      user_explanation: input.user_explanation,
      additional_evidence_urls: input.additional_evidence_urls,
      sla_deadline: slaDeadline,
    })
    .select("id, sla_deadline, created_at")
    .single();

  if (error || !appeal) {
    console.error("[moderation:appeals] insert failed:", error);
    return NextResponse.json(
      { error: "Impossible d'enregistrer l'appel pour le moment." },
      { status: 500 },
    );
  }

  /* Mise en queue handoff. Priorité haute (75) — les appeals doivent
     être traités sous 7 jours, donc plus prioritaires que les reports
     standards. */
  const admin = createAdminClient();
  await admin.from("moderation_queue").insert({
    job_type: "appeal_handoff",
    payload: {
      appeal_id: appeal.id,
      action_id: input.action_id,
      excluded_moderator_id: action.moderator_id,
    },
    priority: 75,
  });

  /* Notifier le user de la prise en compte. */
  await admin.from("notifications").insert({
    user_id: user.id,
    type: "moderation_appeal_resolved",
    title: "Ton recours a été enregistré",
    body: `Notre équipe T&S l'examinera sous 7 jours (délai légal max : 6 mois). Référence : ${appeal.id.slice(0, 8).toUpperCase()}.`,
    href: `/settings/moderation`,
    related_user_id: null,
    related_conversation_id: null,
    related_friendship_id: null,
  });

  return NextResponse.json(
    {
      id: appeal.id,
      sla_deadline: appeal.sla_deadline,
      created_at: appeal.created_at,
    },
    { status: 201 },
  );
}
