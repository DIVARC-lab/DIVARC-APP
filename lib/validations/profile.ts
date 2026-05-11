import { z } from "zod";

export const usernameSchema = z
  .string()
  .trim()
  .toLowerCase()
  .min(3, { message: "Au moins 3 caractères." })
  .max(20, { message: "20 caractères maximum." })
  .regex(/^[a-z0-9_]+$/, {
    message: "Lettres minuscules, chiffres et _ uniquement.",
  });

export const profileFormSchema = z.object({
  username: usernameSchema,
  fullName: z
    .string()
    .trim()
    .min(2, { message: "Au moins 2 caractères." })
    .max(80, { message: "80 caractères maximum." }),
  bio: z
    .string()
    .trim()
    .max(280, { message: "280 caractères maximum." })
    .optional()
    .transform((value) => (value && value.length > 0 ? value : null)),
  location: z
    .string()
    .trim()
    .max(80, { message: "80 caractères maximum." })
    .optional()
    .transform((value) => (value && value.length > 0 ? value : null)),
});

export type ProfileFormInput = z.infer<typeof profileFormSchema>;

export const localeSchema = z.enum([
  "fr-FR",
  "fr-CA",
  "fr-BE",
  "fr-CH",
  "fr-MA",
  "fr-SN",
  "fr-CI",
  "fr-CM",
  "fr-DZ",
  "fr-TN",
]);

export const currencySchema = z.enum([
  "EUR",
  "XAF",
  "XOF",
  "MAD",
  "TND",
  "DZD",
  "CAD",
  "CHF",
]);

export const themeSchema = z.enum(["light", "dark", "system"]);

export const customStatusSchema = z.enum([
  "available",
  "busy",
  "dnd",
  "invisible",
]);

export const presenceVisibilitySchema = z.enum([
  "everyone",
  "friends",
  "nobody",
]);

export const preferencesFormSchema = z.object({
  locale: localeSchema,
  currency: currencySchema,
  theme: themeSchema,
  email_notifications: z.boolean(),
  push_notifications: z.boolean(),
  discoverable: z.boolean(),
  show_email: z.boolean(),
  show_location: z.boolean(),
  custom_status: customStatusSchema,
  presence_visibility: presenceVisibilitySchema,
});

export type PreferencesFormInput = z.infer<typeof preferencesFormSchema>;

/* Identité étendue (migration 0063). */
export const coverGradientSchema = z.enum([
  "navy_gold",
  "sunset",
  "ocean",
  "forest",
  "rose",
  "aurora",
  "cream_navy",
  "noir",
  "cyber",
]);

export const socialLinkKindSchema = z.enum([
  "instagram",
  "twitter",
  "linkedin",
  "github",
  "youtube",
  "tiktok",
  "behance",
  "dribbble",
  "mastodon",
  "bluesky",
  "custom",
]);

export const socialLinkSchema = z.object({
  kind: socialLinkKindSchema,
  url: z.string().url().max(500),
  label: z.string().max(40).optional(),
});

export const facetSchema = z.enum([
  "particulier",
  "professionnel",
  "createur",
  "vendeur",
  "mentor",
  "recruteur",
  "entrepreneur",
]);

export const identityExtendedSchema = z.object({
  pronouns: z.string().max(30).nullable().optional(),
  cover_photo_url: z.string().url().nullable().optional(),
  cover_gradient: coverGradientSchema.nullable().optional(),
  website: z.string().url().nullable().optional(),
  headline: z.string().max(220).nullable().optional(),
  social_links: z.array(socialLinkSchema).max(15),
});

export type IdentityExtendedInput = z.infer<typeof identityExtendedSchema>;

export const facetsUpdateSchema = z
  .object({
    facets: z.array(facetSchema).min(1).max(7),
    primary_facet: facetSchema,
  })
  .refine((data) => data.facets.includes(data.primary_facet), {
    message: "La facette principale doit être dans la liste activée.",
    path: ["primary_facet"],
  })
  .refine((data) => data.facets.includes("particulier"), {
    message: "La facette 'particulier' est toujours active.",
    path: ["facets"],
  });

export type FacetsUpdateInput = z.infer<typeof facetsUpdateSchema>;

export type FieldErrors<T> = Partial<Record<keyof T, string>>;

export function flattenZodErrors<T>(
  error: z.ZodError<T>,
): FieldErrors<T> {
  const errors: FieldErrors<T> = {};
  for (const issue of error.issues) {
    const key = issue.path[0];
    if (typeof key !== "string") continue;
    const typedKey = key as keyof T;
    if (!errors[typedKey]) {
      errors[typedKey] = issue.message;
    }
  }
  return errors;
}
