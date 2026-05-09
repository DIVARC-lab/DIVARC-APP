"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";

/* IBAN validation : format SEPA générique. On strip les espaces avant
 * validation, puis on vérifie longueur 14-34 + alphanumeric uppercase. */
function normalizeIban(raw: string): string {
  return raw.replace(/\s+/g, "").toUpperCase();
}

const payoutSchema = z.object({
  amount: z.coerce.number().int().min(100).max(1_000_000),
  currency: z.enum(["EUR", "USD", "GBP", "CHF", "CAD"]),
  iban: z
    .string()
    .trim()
    .transform(normalizeIban)
    .refine((v) => /^[A-Z]{2}\d{2}[A-Z0-9]{10,30}$/.test(v), {
      message: "IBAN invalide.",
    }),
  bic: z
    .string()
    .trim()
    .toUpperCase()
    .optional()
    .transform((v) => (v && v.length > 0 ? v : null))
    .refine((v) => v === null || /^[A-Z0-9]{8}([A-Z0-9]{3})?$/.test(v), {
      message: "BIC invalide (8 ou 11 caractères).",
    }),
  account_holder: z.string().trim().min(2).max(100),
});

export type PayoutActionResult =
  | { ok: true; requestId: string }
  | { ok: false; error: string };

/* Crée une demande de payout via la RPC create_payout_request, qui
 * vérifie atomiquement le solde et l'absence d'autre demande pending. */
export async function requestPayout(formData: FormData): Promise<PayoutActionResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Non authentifié." };

  const parsed = payoutSchema.safeParse({
    amount: formData.get("amount"),
    currency: formData.get("currency"),
    iban: formData.get("iban"),
    bic: formData.get("bic"),
    account_holder: formData.get("account_holder"),
  });
  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.issues[0]?.message ?? "Demande invalide.",
    };
  }

  const { data, error } = await supabase.rpc("create_payout_request", {
    amount_cents: parsed.data.amount,
    currency_code: parsed.data.currency,
    iban_value: parsed.data.iban,
    bic_value: parsed.data.bic,
    holder: parsed.data.account_holder,
  });

  if (error || !data) {
    if (/Insufficient/i.test(error?.message ?? "")) {
      return { ok: false, error: "Solde insuffisant." };
    }
    if (/in progress/i.test(error?.message ?? "")) {
      return {
        ok: false,
        error: "Une demande est déjà en cours. Annule-la avant d'en créer une nouvelle.",
      };
    }
    return { ok: false, error: "Demande impossible. Réessaie." };
  }

  revalidatePath("/wallet");
  revalidatePath("/wallet/payout");
  return { ok: true, requestId: data as string };
}

/* Annule une demande pending — atomique côté RPC (re-crédit wallet +
 * status cancelled dans la même transaction). */
export async function cancelPayout(requestId: string): Promise<PayoutActionResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Non authentifié." };

  const { error } = await supabase.rpc("cancel_payout_request", {
    request_id: requestId,
  });
  if (error) {
    if (/Not authorized/i.test(error.message)) {
      return { ok: false, error: "Non autorisé." };
    }
    if (/non-pending/i.test(error.message)) {
      return { ok: false, error: "Demande déjà traitée." };
    }
    return { ok: false, error: "Annulation impossible." };
  }

  revalidatePath("/wallet");
  revalidatePath("/wallet/payout");
  return { ok: true, requestId };
}
