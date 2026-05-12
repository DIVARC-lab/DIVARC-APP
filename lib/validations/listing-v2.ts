import { z } from "zod";
import { currencySchema } from "./profile";

/* Chantier 4 — Schéma de validation pour le wizard de création v2.
 *
 * Différences avec listingFormSchema (v1) :
 *   - condition : accepte les valeurs Vinted-style (cf. migration 0083)
 *   - category_path : array (taxonomy v2), au moins 1 niveau
 *   - primary_category : top de la taxonomy v2
 *   - attributes : jsonb libre (validé séparément via buildZodSchema par catégorie)
 *   - is_negotiable : flag prix négociable
 *   - listing_type : 'goods'|'service'|'real_estate'|'vehicle'|… */

const conditionV2Schema = z.enum([
  /* Legacy (compat rows existantes). */
  "new",
  "like_new",
  "used",
  "fair",
  /* Vinted-style. */
  "new_with_tags",
  "new_without_tags",
  "very_good",
  "good",
  "satisfactory",
  "damaged",
]);

const listingTypeSchema = z.enum([
  "goods",
  "service",
  "real_estate",
  "vehicle",
  "event_ticket",
  "digital",
  "job",
  "housing_rental",
]);

export const listingFormV2Schema = z.object({
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
  is_negotiable: z.boolean().default(false),
  condition: conditionV2Schema,
  listing_type: listingTypeSchema.default("goods"),
  /* Path de catégorie (taxonomy v2) : au moins 1 niveau (top), max 4. */
  category_path: z
    .array(z.string().min(1).max(120))
    .min(1, { message: "Choisis une catégorie." })
    .max(4),
  /* Top-category (1er élément du path). Stocké séparément pour requêtes. */
  primary_category: z.string().min(1).max(80),
  /* Attributs dynamiques selon la catégorie. Validé séparément côté action. */
  attributes: z.record(z.string(), z.unknown()).default({}),
  location: z
    .string()
    .trim()
    .max(80, { message: "80 caractères maximum." })
    .optional()
    .transform((v) => (v && v.length > 0 ? v : null)),
});

export type ListingFormV2Input = z.infer<typeof listingFormV2Schema>;
