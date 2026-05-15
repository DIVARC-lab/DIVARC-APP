"use server";

/* Server Actions board Demandes & Offres cercles. */

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";

/* eslint-disable @typescript-eslint/no-explicit-any */
type SupabaseAny = any;

const createSchema = z.object({
  circleId: z.string().uuid(),
  circleSlug: z.string().min(1),
  kind: z.enum(["request", "offer"]),
  title: z.string().min(3).max(140),
  body: z.string().max(4000).optional(),
  tags: z.array(z.string().max(40)).max(8).default([]),
  budgetAmount: z.number().min(0).max(1_000_000).nullable().optional(),
  budgetCurrency: z.enum(["EUR", "USD", "XOF", "XAF", "KARMA"]).nullable().optional(),
  isRemote: z.boolean().default(true),
  locationCity: z.string().max(120).nullable().optional(),
});

export async function createCircleRequest(args: z.infer<typeof createSchema>) {
  const parsed = createSchema.safeParse(args);
  if (!parsed.success) {
    return { ok: false as const, error: parsed.error.issues[0]?.message ?? "Invalid" };
  }
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false as const, error: "Non authentifié" };

  const { data, error } = await (supabase as SupabaseAny)
    .from("circle_requests")
    .insert({
      circle_id: parsed.data.circleId,
      author_id: user.id,
      kind: parsed.data.kind,
      title: parsed.data.title,
      body: parsed.data.body ?? null,
      tags: parsed.data.tags,
      budget_amount: parsed.data.budgetAmount ?? null,
      budget_currency: parsed.data.budgetCurrency ?? null,
      is_remote: parsed.data.isRemote,
      location_city: parsed.data.locationCity ?? null,
    })
    .select("id")
    .single();

  if (error || !data) {
    return { ok: false as const, error: error?.message ?? "Insert failed" };
  }
  revalidatePath(`/circles/${parsed.data.circleSlug}/requests`);
  return { ok: true as const, id: data.id as string };
}

const respondSchema = z.object({
  requestId: z.string().uuid(),
  circleSlug: z.string().min(1),
  message: z.string().min(1).max(2000),
});

export async function respondToCircleRequest(args: z.infer<typeof respondSchema>) {
  const parsed = respondSchema.safeParse(args);
  if (!parsed.success) {
    return { ok: false as const, error: parsed.error.issues[0]?.message ?? "Invalid" };
  }
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false as const, error: "Non authentifié" };

  const { error } = await (supabase as SupabaseAny)
    .from("circle_request_responses")
    .insert({
      request_id: parsed.data.requestId,
      responder_id: user.id,
      message: parsed.data.message,
    });

  if (error) return { ok: false as const, error: error.message };
  revalidatePath(`/circles/${parsed.data.circleSlug}/requests`);
  return { ok: true as const };
}

const markFulfilledSchema = z.object({
  requestId: z.string().uuid(),
  circleSlug: z.string().min(1),
  fulfilledBy: z.string().uuid().nullable().optional(),
});

export async function markCircleRequestFulfilled(
  args: z.infer<typeof markFulfilledSchema>,
) {
  const parsed = markFulfilledSchema.safeParse(args);
  if (!parsed.success) {
    return { ok: false as const, error: parsed.error.issues[0]?.message ?? "Invalid" };
  }
  const supabase = await createClient();
  const { error } = await (supabase as SupabaseAny)
    .from("circle_requests")
    .update({
      status: "fulfilled",
      fulfilled_by: parsed.data.fulfilledBy ?? null,
      fulfilled_at: new Date().toISOString(),
    })
    .eq("id", parsed.data.requestId);

  if (error) return { ok: false as const, error: error.message };
  revalidatePath(`/circles/${parsed.data.circleSlug}/requests`);
  return { ok: true as const };
}

const closeSchema = z.object({
  requestId: z.string().uuid(),
  circleSlug: z.string().min(1),
});

export async function closeCircleRequest(args: z.infer<typeof closeSchema>) {
  const parsed = closeSchema.safeParse(args);
  if (!parsed.success) {
    return { ok: false as const, error: parsed.error.issues[0]?.message ?? "Invalid" };
  }
  const supabase = await createClient();
  const { error } = await (supabase as SupabaseAny)
    .from("circle_requests")
    .update({ status: "closed" })
    .eq("id", parsed.data.requestId);
  if (error) return { ok: false as const, error: error.message };
  revalidatePath(`/circles/${parsed.data.circleSlug}/requests`);
  return { ok: true as const };
}
