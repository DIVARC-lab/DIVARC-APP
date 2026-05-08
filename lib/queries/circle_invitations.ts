import "server-only";
import { createClient } from "@/lib/supabase/server";
import type {
  CircleInvitation,
  CircleInvitationPreview,
} from "@/lib/database.types";

export async function listCircleInvitations(
  circleId: string,
): Promise<CircleInvitation[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("circle_invitations")
    .select("*")
    .eq("circle_id", circleId)
    .order("created_at", { ascending: false });
  if (error || !data) return [];
  return data;
}

export async function previewInvitation(
  token: string,
): Promise<CircleInvitationPreview | null> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("preview_circle_invitation", {
    p_token: token,
  });
  if (error || !data || data.length === 0) return null;
  return data[0] ?? null;
}
