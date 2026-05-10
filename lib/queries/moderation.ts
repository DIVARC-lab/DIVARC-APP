import "server-only";
import { createClient } from "@/lib/supabase/server";
import type {
  ModerationCategory,
  ModerationReport,
  ModerationReportStatus,
} from "@/lib/database.types";

/* Queries server-only pour la console admin /admin/moderation.
 *
 * Toutes ces fonctions assument que l'appelant est déjà passé par
 * isCurrentUserAdmin() côté page (404 si non-admin). Les RLS sont
 * définies pour autoriser is_admin, donc même sans guard applicatif
 * un user normal ne pourrait pas lire. */

export type ReportListFilters = {
  status?: ModerationReportStatus[];
  category?: ModerationCategory[];
  /** Limit pour la liste de gauche, défaut 50. */
  limit?: number;
};

export type ReportListItem = {
  id: string;
  category: ModerationCategory;
  status: ModerationReportStatus;
  priority_score: number;
  target_type: ModerationReport["target_type"];
  target_post_id: string | null;
  target_comment_id: string | null;
  target_user_id: string | null;
  target_listing_id: string | null;
  target_story_id: string | null;
  target_message_id: string | null;
  target_job_id: string | null;
  created_at: string;
  /** Anonymisé côté UI ; on le garde server-side pour drill-down. */
  reporter_id: string;
  /** Stats jointes : combien d'autres reports sur le même target. */
  duplicate_count: number;
};

export async function listPendingReports(
  filters: ReportListFilters = {},
): Promise<ReportListItem[]> {
  const supabase = await createClient();
  const limit = filters.limit ?? 50;

  let query = supabase
    .from("moderation_reports")
    .select(
      "id, category, status, priority_score, target_type, target_post_id, target_comment_id, target_user_id, target_listing_id, target_story_id, target_message_id, target_job_id, created_at, reporter_id",
    )
    .order("priority_score", { ascending: false })
    .order("created_at", { ascending: true })
    .limit(limit);

  const statuses = filters.status ?? ["pending", "triaging", "under_review"];
  query = query.in("status", statuses);
  if (filters.category && filters.category.length > 0) {
    query = query.in("category", filters.category);
  }

  const { data, error } = await query;
  if (error || !data) {
    if (error) console.error("[moderation:listPendingReports]", error);
    return [];
  }

  /* Stats duplicate_count pour faire ressortir les contenus mass-reportés.
     Une seule query d'agrégation au lieu d'N+1. */
  const targetPostIds = data
    .map((r) => r.target_post_id)
    .filter((id): id is string => Boolean(id));
  const dupMap = new Map<string, number>();
  if (targetPostIds.length > 0) {
    const { data: dups } = await supabase
      .from("moderation_reports")
      .select("target_post_id")
      .in("target_post_id", targetPostIds);
    if (dups) {
      for (const d of dups) {
        if (d.target_post_id) {
          dupMap.set(
            d.target_post_id,
            (dupMap.get(d.target_post_id) ?? 0) + 1,
          );
        }
      }
    }
  }

  return data.map((r) => ({
    ...r,
    duplicate_count: r.target_post_id ? dupMap.get(r.target_post_id) ?? 1 : 1,
  }));
}

export type ReportDetail = ReportListItem & {
  description: string | null;
  subcategory: string | null;
  evidence_urls: string[];
  reporter_username: string | null;
  reporter_full_name: string | null;
  /* Contenu cible hydraté pour affichage. */
  target: TargetSnapshot | null;
  /* Tous les autres reports sur le même target (pour aggreg modérateur). */
  related_reports: Array<{
    id: string;
    category: ModerationCategory;
    description: string | null;
    created_at: string;
  }>;
  /* Historique modération de l'auteur du contenu. */
  author_history: AuthorHistory | null;
};

export type TargetSnapshot = {
  type: ReportListItem["target_type"];
  id: string;
  /* Pour post : body + media_url. Pour comment : body + parent. Pour
     user : profile. Pour listing : title + price. Pour message : body
     + conversation. Etc. Tous les champs sont optionnels. */
  body?: string | null;
  title?: string | null;
  media_url?: string | null;
  author_id?: string | null;
  author_username?: string | null;
  author_full_name?: string | null;
  author_avatar_url?: string | null;
  created_at?: string | null;
  url_in_app?: string;
};

export type AuthorHistory = {
  user_id: string;
  trust_score: number;
  warnings_count: number;
  content_removed_count: number;
  timeouts_received: number;
  active_sanction_type: string | null;
  account_age_days: number;
  prior_actions_count: number;
};

export async function getReportDetail(
  reportId: string,
): Promise<ReportDetail | null> {
  const supabase = await createClient();
  const { data: report, error } = await supabase
    .from("moderation_reports")
    .select("*")
    .eq("id", reportId)
    .maybeSingle();
  if (error || !report) {
    if (error) console.error("[moderation:getReportDetail]", error);
    return null;
  }

  /* Reporter profile (anonymisé en UI, mais utile en mod). */
  const { data: reporter } = await supabase
    .from("profiles")
    .select("username, full_name")
    .eq("id", report.reporter_id)
    .maybeSingle();

  /* Target snapshot. */
  const target = await hydrateTarget(supabase, report);

  /* Related reports — tous les autres reports sur le même target. */
  let relatedQuery = supabase
    .from("moderation_reports")
    .select("id, category, description, created_at")
    .neq("id", reportId)
    .order("created_at", { ascending: false })
    .limit(20);
  if (report.target_post_id) {
    relatedQuery = relatedQuery.eq("target_post_id", report.target_post_id);
  } else if (report.target_user_id) {
    relatedQuery = relatedQuery.eq("target_user_id", report.target_user_id);
  } else if (report.target_listing_id) {
    relatedQuery = relatedQuery.eq("target_listing_id", report.target_listing_id);
  } else if (report.target_comment_id) {
    relatedQuery = relatedQuery.eq("target_comment_id", report.target_comment_id);
  } else {
    relatedQuery = relatedQuery.eq("id", "00000000-0000-0000-0000-000000000000");
  }
  const { data: related } = await relatedQuery;

  /* Author history. */
  const authorId = target?.author_id ?? null;
  const authorHistory = authorId
    ? await loadAuthorHistory(supabase, authorId)
    : null;

  return {
    id: report.id,
    category: report.category,
    status: report.status,
    priority_score: report.priority_score,
    target_type: report.target_type,
    target_post_id: report.target_post_id,
    target_comment_id: report.target_comment_id,
    target_user_id: report.target_user_id,
    target_listing_id: report.target_listing_id,
    target_story_id: report.target_story_id,
    target_message_id: report.target_message_id,
    target_job_id: report.target_job_id,
    created_at: report.created_at,
    reporter_id: report.reporter_id,
    description: report.description,
    subcategory: report.subcategory,
    evidence_urls: report.evidence_urls,
    reporter_username: reporter?.username ?? null,
    reporter_full_name: reporter?.full_name ?? null,
    target,
    related_reports: (related ?? []).map((r) => ({
      id: r.id,
      category: r.category,
      description: r.description,
      created_at: r.created_at,
    })),
    author_history: authorHistory,
    duplicate_count: (related ?? []).length + 1,
  };
}

async function hydrateTarget(
  supabase: Awaited<ReturnType<typeof createClient>>,
  report: ModerationReport,
): Promise<TargetSnapshot | null> {
  if (report.target_post_id) {
    const { data: post } = await supabase
      .from("posts")
      .select(
        "id, body, author_id, created_at",
      )
      .eq("id", report.target_post_id)
      .maybeSingle();
    if (!post) return null;
    const { data: author } = await supabase
      .from("profiles")
      .select("username, full_name, avatar_url")
      .eq("id", post.author_id)
      .maybeSingle();
    return {
      type: "post",
      id: post.id,
      body: post.body,
      author_id: post.author_id,
      author_username: author?.username ?? null,
      author_full_name: author?.full_name ?? null,
      author_avatar_url: author?.avatar_url ?? null,
      created_at: post.created_at,
      url_in_app: `/feed/${post.id}`,
    };
  }
  if (report.target_user_id) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("id, username, full_name, avatar_url, bio, created_at")
      .eq("id", report.target_user_id)
      .maybeSingle();
    if (!profile) return null;
    return {
      type: "user",
      id: profile.id,
      title: profile.full_name ?? profile.username ?? "(sans nom)",
      body: profile.bio,
      author_id: profile.id,
      author_username: profile.username,
      author_full_name: profile.full_name,
      author_avatar_url: profile.avatar_url,
      created_at: profile.created_at,
      url_in_app: profile.username ? `/u/${profile.username}` : `/profile`,
    };
  }
  if (report.target_listing_id) {
    const { data: listing } = await supabase
      .from("listings")
      .select(
        "id, title, description, seller_id, created_at",
      )
      .eq("id", report.target_listing_id)
      .maybeSingle();
    if (!listing) return null;
    const { data: seller } = await supabase
      .from("profiles")
      .select("username, full_name, avatar_url")
      .eq("id", listing.seller_id)
      .maybeSingle();
    return {
      type: "listing",
      id: listing.id,
      title: listing.title,
      body: listing.description,
      author_id: listing.seller_id,
      author_username: seller?.username ?? null,
      author_full_name: seller?.full_name ?? null,
      author_avatar_url: seller?.avatar_url ?? null,
      created_at: listing.created_at,
      url_in_app: `/marketplace/${listing.id}`,
    };
  }
  if (report.target_comment_id) {
    const { data: comment } = await supabase
      .from("post_comments")
      .select("id, body, author_id, post_id, created_at")
      .eq("id", report.target_comment_id)
      .maybeSingle();
    if (!comment) return null;
    const { data: author } = await supabase
      .from("profiles")
      .select("username, full_name, avatar_url")
      .eq("id", comment.author_id)
      .maybeSingle();
    return {
      type: "comment",
      id: comment.id,
      body: comment.body,
      author_id: comment.author_id,
      author_username: author?.username ?? null,
      author_full_name: author?.full_name ?? null,
      author_avatar_url: author?.avatar_url ?? null,
      created_at: comment.created_at,
      url_in_app: `/feed/${comment.post_id}#c-${comment.id}`,
    };
  }
  return null;
}

async function loadAuthorHistory(
  supabase: Awaited<ReturnType<typeof createClient>>,
  userId: string,
): Promise<AuthorHistory | null> {
  const { data: profile } = await supabase
    .from("profiles")
    .select(
      "id, trust_score, warnings_count, content_removed_count, timeouts_received, created_at",
    )
    .eq("id", userId)
    .maybeSingle();
  if (!profile) return null;

  const { data: activeSanction } = await supabase
    .from("user_sanctions")
    .select("type")
    .eq("user_id", userId)
    .eq("is_active", true)
    .order("starts_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  const { count: priorActionsCount } = await supabase
    .from("moderation_actions")
    .select("id", { count: "exact", head: true })
    .eq("target_user_id", userId);

  const ageDays = Math.floor(
    (Date.now() - new Date(profile.created_at).getTime()) /
      (1000 * 60 * 60 * 24),
  );

  return {
    user_id: profile.id,
    trust_score: profile.trust_score ?? 50,
    warnings_count: profile.warnings_count ?? 0,
    content_removed_count: profile.content_removed_count ?? 0,
    timeouts_received: profile.timeouts_received ?? 0,
    active_sanction_type: activeSanction?.type ?? null,
    account_age_days: ageDays,
    prior_actions_count: priorActionsCount ?? 0,
  };
}

export async function getQueueStats() {
  const supabase = await createClient();
  const { count: pending } = await supabase
    .from("moderation_reports")
    .select("id", { count: "exact", head: true })
    .eq("status", "pending");
  const { count: critical } = await supabase
    .from("moderation_reports")
    .select("id", { count: "exact", head: true })
    .eq("status", "pending")
    .gte("priority_score", 80);
  const { count: appealsPending } = await supabase
    .from("moderation_appeals")
    .select("id", { count: "exact", head: true })
    .in("status", ["pending", "assigned"]);

  return {
    pending: pending ?? 0,
    critical: critical ?? 0,
    appealsPending: appealsPending ?? 0,
  };
}
