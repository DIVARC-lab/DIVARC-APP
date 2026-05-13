"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";

const COLOR_VALUES = [
  "gold",
  "navy",
  "emerald",
  "rose",
  "violet",
  "cream",
] as const;

const slugFromName = (name: string) =>
  name
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40);

const createSchema = z.object({
  name: z.string().trim().min(2).max(80),
  description: z
    .string()
    .trim()
    .max(500)
    .optional()
    .transform((v) => (v && v.length > 0 ? v : null)),
  emoji: z
    .string()
    .trim()
    .max(8)
    .optional()
    .transform((v) => (v && v.length > 0 ? v : null)),
  color: z.enum(COLOR_VALUES).optional().transform((v) => v ?? null),
  is_private: z
    .union([z.literal("on"), z.literal("true"), z.literal("false"), z.null()])
    .optional()
    .transform((v) => v === "on" || v === "true"),
});

export async function createCircle(formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false as const, error: "Non authentifié." };

  const parsed = createSchema.safeParse({
    name: formData.get("name"),
    description: formData.get("description"),
    emoji: formData.get("emoji"),
    color: formData.get("color"),
    is_private: formData.get("is_private"),
  });

  if (!parsed.success) {
    return {
      ok: false as const,
      error: parsed.error.issues[0]?.message ?? "Cercle invalide.",
    };
  }

  let slug = slugFromName(parsed.data.name);
  if (slug.length < 2) slug = `cercle-${Date.now().toString(36).slice(-6)}`;

  /* Try insert; if slug collides, retry with -2, -3, ... up to 5 attempts. */
  let attempt = 0;
  let lastError: { message: string } | null = null;
  while (attempt < 5) {
    const candidate = attempt === 0 ? slug : `${slug}-${attempt + 1}`;
    const { data, error } = await supabase
      .from("circles")
      .insert({
        slug: candidate,
        name: parsed.data.name,
        description: parsed.data.description,
        emoji: parsed.data.emoji,
        color: parsed.data.color,
        is_private: parsed.data.is_private,
        owner_id: user.id,
      })
      .select("slug")
      .single();
    if (!error && data) {
      revalidatePath("/circles");
      redirect(`/circles/${data.slug}`);
    }
    lastError = error ?? null;
    if (error?.code !== "23505") break;
    attempt++;
  }

  return {
    ok: false as const,
    error: lastError?.message ?? "Création impossible.",
  };
}

export async function joinCircle(circleId: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false as const, error: "Non authentifié." };

  const { error } = await supabase
    .from("circle_members")
    .insert({ circle_id: circleId, user_id: user.id, role: "member" });

  if (error) {
    return {
      ok: false as const,
      error: error.code === "23505" ? "Tu es déjà membre." : "Impossible de rejoindre.",
    };
  }

  revalidatePath("/circles");
  return { ok: true as const };
}

export async function leaveCircle(circleId: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false as const, error: "Non authentifié." };

  const { error } = await supabase
    .from("circle_members")
    .delete()
    .eq("circle_id", circleId)
    .eq("user_id", user.id);

  if (error) return { ok: false as const, error: "Impossible de quitter." };

  revalidatePath("/circles");
  return { ok: true as const };
}

const circlePostSchema = z.object({
  circle_id: z.string().uuid(),
  body: z.string().trim().min(1).max(4000),
  /* Chantier 3.2 — flair optionnel (FK vers circle_flairs). */
  flair_id: z
    .preprocess(
      (v) => (v == null || v === "" ? undefined : v),
      z.string().uuid().optional(),
    ),
});

export async function createCirclePost(formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false as const, error: "Non authentifié." };

  const parsed = circlePostSchema.safeParse({
    circle_id: formData.get("circle_id"),
    body: formData.get("body"),
    flair_id: formData.get("flair_id"),
  });
  if (!parsed.success) {
    return {
      ok: false as const,
      error: parsed.error.issues[0]?.message ?? "Post invalide.",
    };
  }

  /* Verify membership client-side too (RLS will refuse anyway) for
     a clean error message instead of a generic insert failure. */
  const { data: membership } = await supabase
    .from("circle_members")
    .select("circle_id")
    .eq("circle_id", parsed.data.circle_id)
    .eq("user_id", user.id)
    .maybeSingle();
  if (!membership) {
    return {
      ok: false as const,
      error: "Tu dois être membre du cercle pour poster.",
    };
  }

  const { error } = await supabase.from("posts").insert({
    author_id: user.id,
    body: parsed.data.body,
    visibility: "private",
    circle_id: parsed.data.circle_id,
    flair_id: parsed.data.flair_id ?? null,
  });

  if (error) {
    return { ok: false as const, error: "Publication impossible." };
  }

  /* Find slug to revalidate the right page. */
  const { data: circle } = await supabase
    .from("circles")
    .select("slug")
    .eq("id", parsed.data.circle_id)
    .maybeSingle();
  if (circle?.slug) revalidatePath(`/circles/${circle.slug}`);

  return { ok: true as const };
}

const eventCategorySchema = z
  .enum(["community", "social", "cultural"])
  .default("community");

const createEventSchema = z.object({
  circle_id: z.string().uuid(),
  title: z.string().trim().min(2).max(120),
  description: z
    .string()
    .trim()
    .max(2000)
    .optional()
    .transform((v) => (v && v.length > 0 ? v : null)),
  location: z
    .string()
    .trim()
    .max(200)
    .optional()
    .transform((v) => (v && v.length > 0 ? v : null)),
  category: eventCategorySchema,
  starts_at: z.string().refine((s) => {
    const d = new Date(s);
    return !Number.isNaN(d.getTime()) && d.getTime() > Date.now() - 5 * 60_000;
  }, "Date de début invalide ou passée."),
  ends_at: z
    .string()
    .nullable()
    .optional()
    .transform((v) => (v && v.length > 0 ? v : null)),
  capacity: z
    .union([z.string(), z.number(), z.null()])
    .optional()
    .transform((v) => {
      if (v === null || v === undefined || v === "") return null;
      const n = typeof v === "string" ? parseInt(v, 10) : v;
      return Number.isFinite(n) ? n : null;
    })
    .pipe(z.number().int().min(1).max(5000).nullable()),
  lat: z
    .union([z.string(), z.null()])
    .optional()
    .transform((v) => {
      if (!v) return null;
      const n = parseFloat(v);
      return Number.isFinite(n) && n >= -90 && n <= 90 ? n : null;
    }),
  lng: z
    .union([z.string(), z.null()])
    .optional()
    .transform((v) => {
      if (!v) return null;
      const n = parseFloat(v);
      return Number.isFinite(n) && n >= -180 && n <= 180 ? n : null;
    }),
});

export async function createCircleEvent(formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false as const, error: "Non authentifié." };

  const parsed = createEventSchema.safeParse({
    circle_id: formData.get("circle_id"),
    title: formData.get("title"),
    description: formData.get("description"),
    location: formData.get("location"),
    category: formData.get("category"),
    starts_at: formData.get("starts_at"),
    ends_at: formData.get("ends_at"),
    capacity: formData.get("capacity"),
    lat: formData.get("lat"),
    lng: formData.get("lng"),
  });
  if (!parsed.success) {
    return {
      ok: false as const,
      error: parsed.error.issues[0]?.message ?? "Événement invalide.",
    };
  }

  /* Vérifie que ends_at, si fourni, est bien après starts_at. */
  if (parsed.data.ends_at) {
    const s = new Date(parsed.data.starts_at).getTime();
    const e = new Date(parsed.data.ends_at).getTime();
    if (Number.isNaN(e) || e <= s) {
      return { ok: false as const, error: "La fin doit être après le début." };
    }
  }

  /* lat/lng : tous les deux ou aucun (DB constraint backup côté client). */
  if (
    (parsed.data.lat === null) !== (parsed.data.lng === null)
  ) {
    return {
      ok: false as const,
      error: "Coordonnées : remplis lat ET lng, ou laisse les deux vides.",
    };
  }

  const { error } = await supabase.from("circle_events").insert({
    circle_id: parsed.data.circle_id,
    author_id: user.id,
    title: parsed.data.title,
    description: parsed.data.description,
    location: parsed.data.location,
    category: parsed.data.category,
    starts_at: parsed.data.starts_at,
    ends_at: parsed.data.ends_at,
    capacity: parsed.data.capacity,
    lat: parsed.data.lat,
    lng: parsed.data.lng,
  });

  if (error) {
    return {
      ok: false as const,
      error: "Création impossible (es-tu membre du cercle ?).",
    };
  }

  const { data: circle } = await supabase
    .from("circles")
    .select("slug")
    .eq("id", parsed.data.circle_id)
    .maybeSingle();
  if (circle?.slug) {
    revalidatePath(`/circles/${circle.slug}`);
    redirect(`/circles/${circle.slug}`);
  }

  return { ok: true as const };
}

export async function attendCircleEvent(
  eventId: string,
  status: "going" | "interested" = "going",
) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false as const, error: "Non authentifié." };

  const { error } = await supabase
    .from("circle_event_attendance")
    .upsert(
      { event_id: eventId, user_id: user.id, status },
      { onConflict: "event_id,user_id" },
    );

  if (error) {
    return { ok: false as const, error: "RSVP impossible." };
  }

  /* Revalide la page cercle qui liste les events. */
  const { data: event } = await supabase
    .from("circle_events")
    .select("circle_id")
    .eq("id", eventId)
    .maybeSingle();
  if (event?.circle_id) {
    const { data: circle } = await supabase
      .from("circles")
      .select("slug")
      .eq("id", event.circle_id)
      .maybeSingle();
    if (circle?.slug) revalidatePath(`/circles/${circle.slug}`);
  }
  return { ok: true as const };
}

/* Crypto-strong URL-safe token (24 chars). */
function generateInvitationToken(length = 24): string {
  const bytes = new Uint8Array(length);
  crypto.getRandomValues(bytes);
  const alphabet =
    "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_";
  let out = "";
  for (let i = 0; i < length; i++) {
    out += alphabet[bytes[i]! % alphabet.length];
  }
  return out;
}

const createInvitationSchema = z.object({
  circle_id: z.string().uuid(),
  max_uses: z
    .union([z.string(), z.null()])
    .optional()
    .transform((v) => {
      if (!v) return null;
      const n = parseInt(v, 10);
      return Number.isFinite(n) && n > 0 && n <= 1000 ? n : null;
    }),
  expires_in_days: z
    .union([z.string(), z.null()])
    .optional()
    .transform((v) => {
      if (!v) return null;
      const n = parseInt(v, 10);
      return Number.isFinite(n) && n > 0 && n <= 365 ? n : null;
    }),
});

export async function createCircleInvitation(formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false as const, error: "Non authentifié." };

  const parsed = createInvitationSchema.safeParse({
    circle_id: formData.get("circle_id"),
    max_uses: formData.get("max_uses"),
    expires_in_days: formData.get("expires_in_days"),
  });
  if (!parsed.success) {
    return { ok: false as const, error: "Données invalides." };
  }

  const { data: canMod } = await supabase.rpc("can_moderate_circle", {
    p_circle_id: parsed.data.circle_id,
    p_user_id: user.id,
  });
  if (!canMod) {
    return {
      ok: false as const,
      error: "Tu dois être admin ou modérateur pour créer une invitation.",
    };
  }

  const expiresAt = parsed.data.expires_in_days
    ? new Date(
        Date.now() + parsed.data.expires_in_days * 24 * 3600 * 1000,
      ).toISOString()
    : null;

  /* Retry token collision up to 5 times. */
  let attempt = 0;
  while (attempt < 5) {
    const token = generateInvitationToken();
    const { data, error } = await supabase
      .from("circle_invitations")
      .insert({
        circle_id: parsed.data.circle_id,
        token,
        created_by: user.id,
        max_uses: parsed.data.max_uses,
        expires_at: expiresAt,
      })
      .select("token")
      .single();
    if (!error && data) {
      const { data: circle } = await supabase
        .from("circles")
        .select("slug")
        .eq("id", parsed.data.circle_id)
        .maybeSingle();
      if (circle?.slug) revalidatePath(`/circles/${circle.slug}/invite`);
      return { ok: true as const, token: data.token };
    }
    if (error?.code !== "23505") {
      return { ok: false as const, error: "Création impossible." };
    }
    attempt++;
  }
  return { ok: false as const, error: "Réessaie." };
}

export async function revokeCircleInvitation(invitationId: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false as const, error: "Non authentifié." };

  /* Lookup circle_id to verify mod rights and revalidate. */
  const { data: inv } = await supabase
    .from("circle_invitations")
    .select("circle_id")
    .eq("id", invitationId)
    .maybeSingle();
  if (!inv) return { ok: false as const, error: "Invitation introuvable." };

  const { data: canMod } = await supabase.rpc("can_moderate_circle", {
    p_circle_id: inv.circle_id,
    p_user_id: user.id,
  });
  if (!canMod) {
    return { ok: false as const, error: "Action non autorisée." };
  }

  const { error } = await supabase
    .from("circle_invitations")
    .update({ revoked_at: new Date().toISOString() })
    .eq("id", invitationId);
  if (error) return { ok: false as const, error: "Action impossible." };

  const { data: circle } = await supabase
    .from("circles")
    .select("slug")
    .eq("id", inv.circle_id)
    .maybeSingle();
  if (circle?.slug) revalidatePath(`/circles/${circle.slug}/invite`);

  return { ok: true as const };
}

export async function acceptCircleInvitation(token: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false as const, error: "Non authentifié." };

  const { data, error } = await supabase.rpc("accept_circle_invitation", {
    p_token: token,
  });
  if (error || !data) {
    return {
      ok: false as const,
      error: error?.message?.includes("expirée")
        ? "Cette invitation a expiré."
        : error?.message?.includes("révoquée")
          ? "Invitation révoquée."
          : error?.message?.includes("épuisée")
            ? "Toutes les places sont prises."
            : "Invitation invalide.",
    };
  }

  /* Get slug for redirect. */
  const { data: circle } = await supabase
    .from("circles")
    .select("slug")
    .eq("id", data)
    .maybeSingle();

  revalidatePath("/circles");
  if (circle?.slug) revalidatePath(`/circles/${circle.slug}`);

  return { ok: true as const, slug: circle?.slug ?? null };
}

export async function pinCirclePost(postId: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false as const, error: "Non authentifié." };

  /* Verify post is in a circle and user can moderate it. */
  const { data: post } = await supabase
    .from("posts")
    .select("circle_id")
    .eq("id", postId)
    .maybeSingle();
  if (!post?.circle_id) {
    return { ok: false as const, error: "Post introuvable ou hors cercle." };
  }
  const { data: canMod } = await supabase.rpc("can_moderate_circle", {
    p_circle_id: post.circle_id,
    p_user_id: user.id,
  });
  if (!canMod) {
    return {
      ok: false as const,
      error: "Tu dois être admin ou modérateur pour épingler.",
    };
  }

  const { error } = await supabase
    .from("posts")
    .update({ pinned_at: new Date().toISOString(), pinned_by: user.id })
    .eq("id", postId);
  if (error) return { ok: false as const, error: "Épinglage impossible." };

  const { data: circle } = await supabase
    .from("circles")
    .select("slug")
    .eq("id", post.circle_id)
    .maybeSingle();
  if (circle?.slug) revalidatePath(`/circles/${circle.slug}`);
  return { ok: true as const };
}

export async function unpinCirclePost(postId: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false as const, error: "Non authentifié." };

  const { data: post } = await supabase
    .from("posts")
    .select("circle_id")
    .eq("id", postId)
    .maybeSingle();
  if (!post?.circle_id) {
    return { ok: false as const, error: "Post introuvable." };
  }
  const { data: canMod } = await supabase.rpc("can_moderate_circle", {
    p_circle_id: post.circle_id,
    p_user_id: user.id,
  });
  if (!canMod) {
    return {
      ok: false as const,
      error: "Tu dois être admin ou modérateur.",
    };
  }

  const { error } = await supabase
    .from("posts")
    .update({ pinned_at: null, pinned_by: null })
    .eq("id", postId);
  if (error) return { ok: false as const, error: "Action impossible." };

  const { data: circle } = await supabase
    .from("circles")
    .select("slug")
    .eq("id", post.circle_id)
    .maybeSingle();
  if (circle?.slug) revalidatePath(`/circles/${circle.slug}`);
  return { ok: true as const };
}

export async function cancelEventRsvp(eventId: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false as const, error: "Non authentifié." };

  const { error } = await supabase
    .from("circle_event_attendance")
    .delete()
    .eq("event_id", eventId)
    .eq("user_id", user.id);

  if (error) return { ok: false as const, error: "Action impossible." };

  const { data: event } = await supabase
    .from("circle_events")
    .select("circle_id")
    .eq("id", eventId)
    .maybeSingle();
  if (event?.circle_id) {
    const { data: circle } = await supabase
      .from("circles")
      .select("slug")
      .eq("id", event.circle_id)
      .maybeSingle();
    if (circle?.slug) revalidatePath(`/circles/${circle.slug}`);
  }
  return { ok: true as const };
}
