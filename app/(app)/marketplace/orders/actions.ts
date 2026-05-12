"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import type {
  DisputeReason,
  MarketplaceDispute,
} from "@/lib/database.types";

/* ============================================================================
 * Chantier 6 — Server actions confiance & litiges marketplace.
 * ============================================================================ */

const reviewSchema = z.object({
  orderId: z.string().uuid(),
  rating: z.number().int().min(1).max(5),
  body: z.string().trim().max(2000).optional(),
});

export type ReviewActionState = {
  ok: boolean;
  error?: string;
};

export async function submitReviewAction(
  _prev: ReviewActionState | undefined,
  formData: FormData,
): Promise<ReviewActionState> {
  const parsed = reviewSchema.safeParse({
    orderId: formData.get("orderId"),
    rating: Number(formData.get("rating")),
    body: formData.get("body") ?? undefined,
  });
  if (!parsed.success) {
    return { ok: false, error: "Note invalide ou commentaire trop long." };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Non authentifié." };

  const { error } = await supabase.rpc("submit_marketplace_review", {
    p_order_id: parsed.data.orderId,
    p_rating: parsed.data.rating,
    p_body: parsed.data.body ?? null,
  });
  if (error) {
    return { ok: false, error: error.message };
  }

  revalidatePath(`/marketplace/orders/${parsed.data.orderId}`);
  return { ok: true };
}

/* ----------------------------------------------------------------------------
 * Litiges
 * ---------------------------------------------------------------------------- */

const DISPUTE_REASONS: DisputeReason[] = [
  "item_not_received",
  "item_not_as_described",
  "item_damaged",
  "counterfeit",
  "buyer_no_payment",
  "buyer_abusive",
  "other",
];

const disputeSchema = z.object({
  orderId: z.string().uuid(),
  reason: z.enum(DISPUTE_REASONS as [DisputeReason, ...DisputeReason[]]),
  body: z.string().trim().min(10).max(4000),
});

export type DisputeActionState = {
  ok: boolean;
  error?: string;
  disputeId?: string;
};

export async function openDisputeAction(
  _prev: DisputeActionState | undefined,
  formData: FormData,
): Promise<DisputeActionState> {
  const parsed = disputeSchema.safeParse({
    orderId: formData.get("orderId"),
    reason: formData.get("reason"),
    body: formData.get("body"),
  });
  if (!parsed.success) {
    return {
      ok: false,
      error: "Détaille ton problème (10 caractères minimum).",
    };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Non authentifié." };

  /* Charge l'order pour déterminer le rôle de l'utilisateur. */
  const { data: order } = await supabase
    .from("orders")
    .select("buyer_id, seller_id")
    .eq("id", parsed.data.orderId)
    .maybeSingle();
  if (!order) return { ok: false, error: "Commande introuvable." };

  const role: "buyer" | "seller" =
    order.buyer_id === user.id
      ? "buyer"
      : order.seller_id === user.id
        ? "seller"
        : (() => {
            throw new Error("Pas partie");
          })();

  const { data: dispute, error } = await supabase
    .from("marketplace_disputes")
    .insert({
      order_id: parsed.data.orderId,
      opened_by: user.id,
      opened_by_role: role,
      reason: parsed.data.reason,
      body: parsed.data.body,
      status: "awaiting_response",
    })
    .select("id")
    .single<Pick<MarketplaceDispute, "id">>();

  if (error || !dispute) {
    /* Conflit unique (un litige existe déjà) → on remonte un message clair. */
    if (error?.code === "23505") {
      return {
        ok: false,
        error: "Un litige existe déjà sur cette commande.",
      };
    }
    return { ok: false, error: error?.message ?? "Ouverture impossible." };
  }

  /* Marque l'order comme disputed. */
  await supabase
    .from("orders")
    .update({ is_disputed: true, dispute_id: dispute.id, status: "disputed" })
    .eq("id", parsed.data.orderId);

  revalidatePath(`/marketplace/orders/${parsed.data.orderId}`);
  return { ok: true, disputeId: dispute.id };
}
