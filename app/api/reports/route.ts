import { NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import type {
  Database,
  ModerationCategory,
  ModerationTargetType,
} from "@/lib/database.types";

type ReportInsert =
  Database["public"]["Tables"]["moderation_reports"]["Insert"];

/* POST /api/reports — Signalement utilisateur (DSA art. 16).
 *
 * Pré-conditions :
 *   - Auth requis (anonymes redirigés vers /login depuis le ReportModal)
 *   - Rate limit : 10 reports/h par user (anti-spam et anti-abus)
 *   - Dédoublonnage : un user ne peut pas signaler 2× le même contenu
 *     dans la même catégorie (contrainte DB unique index)
 *
 * Post-conditions :
 *   - Insertion en moderation_reports (RLS reporter_id = auth.uid)
 *   - priority_score calculé via RPC (catégorie + trusted flagger +
 *     duplicates + viralité)
 *   - Ajout en moderation_queue pour review (job_type review_handoff)
 *   - Réponse 201 avec {id, reference} pour accusé de réception
 *     visible côté UI ("Nous avons bien reçu ton signalement #ABC123")
 *
 * Conformité :
 *   - LCEN art. 6 : conservation IP + user-agent du reporter (1 an min)
 *   - DSA art. 16 §2 : accusé de réception confirmé
 *   - DSA art. 16 §6 : décision sur le report sera notifiée au reporter
 */

const TARGET_TYPES: readonly ModerationTargetType[] = [
  "post",
  "comment",
  "user",
  "message",
  "listing",
  "story",
  "job",
  "listing_offer",
] as const;

const CATEGORIES: readonly ModerationCategory[] = [
  "hate_speech",
  "harassment",
  "violence",
  "nudity_sexual",
  "child_safety",
  "self_harm",
  "spam",
  "scam_fraud",
  "impersonation",
  "intellectual_property",
  "privacy",
  "illegal_activity",
  "other",
] as const;

const reportSchema = z
  .object({
    target_type: z.enum(TARGET_TYPES as unknown as [string, ...string[]]),
    target_id: z.string().uuid("target_id doit être un UUID valide"),
    category: z.enum(CATEGORIES as unknown as [string, ...string[]]),
    subcategory: z.string().max(50).optional(),
    description: z.string().max(1000).optional(),
    evidence_urls: z
      .array(z.string().url())
      .max(5, "Maximum 5 URLs de preuves")
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
      { error: "Authentification requise pour signaler un contenu." },
      { status: 401 },
    );
  }

  /* Vérification compte non-banni : un user banni ne peut pas reporter. */
  const { data: hasSanction } = await supabase.rpc(
    "is_user_under_active_sanction",
    { p_user_id: user.id },
  );
  if (hasSanction === true) {
    /* On lit aussi le type de sanction pour différencier readonly (peut
       reporter) de banned (ne peut pas). */
    const { data: sanction } = await supabase
      .from("user_sanctions")
      .select("type")
      .eq("user_id", user.id)
      .eq("is_active", true)
      .in("type", ["banned", "suspended"])
      .maybeSingle();
    if (sanction) {
      return NextResponse.json(
        {
          error:
            "Ton compte est suspendu. Tu ne peux pas soumettre de signalement.",
        },
        { status: 403 },
      );
    }
  }

  /* Parse + validation. */
  const body = await request.json().catch(() => null);
  const parsed = reportSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      {
        error: "Requête invalide.",
        details: parsed.error.flatten(),
      },
      { status: 400 },
    );
  }
  /* Cast explicite vers les union types DB — Zod garantit déjà la valeur,
     on aligne juste les types pour TypeScript. */
  const input = parsed.data as typeof parsed.data & {
    target_type: ModerationTargetType;
    category: ModerationCategory;
  };

  /* Rate limit 10/h : on compte les reports créés dans la dernière heure
     par ce reporter. Implémentation Postgres pour cohérence avec stack. */
  const oneHourAgo = new Date(Date.now() - 3600_000).toISOString();
  const { count: recentCount } = await supabase
    .from("moderation_reports")
    .select("id", { count: "exact", head: true })
    .eq("reporter_id", user.id)
    .gte("created_at", oneHourAgo);
  if ((recentCount ?? 0) >= 10) {
    return NextResponse.json(
      {
        error:
          "Limite de signalements atteinte (10/heure). Réessaie plus tard.",
      },
      { status: 429 },
    );
  }

  /* Anti-self-report : on ne peut pas signaler son propre contenu. */
  if (input.target_type === "user" && input.target_id === user.id) {
    return NextResponse.json(
      { error: "Tu ne peux pas te signaler toi-même." },
      { status: 400 },
    );
  }
  if (input.target_type === "post") {
    const { data: post } = await supabase
      .from("posts")
      .select("author_id")
      .eq("id", input.target_id)
      .maybeSingle();
    if (post?.author_id === user.id) {
      return NextResponse.json(
        { error: "Tu ne peux pas signaler ton propre post." },
        { status: 400 },
      );
    }
  }

  /* Détermination du target_user_id pour le scoring (auteur du contenu). */
  const targetUserId = await resolveTargetUserId(
    supabase,
    input.target_type,
    input.target_id,
  );

  /* Calcul priority via RPC. */
  const { data: priorityScore } = await supabase.rpc(
    "compute_report_priority_score",
    {
      p_category: input.category,
      p_reporter_id: user.id,
      p_target_user_id: targetUserId,
      p_target_post_id: input.target_type === "post" ? input.target_id : null,
    },
  );

  /* LCEN art. 6 : capture IP + UA depuis les headers Vercel. */
  const reporterIp =
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? null;
  const reporterUa = request.headers.get("user-agent")?.slice(0, 500) ?? null;

  /* Insertion — colonne FK de target choisie via switch typé. */
  const insertPayload: ReportInsert = {
    reporter_id: user.id,
    target_type: input.target_type,
    target_post_id: input.target_type === "post" ? input.target_id : null,
    target_comment_id:
      input.target_type === "comment" ? input.target_id : null,
    target_user_id: input.target_type === "user" ? input.target_id : null,
    target_message_id:
      input.target_type === "message" ? input.target_id : null,
    target_listing_id:
      input.target_type === "listing" || input.target_type === "listing_offer"
        ? input.target_id
        : null,
    target_story_id: input.target_type === "story" ? input.target_id : null,
    target_job_id: input.target_type === "job" ? input.target_id : null,
    category: input.category,
    subcategory: input.subcategory ?? null,
    description: input.description ?? null,
    evidence_urls: input.evidence_urls,
    reporter_ip: reporterIp,
    reporter_user_agent: reporterUa,
    priority_score: priorityScore ?? 20,
  };

  const { data: report, error } = await supabase
    .from("moderation_reports")
    .insert(insertPayload)
    .select("id, created_at, priority_score")
    .single();

  if (error) {
    /* Code 23505 = unique_violation → dédoublonnage. */
    if (error.code === "23505") {
      return NextResponse.json(
        {
          error:
            "Tu as déjà signalé ce contenu pour cette raison. Notre équipe traite ton signalement.",
          duplicate: true,
        },
        { status: 409 },
      );
    }
    console.error("[divarc:moderation:reports] insert failed:", error);
    return NextResponse.json(
      {
        error:
          "Impossible d'enregistrer le signalement pour le moment. Réessaie dans quelques instants.",
      },
      { status: 500 },
    );
  }

  /* Mise en queue async — review_handoff = un modérateur doit prendre.
     Si la queue échoue, on n'annule pas le report (le modérateur peut
     le voir dans la liste sans queue item). */
  await supabase
    .from("moderation_queue")
    .insert({
      job_type: "review_handoff",
      payload: { report_id: report.id, category: input.category },
      priority: report.priority_score ?? 20,
    })
    .then(({ error: qErr }) => {
      if (qErr) console.error("[moderation:queue] enqueue failed:", qErr);
    });

  /* Si catégorie critique (CSAM/self-harm), on enrichit avec un incident
     critique pour traçabilité Pharos/NCMEC. Le contenu réel n'est pas
     déplacé ici — c'est le job du decision flow modérateur. */
  if (input.category === "child_safety") {
    await supabase.from("moderation_critical_incidents").insert({
      incident_type: "csam",
      evidence_storage_path: `report:${report.id}`,
      evidence_metadata: {
        report_id: report.id,
        target_type: input.target_type,
        target_id: input.target_id,
        reporter_id: user.id,
      },
      perpetrator_user_id: targetUserId,
      perpetrator_ip: reporterIp,
      detected_by: "user_report",
    });
  }

  /* Référence courte humaine-readable pour l'accusé de réception. */
  const reference = `RPT-${report.id.slice(0, 8).toUpperCase()}`;
  return NextResponse.json(
    {
      id: report.id,
      reference,
      priority_score: report.priority_score,
      message:
        "Nous avons bien reçu ton signalement. Notre équipe Trust & Safety l'examine selon notre processus de modération.",
    },
    { status: 201 },
  );
}

async function resolveTargetUserId(
  supabase: Awaited<ReturnType<typeof createClient>>,
  type: ModerationTargetType,
  id: string,
): Promise<string | null> {
  if (type === "user") return id;
  /* Lookup léger pour récupérer l'auteur du contenu — utilisé pour le
     scoring (compte target récent). Si la table/row n'est pas
     accessible (RLS), on retourne null gracieusement. */
  if (type === "post") {
    const { data } = await supabase
      .from("posts")
      .select("author_id")
      .eq("id", id)
      .maybeSingle();
    return data?.author_id ?? null;
  }
  if (type === "comment") {
    const { data } = await supabase
      .from("post_comments")
      .select("author_id")
      .eq("id", id)
      .maybeSingle();
    return data?.author_id ?? null;
  }
  if (type === "listing") {
    const { data } = await supabase
      .from("listings")
      .select("seller_id")
      .eq("id", id)
      .maybeSingle();
    return data?.seller_id ?? null;
  }
  if (type === "story") {
    const { data } = await supabase
      .from("stories")
      .select("author_id")
      .eq("id", id)
      .maybeSingle();
    return data?.author_id ?? null;
  }
  /* job / message : on ne propage pas l'auteur ici par défaut. */
  return null;
}
