/* lib/bots/handlers.ts — Handlers par action_kind.
 *
 * Chaque handler implémente une action que les bots peuvent exécuter :
 *  - post_chat_message : poste dans le chat cercle (via bot_post_chat_message RPC)
 *  - send_dm          : V2 (nécessite système DM cross-user)
 *  - add_tag          : V2 (nécessite système de tags posts)
 *  - hide_content     : soft-delete d'un post/chat message (modération)
 *  - flag_for_review  : crée une entrée dans circle_moderation_actions
 *  - create_post      : crée un post dans le cercle (digest, reminder)
 *  - mention_role     : V2 (nécessite notifs cross-roles)
 *  - webhook          : V2 (POST HTTP outbound)
 *
 * Les handlers reçoivent le contexte (event qui a déclenché) + params
 * (config de l'action) et exécutent leur tâche. Les erreurs throw
 * remontent à l'engine qui log dans circle_bot_executions. */

import type { SupabaseClient } from "@supabase/supabase-js";
import type { ExecutionContext } from "./engine";

/* eslint-disable @typescript-eslint/no-explicit-any */
type SupabaseAny = SupabaseClient<any, any, any>;

export type HandlerArgs = {
  bot_id: string;
  bot_name: string;
  circle_id: string;
  action_kind: string;
  params: Record<string, unknown>;
  context: ExecutionContext;
};

/* Résout les variables {{name}}, {{circle}}, {{user}} dans un template.
 * Variables supportées :
 *   {{name}}        → nom de l'user (context.user_full_name)
 *   {{username}}    → username de l'user
 *   {{circle}}      → nom du cercle (context.circle_name)
 *   {{date}}        → date courante FR
 *   {{time}}        → time courant FR */
export function renderTemplate(
  template: string,
  context: ExecutionContext,
): string {
  const vars: Record<string, string> = {
    name:
      (context.user_full_name as string | undefined) ??
      (context.user_username as string | undefined) ??
      "Membre",
    username: (context.user_username as string | undefined) ?? "",
    circle: (context.circle_name as string | undefined) ?? "ce cercle",
    date: new Date().toLocaleDateString("fr-FR"),
    time: new Date().toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" }),
  };
  return template.replace(/\{\{(\w+)\}\}/g, (match, key) => vars[key] ?? match);
}

/* === post_chat_message === */
async function handlePostChatMessage(
  supabase: SupabaseAny,
  args: HandlerArgs,
): Promise<void> {
  const template = args.params.template;
  if (typeof template !== "string" || template.length === 0) {
    throw new Error("post_chat_message: missing template");
  }
  const body = renderTemplate(template, args.context).slice(0, 4000);

  const { error } = await supabase.rpc("bot_post_chat_message", {
    p_bot_id: args.bot_id,
    p_circle_id: args.circle_id,
    p_body: body,
  });
  if (error) {
    throw new Error(`bot_post_chat_message RPC: ${error.message}`);
  }
}

/* === create_post (post avec circle_id, author = bot's created_by) === */
async function handleCreatePost(
  supabase: SupabaseAny,
  args: HandlerArgs,
): Promise<void> {
  const template = args.params.template;
  if (typeof template !== "string" || template.length === 0) {
    throw new Error("create_post: missing template");
  }
  const body = renderTemplate(template, args.context).slice(0, 8000);

  /* On retrouve created_by du bot pour l'attribuer comme author. */
  const { data: bot } = await supabase
    .from("circle_bots")
    .select("created_by")
    .eq("id", args.bot_id)
    .maybeSingle();

  if (!bot?.created_by) {
    throw new Error("create_post: bot creator unknown");
  }

  const { error } = await supabase.from("posts").insert({
    circle_id: args.circle_id,
    author_id: bot.created_by,
    body,
    visibility: "members",
    status: "published",
  });
  if (error) {
    throw new Error(`create_post insert: ${error.message}`);
  }
}

/* === hide_content === Soft-delete un chat message ou post via context. */
async function handleHideContent(
  supabase: SupabaseAny,
  args: HandlerArgs,
): Promise<void> {
  const chatMessageId = args.context.chat_message_id as string | undefined;
  const postId = args.context.post_id as string | undefined;

  if (chatMessageId) {
    const { error } = await supabase
      .from("circle_chat_messages")
      .update({ deleted_at: new Date().toISOString() })
      .eq("id", chatMessageId);
    if (error) {
      throw new Error(`hide_content chat: ${error.message}`);
    }
    return;
  }
  if (postId) {
    const { error } = await supabase
      .from("posts")
      .update({ deleted_at: new Date().toISOString() })
      .eq("id", postId);
    if (error) {
      throw new Error(`hide_content post: ${error.message}`);
    }
    return;
  }
  throw new Error("hide_content: no target (chat_message_id or post_id) in context");
}

/* === flag_for_review === Crée entrée dans circle_moderation_actions. */
async function handleFlagForReview(
  supabase: SupabaseAny,
  args: HandlerArgs,
): Promise<void> {
  const reason = (args.params.reason as string | undefined) ?? "auto_flag_by_bot";
  const targetUserId = args.context.user_id as string | undefined;
  const chatMessageId = args.context.chat_message_id as string | undefined;
  const postId = args.context.post_id as string | undefined;

  const { error } = await supabase.from("circle_moderation_actions").insert({
    circle_id: args.circle_id,
    /* actor_id null pour signaler "automatique par bot". Si la
       colonne exige NOT NULL, on retombera sur created_by du bot. */
    actor_id: null,
    action_type: "auto_flag",
    target_user_id: targetUserId ?? null,
    target_post_id: postId ?? null,
    target_message_id: chatMessageId ?? null,
    reason,
    metadata: {
      bot_id: args.bot_id,
      bot_name: args.bot_name,
      bot_action: "flag_for_review",
    },
  });
  if (error) {
    /* Si la table circle_moderation_actions a une structure différente,
       on échoue silencieusement (V2 : refacto pour matcher schéma). */
    throw new Error(`flag_for_review insert: ${error.message}`);
  }
}

/* === send_dm === V2 (requires DM system across users). */
async function handleSendDM(): Promise<void> {
  throw new Error("send_dm: not implemented in V1");
}

/* === add_tag === V2. */
async function handleAddTag(): Promise<void> {
  throw new Error("add_tag: not implemented in V1");
}

/* === mention_role === V2. */
async function handleMentionRole(): Promise<void> {
  throw new Error("mention_role: not implemented in V1");
}

/* === webhook === V2 (outbound HTTP). */
async function handleWebhook(): Promise<void> {
  throw new Error("webhook: not implemented in V1");
}

/* Dispatch table */
export async function runActionHandler(
  supabase: SupabaseAny,
  args: HandlerArgs,
): Promise<void> {
  switch (args.action_kind) {
    case "post_chat_message":
      return handlePostChatMessage(supabase, args);
    case "create_post":
      return handleCreatePost(supabase, args);
    case "hide_content":
      return handleHideContent(supabase, args);
    case "flag_for_review":
      return handleFlagForReview(supabase, args);
    case "send_dm":
      return handleSendDM();
    case "add_tag":
      return handleAddTag();
    case "mention_role":
      return handleMentionRole();
    case "webhook":
      return handleWebhook();
    default:
      throw new Error(`unknown action_kind: ${args.action_kind}`);
  }
}
