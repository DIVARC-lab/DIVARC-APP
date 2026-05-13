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

/* Chantier 4.1 — Wizard de création v2 avec tous les champs étendus. */
const createV2Schema = z.object({
  name: z.string().trim().min(2).max(80),
  tagline: z
    .string()
    .trim()
    .max(140)
    .optional()
    .transform((v) => (v && v.length > 0 ? v : null)),
  description: z
    .string()
    .trim()
    .max(4000)
    .optional()
    .transform((v) => (v && v.length > 0 ? v : null)),
  emoji: z
    .string()
    .trim()
    .max(8)
    .optional()
    .transform((v) => (v && v.length > 0 ? v : null)),
  color: z.enum(COLOR_VALUES).optional().transform((v) => v ?? null),
  color_accent: z
    .string()
    .regex(/^#[0-9a-fA-F]{6}$/)
    .optional()
    .transform((v) => v ?? "#C9A961"),
  primary_category: z
    .string()
    .min(1)
    .max(80)
    .optional()
    .transform((v) => v ?? null),
  tags: z.array(z.string().min(1).max(40)).max(10).default([]),
  language: z.string().min(2).max(5).default("fr"),
  is_local: z.boolean().default(false),
  location_city: z
    .string()
    .trim()
    .max(80)
    .optional()
    .transform((v) => (v && v.length > 0 ? v : null)),
  location_country: z
    .string()
    .length(2)
    .optional()
    .transform((v) => v ?? null),
  type: z.enum(["open", "semi_open", "private", "hidden"]).default("open"),
  join_policy: z
    .enum(["instant", "request", "invite_only", "paid", "quiz"])
    .default("instant"),
  visibility: z.enum(["public", "unlisted", "invite_only"]).default("public"),
  modules: z.object({
    social_feed: z.boolean().default(true),
    marketplace: z.boolean().default(false),
    jobs: z.boolean().default(false),
    library: z.boolean().default(false),
    events: z.boolean().default(true),
    polls: z.boolean().default(true),
    wiki: z.boolean().default(false),
    live_audio: z.boolean().default(false),
    challenges: z.boolean().default(false),
    mentorship: z.boolean().default(false),
  }),
  welcome_message: z
    .string()
    .trim()
    .max(1000)
    .optional()
    .transform((v) => (v && v.length > 0 ? v : null)),
  rules: z
    .array(
      z.object({
        title: z.string().trim().min(1).max(60),
        description: z
          .string()
          .trim()
          .max(300)
          .optional()
          .transform((v) => (v && v.length > 0 ? v : null)),
        is_critical: z.boolean().default(false),
      }),
    )
    .max(15)
    .default([]),
});

export type CreateCircleV2Result =
  | { ok: true; slug: string }
  | { ok: false; error: string };

export async function createCircleV2(
  payload: unknown,
): Promise<CreateCircleV2Result> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Non authentifié." };

  const parsed = createV2Schema.safeParse(payload);
  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.issues[0]?.message ?? "Cercle invalide.",
    };
  }

  let slug = slugFromName(parsed.data.name);
  if (slug.length < 2) slug = `cercle-${Date.now().toString(36).slice(-6)}`;

  /* Insert avec retry sur conflit slug. */
  let attempt = 0;
  let lastError: { message: string } | null = null;
  let createdId: string | null = null;
  let createdSlug: string | null = null;
  while (attempt < 5) {
    const candidate = attempt === 0 ? slug : `${slug}-${attempt + 1}`;
    const { data, error } = await supabase
      .from("circles")
      .insert({
        slug: candidate,
        name: parsed.data.name,
        tagline: parsed.data.tagline,
        description: parsed.data.description,
        emoji: parsed.data.emoji,
        color: parsed.data.color,
        color_accent: parsed.data.color_accent,
        primary_category: parsed.data.primary_category,
        tags: parsed.data.tags,
        language: parsed.data.language,
        is_local: parsed.data.is_local,
        location_city: parsed.data.location_city,
        location_country: parsed.data.location_country,
        type: parsed.data.type,
        join_policy: parsed.data.join_policy,
        visibility: parsed.data.visibility,
        modules: parsed.data.modules,
        welcome_message: parsed.data.welcome_message,
        /* Conserve la sémantique legacy is_private pour les queries v1. */
        is_private: parsed.data.type === "private" || parsed.data.type === "hidden",
        owner_id: user.id,
      })
      .select("id, slug")
      .single();
    if (!error && data) {
      createdId = data.id;
      createdSlug = data.slug;
      break;
    }
    lastError = error ?? null;
    if (error?.code !== "23505") break;
    attempt++;
  }

  if (!createdId || !createdSlug) {
    return {
      ok: false,
      error: lastError?.message ?? "Création impossible.",
    };
  }

  /* Ajoute le owner dans circle_members (le trigger backfill 0092 le fait
   * pour les rows existantes, mais pas pour les nouvelles ; on l'insère
   * explicitement pour cohérence). */
  await supabase
    .from("circle_members")
    .insert({
      circle_id: createdId,
      user_id: user.id,
      role: "owner",
      status: "active",
    })
    /* idempotent : si le trigger ou la backfill a déjà inséré, on ignore. */
    .select("user_id")
    .maybeSingle();

  /* Insère les règles (si fournies). */
  if (parsed.data.rules.length > 0) {
    await supabase.from("circle_rules").insert(
      parsed.data.rules.map((r, i) => ({
        circle_id: createdId,
        position: i + 1,
        title: r.title,
        description: r.description,
        is_critical: r.is_critical,
      })),
    );
  }

  revalidatePath("/circles");
  return { ok: true, slug: createdSlug };
}

/* Chantier 4.2 — Édition des settings du cercle (owner/admin only). */
const updateSettingsSchema = z.object({
  name: z.string().trim().min(2).max(80).optional(),
  tagline: z
    .string()
    .trim()
    .max(140)
    .optional()
    .transform((v) => (v && v.length > 0 ? v : null)),
  description: z
    .string()
    .trim()
    .max(4000)
    .optional()
    .transform((v) => (v && v.length > 0 ? v : null)),
  emoji: z
    .string()
    .trim()
    .max(8)
    .optional()
    .transform((v) => (v && v.length > 0 ? v : null)),
  color_accent: z
    .string()
    .regex(/^#[0-9a-fA-F]{6}$/)
    .optional(),
  primary_category: z.string().max(80).optional(),
  tags: z.array(z.string().min(1).max(40)).max(10).optional(),
  language: z.string().min(2).max(5).optional(),
  is_local: z.boolean().optional(),
  location_city: z
    .string()
    .trim()
    .max(80)
    .optional()
    .transform((v) => (v && v.length > 0 ? v : null)),
  location_country: z
    .string()
    .length(2)
    .optional()
    .transform((v) => v ?? null),
  type: z.enum(["open", "semi_open", "private", "hidden"]).optional(),
  join_policy: z
    .enum(["instant", "request", "invite_only", "paid", "quiz"])
    .optional(),
  visibility: z.enum(["public", "unlisted", "invite_only"]).optional(),
  modules: z
    .object({
      social_feed: z.boolean(),
      marketplace: z.boolean(),
      jobs: z.boolean(),
      library: z.boolean(),
      events: z.boolean(),
      polls: z.boolean(),
      wiki: z.boolean(),
      live_audio: z.boolean(),
      challenges: z.boolean(),
      mentorship: z.boolean(),
    })
    .optional(),
  welcome_message: z
    .string()
    .trim()
    .max(1000)
    .optional()
    .transform((v) => (v && v.length > 0 ? v : null)),
});

export async function updateCircleSettings(
  circleId: string,
  patch: unknown,
): Promise<{ ok: boolean; error?: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Non authentifié." };

  const { data: membership } = await supabase
    .from("circle_members")
    .select("role")
    .eq("circle_id", circleId)
    .eq("user_id", user.id)
    .maybeSingle();
  const role = (membership as { role?: string } | null)?.role;
  if (!role || !["owner", "admin"].includes(role)) {
    return {
      ok: false,
      error: "Seuls le fondateur et les admins peuvent modifier ce cercle.",
    };
  }

  const parsed = updateSettingsSchema.safeParse(patch);
  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.issues[0]?.message ?? "Valeur invalide.",
    };
  }

  /* Sync is_private legacy si type change (compat queries v1).
   * Le typing strict de l'Update Supabase rejette le shape Partial dérivé
   * de Zod ; on cast localement (les valeurs sont déjà validées). */
  const dbPatch: Record<string, unknown> = { ...parsed.data };
  if (parsed.data.type) {
    dbPatch.is_private =
      parsed.data.type === "private" || parsed.data.type === "hidden";
  }

  const { error } = await supabase
    .from("circles")
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    .update(dbPatch as any)
    .eq("id", circleId);
  if (error) return { ok: false, error: error.message };

  const { data: circle } = await supabase
    .from("circles")
    .select("slug")
    .eq("id", circleId)
    .maybeSingle();
  if (circle?.slug) {
    revalidatePath(`/circles/${circle.slug}`);
    revalidatePath(`/circles/${circle.slug}/settings`);
  }
  revalidatePath("/circles");
  return { ok: true };
}

/* Chantier 4.2 — Archive (zone dangereuse). */
export async function archiveCircle(
  circleId: string,
): Promise<{ ok: boolean; error?: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Non authentifié." };

  const { data: circle } = await supabase
    .from("circles")
    .select("owner_id")
    .eq("id", circleId)
    .maybeSingle();
  if (!circle) return { ok: false, error: "Cercle introuvable." };
  if (circle.owner_id !== user.id) {
    return { ok: false, error: "Seul le fondateur peut archiver." };
  }

  const { error } = await supabase
    .from("circles")
    .update({ archived_at: new Date().toISOString() })
    .eq("id", circleId);
  if (error) return { ok: false, error: error.message };

  revalidatePath("/circles");
  return { ok: true };
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
  status: "going" | "interested" | "maybe" | "not_going" = "going",
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

/* ============================================================================
 * Chantier 4.3 — Modération par cercle
 * ============================================================================ */

async function assertCircleModerator(
  supabase: Awaited<ReturnType<typeof createClient>>,
  circleId: string,
  userId: string,
): Promise<{ ok: true; role: string } | { ok: false; error: string }> {
  const { data: m } = await supabase
    .from("circle_members")
    .select("role")
    .eq("circle_id", circleId)
    .eq("user_id", userId)
    .maybeSingle();
  const role = (m as { role?: string } | null)?.role;
  if (!role || !["owner", "admin", "moderator", "mod"].includes(role)) {
    return {
      ok: false,
      error: "Seuls les modérateurs peuvent effectuer cette action.",
    };
  }
  return { ok: true, role };
}

async function logModerationAction(
  supabase: Awaited<ReturnType<typeof createClient>>,
  circleId: string,
  actorId: string,
  actionType: import("@/lib/database.types").CircleModerationActionType,
  args: {
    targetPostId?: string | null;
    targetUserId?: string | null;
    reason?: string | null;
    metadata?: Record<string, unknown>;
  } = {},
) {
  try {
    await supabase.from("circle_moderation_actions").insert({
      circle_id: circleId,
      actor_user_id: actorId,
      action_type: actionType,
      target_post_id: args.targetPostId ?? null,
      target_user_id: args.targetUserId ?? null,
      reason: args.reason ?? null,
      metadata: args.metadata ?? {},
    });
  } catch (err) {
    console.warn("[divarc] logModerationAction failed (non-fatal):", err);
  }
}

export async function approveCirclePost(
  postId: string,
): Promise<{ ok: boolean; error?: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Non authentifié." };

  const { data: post } = await supabase
    .from("posts")
    .select("circle_id")
    .eq("id", postId)
    .maybeSingle();
  if (!post?.circle_id) return { ok: false, error: "Post introuvable." };

  const check = await assertCircleModerator(supabase, post.circle_id, user.id);
  if (!check.ok) return check;

  const { error } = await supabase
    .from("posts")
    .update({
      requires_approval: false,
      approved_by: user.id,
      approved_at: new Date().toISOString(),
    })
    .eq("id", postId);
  if (error) return { ok: false, error: error.message };

  await logModerationAction(supabase, post.circle_id, user.id, "post_approved", {
    targetPostId: postId,
  });

  const { data: circle } = await supabase
    .from("circles")
    .select("slug")
    .eq("id", post.circle_id)
    .maybeSingle();
  if (circle?.slug) {
    revalidatePath(`/circles/${circle.slug}`);
    revalidatePath(`/circles/${circle.slug}/moderation`);
  }
  return { ok: true };
}

export async function rejectCirclePost(
  postId: string,
  reason: string,
): Promise<{ ok: boolean; error?: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Non authentifié." };

  const { data: post } = await supabase
    .from("posts")
    .select("circle_id")
    .eq("id", postId)
    .maybeSingle();
  if (!post?.circle_id) return { ok: false, error: "Post introuvable." };

  const check = await assertCircleModerator(supabase, post.circle_id, user.id);
  if (!check.ok) return check;

  const { error } = await supabase
    .from("posts")
    .update({ deleted_at: new Date().toISOString() })
    .eq("id", postId);
  if (error) return { ok: false, error: error.message };

  await logModerationAction(supabase, post.circle_id, user.id, "post_rejected", {
    targetPostId: postId,
    reason: reason.slice(0, 1000),
  });

  const { data: circle } = await supabase
    .from("circles")
    .select("slug")
    .eq("id", post.circle_id)
    .maybeSingle();
  if (circle?.slug) {
    revalidatePath(`/circles/${circle.slug}`);
    revalidatePath(`/circles/${circle.slug}/moderation`);
  }
  return { ok: true };
}

export async function toggleLockCirclePost(
  postId: string,
): Promise<{ ok: boolean; error?: string; locked?: boolean }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Non authentifié." };

  const { data: post } = await supabase
    .from("posts")
    .select("circle_id, is_locked")
    .eq("id", postId)
    .maybeSingle();
  if (!post?.circle_id) return { ok: false, error: "Post introuvable." };

  const check = await assertCircleModerator(supabase, post.circle_id, user.id);
  if (!check.ok) return check;

  const nextLocked = !(post as { is_locked?: boolean }).is_locked;
  const { error } = await supabase
    .from("posts")
    .update({ is_locked: nextLocked })
    .eq("id", postId);
  if (error) return { ok: false, error: error.message };

  await logModerationAction(
    supabase,
    post.circle_id,
    user.id,
    nextLocked ? "post_locked" : "post_unlocked",
    { targetPostId: postId },
  );

  const { data: circle } = await supabase
    .from("circles")
    .select("slug")
    .eq("id", post.circle_id)
    .maybeSingle();
  if (circle?.slug) revalidatePath(`/circles/${circle.slug}`);
  return { ok: true, locked: nextLocked };
}

export async function updateCircleMemberRole(
  circleId: string,
  targetUserId: string,
  newRole: "admin" | "moderator" | "ambassador" | "contributor" | "member",
): Promise<{ ok: boolean; error?: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Non authentifié." };

  const [{ data: circle }, { data: actor }] = await Promise.all([
    supabase
      .from("circles")
      .select("owner_id, slug")
      .eq("id", circleId)
      .maybeSingle(),
    supabase
      .from("circle_members")
      .select("role")
      .eq("circle_id", circleId)
      .eq("user_id", user.id)
      .maybeSingle(),
  ]);

  if (!circle) return { ok: false, error: "Cercle introuvable." };

  const actorRole = (actor as { role?: string } | null)?.role;
  const isOwner = circle.owner_id === user.id;
  if (!isOwner && actorRole !== "admin") {
    return {
      ok: false,
      error: "Seul le fondateur ou les admins peuvent modifier les rôles.",
    };
  }

  if (targetUserId === circle.owner_id) {
    return { ok: false, error: "Le rôle du fondateur ne peut être modifié." };
  }

  if (newRole === "admin" && !isOwner) {
    return { ok: false, error: "Seul le fondateur peut nommer un admin." };
  }

  const { data: target } = await supabase
    .from("circle_members")
    .select("role")
    .eq("circle_id", circleId)
    .eq("user_id", targetUserId)
    .maybeSingle();
  const previousRole = (target as { role?: string } | null)?.role ?? "member";

  const { error } = await supabase
    .from("circle_members")
    .update({ role: newRole })
    .eq("circle_id", circleId)
    .eq("user_id", targetUserId);
  if (error) return { ok: false, error: error.message };

  const ORDER = ["member", "contributor", "ambassador", "moderator", "admin"];
  const actionType =
    ORDER.indexOf(newRole) > ORDER.indexOf(previousRole)
      ? "member_promoted"
      : "member_demoted";

  await logModerationAction(supabase, circleId, user.id, actionType, {
    targetUserId,
    metadata: { previous_role: previousRole, new_role: newRole },
  });

  if (circle.slug) {
    revalidatePath(`/circles/${circle.slug}/members`);
    revalidatePath(`/circles/${circle.slug}/moderation`);
  }
  return { ok: true };
}

/* ============================================================================
 * Chantier 4.4 — Sanctions progressives
 * ============================================================================ */

const SANCTION_ACTIONS = [
  "warning",
  "mute_1h",
  "mute_24h",
  "mute_7d",
  "temp_ban_30d",
  "permanent_ban",
] as const;
type SanctionAction = (typeof SANCTION_ACTIONS)[number];

const SANCTION_LEVELS: Record<SanctionAction, number> = {
  warning: 1,
  mute_1h: 2,
  mute_24h: 3,
  mute_7d: 4,
  temp_ban_30d: 5,
  permanent_ban: 6,
};

const SANCTION_DURATION_MS: Record<SanctionAction, number | null> = {
  warning: null,
  mute_1h: 60 * 60 * 1000,
  mute_24h: 24 * 60 * 60 * 1000,
  mute_7d: 7 * 24 * 60 * 60 * 1000,
  temp_ban_30d: 30 * 24 * 60 * 60 * 1000,
  permanent_ban: null,
};

export async function issueCircleSanction(
  circleId: string,
  targetUserId: string,
  action: SanctionAction,
  reason: string,
): Promise<{ ok: boolean; error?: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Non authentifié." };

  const check = await assertCircleModerator(supabase, circleId, user.id);
  if (!check.ok) return check;

  if (!SANCTION_ACTIONS.includes(action)) {
    return { ok: false, error: "Sanction invalide." };
  }
  if (reason.trim().length < 5) {
    return {
      ok: false,
      error: "Précise la raison (5 caractères minimum).",
    };
  }

  /* Le owner du cercle est intouchable. */
  const { data: circle } = await supabase
    .from("circles")
    .select("owner_id, slug")
    .eq("id", circleId)
    .maybeSingle();
  if (!circle) return { ok: false, error: "Cercle introuvable." };
  if (circle.owner_id === targetUserId) {
    return { ok: false, error: "Le fondateur ne peut être sanctionné." };
  }

  const now = Date.now();
  const duration = SANCTION_DURATION_MS[action];
  const expiresAt =
    duration === null ? null : new Date(now + duration).toISOString();

  /* Insert sanction. */
  const { error: insertError } = await supabase
    .from("circle_sanctions")
    .insert({
      circle_id: circleId,
      target_user_id: targetUserId,
      issued_by: user.id,
      level: SANCTION_LEVELS[action],
      action,
      reason: reason.trim().slice(0, 1000),
      expires_at: expiresAt,
    });
  if (insertError) return { ok: false, error: insertError.message };

  /* Update circle_members selon le type de sanction. */
  const memberPatch: Record<string, unknown> = {};
  if (action === "warning") {
    /* Increment warnings_count. */
    const { data: m } = await supabase
      .from("circle_members")
      .select("warnings_count")
      .eq("circle_id", circleId)
      .eq("user_id", targetUserId)
      .maybeSingle();
    const prev = (m as { warnings_count?: number } | null)?.warnings_count ?? 0;
    memberPatch.warnings_count = prev + 1;
  } else if (action.startsWith("mute_")) {
    memberPatch.is_muted = true;
    memberPatch.muted_until = expiresAt;
  } else if (action === "temp_ban_30d" || action === "permanent_ban") {
    memberPatch.is_banned = true;
    memberPatch.banned_at = new Date(now).toISOString();
    memberPatch.ban_reason = reason.trim().slice(0, 500);
    memberPatch.status = "banned";
  }

  if (Object.keys(memberPatch).length > 0) {
    await supabase
      .from("circle_members")
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .update(memberPatch as any)
      .eq("circle_id", circleId)
      .eq("user_id", targetUserId);
  }

  /* Log dans circle_moderation_actions. */
  const logAction =
    action === "warning"
      ? "member_warned"
      : action.startsWith("mute_")
        ? "member_muted"
        : "member_banned";
  await logModerationAction(supabase, circleId, user.id, logAction, {
    targetUserId,
    reason: reason.trim().slice(0, 1000),
    metadata: { action, level: SANCTION_LEVELS[action], expires_at: expiresAt },
  });

  if (circle.slug) {
    revalidatePath(`/circles/${circle.slug}/members`);
    revalidatePath(`/circles/${circle.slug}/moderation`);
  }
  return { ok: true };
}

export async function liftCircleSanction(
  sanctionId: string,
  liftReason: string,
): Promise<{ ok: boolean; error?: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Non authentifié." };

  const { data: sanction } = await supabase
    .from("circle_sanctions")
    .select("circle_id, target_user_id, action, lifted_at")
    .eq("id", sanctionId)
    .maybeSingle();
  if (!sanction) return { ok: false, error: "Sanction introuvable." };
  if (sanction.lifted_at)
    return { ok: false, error: "Sanction déjà levée." };

  const check = await assertCircleModerator(
    supabase,
    sanction.circle_id,
    user.id,
  );
  if (!check.ok) return check;

  const { error } = await supabase
    .from("circle_sanctions")
    .update({
      lifted_at: new Date().toISOString(),
      lifted_by: user.id,
      lifted_reason: liftReason.slice(0, 500),
    })
    .eq("id", sanctionId);
  if (error) return { ok: false, error: error.message };

  /* Reset les flags membre selon l'action levée. */
  const memberPatch: Record<string, unknown> = {};
  if (sanction.action.startsWith("mute_")) {
    memberPatch.is_muted = false;
    memberPatch.muted_until = null;
  } else if (
    sanction.action === "temp_ban_30d" ||
    sanction.action === "permanent_ban"
  ) {
    memberPatch.is_banned = false;
    memberPatch.banned_at = null;
    memberPatch.ban_reason = null;
    memberPatch.status = "active";
  }
  if (Object.keys(memberPatch).length > 0) {
    await supabase
      .from("circle_members")
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .update(memberPatch as any)
      .eq("circle_id", sanction.circle_id)
      .eq("user_id", sanction.target_user_id);
  }

  const logType =
    sanction.action.startsWith("mute_")
      ? "member_unmuted"
      : sanction.action === "temp_ban_30d" || sanction.action === "permanent_ban"
        ? "member_unbanned"
        : "member_warned";
  await logModerationAction(supabase, sanction.circle_id, user.id, logType, {
    targetUserId: sanction.target_user_id,
    reason: liftReason.slice(0, 500),
    metadata: { sanction_id: sanctionId, action_lifted: sanction.action },
  });

  const { data: circle } = await supabase
    .from("circles")
    .select("slug")
    .eq("id", sanction.circle_id)
    .maybeSingle();
  if (circle?.slug) {
    revalidatePath(`/circles/${circle.slug}/members`);
    revalidatePath(`/circles/${circle.slug}/moderation`);
  }
  return { ok: true };
}

/* ============================================================================
 * Chantier 4.5 — AutoMod
 * ============================================================================ */

const automodRuleSchema = z.object({
  rule_type: z.enum([
    "slow_mode",
    "word_filter",
    "report_threshold",
    "link_filter",
  ]),
  config: z.record(z.string(), z.unknown()).default({}),
  on_match_action: z
    .enum(["flag", "hide", "require_approval"])
    .default("flag"),
  enabled: z.boolean().default(true),
});

export async function createAutomodRule(
  circleId: string,
  payload: unknown,
): Promise<{ ok: boolean; error?: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Non authentifié." };

  /* Owner/admin uniquement (RLS double-check). */
  const { data: m } = await supabase
    .from("circle_members")
    .select("role")
    .eq("circle_id", circleId)
    .eq("user_id", user.id)
    .maybeSingle();
  const role = (m as { role?: string } | null)?.role;
  if (!role || !["owner", "admin"].includes(role)) {
    return {
      ok: false,
      error: "Seuls le fondateur et les admins peuvent gérer l'AutoMod.",
    };
  }

  const parsed = automodRuleSchema.safeParse(payload);
  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.issues[0]?.message ?? "Règle invalide.",
    };
  }

  const { error } = await supabase.from("circle_automod_rules").insert({
    circle_id: circleId,
    created_by: user.id,
    rule_type: parsed.data.rule_type,
    config: parsed.data.config,
    on_match_action: parsed.data.on_match_action,
    enabled: parsed.data.enabled,
  });
  if (error) return { ok: false, error: error.message };

  const { data: circle } = await supabase
    .from("circles")
    .select("slug")
    .eq("id", circleId)
    .maybeSingle();
  if (circle?.slug) {
    revalidatePath(`/circles/${circle.slug}/moderation/automod`);
  }
  return { ok: true };
}

export async function toggleAutomodRule(
  ruleId: string,
): Promise<{ ok: boolean; error?: string; enabled?: boolean }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Non authentifié." };

  const { data: rule } = await supabase
    .from("circle_automod_rules")
    .select("circle_id, enabled")
    .eq("id", ruleId)
    .maybeSingle();
  if (!rule) return { ok: false, error: "Règle introuvable." };

  /* Check role. */
  const { data: m } = await supabase
    .from("circle_members")
    .select("role")
    .eq("circle_id", rule.circle_id)
    .eq("user_id", user.id)
    .maybeSingle();
  const role = (m as { role?: string } | null)?.role;
  if (!role || !["owner", "admin"].includes(role)) {
    return {
      ok: false,
      error: "Seuls le fondateur et les admins peuvent gérer l'AutoMod.",
    };
  }

  const nextEnabled = !rule.enabled;
  const { error } = await supabase
    .from("circle_automod_rules")
    .update({ enabled: nextEnabled })
    .eq("id", ruleId);
  if (error) return { ok: false, error: error.message };

  const { data: circle } = await supabase
    .from("circles")
    .select("slug")
    .eq("id", rule.circle_id)
    .maybeSingle();
  if (circle?.slug) {
    revalidatePath(`/circles/${circle.slug}/moderation/automod`);
  }
  return { ok: true, enabled: nextEnabled };
}

export async function deleteAutomodRule(
  ruleId: string,
): Promise<{ ok: boolean; error?: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Non authentifié." };

  const { data: rule } = await supabase
    .from("circle_automod_rules")
    .select("circle_id")
    .eq("id", ruleId)
    .maybeSingle();
  if (!rule) return { ok: false, error: "Règle introuvable." };

  const { data: m } = await supabase
    .from("circle_members")
    .select("role")
    .eq("circle_id", rule.circle_id)
    .eq("user_id", user.id)
    .maybeSingle();
  const role = (m as { role?: string } | null)?.role;
  if (!role || !["owner", "admin"].includes(role)) {
    return {
      ok: false,
      error: "Seuls le fondateur et les admins peuvent gérer l'AutoMod.",
    };
  }

  const { error } = await supabase
    .from("circle_automod_rules")
    .delete()
    .eq("id", ruleId);
  if (error) return { ok: false, error: error.message };

  const { data: circle } = await supabase
    .from("circles")
    .select("slug")
    .eq("id", rule.circle_id)
    .maybeSingle();
  if (circle?.slug) {
    revalidatePath(`/circles/${circle.slug}/moderation/automod`);
  }
  return { ok: true };
}
