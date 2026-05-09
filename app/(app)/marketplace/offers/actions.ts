"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";

const sendOfferSchema = z.object({
  listing_id: z.string().uuid(),
  amount: z.coerce.number().int().min(1).max(10_000_000),
  message: z
    .string()
    .trim()
    .max(500)
    .optional()
    .transform((v) => (v && v.length > 0 ? v : null)),
});

const respondSchema = z.object({
  offer_id: z.string().uuid(),
  decision: z.enum(["accept", "decline", "counter", "withdraw"]),
  /* counter_amount + counter_message uniquement pour la branche counter. */
  counter_amount: z.coerce.number().int().min(1).max(10_000_000).optional(),
  counter_message: z
    .string()
    .trim()
    .max(500)
    .optional()
    .transform((v) => (v && v.length > 0 ? v : null)),
});

export type OfferActionResult =
  | { ok: true; offerId: string }
  | { ok: false; error: string };

/* Crée une nouvelle offre buyer → seller. Refuse si :
 * - l'utilisateur n'est pas authentifié
 * - le listing n'est pas actif
 * - le buyer est le seller (pas d'auto-offre)
 * - une offre pending existe déjà du même buyer pour ce listing
 *   (pour éviter le spam — il doit attendre la réponse ou withdraw). */
export async function sendOffer(formData: FormData): Promise<OfferActionResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Non authentifié." };

  const parsed = sendOfferSchema.safeParse({
    listing_id: formData.get("listing_id"),
    amount: formData.get("amount"),
    message: formData.get("message"),
  });
  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.issues[0]?.message ?? "Offre invalide.",
    };
  }

  const { data: listing } = await supabase
    .from("listings")
    .select("id, seller_id, status, price_currency")
    .eq("id", parsed.data.listing_id)
    .maybeSingle();
  if (!listing) return { ok: false, error: "Annonce introuvable." };
  if (listing.status !== "active") {
    return { ok: false, error: "Annonce non disponible." };
  }
  if (listing.seller_id === user.id) {
    return { ok: false, error: "Tu ne peux pas faire une offre sur ta propre annonce." };
  }

  /* Garde-fou anti-spam : une seule offre pending par (buyer, listing). */
  const { data: existing } = await supabase
    .from("listing_offers")
    .select("id")
    .eq("listing_id", parsed.data.listing_id)
    .eq("from_user", user.id)
    .eq("status", "pending")
    .maybeSingle();
  if (existing) {
    return {
      ok: false,
      error: "Tu as déjà une offre en attente sur cette annonce.",
    };
  }

  const { data: created, error } = await supabase
    .from("listing_offers")
    .insert({
      listing_id: parsed.data.listing_id,
      from_user: user.id,
      to_user: listing.seller_id,
      amount: parsed.data.amount,
      currency: listing.price_currency,
      message: parsed.data.message,
      parent_offer_id: null,
    })
    .select("id")
    .single();

  if (error || !created) {
    return { ok: false, error: "Envoi impossible." };
  }

  revalidatePath(`/marketplace/${parsed.data.listing_id}`);
  revalidatePath("/marketplace/offers");
  return { ok: true, offerId: created.id };
}

/* Répond à une offre : accept | decline | counter | withdraw.
 * - accept : marque l'offre `accepted`, marque le listing `sold`.
 * - decline : marque l'offre `declined`.
 * - counter : crée une nouvelle offre liée (parent_offer_id), marque
 *   l'offre courante `countered`.
 * - withdraw : seul le from_user peut retirer son offre pending. */
export async function respondToOffer(
  formData: FormData,
): Promise<OfferActionResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Non authentifié." };

  const parsed = respondSchema.safeParse({
    offer_id: formData.get("offer_id"),
    decision: formData.get("decision"),
    counter_amount: formData.get("counter_amount"),
    counter_message: formData.get("counter_message"),
  });
  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.issues[0]?.message ?? "Réponse invalide.",
    };
  }

  const { data: offer } = await supabase
    .from("listing_offers")
    .select("*")
    .eq("id", parsed.data.offer_id)
    .maybeSingle();
  if (!offer) return { ok: false, error: "Offre introuvable." };
  if (offer.status !== "pending") {
    return { ok: false, error: "Offre déjà traitée." };
  }

  /* Permissions : recipient pour accept/decline/counter, sender pour withdraw. */
  const isRecipient = offer.to_user === user.id;
  const isSender = offer.from_user === user.id;
  const decision = parsed.data.decision;

  if (decision === "withdraw" && !isSender) {
    return { ok: false, error: "Seul l'envoyeur peut retirer une offre." };
  }
  if (
    (decision === "accept" || decision === "decline" || decision === "counter") &&
    !isRecipient
  ) {
    return { ok: false, error: "Seul le destinataire peut répondre." };
  }

  if (decision === "withdraw") {
    const { error } = await supabase
      .from("listing_offers")
      .update({ status: "withdrawn", responded_at: new Date().toISOString() })
      .eq("id", offer.id);
    if (error) return { ok: false, error: "Retrait impossible." };
  } else if (decision === "decline") {
    const { error } = await supabase
      .from("listing_offers")
      .update({ status: "declined", responded_at: new Date().toISOString() })
      .eq("id", offer.id);
    if (error) return { ok: false, error: "Refus impossible." };
  } else if (decision === "accept") {
    /* On marque l'offre acceptée + le listing vendu en transaction. La
       fonction RPC `accept_listing_offer` garantit l'atomicité côté DB. */
    const { error } = await supabase.rpc("accept_listing_offer", {
      offer_id: offer.id,
    });
    if (error) return { ok: false, error: "Acceptation impossible." };
  } else if (decision === "counter") {
    if (!parsed.data.counter_amount) {
      return { ok: false, error: "Montant de la contre-offre requis." };
    }
    /* Marque l'offre actuelle `countered` et crée la contre-offre liée. */
    const { error: updateError } = await supabase
      .from("listing_offers")
      .update({ status: "countered", responded_at: new Date().toISOString() })
      .eq("id", offer.id);
    if (updateError) return { ok: false, error: "Contre-offre impossible." };

    const { data: counter, error: insertError } = await supabase
      .from("listing_offers")
      .insert({
        listing_id: offer.listing_id,
        from_user: user.id,
        to_user: offer.from_user,
        parent_offer_id: offer.id,
        amount: parsed.data.counter_amount,
        currency: offer.currency,
        message: parsed.data.counter_message,
      })
      .select("id")
      .single();
    if (insertError || !counter) {
      return { ok: false, error: "Contre-offre impossible." };
    }
    revalidatePath(`/marketplace/${offer.listing_id}`);
    revalidatePath("/marketplace/offers");
    return { ok: true, offerId: counter.id };
  }

  revalidatePath(`/marketplace/${offer.listing_id}`);
  revalidatePath("/marketplace/offers");
  return { ok: true, offerId: offer.id };
}
