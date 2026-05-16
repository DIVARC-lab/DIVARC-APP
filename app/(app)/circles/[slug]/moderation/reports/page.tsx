/* Sprint J — File de modération des signalements (admin only). */

import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { AlertTriangle, Flag } from "lucide-react";
import { Avatar } from "@/components/ui/Avatar";
import { createClient } from "@/lib/supabase/server";
import { getCircleBySlug } from "@/lib/queries/circles";
import { ReportRow } from "../../_components/ReportRow";

type Params = Promise<{ slug: string }>;

export const metadata = { title: "Signalements" };

const REASON_LABELS: Record<string, string> = {
  spam: "Spam",
  harassment: "Harcèlement",
  hate_speech: "Discours haineux",
  nsfw: "Contenu sensible",
  misinfo: "Désinformation",
  self_harm: "Automutilation",
  other: "Autre",
};

export default async function CircleReportsPage({
  params,
}: {
  params: Params;
}) {
  const { slug } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect(`/login?next=/circles/${slug}/moderation/reports`);

  const circle = await getCircleBySlug(slug, user.id);
  if (!circle) notFound();

  const isAdmin =
    circle.my_role === "owner" || circle.my_role === "admin";
  if (!isAdmin) redirect(`/circles/${slug}`);

  /* eslint-disable-next-line @typescript-eslint/no-explicit-any */
  const { data: reports } = await (supabase as any)
    .from("circle_reports")
    .select(
      "id, target_kind, target_id, reason, note, status, reporter_id, created_at, resolved_at, resolution_kind",
    )
    .eq("circle_id", circle.id)
    .order("created_at", { ascending: false })
    .limit(100);

  const list = (reports ?? []) as Array<{
    id: string;
    target_kind: "post" | "comment" | "chat_message" | "member";
    target_id: string;
    reason: keyof typeof REASON_LABELS;
    note: string | null;
    status: "open" | "in_review" | "resolved" | "dismissed";
    reporter_id: string;
    created_at: string;
    resolved_at: string | null;
    resolution_kind: string | null;
  }>;

  /* Hydrate reporters profiles. */
  const reporterIds = Array.from(new Set(list.map((r) => r.reporter_id)));
  const { data: profiles } =
    reporterIds.length > 0
      ? await supabase
          .from("profiles")
          .select("id, full_name, username, avatar_url")
          .in("id", reporterIds)
      : { data: [] as Array<{ id: string; full_name: string | null; username: string | null; avatar_url: string | null }> };
  const reporterMap = new Map(
    ((profiles ?? []) as Array<{
      id: string;
      full_name: string | null;
      username: string | null;
      avatar_url: string | null;
    }>).map((p) => [p.id, p]),
  );

  const openCount = list.filter((r) =>
    ["open", "in_review"].includes(r.status),
  ).length;

  return (
    <div className="p-4 sm:p-6 max-w-3xl mx-auto">
      <header className="mb-5 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Flag className="w-4 h-4 text-rose-600" aria-hidden />
          <h1 className="text-[15px] sm:text-[17px] font-bold text-night">
            Signalements
          </h1>
          {openCount > 0 ? (
            <span className="inline-flex items-center h-5 px-2 rounded-full bg-rose-50 border border-rose-200 text-[10.5px] font-bold text-rose-700">
              {openCount} à traiter
            </span>
          ) : null}
        </div>
        <Link
          href={`/circles/${slug}/moderation`}
          className="text-[12px] text-night-dim hover:text-night transition-colors"
        >
          ← Modération
        </Link>
      </header>

      {list.length === 0 ? (
        <div className="rounded-2xl bg-white border border-line border-dashed p-8 text-center">
          <AlertTriangle
            className="w-8 h-8 text-night-dim/40 mx-auto mb-2"
            aria-hidden
          />
          <p className="text-[13px] text-night-dim">
            Aucun signalement pour l&apos;instant. 🎉
          </p>
        </div>
      ) : (
        <ul className="space-y-2">
          {list.map((r) => (
            <ReportRow
              key={r.id}
              report={r}
              reasonLabel={REASON_LABELS[r.reason] ?? r.reason}
              reporter={reporterMap.get(r.reporter_id) ?? null}
              circleSlug={slug}
            />
          ))}
        </ul>
      )}
    </div>
  );
}
