import { z } from "zod";
import { currencySchema } from "./profile";

export const transferFormSchema = z.object({
  recipient_id: z.string().uuid({ message: "Destinataire invalide." }),
  amount: z
    .number({ message: "Montant invalide." })
    .positive({ message: "Le montant doit être positif." })
    .max(99_999_999, { message: "Montant trop élevé." }),
  currency: currencySchema,
  description: z
    .string()
    .trim()
    .max(280, { message: "280 caractères maximum." })
    .optional()
    .transform((v) => (v && v.length > 0 ? v : null)),
});

export type TransferFormInput = z.infer<typeof transferFormSchema>;
