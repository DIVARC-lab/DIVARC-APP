import { z } from "zod";

export const postFormSchema = z.object({
  body: z
    .string()
    .trim()
    .max(4000, { message: "4000 caractères maximum." })
    .optional()
    .transform((v) => (v && v.length > 0 ? v : null)),
  visibility: z.enum(["public", "friends", "private"]),
});

export type PostFormInput = z.infer<typeof postFormSchema>;

export const commentSchema = z.object({
  body: z
    .string()
    .trim()
    .min(1, { message: "Écris quelque chose." })
    .max(2000, { message: "2000 caractères maximum." }),
});
