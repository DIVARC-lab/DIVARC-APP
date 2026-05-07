"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { listingFormSchema } from "@/lib/validations/listing";
import {
  flattenZodErrors,
  type FieldErrors,
} from "@/lib/validations/profile";
import type { ListingFormInput } from "@/lib/validations/listing";

export type ListingFormState = {
  status: "idle" | "success" | "error";
  message?: string;
  fieldErrors?: FieldErrors<ListingFormInput>;
  listingId?: string;
};

const photoSchema = z.array(
  z.object({
    url: z.string().url(),
    position: z.number().int().min(0),
  }),
);

function parseListingForm(formData: FormData) {
  const photosRaw = formData.get("photos");
  let photos: { url: string; position: number }[] = [];
  if (typeof photosRaw === "string") {
    try {
      photos = photoSchema.parse(JSON.parse(photosRaw));
    } catch {
      photos = [];
    }
  }

  return {
    parsed: listingFormSchema.safeParse({
      title: formData.get("title"),
      description: formData.get("description"),
      price_amount: Number(formData.get("price_amount")),
      price_currency: formData.get("price_currency"),
      category: formData.get("category"),
      condition: formData.get("condition"),
      location: formData.get("location"),
    }),
    photos,
  };
}

export async function createListing(
  _prev: ListingFormState | undefined,
  formData: FormData,
): Promise<ListingFormState> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { status: "error", message: "Tu dois être connecté." };
  }

  const { parsed, photos } = parseListingForm(formData);

  if (!parsed.success) {
    return {
      status: "error",
      message: "Vérifie les champs en rouge.",
      fieldErrors: flattenZodErrors(parsed.error),
    };
  }

  if (photos.length === 0) {
    return {
      status: "error",
      message: "Ajoute au moins une photo.",
    };
  }

  const { data: listing, error: insertError } = await supabase
    .from("listings")
    .insert({
      seller_id: user.id,
      title: parsed.data.title,
      description: parsed.data.description,
      price_amount: parsed.data.price_amount,
      price_currency: parsed.data.price_currency,
      category: parsed.data.category,
      condition: parsed.data.condition,
      location: parsed.data.location,
      status: "active",
    })
    .select("id")
    .single();

  if (insertError || !listing) {
    return {
      status: "error",
      message: "Création impossible. Réessaie.",
    };
  }

  if (photos.length > 0) {
    const { error: photosError } = await supabase
      .from("listing_photos")
      .insert(
        photos.map((photo, index) => ({
          listing_id: listing.id,
          url: photo.url,
          position: photo.position ?? index,
        })),
      );

    if (photosError) {
      // Rollback the listing if photos failed
      await supabase.from("listings").delete().eq("id", listing.id);
      return {
        status: "error",
        message: "Impossible d'attacher les photos. Réessaie.",
      };
    }
  }

  revalidatePath("/marketplace");
  revalidatePath("/marketplace/mine");
  redirect(`/marketplace/${listing.id}`);
}

export async function deleteListing(listingId: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Non authentifié." };

  const { error } = await supabase
    .from("listings")
    .delete()
    .eq("id", listingId)
    .eq("seller_id", user.id);

  if (error) return { ok: false, error: "Suppression impossible." };

  revalidatePath("/marketplace");
  revalidatePath("/marketplace/mine");
  return { ok: true };
}

export async function markListingSold(listingId: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Non authentifié." };

  const { error } = await supabase
    .from("listings")
    .update({ status: "sold", sold_at: new Date().toISOString() })
    .eq("id", listingId)
    .eq("seller_id", user.id);

  if (error) return { ok: false, error: "Action impossible." };

  revalidatePath(`/marketplace/${listingId}`);
  revalidatePath("/marketplace/mine");
  revalidatePath("/marketplace");
  return { ok: true };
}

export async function reactivateListing(listingId: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Non authentifié." };

  const { error } = await supabase
    .from("listings")
    .update({ status: "active", sold_at: null })
    .eq("id", listingId)
    .eq("seller_id", user.id);

  if (error) return { ok: false, error: "Action impossible." };

  revalidatePath(`/marketplace/${listingId}`);
  revalidatePath("/marketplace/mine");
  revalidatePath("/marketplace");
  return { ok: true };
}

export async function toggleFavorite(listingId: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Non authentifié.", favorited: false };

  const { data: existing } = await supabase
    .from("favorites")
    .select("listing_id")
    .eq("user_id", user.id)
    .eq("listing_id", listingId)
    .maybeSingle();

  if (existing) {
    await supabase
      .from("favorites")
      .delete()
      .eq("user_id", user.id)
      .eq("listing_id", listingId);
    revalidatePath(`/marketplace/${listingId}`);
    revalidatePath("/marketplace/favorites");
    return { ok: true, favorited: false };
  }

  await supabase
    .from("favorites")
    .insert({ user_id: user.id, listing_id: listingId });
  revalidatePath(`/marketplace/${listingId}`);
  revalidatePath("/marketplace/favorites");
  return { ok: true, favorited: true };
}

export async function contactSeller(listingId: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    redirect("/login");
  }

  const { data: listing } = await supabase
    .from("listings")
    .select("seller_id")
    .eq("id", listingId)
    .maybeSingle();

  if (!listing) return { error: "Annonce introuvable." };

  if (listing.seller_id === user.id) {
    return { error: "Tu ne peux pas te contacter toi-même." };
  }

  // Try to open existing conversation
  const { data: convId, error: convError } = await supabase.rpc(
    "get_or_create_direct_conversation",
    { other_user_id: listing.seller_id },
  );

  if (convError || !convId) {
    // Need friendship — send friend request first
    const { error: friendError } = await supabase.rpc("send_friend_request", {
      recipient_user_id: listing.seller_id,
      intro: `Bonjour ! Je suis intéressé(e) par ton annonce.`,
    });

    if (friendError) {
      return { error: "Impossible de contacter le vendeur." };
    }

    return { friendRequest: true };
  }

  redirect(`/messages/${convId}`);
}
