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
    /* Dimensions natives pour rendu non-croppé côté feed (lues côté
     * client via image.naturalWidth/Height au moment de l'upload). */
    width: z.number().int().positive().nullable().optional(),
    height: z.number().int().positive().nullable().optional(),
    aspect_ratio: z.string().min(1).max(20).nullable().optional(),
  }),
);

/* V3 Carrousel : chaque slide a sa propre caption + CTA. */
const carouselSchema = z.array(
  z.object({
    position: z.number().int().min(0),
    media_url: z.string().url(),
    media_type: z.enum(["image", "video"]),
    caption: z.string().max(280).optional(),
    cta_label: z.string().max(40).optional(),
    cta_url: z.string().url().optional(),
  }),
).min(2).max(10);

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
  let photos: z.infer<typeof photoSchema> = [];
  if (typeof photosRaw === "string") {
    try {
      photos = photoSchema.parse(JSON.parse(photosRaw));
    } catch {
      photos = [];
    }
  }

  /* V3 Carousel — payload "carousel_slides" : array de slides avec caption
     + CTA. Mutuellement exclusif avec photos[] : si carousel_slides est
     présent, on ignore photos. */
  const carouselRaw = formData.get("carousel_slides");
  let carouselSlides: z.infer<typeof carouselSchema> | null = null;
  if (typeof carouselRaw === "string" && carouselRaw.length > 0) {
    try {
      carouselSlides = carouselSchema.parse(JSON.parse(carouselRaw));
      /* Normalize : trim caption + CTA, drop empty cta. */
      carouselSlides = carouselSlides.map((s) => {
        const caption = s.caption?.trim();
        const ctaLabel = s.cta_label?.trim();
        const ctaUrl = s.cta_url?.trim();
        const hasCta = ctaLabel && ctaUrl;
        return {
          ...s,
          caption: caption && caption.length > 0 ? caption : undefined,
          cta_label: hasCta ? ctaLabel : undefined,
          cta_url: hasCta ? ctaUrl : undefined,
        };
      });
    } catch {
      carouselSlides = null;
    }
  }
  const isCarousel = carouselSlides !== null && carouselSlides.length >= 2;

  /* Plugin Tag amis : CSV d'UUIDs validés. */
  const tagsRaw = formData.get("tagged_user_ids");
  let taggedUserIds: string[] = [];
  if (typeof tagsRaw === "string" && tagsRaw.length > 0) {
    const uuidRe =
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    taggedUserIds = tagsRaw
      .split(",")
      .map((s) => s.trim())
      .filter((s) => uuidRe.test(s))
      .slice(0, 30);
  }

  /* Plugin "Programmer" : datetime ISO. Si > now() + 5min on bascule
     status='scheduled', sinon ignoré (publication immédiate). */
  const scheduledForRaw = formData.get("scheduled_for");
  let scheduledFor: string | null = null;
  let postStatus: "published" | "scheduled" = "published";
  if (typeof scheduledForRaw === "string" && scheduledForRaw.length > 0) {
    const ms = new Date(scheduledForRaw).getTime();
    if (Number.isFinite(ms) && ms > Date.now() + 5 * 60 * 1000) {
      scheduledFor = new Date(ms).toISOString();
      postStatus = "scheduled";
    }
  }

  /* Plugin Link preview : payload JSON validé. */
  const linkPreviewSchema = z.object({
    url: z.string().url(),
    title: z.string().nullable().optional(),
    description: z.string().nullable().optional(),
    image_url: z.string().url().nullable().optional(),
    site_name: z.string().nullable().optional(),
    fetched_at: z.string(),
  });
  const linkPreviewRaw = formData.get("link_preview");
  let linkPreview: z.infer<typeof linkPreviewSchema> | null = null;
  if (typeof linkPreviewRaw === "string" && linkPreviewRaw.length > 0) {
    try {
      linkPreview = linkPreviewSchema.parse(JSON.parse(linkPreviewRaw));
    } catch {
      linkPreview = null;
    }
  }

  /* Plugin Sondage : payload JSON validé via Zod. */
  const pollSchema = z.object({
    question: z.string().min(1).max(200),
    options: z.array(z.string().min(1).max(80)).min(2).max(6),
    duration: z.enum(["1h", "6h", "24h", "3d", "7d", "unlimited"]),
    multiChoice: z.boolean(),
    isAnonymous: z.boolean(),
  });
  const pollRaw = formData.get("poll");
  let poll: z.infer<typeof pollSchema> | null = null;
  if (typeof pollRaw === "string" && pollRaw.length > 0) {
    try {
      poll = pollSchema.parse(JSON.parse(pollRaw));
      /* Dédup options (déjà vérifié côté client mais belt-and-suspenders). */
      const seen = new Set<string>();
      poll.options = poll.options.filter((o) => {
        const norm = o.trim();
        if (seen.has(norm)) return false;
        seen.add(norm);
        return true;
      });
      if (poll.options.length < 2) poll = null;
    } catch {
      poll = null;
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
  const noMedia = photos.length === 0 && !video && !isCarousel;
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

  if (!parsed.data.body && photos.length === 0 && !video && !isCarousel) {
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
      link_preview: linkPreview
        ? {
            url: linkPreview.url,
            title: linkPreview.title ?? undefined,
            description: linkPreview.description ?? undefined,
            image_url: linkPreview.image_url ?? undefined,
            site_name: linkPreview.site_name ?? undefined,
            fetched_at: linkPreview.fetched_at,
          }
        : null,
      scheduled_for: scheduledFor,
      status: postStatus,
      /* Si scheduled, published_at = scheduled_for (le cron mettra à
         jour status quand l'heure est passée). Si publication immédiate,
         published_at = now() via default. */
      published_at: postStatus === "scheduled" ? scheduledFor : undefined,
      is_carousel: isCarousel,
      carousel_slides: isCarousel ? carouselSlides : null,
    })
    .select("id")
    .single();

  if (insertError || !post) {
    return { status: "error", message: "Publication impossible. Réessaie." };
  }

  /* En mode carrousel, les médias sont dans posts.carousel_slides (jsonb)
     et on n'insère rien dans post_photos. */
  if (!isCarousel && photos.length > 0) {
    const { error: photoError } = await supabase
      .from("post_photos")
      .insert(
        photos.map((photo, idx) => ({
          post_id: post.id,
          url: photo.url,
          position: photo.position ?? idx,
          /* Dimensions natives — utilisées par PostPhotos.tsx pour rendre
           * l'image dans son aspect ratio réel (pas crop). */
          width: photo.width ?? null,
          height: photo.height ?? null,
          aspect_ratio: photo.aspect_ratio ?? null,
        })),
      );
    if (photoError) {
      await supabase.from("posts").delete().eq("id", post.id);
      return { status: "error", message: "Impossible d'attacher les photos." };
    }
  }

  /* Plugin Tag amis : insert dans post_tagged_users.
     Non-bloquant : si l'insertion échoue, le post reste créé.
     Tagged_user_ids déjà validés UUID. */
  if (taggedUserIds.length > 0) {
    const { error: tagsError } = await supabase
      .from("post_tagged_users")
      .insert(taggedUserIds.map((uid) => ({ post_id: post.id, user_id: uid })));
    if (tagsError) {
      console.warn("[posts:createPost:tags]", tagsError);
    }
  }

  /* Plugin Sondage : insert post_polls + post_poll_options.
     Bloquant si ça échoue (l'user attend explicitement le sondage),
     on rollback le post. */
  if (poll) {
    const endsAtMs: Record<typeof poll.duration, number | null> = {
      "1h": 60 * 60 * 1000,
      "6h": 6 * 60 * 60 * 1000,
      "24h": 24 * 60 * 60 * 1000,
      "3d": 3 * 24 * 60 * 60 * 1000,
      "7d": 7 * 24 * 60 * 60 * 1000,
      unlimited: null,
    };
    const duration = endsAtMs[poll.duration];
    const endsAt =
      duration === null ? null : new Date(Date.now() + duration).toISOString();

    const { data: pollRow, error: pollError } = await supabase
      .from("post_polls")
      .insert({
        post_id: post.id,
        question: poll.question,
        multi_choice: poll.multiChoice,
        is_anonymous: poll.isAnonymous,
        ends_at: endsAt,
      })
      .select("id")
      .single();

    if (pollError || !pollRow) {
      await supabase.from("posts").delete().eq("id", post.id);
      console.warn("[posts:createPost:poll]", pollError);
      return { status: "error", message: "Création du sondage impossible." };
    }

    const { error: optionsError } = await supabase
      .from("post_poll_options")
      .insert(
        poll.options.map((label, idx) => ({
          poll_id: pollRow.id,
          position: idx,
          label,
        })),
      );
    if (optionsError) {
      await supabase.from("posts").delete().eq("id", post.id);
      console.warn("[posts:createPost:poll-options]", optionsError);
      return {
        status: "error",
        message: "Création des options de sondage impossible.",
      };
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

/* Plugin Sondage : voter (toggle). Multi-choice = empile. Single =
   remplace le vote précédent. */
export async function togglePollVote(args: {
  pollId: string;
  optionId: string;
}): Promise<{ ok: true } | { ok: false; error: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Non authentifié." };

  /* Récupère le poll pour savoir s'il est multi-choice + s'il est encore
     ouvert. */
  const { data: poll } = await supabase
    .from("post_polls")
    .select("id, post_id, multi_choice, ends_at")
    .eq("id", args.pollId)
    .maybeSingle();
  if (!poll) return { ok: false, error: "Sondage introuvable." };
  if (poll.ends_at && new Date(poll.ends_at).getTime() <= Date.now()) {
    return { ok: false, error: "Sondage clôturé." };
  }

  /* Check si l'user a déjà voté pour cette option. */
  const { data: existing } = await supabase
    .from("post_poll_votes")
    .select("option_id")
    .eq("poll_id", args.pollId)
    .eq("user_id", user.id);

  const existingIds = new Set(
    ((existing ?? []) as Array<{ option_id: string }>).map((r) => r.option_id),
  );

  if (existingIds.has(args.optionId)) {
    /* Toggle off : retire le vote. */
    const { error } = await supabase
      .from("post_poll_votes")
      .delete()
      .eq("poll_id", args.pollId)
      .eq("option_id", args.optionId)
      .eq("user_id", user.id);
    if (error) return { ok: false, error: "Vote impossible." };
  } else {
    if (!poll.multi_choice && existingIds.size > 0) {
      /* Single-choice : retire les votes précédents. */
      const { error: delErr } = await supabase
        .from("post_poll_votes")
        .delete()
        .eq("poll_id", args.pollId)
        .eq("user_id", user.id);
      if (delErr) return { ok: false, error: "Vote impossible." };
    }
    const { error } = await supabase.from("post_poll_votes").insert({
      poll_id: args.pollId,
      option_id: args.optionId,
      user_id: user.id,
    });
    if (error) return { ok: false, error: "Vote impossible." };
  }

  revalidatePath(`/feed/${poll.post_id}`);
  revalidatePath("/feed");
  return { ok: true };
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

/* Partage interne : envoie le lien d'un post dans une conversation existante
 * (DM ou groupe). Crée le DM si on partage à un ami sans conv préalable. */
const sharePostSchema = z.object({
  postId: z.string().uuid(),
  target: z.discriminatedUnion("kind", [
    z.object({ kind: z.literal("conversation"), conversationId: z.string().uuid() }),
    z.object({ kind: z.literal("user"), userId: z.string().uuid() }),
  ]),
  note: z.string().trim().max(280).optional(),
});

export type SharePostResult =
  | { ok: true; conversationId: string }
  | { ok: false; error: string };

export async function sharePostToConversation(input: {
  postId: string;
  target:
    | { kind: "conversation"; conversationId: string }
    | { kind: "user"; userId: string };
  note?: string;
}): Promise<SharePostResult> {
  const parsed = sharePostSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Données invalides." };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Non authentifié." };

  /* Vérifie que le post existe et n'est pas supprimé. RLS filtre déjà
     selon la visibilité ; un post non lisible reviendra null. */
  const { data: post } = await supabase
    .from("posts")
    .select("id, deleted_at")
    .eq("id", parsed.data.postId)
    .maybeSingle();
  if (!post || post.deleted_at) {
    return { ok: false, error: "Post introuvable." };
  }

  let conversationId: string;
  if (parsed.data.target.kind === "conversation") {
    conversationId = parsed.data.target.conversationId;
  } else {
    if (parsed.data.target.userId === user.id) {
      return { ok: false, error: "Tu ne peux pas te partager à toi-même." };
    }
    const { data, error } = await supabase.rpc(
      "get_or_create_direct_conversation",
      { other_user_id: parsed.data.target.userId },
    );
    if (error || !data) {
      return { ok: false, error: "Impossible d'ouvrir la conversation." };
    }
    conversationId = data as string;
  }

  const origin =
    process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "") ??
    "https://divarc-app.vercel.app";
  const url = `${origin}/feed/${parsed.data.postId}`;
  const note = parsed.data.note?.trim();
  const body = note ? `${note}\n${url}` : url;

  const { error: insertError } = await supabase.from("messages").insert({
    conversation_id: conversationId,
    sender_id: user.id,
    type: "link",
    body,
  });
  if (insertError) {
    console.error("[sharePostToConversation]", insertError);
    return { ok: false, error: "Échec de l'envoi." };
  }

  revalidatePath(`/messages/${conversationId}`);
  revalidatePath("/messages");
  return { ok: true, conversationId };
}

/* Liste les cibles de partage interne pour un user :
 *  - conversations récentes non archivées (DM ou groupe)
 *  - amis acceptés (pour démarrer un DM si pas de conv préalable)
 * Pas de RPC dédiée → on utilise la stratégie de ForwardPicker. */
export type ShareTarget =
  | {
      kind: "conversation";
      id: string;
      type: "direct" | "group" | "listing_chat" | string;
      label: string;
      subtitle: string | null;
      avatar_url: string | null;
      last_message_at: string | null;
    }
  | {
      kind: "user";
      id: string;
      label: string;
      subtitle: string | null;
      avatar_url: string | null;
    };

export async function listShareTargets(): Promise<{
  ok: boolean;
  conversations: ShareTarget[];
  friends: ShareTarget[];
}> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, conversations: [], friends: [] };

  /* 1. Conversations récentes (mêmes filtres que ForwardPicker). */
  const { data: memberRows } = await supabase
    .from("conversation_members")
    .select("conversation_id, is_archived")
    .eq("user_id", user.id);

  const visibleConvIds = (memberRows ?? [])
    .filter((m) => !m.is_archived)
    .map((m) => m.conversation_id);

  const conversations: ShareTarget[] = [];
  const directConvOtherIds = new Set<string>();

  if (visibleConvIds.length > 0) {
    const { data: convs } = await supabase
      .from("conversations")
      .select("id, type, name, avatar_url, last_message_at")
      .in("id", visibleConvIds)
      .order("last_message_at", { ascending: false })
      .limit(30);

    const directIds = (convs ?? [])
      .filter((c) => c.type === "direct")
      .map((c) => c.id);

    const otherByConv = new Map<string, string>();
    if (directIds.length > 0) {
      const { data: allMembers } = await supabase
        .from("conversation_members")
        .select("conversation_id, user_id")
        .in("conversation_id", directIds);
      for (const m of allMembers ?? []) {
        if (m.user_id !== user.id) {
          otherByConv.set(m.conversation_id, m.user_id);
          directConvOtherIds.add(m.user_id);
        }
      }
    }

    const profileByUserId = new Map<
      string,
      { full_name: string | null; username: string | null; avatar_url: string | null }
    >();
    const otherIds = Array.from(otherByConv.values());
    if (otherIds.length > 0) {
      const { data: profiles } = await supabase
        .from("profiles")
        .select("id, full_name, username, avatar_url")
        .in("id", otherIds);
      for (const p of profiles ?? []) profileByUserId.set(p.id, p);
    }

    for (const c of convs ?? []) {
      if (c.type === "direct") {
        const otherId = otherByConv.get(c.id);
        const profile = otherId ? profileByUserId.get(otherId) : null;
        const label =
          profile?.full_name ?? profile?.username ?? "Conversation";
        conversations.push({
          kind: "conversation",
          id: c.id,
          type: c.type,
          label,
          subtitle: profile?.username ? `@${profile.username}` : null,
          avatar_url: profile?.avatar_url ?? null,
          last_message_at: c.last_message_at,
        });
      } else {
        conversations.push({
          kind: "conversation",
          id: c.id,
          type: c.type,
          label: c.name ?? "Groupe",
          subtitle: c.type === "group" ? "Groupe" : null,
          avatar_url: c.avatar_url,
          last_message_at: c.last_message_at,
        });
      }
    }
  }

  /* 2. Amis acceptés non déjà listés via un DM. */
  const { data: friendships } = await supabase
    .from("friendships")
    .select("requester_id, recipient_id")
    .or(`requester_id.eq.${user.id},recipient_id.eq.${user.id}`)
    .eq("status", "accepted")
    .limit(100);

  const friendIds = new Set<string>();
  for (const f of friendships ?? []) {
    const other = f.requester_id === user.id ? f.recipient_id : f.requester_id;
    if (other && !directConvOtherIds.has(other)) friendIds.add(other);
  }

  const friends: ShareTarget[] = [];
  if (friendIds.size > 0) {
    const { data: profiles } = await supabase
      .from("profiles")
      .select("id, full_name, username, avatar_url")
      .in("id", Array.from(friendIds));
    for (const p of profiles ?? []) {
      friends.push({
        kind: "user",
        id: p.id,
        label: p.full_name ?? p.username ?? "Ami",
        subtitle: p.username ? `@${p.username}` : null,
        avatar_url: p.avatar_url,
      });
    }
    friends.sort((a, b) => a.label.localeCompare(b.label, "fr"));
  }

  return { ok: true, conversations, friends };
}
