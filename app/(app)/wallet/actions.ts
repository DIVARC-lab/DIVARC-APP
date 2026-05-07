"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { transferFormSchema } from "@/lib/validations/wallet";
import {
  flattenZodErrors,
  type FieldErrors,
} from "@/lib/validations/profile";
import type { TransferFormInput } from "@/lib/validations/wallet";

export type TransferFormState = {
  status: "idle" | "success" | "error";
  message?: string;
  fieldErrors?: FieldErrors<TransferFormInput>;
  transactionId?: string;
};

export async function sendMoney(
  _prev: TransferFormState | undefined,
  formData: FormData,
): Promise<TransferFormState> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { status: "error", message: "Tu dois être connecté." };

  const amountStr = formData.get("amount");
  const parsed = transferFormSchema.safeParse({
    recipient_id: formData.get("recipient_id"),
    amount: typeof amountStr === "string" ? Number(amountStr) : NaN,
    currency: formData.get("currency"),
    description: formData.get("description"),
  });

  if (!parsed.success) {
    return {
      status: "error",
      message: "Vérifie les champs.",
      fieldErrors: flattenZodErrors(parsed.error),
    };
  }

  const { data, error } = await supabase.rpc("transfer_money", {
    recipient_user_id: parsed.data.recipient_id,
    transfer_amount: parsed.data.amount,
    transfer_currency: parsed.data.currency,
    transfer_description: parsed.data.description,
  });

  if (error || !data) {
    if (/insufficient/i.test(error?.message ?? "")) {
      return {
        status: "error",
        message: "Solde insuffisant pour ce transfert.",
      };
    }
    if (/friend/i.test(error?.message ?? "")) {
      return {
        status: "error",
        message: "Tu peux uniquement envoyer de l'argent à un ami.",
      };
    }
    if (/yourself/i.test(error?.message ?? "")) {
      return {
        status: "error",
        message: "Tu ne peux pas t'envoyer de l'argent à toi-même.",
      };
    }
    return { status: "error", message: "Transfert impossible. Réessaie." };
  }

  revalidatePath("/wallet");
  redirect(`/wallet?transferred=${data}`);
}
