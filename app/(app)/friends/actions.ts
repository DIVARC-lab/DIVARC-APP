"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { sendPushToUser } from "@/lib/push/sender";
import { createClient } from "@/lib/supabase/server";

const sendRequestSchema = z.object({
  recipientId: z.string().uuid(),
  intro: z
    .string()
    .trim()
    .max(280)
    .optional()
    .transform((v) => (v && v.length > 0 ? v : null)),
});

export type FriendActionResult = {
  ok: boolean;
  error?: string;
};

export async function sendFriendRequest(
  recipientId: string,
  intro?: string,
): Promise<FriendActionResult> {
  const parsed = sendRequestSchema.safeParse({ recipientId, intro });
  if (!parsed.success) return { ok: false, error: "Données invalides." };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Non authentifié." };

  const { error } = await supabase.rpc("send_friend_request", {
    recipient_user_id: parsed.data.recipientId,
    intro: parsed.data.intro ?? undefined,
  });

  if (error) {
    if (/discoverable/i.test(error.message)) {
      return {
        ok: false,
        error: "Cet utilisateur n'apparaît pas dans la recherche.",
      };
    }
    if (/yourself/i.test(error.message)) {
      return { ok: false, error: "Tu ne peux pas t'ajouter toi-même." };
    }
    return { ok: false, error: "Demande impossible. Réessaie." };
  }

  /* Push notif au recipient — best-effort, ne bloque jamais l'action.
     L'in-app notif est gérée par le trigger Postgres notify_friend_request_received. */
  const { data: requesterProfile } = await supabase
    .from("profiles")
    .select("full_name, username")
    .eq("id", user.id)
    .maybeSingle();
  const requesterName =
    requesterProfile?.full_name ?? requesterProfile?.username ?? "Quelqu'un";
  void sendPushToUser(parsed.data.recipientId, {
    title: `${requesterName} veut être ton ami`,
    body: parsed.data.intro ?? "Accepter pour pouvoir discuter ensemble.",
    url: "/friends?tab=recues",
    tag: `friend-req-${user.id}`,
  });

  revalidatePath("/friends");
  revalidatePath("/messages");
  return { ok: true };
}

export async function acceptFriendRequest(
  friendshipId: string,
): Promise<FriendActionResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Non authentifié." };

  const { data: friendship, error } = await supabase
    .from("friendships")
    .update({ status: "accepted" })
    .eq("id", friendshipId)
    .eq("recipient_id", user.id)
    .eq("status", "pending")
    .select("requester_id")
    .single();

  if (error || !friendship) return { ok: false, error: "Acceptation impossible." };

  /* Push au requester originel pour lui dire que c'est accepté. */
  const { data: acceptorProfile } = await supabase
    .from("profiles")
    .select("full_name, username")
    .eq("id", user.id)
    .maybeSingle();
  const acceptorName =
    acceptorProfile?.full_name ?? acceptorProfile?.username ?? "Quelqu'un";
  void sendPushToUser(friendship.requester_id, {
    title: `${acceptorName} a accepté ta demande`,
    body: "Vous pouvez maintenant discuter ensemble.",
    url: "/friends?tab=amis",
    tag: `friend-accepted-${user.id}`,
  });

  revalidatePath("/friends");
  revalidatePath("/messages");
  return { ok: true };
}

export async function rejectFriendRequest(
  friendshipId: string,
): Promise<FriendActionResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Non authentifié." };

  const { error } = await supabase
    .from("friendships")
    .update({ status: "rejected" })
    .eq("id", friendshipId)
    .eq("recipient_id", user.id)
    .eq("status", "pending");

  if (error) return { ok: false, error: "Refus impossible." };

  revalidatePath("/friends");
  return { ok: true };
}

export async function cancelFriendRequest(
  friendshipId: string,
): Promise<FriendActionResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Non authentifié." };

  const { error } = await supabase
    .from("friendships")
    .update({ status: "cancelled" })
    .eq("id", friendshipId)
    .eq("requester_id", user.id)
    .eq("status", "pending");

  if (error) return { ok: false, error: "Annulation impossible." };

  revalidatePath("/friends");
  return { ok: true };
}

export async function removeFriend(
  friendshipId: string,
): Promise<FriendActionResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Non authentifié." };

  const { error } = await supabase
    .from("friendships")
    .delete()
    .eq("id", friendshipId)
    .eq("status", "accepted");

  if (error) return { ok: false, error: "Suppression impossible." };

  revalidatePath("/friends");
  revalidatePath("/messages");
  return { ok: true };
}
