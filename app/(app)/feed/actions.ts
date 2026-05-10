"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import {
  commentSchema,
  postFormSchema,
} from "@/lib/validations/post";
import {
  flattenZodErrors,
  type FieldErrors,
} from "@/lib/validations/profile";
import type { PostFormInput } from "@/lib/validations/post";

export type PostFormState = {
  status: "idle" | "success" | "error";
  message?: string;
  fieldErrors?: FieldErrors<PostFormInput>;
  postId?: string;
};

const photoSchema = z.array(
  z.object({
    url: z.string().url(),
    position: z.number().int().min(0),
  }),
);

const videoSchema = z.object({
  url: z.string().url(),
  thumbnail_url: z.string().url(),
  duration_ms: z.number().int().positive().max(65000),
  width: z.number().int().positive().nullable().optional(),
  height: z.number().int().positive().nullable().optional(),
});

export async function createPost(
  _prev: PostFormState | undefined,
  formData: FormData,
): Promise<PostFormState> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { status: "error", message: "Tu dois être connecté." };

  const parsed = postFormSchema.safeParse({
    body: formData.get("body"),
    visibility: formData.get("visibility"),
  });

  if (!parsed.success) {
    return {
      status: "error",
      message: "Vérifie les champs.",
      fieldErrors: flattenZodErrors(parsed.error),
    };
  }

  const photosRaw = formData.get("photos");
  let photos: { url: string; position: number }[] = [];
  if (typeof photosRaw === "string") {
    try {
      photos = photoSchema.parse(JSON.parse(photosRaw));
    } catch {
      photos = [];
    }
  }

  const videoRaw = formData.get("video");
  let video: z.infer<typeof videoSchema> | null = null;
  if (typeof videoRaw === "string" && videoRaw.length > 0) {
    try {
      video = videoSchema.parse(JSON.parse(videoRaw));
    } catch {
      video = null;
    }
  }

  /* Mode "pensée rapide" — background_color valide uniquement si :
     - texte ≤ 130 chars
     - aucun média attaché
     Sinon ignoré silencieusement (le client devrait aussi désactiver). */
  const bgRaw = formData.get("background_color");
  const allowedBackgrounds = [
    "navy",
    "gold",
    "cream",
    "gradient_dawn",
    "gradient_dusk",
    "gradient_ocean",
    "gradient_forest",
    "gradient_rose",
  ] as const;
  type AllowedBg = (typeof allowedBackgrounds)[number];
  const bgIsValid =
    typeof bgRaw === "string" &&
    (allowedBackgrounds as readonly string[]).includes(bgRaw);
  const bodyShort = (parsed.data.body ?? "").length <= 130;
  const noMedia = photos.length === 0 && !video;
  const backgroundColor: AllowedBg | null =
    bgIsValid && bodyShort && noMedia ? (bgRaw as AllowedBg) : null;

  /* Plugin Sentiment / Activité (mutuellement exclusifs). */
  const allowedActivityTypes = [
    "watching",
    "listening",
    "playing",
    "reading",
    "eating",
    "traveling",
    "celebrating",
    "feeling",
  ] as const;
  type AllowedActivity = (typeof allowedActivityTypes)[number];
  const sentimentEmoji = formData.get("sentiment_emoji");
  const sentimentLabel = formData.get("sentiment_label");
  const activityType = formData.get("activity_type");
  const activityDetail = formData.get("activity_detail");

  let normalizedSentimentEmoji: string | null = null;
  let normalizedSentimentLabel: string | null = null;
  let normalizedActivityType: AllowedActivity | null = null;
  let normalizedActivityDetail: string | null = null;

  if (
    typeof activityType === "string" &&
    (allowedActivityTypes as readonly string[]).includes(activityType)
  ) {
    normalizedActivityType = activityType as AllowedActivity;
    if (typeof activityDetail === "string" && activityDetail.trim().length > 0) {
      normalizedActivityDetail = activityDetail.trim().slice(0, 120);
    }
  } else if (
    typeof sentimentEmoji === "string" &&
    sentimentEmoji.length > 0 &&
    sentimentEmoji.length <= 8 &&
    typeof sentimentLabel === "string" &&
    sentimentLabel.trim().length > 0
  ) {
    normalizedSentimentEmoji = sentimentEmoji;
    normalizedSentimentLabel = sentimentLabel.trim().slice(0, 50);
  }

  /* Plugin "Lieu" — Mapbox places. Validation : nom requis + lat/lng
     dans la bonne plage. Si invalide, location ignorée silencieusement. */
  const locationName = formData.get("location_name");
  const locationCity = formData.get("location_city");
  const locationCountry = formData.get("location_country");
  const locationLat = formData.get("location_lat");
  const locationLng = formData.get("location_lng");
  let normalizedLocationName: string | null = null;
  let normalizedLocationCity: string | null = null;
  let normalizedLocationCountry: string | null = null;
  let normalizedLocationLat: number | null = null;
  let normalizedLocationLng: number | null = null;
  if (
    typeof locationName === "string" &&
    locationName.trim().length > 0 &&
    typeof locationLat === "string" &&
    typeof locationLng === "string"
  ) {
    const lat = Number(locationLat);
    const lng = Number(locationLng);
    if (
      Number.isFinite(lat) &&
      Number.isFinite(lng) &&
      lat >= -90 &&
      lat <= 90 &&
      lng >= -180 &&
      lng <= 180
    ) {
      normalizedLocationName = locationName.trim().slice(0, 200);
      normalizedLocationLat = lat;
      normalizedLocationLng = lng;
      if (typeof locationCity === "string" && locationCity.trim().length > 0) {
        normalizedLocationCity = locationCity.trim().slice(0, 120);
      }
      if (
        typeof locationCountry === "string" &&
        /^[A-Za-z]{2}$/.test(locationCountry)
      ) {
        normalizedLocationCountry = locationCountry.toUpperCase();
      }
    }
  }

  if (!parsed.data.body && photos.length === 0 && !video) {
    return {
      status: "error",
      message: "Écris quelque chose, ajoute une photo ou une vidéo.",
    };
  }

  const { data: post, error: insertError } = await supabase
    .from("posts")
    .insert({
      author_id: user.id,
      body: parsed.data.body,
      visibility: parsed.data.visibility,
      video_url: video?.url ?? null,
      video_thumbnail_url: video?.thumbnail_url ?? null,
      video_duration_ms: video?.duration_ms ?? null,
      video_width: video?.width ?? null,
      video_height: video?.height ?? null,
      background_color: backgroundColor,
      sentiment_emoji: normalizedSentimentEmoji,
      sentiment_label: normalizedSentimentLabel,
      activity_type: normalizedActivityType,
      activity_detail: normalizedActivityDetail,
      location_name: normalizedLocationName,
      location_city: normalizedLocationCity,
      location_country: normalizedLocationCountry,
      location_lat: normalizedLocationLat,
      location_lng: normalizedLocationLng,
    })
    .select("id")
    .single();

  if (insertError || !post) {
    return { status: "error", message: "Publication impossible. Réessaie." };
  }

  if (photos.length > 0) {
    const { error: photoError } = await supabase
      .from("post_photos")
      .insert(
        photos.map((photo, idx) => ({
          post_id: post.id,
          url: photo.url,
          position: photo.position ?? idx,
        })),
      );
    if (photoError) {
      await supabase.from("posts").delete().eq("id", post.id);
      return { status: "error", message: "Impossible d'attacher les photos." };
    }
  }

  /* Indexation embedding OpenAI — async, ne bloque pas le retour user.
     Si OPENAI_API_KEY absent ou erreur API, on no-op silencieusement
     (le post est publié, le ranker fallback sur les heuristiques sans
     cosine similarity). Le cron de backfill rattrapera les posts non
     embeddés. */
  void indexPostEmbedding(supabase, post.id, parsed.data.body ?? "");

  revalidatePath("/feed");
  return { status: "success", postId: post.id };
}

async function indexPostEmbedding(
  supabase: Awaited<ReturnType<typeof createClient>>,
  postId: string,
  body: string,
) {
  if (!body || body.length < 10) return;
  try {
    const { generateEmbedding } = await import("@/lib/openai/embeddings");
    const result = await generateEmbedding(body);
    if (!result) return;
    await supabase.from("content_embeddings").upsert(
      {
        post_id: postId,
        embedding: result.embedding,
        model: result.model,
        source_text: result.source_text,
        generated_at: new Date().toISOString(),
      },
      { onConflict: "post_id" },
    );
  } catch {
    /* Silent fail — le post est publié, l'indexation peut être rattrapée
       par le cron backfill. */
  }
}

export async function toggleBookmark(postId: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, bookmarked: false };

  const { data: existing } = await supabase
    .from("post_bookmarks")
    .select("post_id")
    .eq("user_id", user.id)
    .eq("post_id", postId)
    .maybeSingle();

  if (existing) {
    await supabase
      .from("post_bookmarks")
      .delete()
      .eq("user_id", user.id)
      .eq("post_id", postId);
    revalidatePath("/feed/saved");
    return { ok: true, bookmarked: false };
  }

  const { error } = await supabase
    .from("post_bookmarks")
    .insert({ user_id: user.id, post_id: postId });
  if (error) return { ok: false, bookmarked: false };

  revalidatePath("/feed/saved");
  return { ok: true, bookmarked: true };
}

export async function deletePost(postId: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false };

  await supabase
    .from("posts")
    .update({ deleted_at: new Date().toISOString() })
    .eq("id", postId)
    .eq("author_id", user.id);

  revalidatePath("/feed");
  return { ok: true };
}

export async function toggleLike(postId: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, liked: false };

  const { data: existing } = await supabase
    .from("post_likes")
    .select("post_id")
    .eq("post_id", postId)
    .eq("user_id", user.id)
    .maybeSingle();

  if (existing) {
    await supabase
      .from("post_likes")
      .delete()
      .eq("post_id", postId)
      .eq("user_id", user.id);
    revalidatePath(`/feed/${postId}`);
    return { ok: true, liked: false };
  }

  await supabase
    .from("post_likes")
    .insert({ post_id: postId, user_id: user.id });
  revalidatePath(`/feed/${postId}`);
  return { ok: true, liked: true };
}

export type CommentState = {
  status: "idle" | "success" | "error";
  message?: string;
};

export async function addComment(
  postId: string,
  _prev: CommentState | undefined,
  formData: FormData,
): Promise<CommentState> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { status: "error", message: "Non authentifié." };

  const parsed = commentSchema.safeParse({ body: formData.get("body") });
  if (!parsed.success) {
    return {
      status: "error",
      message: parsed.error.issues[0]?.message ?? "Commentaire invalide.",
    };
  }

  const { error } = await supabase.from("post_comments").insert({
    post_id: postId,
    author_id: user.id,
    body: parsed.data.body,
  });

  if (error) {
    return { status: "error", message: "Publication du commentaire impossible." };
  }

  revalidatePath(`/feed/${postId}`);
  return { status: "success" };
}

export async function deleteComment(commentId: string, postId: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false };

  await supabase
    .from("post_comments")
    .update({ deleted_at: new Date().toISOString() })
    .eq("id", commentId)
    .eq("author_id", user.id);

  revalidatePath(`/feed/${postId}`);
  return { ok: true };
}
