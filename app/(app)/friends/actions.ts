"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
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

  const { error } = await supabase
    .from("friendships")
    .update({ status: "accepted" })
    .eq("id", friendshipId)
    .eq("recipient_id", user.id)
    .eq("status", "pending");

  if (error) return { ok: false, error: "Acceptation impossible." };

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
