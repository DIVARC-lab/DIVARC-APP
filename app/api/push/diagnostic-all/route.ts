import { NextResponse } from "next/server";
import { sendPushToUsers } from "@/lib/push/sender";
import { createClient } from "@/lib/supabase/server";

/* GET /api/push/diagnostic-all
 * Teste l'envoi d'un push vers chaque autre membre de chaque conv de
 * l'user courant. Retourne un rapport par-conv :
 *  - convId, type (direct/group)
 *  - nb membres total
 *  - liste des targets avec : push_subs count, would_deliver, error
 *
 * Utile pour identifier précisément quelles convs ont des problèmes
 * (membre sans sub, sub stale, etc.). */

type ConvReport = {
  conversation_id: string;
  type: string;
  member_count: number;
  other_members: number;
  active_targets: number;
  targets: Array<{
    user_id: string;
    has_subs: number;
    delivery_status?: number | string;
    delivery_message?: string;
  }>;
  summary: string;
};

export async function GET() {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ ok: false, error: "Not authenticated" }, { status: 401 });
    }

    /* Toutes mes convs */
    const { data: myMemberships } = await supabase
      .from("conversation_members")
      .select("conversation_id")
      .eq("user_id", user.id);

    const convIds = (myMemberships ?? []).map((m) => m.conversation_id);
    if (convIds.length === 0) {
      return NextResponse.json({
        ok: true,
        user_id: user.id,
        message: "Tu n'es membre d'aucune conversation.",
      });
    }

    /* Tous les membres de toutes les convs */
    const { data: allMembers } = await supabase
      .from("conversation_members")
      .select("conversation_id, user_id, is_muted, mute_until")
      .in("conversation_id", convIds);

    /* Type de chaque conv */
    const { data: convs } = await supabase
      .from("conversations")
      .select("id, type, name")
      .in("id", convIds);
    const typeByConv = new Map<string, string>();
    const nameByConv = new Map<string, string | null>();
    for (const c of convs ?? []) {
      typeByConv.set(c.id, c.type);
      nameByConv.set(c.id, c.name);
    }

    /* Collecte tous les target user_ids (sauf self) */
    const allTargetIds = new Set<string>();
    for (const m of allMembers ?? []) {
      if (m.user_id !== user.id) allTargetIds.add(m.user_id);
    }

    /* Une seule RPC pour récupérer toutes les subs */
    const { data: allSubs } = await supabase.rpc("get_push_subs_for_users", {
      p_user_ids: Array.from(allTargetIds),
    });
    const subsCountByUser = new Map<string, number>();
    for (const s of (allSubs ?? []) as Array<{ user_id: string }>) {
      subsCountByUser.set(s.user_id, (subsCountByUser.get(s.user_id) ?? 0) + 1);
    }

    /* Pour chaque conv, génère le rapport */
    const now = Date.now();
    const reports: ConvReport[] = [];
    let totalConvs = 0;
    let convsWithIssue = 0;

    for (const convId of convIds) {
      const members = (allMembers ?? []).filter(
        (m) => m.conversation_id === convId,
      );
      const others = members.filter((m) => m.user_id !== user.id);
      const active = others.filter((m) => {
        if (!m.is_muted) return true;
        if (!m.mute_until) return false;
        return new Date(m.mute_until).getTime() <= now;
      });
      totalConvs++;

      const targets = others.map((m) => ({
        user_id: m.user_id,
        has_subs: subsCountByUser.get(m.user_id) ?? 0,
      }));

      const usersWithoutSub = active.filter(
        (m) => (subsCountByUser.get(m.user_id) ?? 0) === 0,
      );
      const usersWithSub = active.filter(
        (m) => (subsCountByUser.get(m.user_id) ?? 0) > 0,
      );

      let summary = "";
      if (active.length === 0) {
        summary = "ℹ️ Tous les membres ont muté cette conv";
      } else if (usersWithoutSub.length > 0 && usersWithSub.length === 0) {
        summary = `❌ Aucun membre actif n'a de push_subscription`;
        convsWithIssue++;
      } else if (usersWithoutSub.length > 0) {
        summary = `⚠️ ${usersWithoutSub.length}/${active.length} membres actifs n'ont pas activé push`;
        convsWithIssue++;
      } else {
        summary = `✅ Tous les ${active.length} membres actifs ont une sub`;
      }

      reports.push({
        conversation_id: convId,
        type: typeByConv.get(convId) ?? "?",
        member_count: members.length,
        other_members: others.length,
        active_targets: active.length,
        targets,
        summary,
      });
    }

    return NextResponse.json({
      ok: true,
      user_id: user.id,
      total_convs: totalConvs,
      convs_with_issue: convsWithIssue,
      global_summary:
        convsWithIssue === 0
          ? "✅ Toutes tes convs sont correctement configurées pour le push"
          : `⚠️ ${convsWithIssue}/${totalConvs} convs ont des membres sans push activé`,
      reports,
    });
  } catch (err) {
    return NextResponse.json(
      {
        ok: false,
        error: err instanceof Error ? err.message : String(err),
      },
      { status: 500 },
    );
  }
}
