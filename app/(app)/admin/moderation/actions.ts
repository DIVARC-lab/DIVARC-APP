"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createAdminClient, createClient } from "@/lib/supabase/server";
import { CATEGORY_BY_ID } from "@/lib/moderation/categories";
import type {
  Database,
  ModerationActionType,
  ModerationCategory,
  ModerationTargetType,
} from "@/lib/database.types";

/* Server actions pour la console modération.
 *
 * Toutes ces actions sont gardées par un check is_admin côté DB (RLS)
 * + côté applicatif pour les early-fail proprement. Les inserts en
 * moderation_actions sont immuables (triggers), donc on construit
 * l'enregistrement complet en une fois.
 *
 * DSA art. 17 : pour chaque action ≠ no_action, on insert une
 * notification destinée à l'auteur du contenu, avec la motivation
 * structurée (catégorie, base légale, deadline d'appel). */

const decisionSchema = z
  .object({
    report_id: z.string().uuid(),
    action: z.enum([
      "no_action",
      "warn",
      "hide",
      "delete",
      "restrict_24h",
      "restrict_7d",
      "restrict_30d",
      "suspend",
      "ban_permanent",
      "escalate",
      "authority_report",
    ] as const) as z.ZodType<ModerationActionType>,
    /* La catégorie peut être différente de celle du report initial : le
       reporter a pu cocher "harassment" mais le mod requalifie en
       "hate_speech" (plus précis pour l'audit). */
    category_decision: z
      .string()
      .min(1) as z.ZodType<ModerationCategory>,
    reason_internal: z.string().max(2000).optional(),
    reason_user: z.string().min(20).max(2000),
    legal_basis: z.string().max(500).optional(),
  })
  .strict();

export type DecisionResult =
  | { ok: true; action_id: string; sanction_id: string | null }
  | { ok: false; error: string };

export async function applyModerationDecision(
  input: z.infer<typeof decisionSchema>,
): Promise<DecisionResult> {
  const parsed = decisionSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: "Décision invalide." };
  }
  const data = parsed.data;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Non authentifié." };

  const { data: isAdmin } = await supabase.rpc("current_user_is_admin");
  if (!isAdmin) return { ok: false, error: "Réservé aux modérateurs." };

  /* Lecture du report + target. */
  const { data: report } = await supabase
    .from("moderation_reports")
    .select("*")
    .eq("id", data.report_id)
    .maybeSingle();
  if (!report) return { ok: false, error: "Signalement introuvable." };

  /* Build target identifiers. */
  const targetType = report.target_type as ModerationTargetType;
  const targetId =
    report.target_post_id ??
    report.target_comment_id ??
    report.target_user_id ??
    report.target_listing_id ??
    report.target_story_id ??
    report.target_message_id ??
    report.target_job_id;
  if (!targetId) return { ok: false, error: "Cible introuvable." };

  /* Snapshot du contenu cible (preuve immuable). */
  const snapshot = await captureSnapshot(supabase, targetType, targetId);

  /* Determine target_user_id (auteur du contenu pour notifications). */
  const targetUserId = await resolveTargetUserId(
    supabase,
    targetType,
    targetId,
    snapshot,
  );

  /* Insert moderation_action (immuable). */
  const insertAction: Database["public"]["Tables"]["moderation_actions"]["Insert"] =
    {
      moderator_id: user.id,
      is_automated: false,
      target_type: targetType,
      target_post_id: targetType === "post" ? targetId : null,
      target_comment_id: targetType === "comment" ? targetId : null,
      target_user_id: targetType === "user" ? targetId : targetUserId ?? null,
      target_listing_id:
        targetType === "listing" || targetType === "listing_offer"
          ? targetId
          : null,
      target_story_id: targetType === "story" ? targetId : null,
      target_message_id: targetType === "message" ? targetId : null,
      target_job_id: targetType === "job" ? targetId : null,
      action: data.action,
      category: data.category_decision,
      reason_internal: data.reason_internal ?? null,
      reason_user: data.reason_user,
      legal_basis: data.legal_basis ?? null,
      content_snapshot: snapshot,
      reports_referenced: [report.id],
      appealable: data.action !== "no_action",
      appeal_deadline:
        data.action !== "no_action"
          ? new Date(Date.now() + 180 * 24 * 3600 * 1000).toISOString()
          : null,
    };

  const { data: action, error: actionErr } = await supabase
    .from("moderation_actions")
    .insert(insertAction)
    .select("id")
    .single();
  if (actionErr || !action) {
    console.error("[moderation:apply] insert action failed:", actionErr);
    return { ok: false, error: "Impossible de logger la décision." };
  }

  /* Mettre à jour le report : status + résolution + assigned. */
  await supabase
    .from("moderation_reports")
    .update({
      status: data.action === "no_action" ? "dismissed" : "actioned",
      assigned_moderator_id: user.id,
      assigned_at: new Date().toISOString(),
      resolved_at: new Date().toISOString(),
      resolution_action_id: action.id,
    })
    .eq("id", report.id);

  /* Appliquer l'effet — content removal / sanction. Side-effects sur
     les tables source. On utilise admin client pour bypasser les RLS
     auteur (un mod peut delete le contenu d'un autre user). */
  const admin = createAdminClient();
  let sanctionId: string | null = null;
  switch (data.action) {
    case "delete":
      await applyContentRemoval(admin, targetType, targetId, "deleted");
      if (targetUserId) {
        await admin
          .from("profiles")
          .update({
            content_removed_count: (await fetchCounter(
              admin,
              targetUserId,
              "content_removed_count",
            )) + 1,
          })
          .eq("id", targetUserId);
      }
      break;
    case "hide":
      await applyContentRemoval(admin, targetType, targetId, "hidden");
      break;
    case "warn":
      if (targetUserId) {
        const { data: sid } = await admin.rpc("apply_sanction", {
          p_user_id: targetUserId,
          p_level: 1,
          p_reason: data.reason_user,
          p_source_action_id: action.id,
        });
        sanctionId = (sid as string | null) ?? null;
      }
      break;
    case "restrict_24h":
    case "restrict_7d":
    case "restrict_30d": {
      const level =
        data.action === "restrict_24h"
          ? 2
          : data.action === "restrict_7d"
            ? 3
            : 4;
      if (targetUserId) {
        const { data: sid } = await admin.rpc("apply_sanction", {
          p_user_id: targetUserId,
          p_level: level,
          p_reason: data.reason_user,
          p_source_action_id: action.id,
        });
        sanctionId = (sid as string | null) ?? null;
      }
      /* Le contenu est aussi caché dans ce cas. */
      await applyContentRemoval(admin, targetType, targetId, "hidden");
      break;
    }
    case "suspend":
    case "ban_permanent":
      if (targetUserId) {
        const { data: sid } = await admin.rpc("apply_sanction", {
          p_user_id: targetUserId,
          p_level: 5,
          p_reason: data.reason_user,
          p_source_action_id: action.id,
        });
        sanctionId = (sid as string | null) ?? null;
      }
      await applyContentRemoval(admin, targetType, targetId, "deleted");
      break;
    case "no_action":
    case "escalate":
    case "authority_report":
      break;
  }

  /* Notifications DSA art. 17 — au target user (motivation) + au reporter
     (issue de son signalement). */
  if (targetUserId && data.action !== "no_action") {
    await sendDecisionNotification(admin, {
      target_user_id: targetUserId,
      action_id: action.id,
      action: data.action,
      category: data.category_decision,
      reason_user: data.reason_user,
      legal_basis: data.legal_basis ?? null,
      appeal_deadline: insertAction.appeal_deadline ?? null,
    });
  }
  await sendReporterFeedback(admin, {
    reporter_id: report.reporter_id,
    report_id: report.id,
    action_taken: data.action,
  });

  /* Pour escalate / authority_report, on enrichit critical_incidents
     ou on flag la queue. */
  if (data.action === "authority_report") {
    await admin.from("moderation_critical_incidents").insert({
      incident_type:
        data.category_decision === "child_safety"
          ? "csam"
          : data.category_decision === "violence"
            ? "imminent_violence"
            : "terrorism",
      evidence_storage_path: `action:${action.id}`,
      evidence_metadata: {
        action_id: action.id,
        report_id: report.id,
        target_type: targetType,
        target_id: targetId,
      },
      perpetrator_user_id: targetUserId ?? null,
      detected_by: "moderator",
      status: "detected",
    });
  }

  revalidatePath("/admin/moderation");
  return { ok: true, action_id: action.id, sanction_id: sanctionId };
}

async function captureSnapshot(
  supabase: Awaited<ReturnType<typeof createClient>>,
  type: ModerationTargetType,
  id: string,
): Promise<Record<string, unknown>> {
  if (type === "post") {
    const { data } = await supabase
      .from("posts")
      .select("*")
      .eq("id", id)
      .maybeSingle();
    return data ? { ...data } : { id, type, captured_at: new Date().toISOString() };
  }
  if (type === "comment") {
    const { data } = await supabase
      .from("post_comments")
      .select("*")
      .eq("id", id)
      .maybeSingle();
    return data ? { ...data } : { id, type };
  }
  if (type === "user") {
    const { data } = await supabase
      .from("profiles")
      .select(
        "id, username, full_name, bio, avatar_url, created_at, trust_score",
      )
      .eq("id", id)
      .maybeSingle();
    return data ? { ...data } : { id, type };
  }
  if (type === "listing") {
    const { data } = await supabase
      .from("listings")
      .select("*")
      .eq("id", id)
      .maybeSingle();
    return data ? { ...data } : { id, type };
  }
  if (type === "story") {
    const { data } = await supabase
      .from("stories")
      .select("*")
      .eq("id", id)
      .maybeSingle();
    return data ? { ...data } : { id, type };
  }
  return { id, type, captured_at: new Date().toISOString() };
}

async function resolveTargetUserId(
  supabase: Awaited<ReturnType<typeof createClient>>,
  type: ModerationTargetType,
  id: string,
  snapshot: Record<string, unknown>,
): Promise<string | null> {
  if (type === "user") return id;
  if ((snapshot as { author_id?: string }).author_id) {
    return (snapshot as { author_id: string }).author_id;
  }
  if ((snapshot as { seller_id?: string }).seller_id) {
    return (snapshot as { seller_id: string }).seller_id;
  }
  if ((snapshot as { sender_id?: string }).sender_id) {
    return (snapshot as { sender_id: string }).sender_id;
  }
  return null;
}

async function applyContentRemoval(
  admin: ReturnType<typeof createAdminClient>,
  type: ModerationTargetType,
  id: string,
  mode: "hidden" | "deleted",
): Promise<void> {
  const stamp = new Date().toISOString();
  if (type === "post") {
    /* DIVARC posts utilisent soft delete via deleted_at. */
    await admin.from("posts").update({ deleted_at: stamp }).eq("id", id);
    return;
  }
  if (type === "comment") {
    await admin
      .from("post_comments")
      .update({ deleted_at: stamp })
      .eq("id", id);
    return;
  }
  if (type === "listing") {
    /* Pas de status "removed" sur listings — on archive (retire du
       marketplace public) et on garde la trace via moderation_actions. */
    await admin.from("listings").update({ status: "archived" }).eq("id", id);
    return;
  }
  if (type === "story") {
    /* Stories n'ont pas de soft delete (pas de colonne deleted_at).
       On hard-delete — la trace reste dans moderation_actions.content_snapshot. */
    await admin.from("stories").delete().eq("id", id);
    return;
  }
  if (type === "message") {
    await admin
      .from("messages")
      .update({ deleted_at: stamp })
      .eq("id", id);
    return;
  }
}

async function fetchCounter(
  admin: ReturnType<typeof createAdminClient>,
  userId: string,
  field: "warnings_count" | "content_removed_count" | "timeouts_received",
): Promise<number> {
  const { data } = await admin
    .from("profiles")
    .select(field)
    .eq("id", userId)
    .maybeSingle();
  return ((data as Record<string, number> | null)?.[field] ?? 0) as number;
}

function actionLabel(a: ModerationActionType): string {
  return (
    {
      no_action: "Aucune action",
      warn: "Avertissement",
      hide: "Masquage",
      delete: "Suppression",
      restrict_24h: "Restriction 24 h",
      restrict_7d: "Restriction 7 jours",
      restrict_30d: "Restriction 30 jours",
      suspend: "Suspension",
      ban_permanent: "Bannissement définitif",
      escalate: "Escalade en cours",
      authority_report: "Signalement aux autorités",
    } as const
  )[a];
}

async function sendDecisionNotification(
  admin: ReturnType<typeof createAdminClient>,
  args: {
    target_user_id: string;
    action_id: string;
    action: ModerationActionType;
    category: ModerationCategory;
    reason_user: string;
    legal_basis: string | null;
    appeal_deadline: string | null;
  },
): Promise<void> {
  const cat = CATEGORY_BY_ID[args.category];
  /* DSA art. 17 — notification structurée. La page /settings/moderation
     fait le rendu détaillé (motif + base légale + bouton Faire appel)
     en lisant moderation_actions par action_id depuis l'URL href. */
  const deadlineFr = args.appeal_deadline
    ? new Date(args.appeal_deadline).toLocaleDateString("fr-FR")
    : null;
  const bodyParts = [
    args.reason_user,
    args.legal_basis ? `Base légale : ${args.legal_basis}` : null,
    deadlineFr ? `Tu peux faire appel jusqu'au ${deadlineFr}.` : null,
  ].filter(Boolean);
  await admin.from("notifications").insert({
    user_id: args.target_user_id,
    type: "moderation_decision",
    title: `${actionLabel(args.action)} — ${cat?.label ?? args.category}`,
    body: bodyParts.join("\n\n"),
    href: `/settings/moderation`,
    related_user_id: null,
    related_conversation_id: null,
    related_friendship_id: null,
  });
}

async function sendReporterFeedback(
  admin: ReturnType<typeof createAdminClient>,
  args: {
    reporter_id: string;
    report_id: string;
    action_taken: ModerationActionType;
  },
): Promise<void> {
  const summary =
    args.action_taken === "no_action"
      ? "Notre équipe a examiné ton signalement et estime qu'il ne constitue pas une violation de nos règles."
      : `Notre équipe a examiné ton signalement. Décision prise : ${actionLabel(
          args.action_taken,
        )}.`;
  await admin.from("notifications").insert({
    user_id: args.reporter_id,
    type: "moderation_report_resolved",
    title: "Ton signalement a été traité",
    body: summary,
    href: `/settings/moderation`,
    related_user_id: null,
    related_conversation_id: null,
    related_friendship_id: null,
  });
}
