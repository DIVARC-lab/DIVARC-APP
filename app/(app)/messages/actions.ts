"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";

const messageSchema = z.object({
  conversationId: z.string().uuid(),
  body: z.string().trim().min(1).max(4000),
});

export type SendMessageState = {
  status: "idle" | "success" | "error";
  message?: string;
};

export async function sendMessage(
  _prev: SendMessageState | undefined,
  formData: FormData,
): Promise<SendMessageState> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { status: "error", message: "Non authentifié." };

  const parsed = messageSchema.safeParse({
    conversationId: formData.get("conversationId"),
    body: formData.get("body"),
  });

  if (!parsed.success) {
    return { status: "error", message: "Message invalide." };
  }

  const { conversationId, body } = parsed.data;

  const { error } = await supabase.from("messages").insert({
    conversation_id: conversationId,
    sender_id: user.id,
    body,
  });

  if (error) {
    return { status: "error", message: "Échec de l'envoi." };
  }

  revalidatePath(`/messages/${conversationId}`);
  revalidatePath("/messages");

  return { status: "success" };
}

export async function startDirectConversation(otherUserId: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  if (otherUserId === user.id) {
    return { error: "Tu ne peux pas démarrer une conversation avec toi-même." };
  }

  const { data, error } = await supabase.rpc(
    "get_or_create_direct_conversation",
    { other_user_id: otherUserId },
  );

  if (error || !data) {
    return { error: "Impossible d'ouvrir la conversation." };
  }

  revalidatePath("/messages");
  redirect(`/messages/${data}`);
}

export async function markConversationRead(conversationId: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return;

  await supabase.rpc("mark_conversation_read", { conv_id: conversationId });
  revalidatePath("/messages");
}
