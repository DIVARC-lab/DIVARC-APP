"use server";

/* Server actions Composer V2 — Chantier Feed 2.5.
 *
 * createArticlePost : crée 1 post kind='article' avec title + body markdown.
 * createThreadPost  : crée N posts kind='thread' chaînés via thread_root_id +
 *                     thread_reply_to_id + thread_position.
 *
 * Validation Zod stricte + audience snapshot capturé au moment du post.
 */

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import type { PostVisibility } from "@/lib/database.types";

export type PostV2FormState = {
  status: "idle" | "success" | "error";
  postId?: string;
  error?: string;
};

const visibilityEnum = z.enum(["public", "friends", "private"]);

const articleSchema = z.object({
  title: z.string().trim().min(5).max(120),
  subtitle: z
    .string()
    .trim()
    .max(200)
    .optional()
    .transform((s) => (s && s.length > 0 ? s : undefined)),
  body: z.string().min(150).max(20000),
  visibility: visibilityEnum,
});

const threadSchema = z.object({
  cards: z.array(z.string().trim().min(1).max(500)).min(2).max(25),
  visibility: visibilityEnum,
});

const quoteSchema = z.object({
  body: z.string().trim().min(1).max(500),
  visibility: visibilityEnum,
  quoted_post_id: z.string().uuid(),
});

function audienceSnapshot(visibility: PostVisibility) {
  return {
    visibility,
    circle_id: null,
    audience_excluded: [],
  };
}

export async function createArticlePost(
  _prev: PostV2FormState | undefined,
  formData: FormData,
): Promise<PostV2FormState> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { status: "error", error: "Tu dois être connecté." };

  const parsed = articleSchema.safeParse({
    title: formData.get("title"),
    subtitle: formData.get("subtitle"),
    body: formData.get("body"),
    visibility: formData.get("visibility"),
  });

  if (!parsed.success) {
    const first = parsed.error.issues[0];
    return {
      status: "error",
      error: first?.message ?? "Champs invalides.",
    };
  }

  const { title, subtitle, body, visibility } = parsed.data;

  /* L'article a son titre/subtitle dans le body markdown pour rester
   * compatible avec le rendu PostCard existant. Header H1 + H2 italic. */
  const fullBody =
    `# ${title}\n` +
    (subtitle ? `_${subtitle}_\n\n` : "\n") +
    body;

  const { data: post, error } = await supabase
    .from("posts")
    .insert({
      author_id: user.id,
      body: fullBody,
      visibility,
      status: "published",
      post_kind: "article",
      audience_snapshot: audienceSnapshot(visibility),
    })
    .select("id")
    .single();

  if (error || !post) {
    return {
      status: "error",
      error: error?.message ?? "Erreur lors de la création de l'article.",
    };
  }

  revalidatePath("/feed");
  return { status: "success", postId: post.id };
}

export async function createThreadPost(
  _prev: PostV2FormState | undefined,
  formData: FormData,
): Promise<PostV2FormState> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { status: "error", error: "Tu dois être connecté." };

  const rawCards = formData.get("cards");
  if (typeof rawCards !== "string") {
    return { status: "error", error: "Cartes manquantes." };
  }

  let cards: unknown;
  try {
    cards = JSON.parse(rawCards);
  } catch {
    return { status: "error", error: "Format des cartes invalide." };
  }

  const parsed = threadSchema.safeParse({
    cards,
    visibility: formData.get("visibility"),
  });
  if (!parsed.success) {
    const first = parsed.error.issues[0];
    return {
      status: "error",
      error: first?.message ?? "Champs invalides.",
    };
  }

  const { cards: parsedCards, visibility } = parsed.data;
  const snapshot = audienceSnapshot(visibility);

  /* On crée le post racine d'abord, puis on chaîne les suivants. */
  const { data: rootPost, error: rootError } = await supabase
    .from("posts")
    .insert({
      author_id: user.id,
      body: parsedCards[0],
      visibility,
      status: "published",
      post_kind: "thread",
      thread_position: 0,
      audience_snapshot: snapshot,
    })
    .select("id")
    .single();

  if (rootError || !rootPost) {
    return {
      status: "error",
      error: rootError?.message ?? "Échec création thread (carte 1).",
    };
  }

  /* Le root pointe sur lui-même (thread_root_id = own id). On le met à jour. */
  await supabase
    .from("posts")
    .update({ thread_root_id: rootPost.id })
    .eq("id", rootPost.id);

  /* Cartes suivantes : chaînage via thread_reply_to_id = précédent. */
  let previousId = rootPost.id;
  for (let i = 1; i < parsedCards.length; i += 1) {
    const { data: next, error: nextError } = await supabase
      .from("posts")
      .insert({
        author_id: user.id,
        body: parsedCards[i],
        visibility,
        status: "published",
        post_kind: "thread",
        thread_root_id: rootPost.id,
        thread_reply_to_id: previousId,
        thread_position: i,
        audience_snapshot: snapshot,
      })
      .select("id")
      .single();

    if (nextError || !next) {
      /* On a déjà publié N posts. On les rollback pour éviter un thread cassé. */
      await supabase.from("posts").delete().eq("thread_root_id", rootPost.id);
      await supabase.from("posts").delete().eq("id", rootPost.id);
      return {
        status: "error",
        error:
          nextError?.message ??
          `Échec création thread (carte ${i + 1}). Tout a été annulé.`,
      };
    }
    previousId = next.id;
  }

  revalidatePath("/feed");
  return { status: "success", postId: rootPost.id };
}

/* Chantier Feed 4.4 — crée un post citant un autre post. */
export async function createQuotePost(
  _prev: PostV2FormState | undefined,
  formData: FormData,
): Promise<PostV2FormState> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { status: "error", error: "Tu dois être connecté." };

  const parsed = quoteSchema.safeParse({
    body: formData.get("body"),
    visibility: formData.get("visibility"),
    quoted_post_id: formData.get("quoted_post_id"),
  });
  if (!parsed.success) {
    const first = parsed.error.issues[0];
    return {
      status: "error",
      error: first?.message ?? "Champs invalides.",
    };
  }

  const { body, visibility, quoted_post_id } = parsed.data;

  /* Vérifie que le post cité existe et est visible (RLS gère). */
  const { data: quoted } = await supabase
    .from("posts")
    .select("id")
    .eq("id", quoted_post_id)
    .is("deleted_at", null)
    .maybeSingle();

  if (!quoted) {
    return { status: "error", error: "Post cité introuvable." };
  }

  const { data: post, error } = await supabase
    .from("posts")
    .insert({
      author_id: user.id,
      body,
      visibility,
      status: "published",
      post_kind: "standard",
      quoted_post_id,
      audience_snapshot: audienceSnapshot(visibility),
    })
    .select("id")
    .single();

  if (error || !post) {
    return {
      status: "error",
      error: error?.message ?? "Erreur lors de la publication.",
    };
  }

  revalidatePath("/feed");
  revalidatePath(`/feed/${quoted_post_id}`);
  return { status: "success", postId: post.id };
}
