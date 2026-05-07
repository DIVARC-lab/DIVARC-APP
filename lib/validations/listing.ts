import { z } from "zod";
import { currencySchema } from "./profile";

export const listingFormSchema = z.object({
  title: z
    .string()
    .trim()
    .min(3, { message: "Au moins 3 caractères." })
    .max(120, { message: "120 caractères maximum." }),
  description: z
    .string()
    .trim()
    .max(4000, { message: "4000 caractères maximum." })
    .optional()
    .transform((v) => (v && v.length > 0 ? v : null)),
  price_amount: z
    .number({ message: "Prix invalide." })
    .min(0, { message: "Le prix ne peut pas être négatif." })
    .max(99_999_999, { message: "Prix trop élevé." }),
  price_currency: currencySchema,
  category: z.enum([
    "mode",
    "mobilier",
    "electronique",
    "vehicules",
    "livres",
    "sport",
    "musique",
    "enfants",
    "jardinage",
    "alimentation",
    "artisanat",
    "services",
    "autre",
  ]),
  condition: z.enum(["new", "like_new", "used", "fair"]),
  location: z
    .string()
    .trim()
    .max(80, { message: "80 caractères maximum." })
    .optional()
    .transform((v) => (v && v.length > 0 ? v : null)),
});

export type ListingFormInput = z.infer<typeof listingFormSchema>;
