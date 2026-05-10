import "server-only";
import { createAdminClient } from "@/lib/supabase/server";

/* Génération du rapport de transparence DSA art. 24.
 *
 * Calculé sur une période donnée (typiquement 12 mois glissants ou
 * année civile). Toutes les agrégations utilisent service_role pour
 * lire à travers les RLS — la page consommatrice est publique mais
 * n'expose que des chiffres agrégés.
 *
 * Pas de cache DB pour V1 — la page est mise en cache Vercel via
 * `revalidate` (1 jour). Pour V2 on pourra matérialiser une table
 * `transparency_report_snapshots` avec un cron annuel.
 */

export type TransparencyReport = {
  period_start: string;
  period_end: string;
  generated_at: string;

  reports: {
    total: number;
    by_category: Record<string, number>;
    median_priority: number;
    duplicates_rate: number;
  };

  actions: {
    total: number;
    by_action: Record<string, number>;
    by_category: Record<string, number>;
    automated_count: number;
    manual_count: number;
  };

  appeals: {
    total: number;
    accepted: number;
    rejected: number;
    pending: number;
    median_resolution_days: number | null;
  };

  authorities: {
    csam_incidents: number;
    ncmec_submissions: number;
    pharos_submissions: number;
    legal_data_requests: number;
  };

  trusted_flaggers: {
    total: number;
    active: number;
    avg_precision_rate: number | null;
  };

  timing: {
    median_resolution_hours: number | null;
    p90_resolution_hours: number | null;
  };
};

export async function buildTransparencyReport(args: {
  period_start?: Date;
  period_end?: Date;
}): Promise<TransparencyReport> {
  const periodEnd = args.period_end ?? new Date();
  const periodStart =
    args.period_start ?? new Date(Date.now() - 365 * 24 * 3600 * 1000);
  const startIso = periodStart.toISOString();
  const endIso = periodEnd.toISOString();

  const admin = createAdminClient();

  /* Reports. */
  const { data: reports } = await admin
    .from("moderation_reports")
    .select("category, priority_score, target_post_id, target_user_id, created_at")
    .gte("created_at", startIso)
    .lte("created_at", endIso);

  const reportsByCategory: Record<string, number> = {};
  for (const r of reports ?? []) {
    reportsByCategory[r.category] = (reportsByCategory[r.category] ?? 0) + 1;
  }
  const priorityScores = (reports ?? [])
    .map((r) => r.priority_score)
    .sort((a, b) => a - b);
  const medianPriority =
    priorityScores.length > 0
      ? priorityScores[Math.floor(priorityScores.length / 2)]
      : 0;
  /* Taux de duplicats : reports sur un même target>1 / total reports. */
  const targetCounts = new Map<string, number>();
  for (const r of reports ?? []) {
    const t = r.target_post_id ?? r.target_user_id ?? null;
    if (t) targetCounts.set(t, (targetCounts.get(t) ?? 0) + 1);
  }
  const duplicateReports = Array.from(targetCounts.values())
    .filter((c) => c > 1)
    .reduce((a, c) => a + c, 0);
  const duplicatesRate =
    (reports?.length ?? 0) > 0 ? duplicateReports / reports!.length : 0;

  /* Actions. */
  const { data: actions } = await admin
    .from("moderation_actions")
    .select("action, category, is_automated, created_at")
    .gte("created_at", startIso)
    .lte("created_at", endIso);

  const actionsByAction: Record<string, number> = {};
  const actionsByCategory: Record<string, number> = {};
  let automatedCount = 0;
  let manualCount = 0;
  for (const a of actions ?? []) {
    actionsByAction[a.action] = (actionsByAction[a.action] ?? 0) + 1;
    actionsByCategory[a.category] = (actionsByCategory[a.category] ?? 0) + 1;
    if (a.is_automated) automatedCount++;
    else manualCount++;
  }

  /* Appeals. */
  const { data: appeals } = await admin
    .from("moderation_appeals")
    .select("status, created_at, resolved_at")
    .gte("created_at", startIso)
    .lte("created_at", endIso);

  let appealsAccepted = 0;
  let appealsRejected = 0;
  let appealsPending = 0;
  const appealResolutions: number[] = [];
  for (const a of appeals ?? []) {
    if (a.status === "accepted") appealsAccepted++;
    else if (a.status === "rejected") appealsRejected++;
    else if (a.status === "pending" || a.status === "assigned")
      appealsPending++;
    if (a.resolved_at) {
      const days =
        (new Date(a.resolved_at).getTime() -
          new Date(a.created_at).getTime()) /
        (1000 * 60 * 60 * 24);
      appealResolutions.push(days);
    }
  }
  appealResolutions.sort((a, b) => a - b);
  const medianAppealDays =
    appealResolutions.length > 0
      ? appealResolutions[Math.floor(appealResolutions.length / 2)]
      : null;

  /* Authorities. */
  const { data: incidents } = await admin
    .from("moderation_critical_incidents")
    .select(
      "incident_type, ncmec_submitted_at, pharos_submitted_at, created_at",
    )
    .gte("created_at", startIso)
    .lte("created_at", endIso);
  const csamIncidents = (incidents ?? []).filter(
    (i) => i.incident_type === "csam",
  ).length;
  const ncmecSubmissions = (incidents ?? []).filter(
    (i) => i.ncmec_submitted_at !== null,
  ).length;
  const pharosSubmissions = (incidents ?? []).filter(
    (i) => i.pharos_submitted_at !== null,
  ).length;

  const { count: legalRequestsCount } = await admin
    .from("legal_data_requests")
    .select("id", { count: "exact", head: true })
    .gte("received_at", startIso)
    .lte("received_at", endIso);

  /* Trusted flaggers. */
  const { data: flaggers } = await admin
    .from("trusted_flaggers")
    .select("is_active, precision_rate");
  const flaggersActive = (flaggers ?? []).filter((f) => f.is_active).length;
  const precisions = (flaggers ?? [])
    .map((f) => f.precision_rate)
    .filter((p): p is number => p !== null);
  const avgPrecision =
    precisions.length > 0
      ? precisions.reduce((a, c) => a + c, 0) / precisions.length
      : null;

  /* Timing : délai entre report.created_at et report.resolved_at. */
  const { data: resolved } = await admin
    .from("moderation_reports")
    .select("created_at, resolved_at")
    .gte("created_at", startIso)
    .lte("created_at", endIso)
    .not("resolved_at", "is", null);
  const resolutionHours = (resolved ?? [])
    .map((r) => {
      if (!r.resolved_at) return null;
      return (
        (new Date(r.resolved_at).getTime() - new Date(r.created_at).getTime()) /
        (1000 * 60 * 60)
      );
    })
    .filter((h): h is number => h !== null)
    .sort((a, b) => a - b);
  const medianResolutionHours =
    resolutionHours.length > 0
      ? resolutionHours[Math.floor(resolutionHours.length / 2)]
      : null;
  const p90ResolutionHours =
    resolutionHours.length > 0
      ? resolutionHours[Math.floor(resolutionHours.length * 0.9)]
      : null;

  return {
    period_start: startIso,
    period_end: endIso,
    generated_at: new Date().toISOString(),
    reports: {
      total: reports?.length ?? 0,
      by_category: reportsByCategory,
      median_priority: medianPriority,
      duplicates_rate: duplicatesRate,
    },
    actions: {
      total: actions?.length ?? 0,
      by_action: actionsByAction,
      by_category: actionsByCategory,
      automated_count: automatedCount,
      manual_count: manualCount,
    },
    appeals: {
      total: appeals?.length ?? 0,
      accepted: appealsAccepted,
      rejected: appealsRejected,
      pending: appealsPending,
      median_resolution_days: medianAppealDays ?? null,
    },
    authorities: {
      csam_incidents: csamIncidents,
      ncmec_submissions: ncmecSubmissions,
      pharos_submissions: pharosSubmissions,
      legal_data_requests: legalRequestsCount ?? 0,
    },
    trusted_flaggers: {
      total: flaggers?.length ?? 0,
      active: flaggersActive,
      avg_precision_rate: avgPrecision,
    },
    timing: {
      median_resolution_hours: medianResolutionHours,
      p90_resolution_hours: p90ResolutionHours,
    },
  };
}
