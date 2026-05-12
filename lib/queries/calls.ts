import "server-only";
import { createClient } from "@/lib/supabase/server";
import type { CallRow, CallStatus, CallKind } from "@/lib/calls/types";

/* Item enrichi de la liste des appels : ajoute le profil de l'autre
 * partie (par rapport à l'utilisateur courant) + un flag pratique
 * is_outgoing (caller == me). */
export type CallListItem = {
  id: string;
  conversation_id: string;
  status: CallStatus;
  kind: CallKind;
  started_at: string;
  connected_at: string | null;
  ended_at: string | null;
  duration_ms: number | null;
  end_reason: string | null;
  is_outgoing: boolean;
  /* Profil de l'autre partie (peer). */
  peer: {
    user_id: string;
    full_name: string | null;
    username: string | null;
    avatar_url: string | null;
  } | null;
  /* True si appel manqué côté callee (status='missed' && callee=me) OU
     côté caller (status='missed' && caller=me, càd "pas de réponse"). */
  is_missed: boolean;
};

/* Liste les N derniers appels où l'utilisateur courant est caller OU
 * callee, triés par started_at desc. Inclut le profil de l'autre partie. */
export async function listRecentCallsForUser(
  userId: string,
  limit: number = 50,
): Promise<CallListItem[]> {
  const supabase = await createClient();

  const { data: calls, error } = await supabase
    .from("call_sessions")
    .select("*")
    .or(`caller_id.eq.${userId},callee_id.eq.${userId}`)
    .order("started_at", { ascending: false })
    .limit(limit);

  if (error || !calls || calls.length === 0) return [];

  /* Collecte tous les peer user_ids (l'autre partie). */
  const peerIds = new Set<string>();
  for (const c of calls as CallRow[]) {
    const peer = c.caller_id === userId ? c.callee_id : c.caller_id;
    peerIds.add(peer);
  }

  const { data: profiles } = await supabase
    .from("profiles")
    .select("id, full_name, username, avatar_url")
    .in("id", Array.from(peerIds));

  const profileMap = new Map<string, {
    user_id: string;
    full_name: string | null;
    username: string | null;
    avatar_url: string | null;
  }>();
  for (const p of profiles ?? []) {
    profileMap.set(p.id, {
      user_id: p.id,
      full_name: p.full_name,
      username: p.username,
      avatar_url: p.avatar_url,
    });
  }

  return (calls as CallRow[]).map((c) => {
    const peerId = c.caller_id === userId ? c.callee_id : c.caller_id;
    const isOutgoing = c.caller_id === userId;
    return {
      id: c.id,
      conversation_id: c.conversation_id,
      status: c.status,
      kind: c.kind,
      started_at: c.started_at,
      connected_at: c.connected_at,
      ended_at: c.ended_at,
      duration_ms: c.duration_ms,
      end_reason: c.end_reason,
      is_outgoing: isOutgoing,
      peer: profileMap.get(peerId) ?? null,
      is_missed: c.status === "missed",
    };
  });
}

/* Liste les appels d'une conversation spécifique (pour affichage dans
 * le thread comme messages système). */
export async function listCallsForConversation(
  conversationId: string,
  limit: number = 100,
): Promise<CallListItem[]> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return [];

  const { data: calls, error } = await supabase
    .from("call_sessions")
    .select("*")
    .eq("conversation_id", conversationId)
    .order("started_at", { ascending: false })
    .limit(limit);

  if (error || !calls) return [];

  return (calls as CallRow[]).map((c) => ({
    id: c.id,
    conversation_id: c.conversation_id,
    status: c.status,
    kind: c.kind,
    started_at: c.started_at,
    connected_at: c.connected_at,
    ended_at: c.ended_at,
    duration_ms: c.duration_ms,
    end_reason: c.end_reason,
    is_outgoing: c.caller_id === user.id,
    peer: null, // pas besoin dans le thread
    is_missed: c.status === "missed",
  }));
}

/* Compte les appels manqués non vus par l'utilisateur. V1 : on retourne
 * juste le count total des status='missed' où user=callee. Pas de notion
 * de "viewed" V1 (on pourra ajouter une colonne is_seen_by_callee). */
export async function countMissedCallsForUser(
  userId: string,
): Promise<number> {
  const supabase = await createClient();
  const { count, error } = await supabase
    .from("call_sessions")
    .select("id", { count: "exact", head: true })
    .eq("callee_id", userId)
    .eq("status", "missed");
  if (error) return 0;
  return count ?? 0;
}

