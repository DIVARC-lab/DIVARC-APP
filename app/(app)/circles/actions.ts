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
