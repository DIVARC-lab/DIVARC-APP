"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";

const createGroupSchema = z.object({
  name: z
    .string()
    .trim()
    .min(2, { message: "Au moins 2 caractères." })
    .max(80, { message: "80 caractères maximum." }),
  memberIds: z
    .array(z.string().uuid())
    .min(1, { message: "Choisis au moins un ami." })
    .max(50, { message: "50 membres maximum." }),
});

export type CreateGroupResult =
  | { ok: true; conversationId: string }
  | { ok: false; error: string };

export async function createGroup(
  name: string,
  memberIds: string[],
): Promise<CreateGroupResult> {
  const parsed = createGroupSchema.safeParse({ name, memberIds });
  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.issues[0]?.message ?? "Données invalides.",
    };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Non authentifié." };

  const { data, error } = await supabase.rpc("create_group_conversation", {
    group_name: parsed.data.name,
    member_ids: parsed.data.memberIds,
  });

  if (error || !data) {
    if (/friend/i.test(error?.message ?? "")) {
      return { ok: false, error: "Tous les membres doivent être tes amis." };
    }
    return { ok: false, error: "Création impossible. Réessaie." };
  }

  revalidatePath("/messages");
  return { ok: true, conversationId: data };
}

export async function leaveGroup(conversationId: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false };

  const { error } = await supabase.rpc("remove_group_member", {
    conv_id: conversationId,
    target_user_id: user.id,
  });

  if (error) return { ok: false };

  revalidatePath("/messages");
  redirect("/messages");
}

export async function removeMember(
  conversationId: string,
  targetUserId: string,
) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false };

  const { error } = await supabase.rpc("remove_group_member", {
    conv_id: conversationId,
    target_user_id: targetUserId,
  });

  if (error) return { ok: false };

  revalidatePath(`/messages/${conversationId}`);
  revalidatePath(`/messages/${conversationId}/settings`);
  return { ok: true };
}

export async function addMember(conversationId: string, userId: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false };

  const { error } = await supabase.rpc("add_group_member", {
    conv_id: conversationId,
    new_member_id: userId,
  });

  if (error) {
    if (/friend/i.test(error.message)) {
      return { ok: false, error: "Cet utilisateur doit d'abord être ton ami." };
    }
    return { ok: false, error: "Ajout impossible." };
  }

  revalidatePath(`/messages/${conversationId}`);
  revalidatePath(`/messages/${conversationId}/settings`);
  return { ok: true };
}

export async function renameGroup(conversationId: string, name: string) {
  const trimmed = name.trim();
  if (trimmed.length < 2 || trimmed.length > 80) {
    return { ok: false, error: "Nom invalide." };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false };

  const { error } = await supabase.rpc("update_group_info", {
    conv_id: conversationId,
    new_name: trimmed,
  });

  if (error) return { ok: false, error: "Renommage impossible." };

  revalidatePath(`/messages/${conversationId}`);
  revalidatePath(`/messages/${conversationId}/settings`);
  return { ok: true };
}
