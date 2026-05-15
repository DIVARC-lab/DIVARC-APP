"use server";

/* Server Actions Live Rooms cercles. */

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";

/* eslint-disable @typescript-eslint/no-explicit-any */
type SupabaseAny = any;

const createSchema = z.object({
  circleId: z.string().uuid(),
  circleSlug: z.string().min(1),
  title: z.string().min(3).max(140),
  description: z.string().max(2000).optional(),
  kind: z.enum(["audio", "video"]),
  scheduledAt: z.string().datetime().nullable().optional(),
});

export async function createCircleLiveRoom(args: z.infer<typeof createSchema>) {
  const parsed = createSchema.safeParse(args);
  if (!parsed.success) {
    return { ok: false as const, error: parsed.error.issues[0]?.message ?? "Invalid" };
  }
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false as const, error: "Non authentifié" };

  const status = parsed.data.scheduledAt ? "scheduled" : "live";
  const startedAt = status === "live" ? new Date().toISOString() : null;

  const { data, error } = await (supabase as SupabaseAny)
    .from("circle_live_rooms")
    .insert({
      circle_id: parsed.data.circleId,
      host_id: user.id,
      title: parsed.data.title,
      description: parsed.data.description ?? null,
      kind: parsed.data.kind,
      status,
      scheduled_at: parsed.data.scheduledAt ?? null,
      started_at: startedAt,
    })
    .select("id")
    .single();

  if (error || !data) {
    return { ok: false as const, error: error?.message ?? "Insert failed" };
  }
  revalidatePath(`/circles/${parsed.data.circleSlug}/live`);
  return { ok: true as const, id: data.id as string };
}

export async function startCircleLiveRoom(args: { roomId: string; circleSlug: string }) {
  const supabase = await createClient();
  const { error } = await (supabase as SupabaseAny)
    .from("circle_live_rooms")
    .update({
      status: "live",
      started_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq("id", args.roomId);
  if (error) return { ok: false as const, error: error.message };
  revalidatePath(`/circles/${args.circleSlug}/live`);
  return { ok: true as const };
}

export async function endCircleLiveRoom(args: { roomId: string; circleSlug: string }) {
  const supabase = await createClient();
  const { error } = await (supabase as SupabaseAny).rpc("end_circle_live_room", {
    p_room_id: args.roomId,
  });
  if (error) return { ok: false as const, error: error.message };
  revalidatePath(`/circles/${args.circleSlug}/live`);
  return { ok: true as const };
}

export async function joinCircleLiveRoom(roomId: string) {
  const supabase = await createClient();
  const { error } = await (supabase as SupabaseAny).rpc("join_circle_live_room", {
    p_room_id: roomId,
  });
  if (error) return { ok: false as const, error: error.message };
  return { ok: true as const };
}

export async function leaveCircleLiveRoom(roomId: string) {
  const supabase = await createClient();
  const { error } = await (supabase as SupabaseAny).rpc("leave_circle_live_room", {
    p_room_id: roomId,
  });
  if (error) return { ok: false as const, error: error.message };
  return { ok: true as const };
}
