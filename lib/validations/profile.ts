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

export const preferencesFormSchema = z.object({
  locale: localeSchema,
  currency: currencySchema,
  theme: themeSchema,
  email_notifications: z.boolean(),
  push_notifications: z.boolean(),
  discoverable: z.boolean(),
  show_email: z.boolean(),
  show_location: z.boolean(),
});

export type PreferencesFormInput = z.infer<typeof preferencesFormSchema>;

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
